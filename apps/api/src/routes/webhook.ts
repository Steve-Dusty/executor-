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
let currentWorkflow = {
  nodes: [
    {
      id: '1',
      type: 'trigger',
      position: { x: 250, y: 0 },
      data: { label: 'Schedule Trigger', triggerType: 'schedule', schedule: 'daily' },
    },
    {
      id: '2',
      type: 'firecrawl',
      position: { x: 250, y: 120 },
      data: { label: 'Research Data', mode: 'search', query: 'stock market news today' },
    },
    {
      id: '3',
      type: 'ai',
      position: { x: 250, y: 240 },
      data: { label: 'Analyze & Summarize', prompt: 'Analyze the scraped data and create a summary of key market trends.' },
    },
    {
      id: '4',
      type: 'approval',
      position: { x: 250, y: 360 },
      data: { label: 'Human Approval', to: 'kuantingk2@gmail.com' },
    },
    {
      id: '5',
      type: 'action',
      position: { x: 250, y: 480 },
      data: { label: 'Update Dashboard', actionType: 'custom' },
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
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
  const amount = body.amount || 100;

  // Update business state
  updateBusinessState(amount);

  const triggerData = {
    type: 'payment',
    amount,
    currency: 'usd',
    customerId: `cus_simulated_${Date.now()}`,
    timestamp: new Date().toISOString(),
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
