import { Hono } from 'hono';
import Stripe from 'stripe';
import { workflowEngine } from '../services/workflowEngine';
import { AIAgentBubble } from '@bubblelab/bubble-core';
import { CredentialType } from '@bubblelab/shared-schemas';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const webhookRouter = new Hono();

// Store for workflows and business state
// Multi-branch workflow with fan-out and fan-in
let currentWorkflow = {
  nodes: [
    // TRIGGER - passes ticker & company to all nodes
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 0 },
      data: {
        label: 'Stock Research',
        triggerType: 'manual',
        // Default values - can be overridden at runtime
        ticker: 'NVDA',
        company: 'NVIDIA',
      },
    },

    // FAN-OUT: Three parallel research branches (dynamic queries)
    {
      id: 'fc-news',
      type: 'firecrawl',
      position: { x: 100, y: 150 },
      data: { label: 'Search News', mode: 'search', query: '{{company}} stock news today', limit: 3 },
    },
    {
      id: 'fc-prices',
      type: 'firecrawl',
      position: { x: 400, y: 150 },
      data: { label: 'Get Stock Data', mode: 'extract', url: 'https://www.cnbc.com/quotes/{{ticker}}', prompt: 'Extract stock price, percent change, volume, and market cap for {{company}}' },
    },
    {
      id: 'fc-docs',
      type: 'firecrawl',
      position: { x: 700, y: 150 },
      data: { label: 'Find Earnings Report', mode: 'search', query: '{{company}} quarterly earnings press release 2024 filetype:pdf', limit: 2 },
    },

    // Document parsing (connected to fc-docs)
    {
      id: 'reducto-1',
      type: 'reducto',
      position: { x: 700, y: 300 },
      data: { label: 'Parse Earnings Report', mode: 'parse' },
    },

    // FAN-IN: AI combines all data
    {
      id: 'ai-combine',
      type: 'ai',
      position: { x: 400, y: 450 },
      data: {
        label: 'Analyze & Combine',
        prompt: 'Combine and analyze all the financial data: news sentiment, current stock price, and SEC filing insights. Provide a comprehensive summary with key metrics and recommendations.'
      },
    },

    // Human approval gate
    {
      id: 'approval-1',
      type: 'approval',
      position: { x: 400, y: 600 },
      data: { label: 'Human Approval', to: 'kuantingk2@gmail.com' },
    },

    // FAN-OUT: Multiple output actions
    {
      id: 'action-dashboard',
      type: 'action',
      position: { x: 200, y: 750 },
      data: { label: 'Update Dashboard', actionType: 'custom' },
    },
    {
      id: 'action-notify',
      type: 'resend',
      position: { x: 600, y: 750 },
      data: { label: 'Send Report', to: 'kuantingk2@gmail.com', subject: 'Daily NVIDIA Report' },
    },
  ],
  edges: [
    // Trigger to fan-out
    { id: 'e-t-news', source: 'trigger-1', target: 'fc-news' },
    { id: 'e-t-prices', source: 'trigger-1', target: 'fc-prices' },
    { id: 'e-t-docs', source: 'trigger-1', target: 'fc-docs' },

    // Docs to Reducto
    { id: 'e-docs-reducto', source: 'fc-docs', target: 'reducto-1' },

    // Fan-in to AI
    { id: 'e-news-ai', source: 'fc-news', target: 'ai-combine' },
    { id: 'e-prices-ai', source: 'fc-prices', target: 'ai-combine' },
    { id: 'e-reducto-ai', source: 'reducto-1', target: 'ai-combine' },

    // AI to Approval
    { id: 'e-ai-approval', source: 'ai-combine', target: 'approval-1' },

    // Approval to fan-out outputs
    { id: 'e-approval-dashboard', source: 'approval-1', target: 'action-dashboard' },
    { id: 'e-approval-notify', source: 'approval-1', target: 'action-notify' },
  ],
};

// Business state tracking
let businessState = {
  totalRevenue: 10000,
  recentPayments: [] as { amount: number; timestamp: string }[],
  trend: 'stable' as 'up' | 'down' | 'stable',
};

// WebSocket connections for real-time updates
const wsConnections = new Set<{
  send: (data: string) => void;
  readyState: number;
}>();

export function addWSConnection(ws: { send: (data: string) => void; readyState: number }) {
  wsConnections.add(ws);
}

export function removeWSConnection(ws: { send: (data: string) => void; readyState: number }) {
  wsConnections.delete(ws);
}

function broadcast(message: { type: string; payload: unknown; timestamp: string }) {
  const data = JSON.stringify(message);
  wsConnections.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  });
}

function broadcastWorkflowUpdate(workflow: typeof currentWorkflow) {
  broadcast({
    type: 'WORKFLOW_UPDATE',
    payload: workflow,
    timestamp: new Date().toISOString(),
  });
}

function broadcastExecutionResult(result: Record<string, unknown>) {
  broadcast({
    type: 'EXECUTION_RESULT',
    payload: result,
    timestamp: new Date().toISOString(),
  });
}

function broadcastNodeExecuting(nodeId: string, nodeType: string, inputs: Record<string, unknown>) {
  broadcast({
    type: 'NODE_EXECUTING',
    payload: { nodeId, nodeType, inputs },
    timestamp: new Date().toISOString(),
  });
}

function broadcastNodeResult(nodeId: string, nodeType: string, result: unknown, inputs: Record<string, unknown>) {
  broadcast({
    type: 'NODE_RESULT',
    payload: { nodeId, nodeType, result, inputs },
    timestamp: new Date().toISOString(),
  });
}

function broadcastAdaptation(adaptation: {
  reasoning: string;
  changes: string[];
  newWorkflow?: typeof currentWorkflow;
}) {
  broadcast({
    type: 'ADAPTATION_TRIGGERED',
    payload: adaptation,
    timestamp: new Date().toISOString(),
  });
}

// Set up execution callback for real-time node updates (with inputs for debugging)
workflowEngine.setExecutionCallback(
  (nodeId, nodeType, inputs) => broadcastNodeExecuting(nodeId, nodeType, inputs),
  (nodeId, nodeType, result, inputs) => broadcastNodeResult(nodeId, nodeType, result, inputs)
);

// Update business state and calculate trend
function updateBusinessState(amount: number) {
  businessState.totalRevenue += amount;
  businessState.recentPayments.push({
    amount,
    timestamp: new Date().toISOString(),
  });

  // Keep last 10 payments
  if (businessState.recentPayments.length > 10) {
    businessState.recentPayments.shift();
  }

  // Calculate trend based on recent payments
  if (businessState.recentPayments.length >= 3) {
    const recent = businessState.recentPayments.slice(-3);
    const avgRecent = recent.reduce((sum, p) => sum + p.amount, 0) / recent.length;
    const older = businessState.recentPayments.slice(0, -3);
    const avgOlder = older.length > 0
      ? older.reduce((sum, p) => sum + p.amount, 0) / older.length
      : avgRecent;

    if (avgRecent > avgOlder * 1.2) {
      businessState.trend = 'up';
    } else if (avgRecent < avgOlder * 0.8) {
      businessState.trend = 'down';
    } else {
      businessState.trend = 'stable';
    }
  }
}

// Real Stripe webhook handler
webhookRouter.post('/stripe', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' }, 500);
  }

  const sig = c.req.header('stripe-signature');
  if (!sig) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  const body = await c.req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  console.log(`[Stripe] Received event: ${event.type}`);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const amount = paymentIntent.amount / 100;

    // Update business state
    updateBusinessState(amount);

    const triggerData = {
      type: 'payment',
      amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      paymentIntentId: paymentIntent.id,
      timestamp: new Date().toISOString(),
    };

    // Execute workflow with real AI
    const result = await workflowEngine.executeFromGraph(
      currentWorkflow.nodes,
      currentWorkflow.edges,
      triggerData,
      {
        recentRevenue: businessState.totalRevenue,
        trend: businessState.trend,
        alerts: [],
      }
    );

    broadcastExecutionResult(result);
    return c.json({ received: true, result });
  }

  return c.json({ received: true });
});

// Get current workflow
webhookRouter.get('/current-workflow', (c) => {
  return c.json(currentWorkflow);
});

// Update workflow
webhookRouter.post('/update-workflow', async (c) => {
  const body = await c.req.json();
  if (body.nodes && body.edges) {
    currentWorkflow = body;
    broadcastWorkflowUpdate(currentWorkflow);
    return c.json({ success: true });
  }
  return c.json({ error: 'Invalid workflow' }, 400);
});

// Simulate a payment - creates trigger data and runs REAL workflow execution
webhookRouter.post('/simulate-payment', async (c) => {
  const body = await c.req.json();
  console.log('[Webhook] /simulate-payment body:', JSON.stringify(body));

  const amount = body.amount || 100;

  // Dynamic stock input - defaults to NVIDIA
  const ticker = body.ticker || 'NVDA';
  const company = body.company || 'NVIDIA';

  console.log('[Webhook] Using ticker:', ticker, 'company:', company);

  // Update business state
  updateBusinessState(amount);

  const triggerData = {
    type: 'payment',
    amount,
    currency: 'usd',
    customerId: `cus_simulated_${Date.now()}`,
    timestamp: new Date().toISOString(),
    // Dynamic stock data
    ticker,
    company,
  };

  // Execute workflow with REAL AI processing
  const result = await workflowEngine.executeFromGraph(
    currentWorkflow.nodes,
    currentWorkflow.edges,
    triggerData,
    {
      recentRevenue: businessState.totalRevenue,
      trend: businessState.trend,
      alerts: [],
    }
  );

  broadcastExecutionResult(result);
  return c.json({
    success: true,
    result,
    businessState: {
      totalRevenue: businessState.totalRevenue,
      trend: businessState.trend,
    },
  });
});

// Simulate revenue drop - adjusts business state and triggers adaptation
webhookRouter.post('/simulate-revenue-drop', async (c) => {
  // Simulate a series of low payments
  businessState.recentPayments = [
    { amount: 10, timestamp: new Date().toISOString() },
    { amount: 15, timestamp: new Date().toISOString() },
    { amount: 5, timestamp: new Date().toISOString() },
  ];
  businessState.trend = 'down';
  businessState.totalRevenue = Math.max(0, businessState.totalRevenue - 3000);

  const triggerData = {
    type: 'revenue_alert',
    trend: 'down',
    totalRevenue: businessState.totalRevenue,
    timestamp: new Date().toISOString(),
  };

  // Execute workflow
  const result = await workflowEngine.executeFromGraph(
    currentWorkflow.nodes,
    currentWorkflow.edges,
    triggerData,
    {
      recentRevenue: businessState.totalRevenue,
      trend: 'down',
      alerts: ['Revenue dropped significantly', 'Consider promotional campaigns'],
    }
  );

  // Trigger AI-powered adaptation
  const adaptationResult = await triggerAIAdaptation('down');

  broadcastExecutionResult(result);
  return c.json({
    success: true,
    result,
    adaptation: adaptationResult,
    businessState: {
      totalRevenue: businessState.totalRevenue,
      trend: businessState.trend,
    },
  });
});

// Force trigger adaptation using real AI
webhookRouter.post('/trigger-adaptation', async (c) => {
  const adaptationResult = await triggerAIAdaptation(businessState.trend);
  return c.json({ success: true, adaptation: adaptationResult });
});

// AI-powered workflow adaptation
async function triggerAIAdaptation(trend: 'up' | 'down' | 'stable') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for adaptation');
  }

  const prompt = `You are a workflow optimization AI. Analyze the current workflow and business context, then determine if the workflow should be modified.

CURRENT WORKFLOW:
${JSON.stringify(currentWorkflow, null, 2)}

BUSINESS CONTEXT:
- Recent Revenue: $${businessState.totalRevenue}
- Trend: ${trend}
- Recent Payments: ${businessState.recentPayments.length} payments

INSTRUCTIONS:
1. If revenue is DOWN: Add nodes for discount campaigns, team alerts, cost reduction
2. If revenue is UP: Add nodes for premium upsells, scaling operations
3. If stable: Only optimize if there are clear inefficiencies

Return a JSON response with:
- shouldAdapt: boolean
- newWorkflow: the modified workflow with nodes and edges arrays (include proper positions)
- reasoning: why you made this decision
- changes: array of specific changes made

IMPORTANT: Return ONLY valid JSON, no markdown.`;

  const aiAgent = new AIAgentBubble({
    message: prompt,
    model: { model: 'openai/gpt-5' },
    credentials: {
      [CredentialType.OPENAI_CRED]: process.env.OPENAI_API_KEY!,
    },
  });

  const result = await aiAgent.action();

  // Parse AI response
  const responseText = typeof result.data === 'string'
    ? result.data
    : (result.data as { response?: string })?.response || JSON.stringify(result.data);

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }

  const adaptation = JSON.parse(jsonMatch[0]);

  if (adaptation.shouldAdapt && adaptation.newWorkflow) {
    currentWorkflow = adaptation.newWorkflow;
    broadcastAdaptation({
      reasoning: adaptation.reasoning,
      changes: adaptation.changes,
      newWorkflow: currentWorkflow,
    });
  }

  return adaptation;
}

export { currentWorkflow };
