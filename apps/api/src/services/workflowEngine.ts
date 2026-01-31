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
        return await this.executeResendNode(node.data, inputs);

      case 'approval':
        return await this.executeApprovalNode(node.data, inputs);

      case 'reducto':
        return await this.executeReductoNode(node.data, inputs);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute AI node using BubbleLab's AIAgentBubble with OpenAI
   */
  private async executeAINode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for AI nodes');
    }

    const prompt = (data.prompt as string) || 'Analyze the following data and provide insights.';
    const inputSummary = JSON.stringify({ inputs, triggerData }, null, 2);

    const aiAgent = new AIAgentBubble({
      message: `${prompt}\n\nInput Data:\n${inputSummary}`,
      model: {
        model: 'openai/gpt-5-mini',
      },
      credentials: {
        [CredentialType.OPENAI_CRED]: process.env.OPENAI_API_KEY!,
      },
    });

    const result = await aiAgent.action();
    return result;
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

    console.log('[Firecrawl] triggerData received:', JSON.stringify(triggerData));
    console.log('[Firecrawl] Before interpolation - url:', url, 'query:', query);

    // Interpolate values from trigger data (simple {{field}} syntax)
    if (url?.includes('{{')) url = this.interpolateSimple(url, triggerData || {});
    if (query?.includes('{{')) query = this.interpolateSimple(query, triggerData || {});
    if (prompt?.includes('{{')) prompt = this.interpolateSimple(prompt, triggerData || {});

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
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    let to = data.to as string;
    let subject = data.subject as string;
    let contentHtml = data.contentHtml as string | undefined;

    // Interpolate values from inputs
    if (to?.includes('{{')) to = this.interpolate(to, inputs);
    if (subject?.includes('{{')) subject = this.interpolate(subject, inputs);
    if (contentHtml?.includes('{{')) contentHtml = this.interpolate(contentHtml, inputs);

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

    const sections = Object.entries(findings).map(([key, value]) => {
      let content: string;
      if (typeof value === 'string') {
        content = `<p style="white-space: pre-wrap;">${value}</p>`;
      } else if (Array.isArray(value)) {
        content = `<ul>${value.map(item => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return `<li><strong>${obj.title || 'Item'}</strong><br/><a href="${obj.url}">${obj.url}</a></li>`;
          }
          return `<li>${String(item)}</li>`;
        }).join('')}</ul>`;
      } else if (typeof value === 'object' && value !== null) {
        content = `<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        content = `<p>${String(value)}</p>`;
      }
      return `<div style="margin-bottom: 20px;"><h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">${key}</h3>${content}</div>`;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
    h3 { color: #4f46e5; }
    a { color: #4f46e5; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${subject}</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
  <div class="content">
    ${sections || '<p>No findings to report.</p>'}
  </div>
  <div class="footer">
    <p>This report was automatically generated by your workflow system.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Execute Approval node - send email and wait for human approval
   */
  private async executeApprovalNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    let to = data.to as string;
    let subject = data.subject as string | undefined;

    // Interpolate values from inputs
    if (to?.includes('{{')) to = this.interpolate(to, inputs);
    if (subject?.includes('{{')) subject = this.interpolate(subject, inputs);

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
   */
  private extractFindings(inputs: Record<string, unknown>): Record<string, unknown> {
    const findings: Record<string, unknown> = {};

    for (const [nodeId, nodeData] of Object.entries(inputs)) {
      const data = nodeData as Record<string, unknown>;

      // Extract AI response
      if (data?.data && typeof data.data === 'object') {
        const aiData = data.data as Record<string, unknown>;
        if (aiData.response) {
          findings['AI Analysis'] = aiData.response;
        }
      }

      // Extract Firecrawl extract results (structured data like stock prices)
      if (data?.data && typeof data.data === 'object') {
        const fcData = data.data as { extracted?: Record<string, unknown>; results?: unknown[] };
        if (fcData.extracted) {
          findings['Extracted Data'] = fcData.extracted;
        }
        if (fcData.results && Array.isArray(fcData.results)) {
          findings[`Search Results (${nodeId})`] = fcData.results.map((r: Record<string, unknown>) => ({
            title: r.title,
            url: r.url,
          }));
        }
      }

      // Extract Reducto parsed content
      if (data?.data && typeof data.data === 'object') {
        const reductoData = data.data as { text?: string; pages?: number };
        if (reductoData.text) {
          // Truncate long text
          const text = reductoData.text as string;
          findings['Parsed Document'] = text.length > 500 ? text.slice(0, 500) + '...' : text;
        }
        if (reductoData.pages) {
          findings['Document Pages'] = reductoData.pages;
        }
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

    const reducto = new ReductoBubble({
      mode,
      documentUrl,
      documentBase64: data.documentBase64 as string | undefined,
      schema: data.schema as Record<string, unknown> | undefined,
      options: data.options as { chunkSize?: number; includeImages?: boolean; ocrEnabled?: boolean } | undefined,
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

  getLogger(): BubbleLogger {
    return this.logger;
  }
}

export const workflowEngine = new WorkflowEngine();
