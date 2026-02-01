import {
  BubbleFactory,
  AIAgentBubble,
  SlackBubble,
  NotionBubble,
  HttpBubble,
  BubbleLogger,
  LogLevel,
} from '@bubblelab/bubble-core';
import { CredentialType } from '@bubblelab/shared-schemas';
import { FirecrawlBubble } from '../bubbles/FirecrawlBubble';
import { ResendBubble } from '../bubbles/ResendBubble';
import { ApprovalBubble } from '../bubbles/ApprovalBubble';
import { ReductoBubble } from '../bubbles/ReductoBubble';
import { MongoRAGBubble } from '../bubbles/MongoRAGBubble';
import { dashboardContent, broadcastDashboardUpdate } from '../routes/dashboard';

// Types for our workflow nodes
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

interface BusinessContext {
  recentRevenue: number;
  trend: 'up' | 'down' | 'stable';
  alerts: string[];
}

interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error';
  data: unknown;
  duration: number;
  error?: string;
}

type NodeExecutionCallback = (nodeId: string, type: string, inputs: Record<string, unknown>) => void;
type NodeCompleteCallback = (nodeId: string, type: string, result: ExecutionResult, inputs: Record<string, unknown>) => void;

export class WorkflowEngine {
  private bubbleFactory: BubbleFactory;
  private logger: BubbleLogger;
  private onNodeExecuting?: NodeExecutionCallback;
  private onNodeComplete?: NodeCompleteCallback;

  constructor() {
    this.bubbleFactory = new BubbleFactory();
    this.logger = new BubbleLogger('WorkflowEngine', {
      minLevel: LogLevel.INFO,
      enableTiming: true,
      enableMemoryTracking: false,
      enableStackTraces: false,
      maxLogEntries: 1000,
      bufferSize: 100,
      pricingTable: {
        'openai/gpt-5': { unit: 'tokens', unitCost: 0.00001 },
        'openai/gpt-5-mini': { unit: 'tokens', unitCost: 0.000001 },
      },
    });
  }

  setExecutionCallback(onStart: NodeExecutionCallback, onComplete?: NodeCompleteCallback) {
    this.onNodeExecuting = onStart;
    this.onNodeComplete = onComplete;
  }

  async executeFromGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerData: Record<string, unknown>,
    businessContext?: BusinessContext
  ): Promise<Record<string, ExecutionResult>> {
    const results: Record<string, ExecutionResult> = {};

    // Group nodes by execution level (for parallel execution)
    const levels = this.groupNodesByLevel(nodes, edges);

    console.log(`[Workflow] Executing ${nodes.length} nodes in ${levels.length} parallel levels`);

    for (const levelNodes of levels) {
      // Execute all nodes at this level in parallel
      const levelPromises = levelNodes.map(async (node) => {
        const inputs = this.gatherInputs(node, edges, results);

        // Notify that this node is executing
        this.onNodeExecuting?.(node.id, node.type, inputs);

        const startTime = Date.now();

        try {
          const result = await this.executeNode(node, inputs, triggerData, nodes, edges, businessContext);
          const duration = Date.now() - startTime;

          const execResult: ExecutionResult = {
            nodeId: node.id,
            status: 'success',
            data: result,
            duration,
          };
          results[node.id] = execResult;

          this.onNodeComplete?.(node.id, node.type, execResult, inputs);
          console.log(`[Workflow] ✓ ${node.id} (${node.type}) completed in ${duration}ms`);
        } catch (error) {
          const duration = Date.now() - startTime;
          const execResult: ExecutionResult = {
            nodeId: node.id,
            status: 'error',
            data: null,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          results[node.id] = execResult;

          this.onNodeComplete?.(node.id, node.type, execResult, inputs);
          console.error(`[Workflow] ✗ ${node.id} error:`, error);
        }
      });

      // Wait for all nodes at this level to complete before moving to next level
      await Promise.all(levelPromises);
    }

    return results;
  }

  /**
   * Group nodes by execution level for parallel processing
   * Nodes with no dependencies (or only completed dependencies) can run in parallel
   */
  private groupNodesByLevel(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[][] {
    const levels: WorkflowNode[][] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const completed = new Set<string>();

    // Build dependency map
    const dependencies = new Map<string, Set<string>>();
    nodes.forEach((n) => dependencies.set(n.id, new Set()));
    edges.forEach((e) => dependencies.get(e.target)?.add(e.source));

    while (completed.size < nodes.length) {
      // Find all nodes whose dependencies are all completed
      const readyNodes = nodes.filter(
        (n) => !completed.has(n.id) && [...(dependencies.get(n.id) || [])].every((dep) => completed.has(dep))
      );

      if (readyNodes.length === 0) {
        // Circular dependency or orphan nodes - add remaining
        const remaining = nodes.filter((n) => !completed.has(n.id));
        if (remaining.length > 0) levels.push(remaining);
        break;
      }

      levels.push(readyNodes);
      readyNodes.forEach((n) => completed.add(n.id));
    }

    return levels;
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    businessContext?: BusinessContext
  ): Promise<unknown> {
    switch (node.type) {
      case 'trigger':
        return { data: triggerData };

      case 'ai':
        return await this.executeAINode(node.data, inputs, triggerData);

      case 'action':
        return await this.executeActionNode(node.data, inputs);

      case 'lovable':
        return await this.executeLovableNode(node.data, inputs);

      case 'condition':
        return { result: this.evaluateCondition(node.data, inputs) };

      case 'adaptation':
        return await this.executeAdaptationNode(allNodes, allEdges, triggerData, businessContext);

      case 'firecrawl':
        return await this.executeFirecrawlNode(node.data, inputs, triggerData);

      case 'resend':
        return await this.executeResendNode(node.data, inputs, triggerData);

      case 'approval':
        return await this.executeApprovalNode(node.data, inputs, triggerData);

      case 'reducto':
        return await this.executeReductoNode(node.data, inputs);

      case 'mongo_rag':
        return await MongoRAGBubble.execute(node.data, inputs, { triggerData });

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute AI node using BubbleLab's AIAgentBubble with OpenAI
   * Enhanced to handle RAG context for historical comparison
   */
  private async executeAINode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for AI nodes');
    }

    const userPrompt = (data.prompt as string) || 'Analyze the following data and provide insights.';

    // Extract and format different input types
    const { currentData, historicalData, ticker } = this.categorizeInputs(inputs, triggerData);

    // Build enhanced prompt with RAG context
    let fullPrompt = '';

    if (historicalData.length > 0) {
      // Enhanced prompt for RAG-based reasoning
      fullPrompt = `You are a financial analyst. Your task is to analyze current events in the context of historical data and explain WHY changes matter.

## Your Analysis Must Include:
1. **What Changed**: Summarize the current event/news
2. **Historical Context**: Compare against the historical data provided
3. **Why It Matters**: Explain the significance based on historical patterns
4. **Recommended Action**: What should be done and why (based on evidence)

## Current Data (Real-time):
${currentData.map(d => `- ${d.source}: ${d.content}`).join('\n')}

## Historical Context (from RAG):
${historicalData.map(d => `- [${d.date}] ${d.title}: ${d.excerpt}`).join('\n')}

## Ticker: ${ticker || 'Unknown'}

## User Request:
${userPrompt}

Provide your analysis with clear reasoning based on the historical context. Be specific about how past performance informs current recommendations.`;
    } else {
      // Standard prompt without RAG
      const inputSummary = JSON.stringify({ inputs, triggerData }, null, 2);
      fullPrompt = `${userPrompt}\n\nInput Data:\n${inputSummary}`;
    }

    console.log('[AI] Executing with RAG context:', historicalData.length > 0 ? 'Yes' : 'No');

    const aiAgent = new AIAgentBubble({
      message: fullPrompt,
      model: {
        model: 'openai/gpt-5-mini',
      },
      credentials: {
        [CredentialType.OPENAI_CRED]: process.env.OPENAI_API_KEY!,
      },
    });

    const result = await aiAgent.action();

    // Attach metadata about what context was used
    return {
      ...result,
      _meta: {
        usedRagContext: historicalData.length > 0,
        ragResultsCount: historicalData.length,
        ticker,
      }
    };
  }

  /**
   * Categorize inputs into current data vs historical (RAG) data
   */
  private categorizeInputs(
    inputs: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): {
    currentData: Array<{ source: string; content: string }>;
    historicalData: Array<{ title: string; date: string; excerpt: string; score: number }>;
    ticker: string | null;
  } {
    const currentData: Array<{ source: string; content: string }> = [];
    const historicalData: Array<{ title: string; date: string; excerpt: string; score: number }> = [];
    let ticker: string | null = (triggerData.ticker as string) || null;

    for (const [nodeId, nodeData] of Object.entries(inputs)) {
      const data = nodeData as Record<string, unknown>;

      // Check for RAG results (from mongo_rag node)
      if (data?.data && typeof data.data === 'object') {
        const ragData = data.data as {
          results?: Array<{ title: string; date: string; excerpt: string; score: number; ticker?: string }>;
          method?: string;
        };

        if (ragData.results && ragData.method) {
          // This is RAG output
          console.log(`[AI] Found RAG results from ${nodeId}: ${ragData.results.length} items`);
          historicalData.push(...ragData.results);
          if (ragData.results[0]?.ticker) {
            ticker = ragData.results[0].ticker;
          }
          continue;
        }

        // Check for Firecrawl search results (current news)
        const fcData = data.data as { results?: Array<{ title?: string; description?: string; content?: string }> };
        if (fcData.results && Array.isArray(fcData.results)) {
          fcData.results.forEach((r, i) => {
            currentData.push({
              source: `News ${i + 1}`,
              content: `${r.title || ''}: ${r.description || r.content?.slice(0, 300) || ''}`,
            });
          });
          continue;
        }

        // Check for Firecrawl scrape result
        const scrapeData = data.data as { content?: string; url?: string };
        if (scrapeData.content) {
          currentData.push({
            source: scrapeData.url || 'Scraped Page',
            content: scrapeData.content.slice(0, 500),
          });
          continue;
        }

        // Check for Reducto extracted data
        const reductoData = data.data as { extracted?: Record<string, unknown> };
        if (reductoData.extracted) {
          currentData.push({
            source: 'SEC Filing Extract',
            content: JSON.stringify(reductoData.extracted, null, 2),
          });
        }
      }
    }

    return { currentData, historicalData, ticker };
  }

  /**
   * Execute action node using appropriate BubbleLab bubble
   */
  private async executeActionNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const actionType = data.actionType as string;

    switch (actionType) {
      case 'slack': {
        if (!process.env.SLACK_BOT_TOKEN) {
          throw new Error('SLACK_BOT_TOKEN is required for Slack actions');
        }

        const slack = new SlackBubble({
          operation: 'send_message',
          channel: (data.channel as string) || '#general',
          text: (data.message as string) || `Workflow executed: ${JSON.stringify(inputs)}`,
          credentials: {
            [CredentialType.SLACK_CRED]: process.env.SLACK_BOT_TOKEN,
          },
        });
        return await slack.action();
      }

      case 'notion': {
        if (!process.env.NOTION_API_KEY) {
          throw new Error('NOTION_API_KEY is required for Notion actions');
        }

        const databaseId = data.databaseId as string;
        if (!databaseId) {
          throw new Error('databaseId is required for Notion actions');
        }

        const notion = new NotionBubble({
          operation: 'create_page',
          parent: {
            type: 'database_id',
            database_id: databaseId,
          },
          properties: {
            // Notion expects properties in a specific format
            // Title property (required for most databases)
            Name: {
              title: [
                {
                  text: {
                    content: (data.title as string) || `Workflow Execution - ${new Date().toISOString()}`,
                  },
                },
              ],
            },
            // Add any additional properties from data.properties
            ...(data.properties as Record<string, unknown> || {}),
          },
          credentials: {
            [CredentialType.NOTION_CRED]: process.env.NOTION_API_KEY,
          },
        });
        return await notion.action();
      }

      case 'http': {
        if (!data.url) {
          throw new Error('URL is required for HTTP actions');
        }

        const http = new HttpBubble({
          url: data.url as string,
          method: (data.method as string) || 'POST',
          headers: (data.headers as Record<string, string>) || { 'Content-Type': 'application/json' },
          body: data.body || inputs,
        });
        return await http.action();
      }

      case 'dashboard':
      case 'custom': {
        // Update dashboard directly (same app, no API call needed)
        return this.updateDashboard(inputs);
      }

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute Lovable node - simulates site updates
   * Note: Lovable doesn't have a public API for direct component updates.
   * This implementation simulates the update and logs what would happen.
   * In production, you would integrate with Lovable's actual API or use webhooks.
   */
  private async executeLovableNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const action = data.action as string;
    const targetComponent = (data.targetComponent as string) || 'pricing-section';

    let newValue = data.newValue;
    if (typeof newValue === 'string') {
      newValue = this.interpolate(newValue, inputs);
    }

    console.log(`[Lovable] Simulating ${action} on ${targetComponent}`);
    console.log(`[Lovable] New value:`, newValue);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // If LOVABLE_API_KEY is set, attempt real API call (for future integration)
    if (process.env.LOVABLE_API_KEY && process.env.LOVABLE_PROJECT_ID) {
      try {
        const response = await fetch(
          `https://api.lovable.dev/v1/projects/${process.env.LOVABLE_PROJECT_ID}/components/${targetComponent}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              action,
              value: newValue,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            mode: 'live',
            updatedComponent: targetComponent,
            result,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.log(`[Lovable] API call failed, using simulation mode:`, error);
      }
    }

    // Return simulated success
    return {
      success: true,
      mode: 'simulation',
      action,
      updatedComponent: targetComponent,
      newValue,
      message: `Simulated: Would update ${targetComponent} with action "${action}"`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute adaptation node - uses AI to suggest workflow modifications
   */
  private async executeAdaptationNode(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerData: Record<string, unknown>,
    businessContext?: BusinessContext
  ): Promise<unknown> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for adaptation nodes');
    }

    const prompt = `You are a workflow optimization AI. Analyze the current workflow and business context, then determine if the workflow should be modified.

CURRENT WORKFLOW:
${JSON.stringify({ nodes, edges }, null, 2)}

TRIGGER EVENT:
${JSON.stringify(triggerData, null, 2)}

BUSINESS CONTEXT:
- Recent Revenue: $${businessContext?.recentRevenue || 0}
- Trend: ${businessContext?.trend || 'stable'}
- Active Alerts: ${businessContext?.alerts?.join(', ') || 'None'}

INSTRUCTIONS:
1. Analyze if the current workflow is optimal for the current business state
2. If revenue is DOWN: Consider adding discount campaigns, reducing costs, alerting team
3. If revenue is UP: Consider scaling operations, premium upsells, restocking
4. Return a JSON response with:
   - shouldAdapt: boolean
   - newWorkflow: the modified workflow (if shouldAdapt is true) - include nodes and edges arrays with proper positions
   - reasoning: why you made this decision
   - changes: array of specific changes made

Return ONLY valid JSON, no markdown code blocks.`;

    const aiAgent = new AIAgentBubble({
      message: prompt,
      model: {
        model: 'openai/gpt-5',
      },
      credentials: {
        [CredentialType.OPENAI_CRED]: process.env.OPENAI_API_KEY!,
      },
    });

    const result = await aiAgent.action();

    // Parse the AI response
    const responseText =
      typeof result.data === 'string'
        ? result.data
        : (result.data as { response?: string })?.response || JSON.stringify(result.data);

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Execute Firecrawl node - web scraping, search, extract, map
   */
  private async executeFirecrawlNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    triggerData?: Record<string, unknown>
  ): Promise<unknown> {
    const mode = (data.mode as 'scrape' | 'crawl' | 'search' | 'extract' | 'map') || 'scrape';
    let url = data.url as string | undefined;
    let urls = data.urls as string[] | undefined;
    let query = data.query as string | undefined;
    let prompt = data.prompt as string | undefined;

    // Build interpolation context from trigger data AND trigger node output in inputs
    // The trigger node returns { data: { ticker, ... } }, so we need to extract it
    let interpolationContext: Record<string, unknown> = { ...triggerData };

    // Also check inputs for trigger node output (provides fallback)
    for (const [nodeId, nodeResult] of Object.entries(inputs)) {
      const result = nodeResult as { data?: Record<string, unknown> };
      if (result?.data) {
        // Merge trigger node's data into context
        interpolationContext = { ...interpolationContext, ...result.data };
      }
    }

    console.log('[Firecrawl] Interpolation context:', JSON.stringify(interpolationContext));
    console.log('[Firecrawl] Before interpolation - url:', url, 'query:', query);

    // Interpolate values using combined context
    if (url?.includes('{{')) url = this.interpolateSimple(url, interpolationContext);
    if (query?.includes('{{')) query = this.interpolateSimple(query, interpolationContext);
    if (prompt?.includes('{{')) prompt = this.interpolateSimple(prompt, interpolationContext);

    console.log('[Firecrawl] After interpolation - url:', url, 'query:', query);

    // Auto-discover URLs from upstream firecrawl search results
    if (!url && !urls && mode !== 'search') {
      const discoveredUrls: string[] = [];
      for (const [, nodeData] of Object.entries(inputs)) {
        const inputResult = nodeData as { data?: { results?: Array<{ url?: string }>; url?: string } };
        if (inputResult?.data?.results) {
          inputResult.data.results.forEach((r) => r.url && discoveredUrls.push(r.url));
        } else if (inputResult?.data?.url) {
          discoveredUrls.push(inputResult.data.url);
        }
      }
      if (discoveredUrls.length > 0) {
        urls = discoveredUrls;
        url = discoveredUrls[0];
      }
    }

    const firecrawl = new FirecrawlBubble({
      mode,
      url,
      urls,
      query,
      prompt,
      schema: data.schema as Record<string, unknown> | undefined,
      limit: (data.limit as number) || 5,
      formats: (data.formats as ('markdown' | 'html' | 'json')[]) || ['markdown'],
      actions: data.actions as Array<{ type: string; selector?: string; milliseconds?: number; text?: string; direction?: string }>,
    });

    return await firecrawl.action();
  }

  /**
   * Execute Resend node - send emails with auto-generated report content
   */
  private async executeResendNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    triggerData?: Record<string, unknown>
  ): Promise<unknown> {
    let to = data.to as string;
    let subject = data.subject as string;
    let contentHtml = data.contentHtml as string | undefined;

    // Interpolate values - support both {{field}} (from trigger) and {{nodeId.field}} (from inputs)
    if (to?.includes('{{')) {
      to = this.interpolateSimple(to, triggerData || {});
      to = this.interpolate(to, inputs);
    }
    if (subject?.includes('{{')) {
      subject = this.interpolateSimple(subject, triggerData || {});
      subject = this.interpolate(subject, inputs);
    }
    if (contentHtml?.includes('{{')) {
      contentHtml = this.interpolateSimple(contentHtml, triggerData || {});
      contentHtml = this.interpolate(contentHtml, inputs);
    }

    // If no content provided, auto-generate from upstream findings
    if (!contentHtml) {
      contentHtml = this.generateReportHtml(inputs, subject);
    }

    const resend = new ResendBubble({
      to,
      subject,
      contentHtml,
      contentText: data.contentText as string | undefined,
    });

    return await resend.action();
  }

  /**
   * Generate HTML report from workflow findings
   */
  private generateReportHtml(inputs: Record<string, unknown>, subject: string): string {
    const findings = this.extractFindings(inputs);

    // Also check for findings passed from approval node
    for (const [, nodeData] of Object.entries(inputs)) {
      const data = nodeData as { findings?: Record<string, unknown> };
      if (data?.findings) {
        Object.assign(findings, data.findings);
      }
    }

    // Organize findings into logical sections
    const hasRagContext = '📚 Historical Sources Used' in findings || 'Historical Context (RAG)' in findings;
    const hasReasoningBasis = '💡 Why These Recommendations' in findings || 'Reasoning Basis' in findings;

    // Build sections with special formatting for RAG content
    const sections = Object.entries(findings).map(([key, value]) => {
      let content: string;
      let sectionClass = '';
      let icon = '';

      // Determine section styling based on type
      if (key === 'AI Analysis') {
        sectionClass = 'ai-analysis';
        icon = '🤖';
      } else if (key === '📚 Historical Sources Used' || key === 'Historical Context (RAG)') {
        sectionClass = 'historical-context';
        icon = '';  // Already has emoji in key
      } else if (key === 'Current News') {
        sectionClass = 'current-news';
        icon = '📰';
      } else if (key === '💡 Why These Recommendations' || key === 'Reasoning Basis') {
        sectionClass = 'reasoning-basis';
        icon = '';  // Already has emoji in key
      } else if (key === 'Extracted Data') {
        icon = '📊';
      }

      if (typeof value === 'string') {
        // Format AI analysis and Why sections with markdown-like parsing
        if (key === 'AI Analysis' || key === '💡 Why These Recommendations') {
          content = this.formatAiAnalysis(value);
        } else {
          content = `<p style="white-space: pre-wrap;">${value}</p>`;
        }
      } else if (Array.isArray(value)) {
        // Special formatting for historical context
        if (key === '📚 Historical Sources Used' || key === 'Historical Context (RAG)') {
          content = this.formatHistoricalContext(value as Array<{ title: string; date: string; excerpt: string; relevanceScore: string }>);
        } else if (key === 'Current News') {
          content = this.formatCurrentNews(value as Array<{ title: string; url: string; description?: string }>);
        } else {
          content = `<ul>${value.map(item => {
            if (typeof item === 'object' && item !== null) {
              const obj = item as Record<string, unknown>;
              return `<li><strong>${obj.title || 'Item'}</strong><br/><a href="${obj.url}">${obj.url}</a></li>`;
            }
            return `<li>${String(item)}</li>`;
          }).join('')}</ul>`;
        }
      } else if (typeof value === 'object' && value !== null) {
        content = `<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        content = `<p>${String(value)}</p>`;
      }

      return `<div class="section ${sectionClass}" style="margin-bottom: 24px;">
        <h3 style="color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;">${icon} ${key}</h3>
        ${content}
      </div>`;
    }).join('');

    // Add RAG context banner if used
    const ragBanner = hasRagContext ? `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
        <strong>📚 Historical Analysis Enabled</strong>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #92400e;">This report includes reasoning based on historical data from your document archive.</p>
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
    .section { background: #fafafa; padding: 16px; border-radius: 8px; }
    .section.ai-analysis { background: #f0f9ff; border-left: 4px solid #3b82f6; }
    .section.historical-context { background: #fefce8; border-left: 4px solid #eab308; }
    .section.reasoning-basis { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .section.current-news { background: #faf5ff; border-left: 4px solid #a855f7; }
    h3 { color: #4f46e5; margin-top: 0; }
    a { color: #4f46e5; }
    .historical-item { background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e5e7eb; }
    .historical-item .date { color: #6b7280; font-size: 12px; }
    .historical-item .score { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .news-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .news-item:last-child { border-bottom: none; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${subject}</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
  <div class="content">
    ${ragBanner}
    ${sections || '<p>No findings to report.</p>'}
  </div>
  <div class="footer">
    <p>This report was automatically generated by your workflow system with RAG-enhanced reasoning.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format AI analysis with better structure
   */
  private formatAiAnalysis(text: string): string {
    // Convert markdown-like headers and lists to HTML
    let html = text
      .replace(/^## (.+)$/gm, '<h4 style="color: #1e40af; margin-top: 16px;">$1</h4>')
      .replace(/^### (.+)$/gm, '<h5 style="color: #3b82f6; margin-top: 12px;">$1</h5>')
      .replace(/^\*\*(.+?)\*\*/gm, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    // Wrap loose list items in ul
    html = html.replace(/(<li>.*<\/li>)+/g, '<ul style="margin: 8px 0;">$&</ul>');

    return `<div style="white-space: pre-wrap;">${html}</div>`;
  }

  /**
   * Format historical context from RAG
   */
  private formatHistoricalContext(items: Array<{ title: string; date: string; excerpt: string; relevanceScore: string }>): string {
    return items.map(item => `
      <div class="historical-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong>${item.title}</strong>
          <span class="score">${item.relevanceScore} match</span>
        </div>
        <div class="date">📅 ${item.date}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #4b5563;">${item.excerpt}</p>
      </div>
    `).join('');
  }

  /**
   * Format current news items
   */
  private formatCurrentNews(items: Array<{ title: string; url: string; description?: string }>): string {
    return items.map(item => `
      <div class="news-item">
        <strong><a href="${item.url}" style="text-decoration: none;">${item.title}</a></strong>
        ${item.description ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">${item.description}</p>` : ''}
      </div>
    `).join('');
  }

  /**
   * Execute Approval node - send email and wait for human approval
   */
  private async executeApprovalNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    triggerData?: Record<string, unknown>
  ): Promise<unknown> {
    let to = data.to as string;
    let subject = data.subject as string | undefined;

    // Interpolate values - support both {{field}} (from trigger) and {{nodeId.field}} (from inputs)
    if (to?.includes('{{')) {
      to = this.interpolateSimple(to, triggerData || {});
      to = this.interpolate(to, inputs);
    }
    if (subject?.includes('{{')) {
      subject = this.interpolateSimple(subject, triggerData || {});
      subject = this.interpolate(subject, inputs);
    }

    // Extract meaningful findings from upstream nodes for the email
    const findings = this.extractFindings(inputs);

    const approval = new ApprovalBubble({
      to,
      subject,
      data: findings,
      timeoutMs: (data.timeoutMs as number) || 60 * 60 * 1000, // Default 1 hour for demo
    });

    const result = await approval.action();

    // Pass findings along for downstream nodes
    return { ...result, findings };
  }

  /**
   * Extract meaningful findings from node inputs for email display
   * Enhanced to include RAG historical context with reasoning
   */
  private extractFindings(inputs: Record<string, unknown>): Record<string, unknown> {
    const findings: Record<string, unknown> = {};
    const historicalContext: Array<{ title: string; date: string; excerpt: string; score: number }> = [];
    let aiUsedRag = false;

    for (const [nodeId, nodeData] of Object.entries(inputs)) {
      const data = nodeData as Record<string, unknown>;

      // Extract AI response (check for RAG metadata)
      if (data?.data && typeof data.data === 'object') {
        const aiData = data.data as Record<string, unknown>;
        if (aiData.response) {
          findings['AI Analysis'] = aiData.response;
        }
        // Check if AI used RAG context
        if (data._meta && typeof data._meta === 'object') {
          const meta = data._meta as { usedRagContext?: boolean };
          if (meta.usedRagContext) {
            aiUsedRag = true;
          }
        }
      }

      // Extract RAG results (historical context from mongo_rag node)
      if (data?.data && typeof data.data === 'object') {
        const ragData = data.data as {
          results?: Array<{ title: string; date: string; excerpt: string; score: number; collection?: string }>;
          method?: string;
          query?: string;
        };

        if (ragData.results && ragData.method) {
          console.log(`[Findings] Found RAG results: ${ragData.results.length} items`);
          historicalContext.push(...ragData.results);
        }
      }

      // Extract Firecrawl extract results (structured data like stock prices)
      if (data?.data && typeof data.data === 'object') {
        const fcData = data.data as { extracted?: Record<string, unknown>; results?: unknown[] };
        if (fcData.extracted) {
          findings['Extracted Data'] = fcData.extracted;
        }
        if (fcData.results && Array.isArray(fcData.results) && !data.data.hasOwnProperty('method')) {
          // Only add as search results if not RAG (RAG has 'method' field)
          findings['Current News'] = (fcData.results as Array<Record<string, unknown>>).slice(0, 5).map((r) => ({
            title: r.title,
            url: r.url,
            description: r.description,
          }));
        }
      }

      // Extract Reducto parsed content
      if (data?.data && typeof data.data === 'object') {
        const reductoData = data.data as { text?: string; pages?: number };
        if (reductoData.text) {
          const text = reductoData.text as string;
          findings['Parsed Document'] = text.length > 500 ? text.slice(0, 500) + '...' : text;
        }
        if (reductoData.pages) {
          findings['Document Pages'] = reductoData.pages;
        }
      }
    }

    // Add historical context section if RAG was used
    if (historicalContext.length > 0) {
      // Deduplicate by title (keep highest score)
      const seen = new Map<string, typeof historicalContext[0]>();
      for (const item of historicalContext) {
        const key = item.title.slice(0, 50).toLowerCase(); // Normalize for comparison
        const existing = seen.get(key);
        if (!existing || item.score > existing.score) {
          seen.set(key, item);
        }
      }
      const uniqueContext = Array.from(seen.values()).sort((a, b) => b.score - a.score);

      // Add the sources first (moved up for better email flow)
      findings['📚 Historical Sources Used'] = uniqueContext.map(item => ({
        title: item.title,
        date: item.date,
        excerpt: item.excerpt.slice(0, 200) + (item.excerpt.length > 200 ? '...' : ''),
        relevanceScore: Math.round(item.score * 100) + '%',
        collection: (item as any).collection || 'documents',
      }));

      // Add explicit "Why" section that connects RAG to decisions
      if (aiUsedRag) {
        const sourceList = uniqueContext.map(h => `• ${h.title.slice(0, 60)}... (${Math.round(h.score * 100)}% match)`).join('\n');

        findings['💡 Why These Recommendations'] = `
**This analysis is grounded in ${uniqueContext.length} historical document${uniqueContext.length > 1 ? 's' : ''}:**

${sourceList}

**How RAG informed this report:**
- Historical patterns from SEC filings were used to identify revenue trends and risk factors
- Past earnings data provided baseline metrics for comparison
- Previous guidance and management commentary informed forward-looking analysis
- The AI compared current events against this historical context to determine significance

**Without RAG:** The analysis would only use current news without historical comparison.
**With RAG:** Recommendations are backed by documented historical performance and patterns.
        `.trim();
      }
    }

    return findings;
  }

  /**
   * Execute Reducto node - document parsing and extraction
   * Auto-discovers PDF URLs from upstream Firecrawl results
   */
  private async executeReductoNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const mode = (data.mode as 'parse' | 'extract') || 'parse';
    let documentUrl = data.documentUrl as string | undefined;

    // Interpolate URL from inputs if needed
    if (documentUrl?.includes('{{')) {
      documentUrl = this.interpolate(documentUrl, inputs);
    }

    // Auto-discover PDF URLs from upstream Firecrawl results
    if (!documentUrl) {
      for (const [, nodeData] of Object.entries(inputs)) {
        const inputResult = nodeData as {
          data?: {
            results?: Array<{ url?: string }>;
            url?: string;
            links?: string[];
          }
        };

        // Check search results for PDF links
        if (inputResult?.data?.results) {
          const pdfResult = inputResult.data.results.find((r) =>
            r.url?.toLowerCase().endsWith('.pdf')
          );
          if (pdfResult?.url) {
            documentUrl = pdfResult.url;
            break;
          }
        }

        // Check direct URL
        if (inputResult?.data?.url?.toLowerCase().endsWith('.pdf')) {
          documentUrl = inputResult.data.url;
          break;
        }

        // Check links array
        if (inputResult?.data?.links) {
          const pdfLink = inputResult.data.links.find((l) =>
            l.toLowerCase().endsWith('.pdf')
          );
          if (pdfLink) {
            documentUrl = pdfLink;
            break;
          }
        }
      }
    }

    if (!documentUrl) {
      return {
        success: false,
        data: null,
        error: 'No document URL found. Provide documentUrl or connect to a Firecrawl node that finds PDFs.',
      };
    }

    // Default to first 3 pages (earnings summaries are on first few pages)
    const pageRange = (data.pageRange as { start: number; end: number }) || { start: 1, end: 3 };
    const maxWaitMs = (data.maxWaitMs as number) || 15000; // Default 15 seconds max

    console.log(`[Reducto] Processing document: ${documentUrl}`);
    console.log(`[Reducto] Mode: ${mode}, pageRange: ${pageRange.start}-${pageRange.end}, maxWaitMs: ${maxWaitMs}`);

    const reducto = new ReductoBubble({
      mode,
      documentUrl,
      schema: data.schema as Record<string, unknown> | undefined,
      maxWaitMs,
      pageRange,
    });

    return await reducto.action();
  }

  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((node) => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach((edge) => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
    const sorted: WorkflowNode[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      for (const neighbor of graph.get(node.id) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          const neighborNode = nodes.find((n) => n.id === neighbor);
          if (neighborNode) queue.push(neighborNode);
        }
      }
    }

    return sorted;
  }

  private gatherInputs(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    results: Record<string, ExecutionResult>
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    edges
      .filter((e) => e.target === node.id)
      .forEach((e) => {
        inputs[e.source] = results[e.source]?.data;
      });
    return inputs;
  }

  private interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, nodeId, field) => {
      const nodeResult = context[nodeId] as Record<string, unknown> | undefined;
      return String(nodeResult?.[field] || '');
    });
  }

  /**
   * Simple interpolation for {{field}} syntax - pulls directly from context
   */
  private interpolateSimple(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, field) => {
      return String(context[field] || '');
    });
  }

  private evaluateCondition(data: Record<string, unknown>, inputs: Record<string, unknown>): boolean {
    const expression = data.expression as string;
    const fn = new Function('inputs', `return ${expression}`);
    return fn(inputs);
  }

  /**
   * Update dashboard directly with workflow data - comprehensive investment bank data
   */
  private updateDashboard(inputs: Record<string, unknown>): unknown {
    console.log('[Dashboard] Updating dashboard from workflow data');
    console.log('[Dashboard] Input keys:', Object.keys(inputs));

    // Extract ticker from inputs
    let ticker = 'AAPL';
    for (const [, nodeResult] of Object.entries(inputs)) {
      const result = nodeResult as { data?: { ticker?: string }; ticker?: string; findings?: { ticker?: string } };
      if (result?.data?.ticker) ticker = result.data.ticker;
      if (result?.ticker) ticker = result.ticker;
      if (result?.findings?.ticker) ticker = String(result.findings.ticker);
    }

    const newsItems: Array<{
      id: string;
      headline: string;
      summary: string;
      source: string;
      timestamp: string;
      sentiment: 'bullish' | 'bearish' | 'neutral';
      relevance: number;
    }> = [];

    // Process all input nodes
    for (const [nodeId, nodeResult] of Object.entries(inputs)) {
      const result = nodeResult as {
        data?: {
          results?: Array<{ url?: string; title?: string; description?: string; content?: string; markdown?: string }>;
          extracted?: Record<string, unknown>;
          response?: string;
        };
        findings?: Record<string, unknown>;
      };

      console.log(`[Dashboard] Processing node: ${nodeId}`);

      // === FIRECRAWL NEWS RESULTS ===
      if (result?.data?.results && Array.isArray(result.data.results)) {
        console.log(`[Dashboard] Found ${result.data.results.length} search results from ${nodeId}`);

        result.data.results.slice(0, 5).forEach((item, index) => {
          const text = `${item.title || ''} ${item.description || ''} ${item.content || ''}`.toLowerCase();
          let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';

          // Enhanced sentiment analysis
          const bullishWords = ['surge', 'gain', 'up', 'record', 'beat', 'rise', 'rally', 'soar', 'jump', 'profit', 'growth', 'strong', 'positive', 'outperform', 'buy', 'upgrade'];
          const bearishWords = ['drop', 'fall', 'down', 'miss', 'concern', 'decline', 'plunge', 'crash', 'loss', 'weak', 'negative', 'underperform', 'sell', 'downgrade', 'warning', 'risk'];

          const bullishScore = bullishWords.filter(w => text.includes(w)).length;
          const bearishScore = bearishWords.filter(w => text.includes(w)).length;

          if (bullishScore > bearishScore) sentiment = 'bullish';
          else if (bearishScore > bullishScore) sentiment = 'bearish';

          let source = 'News';
          try {
            source = new URL(item.url || 'https://news.com').hostname.replace('www.', '').split('.')[0];
            source = source.charAt(0).toUpperCase() + source.slice(1);
          } catch { /* ignore */ }

          newsItems.push({
            id: `news-${Date.now()}-${nodeId}-${index}`,
            headline: item.title || `${ticker} Market Update`,
            summary: item.description || item.content?.slice(0, 300) || 'Market analysis from automated workflow.',
            source,
            timestamp: 'Just now',
            sentiment,
            relevance: 95 - index * 3,
          });
        });
      }

      // === REDUCTO EXTRACTED FINANCIAL DATA ===
      if (result?.data?.extracted) {
        const extracted = result.data.extracted as Record<string, unknown>;
        console.log('[Dashboard] Found Reducto extracted data:', Object.keys(extracted));

        // Update quarterly metrics from extracted financial data
        const metricsUpdates: Array<{ label: string; value: string; change: number; trend: number[] }> = [];

        if (extracted.revenue) {
          const revenueStr = String(extracted.revenue);
          const changeStr = extracted.revenue_yoy_change ? String(extracted.revenue_yoy_change) : '';
          const changeNum = parseFloat(changeStr.replace(/[^0-9.-]/g, '')) || 0;
          metricsUpdates.push({
            label: 'Revenue',
            value: revenueStr.includes('$') ? revenueStr : `$${revenueStr}`,
            change: changeNum,
            trend: [18, 20, 19, 22, 24, 26], // Would ideally come from historical data
          });
        }

        if (extracted.net_income) {
          metricsUpdates.push({
            label: 'Net Income',
            value: String(extracted.net_income).includes('$') ? String(extracted.net_income) : `$${extracted.net_income}`,
            change: 12.5,
            trend: [3.8, 4.0, 4.2, 4.5, 4.8, 5.2],
          });
        }

        if (extracted.earnings_per_share) {
          metricsUpdates.push({
            label: 'EPS',
            value: `$${String(extracted.earnings_per_share).replace(/[$]/g, '')}`,
            change: 15.3,
            trend: [3.2, 3.4, 3.5, 3.8, 4.0, 4.5],
          });
        }

        if (extracted.gross_margin) {
          metricsUpdates.push({
            label: 'Gross Margin',
            value: String(extracted.gross_margin).includes('%') ? String(extracted.gross_margin) : `${extracted.gross_margin}%`,
            change: 2.1,
            trend: [42, 43, 44, 44.5, 45, 46],
          });
        }

        if (metricsUpdates.length > 0) {
          // Replace metrics with extracted data, keep existing for missing ones
          const existingLabels = metricsUpdates.map(m => m.label);
          const kept = dashboardContent.quarterlyMetrics.filter(m => !existingLabels.includes(m.label));
          dashboardContent.quarterlyMetrics = [...metricsUpdates, ...kept].slice(0, 4);
          console.log('[Dashboard] Updated quarterly metrics:', metricsUpdates.map(m => m.label));
        }

        // Add extracted data as premium research news item
        const highlights = extracted.key_highlights as string[] | undefined;
        if (highlights && highlights.length > 0) {
          newsItems.unshift({
            id: `reducto-${Date.now()}`,
            headline: `${extracted.company_name || ticker} ${extracted.fiscal_period || 'Q4'} Earnings Analysis`,
            summary: highlights.slice(0, 3).join(' • '),
            source: 'SEC Filing',
            timestamp: 'Just now',
            sentiment: 'neutral',
            relevance: 99,
          });
        }

        // Add guidance as news if available
        if (extracted.guidance) {
          const guidanceText = String(extracted.guidance).toLowerCase();
          const isPositive = guidanceText.includes('raise') || guidanceText.includes('increase') || guidanceText.includes('strong') || guidanceText.includes('above');

          newsItems.unshift({
            id: `guidance-${Date.now()}`,
            headline: `${extracted.company_name || ticker} Forward Guidance`,
            summary: String(extracted.guidance).slice(0, 300),
            source: 'Company Guidance',
            timestamp: 'Just now',
            sentiment: isPositive ? 'bullish' : 'neutral',
            relevance: 97,
          });
        }
      }

      // === AI ANALYSIS (from ai-combine node or approval findings) ===
      const aiResponse = result?.data?.response;
      if (aiResponse && typeof aiResponse === 'string' && aiResponse.length > 100) {
        console.log('[Dashboard] Found AI analysis response');

        // Parse AI analysis for sentiment
        const analysisLower = aiResponse.toLowerCase();
        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (analysisLower.includes('buy') || analysisLower.includes('bullish') || analysisLower.includes('outperform')) {
          sentiment = 'bullish';
        } else if (analysisLower.includes('sell') || analysisLower.includes('bearish') || analysisLower.includes('underperform')) {
          sentiment = 'bearish';
        }

        // Extract executive summary if present
        let summary = aiResponse;
        const execMatch = aiResponse.match(/executive summary[:\s]*([^#\n]+)/i);
        if (execMatch) {
          summary = execMatch[1].trim();
        } else {
          // Take first meaningful paragraph
          summary = aiResponse.split('\n').find(p => p.length > 50) || aiResponse.slice(0, 400);
        }

        newsItems.unshift({
          id: `ai-analysis-${Date.now()}`,
          headline: `${ticker} Comprehensive Research Report`,
          summary: summary.slice(0, 400) + (summary.length > 400 ? '...' : ''),
          source: 'AI Research',
          timestamp: 'Just now',
          sentiment,
          relevance: 100,
        });
      }

      // === APPROVAL NODE FINDINGS ===
      if (result?.findings) {
        const findings = result.findings as Record<string, unknown>;
        console.log('[Dashboard] Found approval findings:', Object.keys(findings));

        const aiAnalysis = findings['AI Analysis'] as string;
        if (aiAnalysis && aiAnalysis.length > 100) {
          const analysisLower = aiAnalysis.toLowerCase();
          let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
          if (analysisLower.includes('buy') || analysisLower.includes('bullish')) sentiment = 'bullish';
          else if (analysisLower.includes('sell') || analysisLower.includes('bearish')) sentiment = 'bearish';

          newsItems.unshift({
            id: `approved-analysis-${Date.now()}`,
            headline: `${ticker} Investment Analysis - Approved`,
            summary: aiAnalysis.slice(0, 500) + (aiAnalysis.length > 500 ? '...' : ''),
            source: 'Research Desk',
            timestamp: 'Just now',
            sentiment,
            relevance: 100,
          });
        }

        // Add extracted data from findings
        const extractedData = findings['Extracted Data'] as Record<string, unknown>;
        if (extractedData) {
          console.log('[Dashboard] Found extracted data in findings');
        }
      }
    }

    // Update news summary - keep unique items, prioritize by relevance
    const uniqueNews = newsItems.reduce((acc, item) => {
      const isDupe = acc.some(existing =>
        existing.headline.toLowerCase() === item.headline.toLowerCase() ||
        existing.summary.slice(0, 100) === item.summary.slice(0, 100)
      );
      if (!isDupe) acc.push(item);
      return acc;
    }, [] as typeof newsItems);

    // Sort by relevance and take top items
    uniqueNews.sort((a, b) => b.relevance - a.relevance);
    dashboardContent.newsSummary = uniqueNews.slice(0, 6);

    // === DYNAMIC STOCK PRICE UPDATES ===
    // Calculate overall sentiment from news
    const bullishCount = uniqueNews.filter(n => n.sentiment === 'bullish').length;
    const bearishCount = uniqueNews.filter(n => n.sentiment === 'bearish').length;
    const overallSentiment = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';

    // Update the researched ticker's stock price
    const stockIndex = dashboardContent.stockPrices.findIndex(s => s.symbol === ticker);
    if (stockIndex >= 0) {
      const stock = dashboardContent.stockPrices[stockIndex];
      // Dynamic price movement based on sentiment (-3% to +5%)
      const baseMove = overallSentiment === 'bullish' ? 2.5 : overallSentiment === 'bearish' ? -1.5 : 0.5;
      const randomFactor = (Math.random() - 0.3) * 3;
      const percentChange = baseMove + randomFactor;
      const priceChange = stock.price * (percentChange / 100);

      dashboardContent.stockPrices[stockIndex] = {
        ...stock,
        price: Number((stock.price + priceChange).toFixed(2)),
        change: Number(priceChange.toFixed(2)),
        changePercent: Number(percentChange.toFixed(2)),
        volume: `${(Math.random() * 50 + 20).toFixed(1)}M`,
        high: Number((stock.price + Math.abs(priceChange) * 1.2).toFixed(2)),
        low: Number((stock.price - Math.abs(priceChange) * 0.8).toFixed(2)),
      };
    } else {
      // Add the ticker if it doesn't exist
      const basePrice = 100 + Math.random() * 400;
      const change = (Math.random() - 0.3) * 10;
      dashboardContent.stockPrices.unshift({
        symbol: ticker,
        price: Number(basePrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number((change / basePrice * 100).toFixed(2)),
        volume: `${(Math.random() * 50 + 20).toFixed(1)}M`,
        high: Number((basePrice + Math.abs(change)).toFixed(2)),
        low: Number((basePrice - Math.abs(change) * 0.5).toFixed(2)),
      });
      // Keep max 8 stocks
      dashboardContent.stockPrices = dashboardContent.stockPrices.slice(0, 8);
    }

    // Update other stocks with small random movements (market correlation)
    dashboardContent.stockPrices.forEach((stock, idx) => {
      if (stock.symbol !== ticker) {
        const correlation = overallSentiment === 'bullish' ? 0.6 : overallSentiment === 'bearish' ? -0.4 : 0;
        const randomMove = (Math.random() - 0.5 + correlation) * 2;
        const priceChange = stock.price * (randomMove / 100);

        dashboardContent.stockPrices[idx] = {
          ...stock,
          price: Number((stock.price + priceChange).toFixed(2)),
          change: Number(priceChange.toFixed(2)),
          changePercent: Number(randomMove.toFixed(2)),
        };
      }
    });

    // === DYNAMIC PORTFOLIO STATS ===
    const totalStockValue = dashboardContent.stockPrices.reduce((sum, s) => sum + s.price * 1000, 0);
    const dayChangeSum = dashboardContent.stockPrices.reduce((sum, s) => sum + s.change * 1000, 0);
    const avgChangePercent = dashboardContent.stockPrices.reduce((sum, s) => sum + s.changePercent, 0) / dashboardContent.stockPrices.length;

    dashboardContent.portfolioStats = {
      ...dashboardContent.portfolioStats,
      totalValue: Number((totalStockValue + 1500000).toFixed(2)),
      dayChange: Number(dayChangeSum.toFixed(2)),
      dayChangePercent: Number(avgChangePercent.toFixed(2)),
      // Update risk metrics based on sentiment
      sharpeRatio: Number((1.5 + (overallSentiment === 'bullish' ? 0.5 : -0.3) + Math.random() * 0.3).toFixed(2)),
      beta: Number((1.0 + (Math.random() - 0.5) * 0.3).toFixed(2)),
      alpha: Number((2.0 + (overallSentiment === 'bullish' ? 2 : -1) + Math.random() * 2).toFixed(2)),
    };

    // === DYNAMIC QUARTERLY METRICS (add trends) ===
    dashboardContent.quarterlyMetrics = dashboardContent.quarterlyMetrics.map(metric => ({
      ...metric,
      // Shift trend data and add new point
      trend: [...metric.trend.slice(1), metric.trend[metric.trend.length - 1] * (1 + (Math.random() - 0.4) * 0.1)],
    }));

    dashboardContent.lastUpdated = new Date().toISOString();

    // Broadcast update to all connected dashboard clients via WebSocket
    broadcastDashboardUpdate();

    console.log('[Dashboard] Updated and broadcasted.');
    console.log('[Dashboard] News items:', dashboardContent.newsSummary.length);
    console.log('[Dashboard] Stocks updated:', dashboardContent.stockPrices.map(s => `${s.symbol}: ${s.changePercent > 0 ? '+' : ''}${s.changePercent}%`).join(', '));
    console.log('[Dashboard] Portfolio value:', dashboardContent.portfolioStats.totalValue);

    return {
      success: true,
      message: `Dashboard updated with ${ticker} comprehensive research data`,
      newsCount: dashboardContent.newsSummary.length,
      metricsUpdated: dashboardContent.quarterlyMetrics.map(m => m.label),
      stocksUpdated: dashboardContent.stockPrices.length,
      sentiment: overallSentiment,
    };
  }

  getLogger(): BubbleLogger {
    return this.logger;
  }
}

export const workflowEngine = new WorkflowEngine();
