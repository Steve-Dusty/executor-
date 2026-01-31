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

    // Topological sort nodes based on edges
    const sortedNodes = this.topologicalSort(nodes, edges);

    for (const node of sortedNodes) {
      const inputs = this.gatherInputs(node, edges, results);

      // Notify that this node is executing (with inputs for debugging)
      this.onNodeExecuting?.(node.id, node.type, inputs);

      const startTime = Date.now();

      try {
        let result: unknown;

        switch (node.type) {
          case 'trigger':
            result = { data: triggerData };
            break;

          case 'ai':
            result = await this.executeAINode(node.data, inputs, triggerData);
            break;

          case 'action':
            result = await this.executeActionNode(node.data, inputs);
            break;

          case 'lovable':
            result = await this.executeLovableNode(node.data, inputs);
            break;

          case 'condition':
            result = { result: this.evaluateCondition(node.data, inputs) };
            break;

          case 'adaptation':
            result = await this.executeAdaptationNode(
              nodes,
              edges,
              triggerData,
              businessContext
            );
            break;

          case 'firecrawl':
            result = await this.executeFirecrawlNode(node.data, inputs);
            break;

          case 'resend':
            result = await this.executeResendNode(node.data, inputs);
            break;

          case 'approval':
            result = await this.executeApprovalNode(node.data, inputs);
            break;

          case 'reducto':
            result = await this.executeReductoNode(node.data, inputs);
            break;

          default:
            throw new Error(`Unknown node type: ${node.type}`);
        }

        const duration = Date.now() - startTime;
        const execResult: ExecutionResult = {
          nodeId: node.id,
          status: 'success',
          data: result,
          duration,
        };
        results[node.id] = execResult;

        // Broadcast node completion (with inputs for debugging)
        this.onNodeComplete?.(node.id, node.type, execResult, inputs);

        console.log(`[Workflow] Executed ${node.id} (${node.type}) in ${duration}ms`);
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

        // Broadcast node completion with error (with inputs for debugging)
        this.onNodeComplete?.(node.id, node.type, execResult, inputs);

        console.error(`[Workflow] Error executing ${node.id}:`, error);
      }

      // Small delay between nodes for visual effect
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return results;
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
   * Execute Firecrawl node - web scraping and search
   */
  private async executeFirecrawlNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const mode = (data.mode as 'scrape' | 'crawl' | 'search') || 'scrape';
    let url = data.url as string | undefined;
    let query = data.query as string | undefined;

    // Interpolate URL/query from inputs if needed
    if (url && url.includes('{{')) {
      url = this.interpolate(url, inputs);
    }
    if (query && query.includes('{{')) {
      query = this.interpolate(query, inputs);
    }

    const firecrawl = new FirecrawlBubble({
      mode,
      url,
      query,
      limit: (data.limit as number) || 5,
      formats: (data.formats as ('markdown' | 'html')[]) || ['markdown'],
    });

    return await firecrawl.action();
  }

  /**
   * Execute Resend node - send emails
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

    const resend = new ResendBubble({
      to,
      subject,
      contentHtml,
      contentText: data.contentText as string | undefined,
    });

    return await resend.action();
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

    // Build approval data from inputs and any custom data
    const approvalData = {
      ...(data.approvalData as Record<string, unknown> || {}),
      inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
    };

    const approval = new ApprovalBubble({
      to,
      subject,
      data: approvalData,
      timeoutMs: (data.timeoutMs as number) || 60 * 60 * 1000, // Default 1 hour for demo
    });

    const result = await approval.action();

    // If not approved, we might want to stop the workflow
    if (!result.approved && !result.timedOut) {
      console.log(`[Workflow] Approval rejected for ${result.runId}`);
    }

    return result;
  }

  /**
   * Execute Reducto node - document parsing and extraction
   */
  private async executeReductoNode(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const mode = (data.mode as 'parse' | 'extract') || 'parse';
    let documentUrl = data.documentUrl as string | undefined;

    // Interpolate URL from inputs if needed
    if (documentUrl && documentUrl.includes('{{')) {
      documentUrl = this.interpolate(documentUrl, inputs);
    }

    // Check if there's a URL from previous Firecrawl node
    if (!documentUrl) {
      for (const [nodeId, nodeData] of Object.entries(inputs)) {
        const inputData = nodeData as { data?: { url?: string } };
        if (inputData?.data?.url) {
          documentUrl = inputData.data.url;
          break;
        }
      }
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
