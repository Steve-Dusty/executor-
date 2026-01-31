# Claude Code Prompt: Self-Adapting Workflow Builder

## Project Overview

Build a **self-adapting workflow automation platform** for the YCombinator Full Stack Hackathon. The system creates AI agent workflows that automatically evolve based on real-time business signals (e.g., Stripe payments).

**Core Concept:** When business conditions change (revenue up/down, demand shifts), the workflow graph visually mutates — adding, removing, or rewiring nodes autonomously.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Workflow Engine** | BubbleLab (`@bubblelab/bubble-core`, `@bubblelab/bubble-runtime`) |
| **Visual Graph** | React Flow |
| **Frontend** | React + TypeScript + Vite |
| **Backend** | Bun + Hono (or Express) |
| **AI Generation** | Pearl (BubbleLab's AI) or Claude API for workflow regeneration |
| **Trigger** | Stripe Webhooks |
| **Output** | Lovable Embed (for live site updates) |

---

## Project Structure

```
/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── WorkflowCanvas.tsx    # React Flow canvas
│   │   │   │   ├── NodeTypes/            # Custom node components
│   │   │   │   │   ├── TriggerNode.tsx
│   │   │   │   │   ├── ActionNode.tsx
│   │   │   │   │   ├── AINode.tsx
│   │   │   │   │   ├── ConditionNode.tsx
│   │   │   │   │   └── LovableNode.tsx
│   │   │   │   ├── Sidebar.tsx           # Node palette
│   │   │   │   └── ExecutionLog.tsx      # Live execution display
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkflow.ts        # Workflow state management
│   │   │   │   └── useWebSocket.ts       # Real-time updates
│   │   │   ├── lib/
│   │   │   │   ├── workflowToGraph.ts    # Convert BubbleLab flow → React Flow
│   │   │   │   └── graphToWorkflow.ts    # Convert React Flow → BubbleLab flow
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── api/                    # Backend server
│       ├── src/
│       │   ├── index.ts                  # Main server
│       │   ├── routes/
│       │   │   ├── webhook.ts            # Stripe webhook handler
│       │   │   ├── workflow.ts           # CRUD for workflows
│       │   │   └── execute.ts            # Execute workflow endpoint
│       │   ├── services/
│       │   │   ├── workflowEngine.ts     # BubbleLab runtime wrapper
│       │   │   ├── adaptationEngine.ts   # AI-powered workflow modification
│       │   │   └── lovableService.ts     # Lovable API integration
│       │   └── bubbles/                  # Custom BubbleLab nodes
│       │       ├── LovableBubble.ts
│       │       ├── SimulationBubble.ts
│       │       └── AdaptationBubble.ts
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types
│       ├── src/
│       │   ├── types.ts
│       │   └── schemas.ts
│       └── package.json
│
└── package.json                # Monorepo root (pnpm workspace)
```

---

## Phase 1: Basic Setup

### 1.1 Initialize Monorepo

```bash
mkdir adaptive-workflows && cd adaptive-workflows
pnpm init
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.2 Install Core Dependencies

**Root:**
```bash
pnpm add -D typescript turbo
```

**Frontend (apps/web):**
```bash
pnpm add react react-dom reactflow @xyflow/react zustand
pnpm add -D vite @vitejs/plugin-react typescript @types/react
```

**Backend (apps/api):**
```bash
pnpm add @bubblelab/bubble-core @bubblelab/bubble-runtime hono
pnpm add stripe @anthropic-ai/sdk
pnpm add -D bun-types typescript
```

---

## Phase 2: React Flow Canvas

### 2.1 WorkflowCanvas.tsx

```tsx
import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from './NodeTypes/TriggerNode';
import { ActionNode } from './NodeTypes/ActionNode';
import { AINode } from './NodeTypes/AINode';
import { ConditionNode } from './NodeTypes/ConditionNode';
import { LovableNode } from './NodeTypes/LovableNode';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AINode,
  condition: ConditionNode,
  lovable: LovableNode,
};

interface WorkflowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void;
}

export function WorkflowCanvas({ 
  initialNodes, 
  initialEdges,
  onWorkflowChange 
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Notify parent of changes
  React.useEffect(() => {
    onWorkflowChange?.(nodes, edges);
  }, [nodes, edges, onWorkflowChange]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### 2.2 Custom Node Example (TriggerNode.tsx)

```tsx
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface TriggerNodeData {
  label: string;
  triggerType: 'stripe' | 'webhook' | 'schedule';
  config?: Record<string, any>;
}

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <div className={`
      px-4 py-2 rounded-lg border-2 
      ${selected ? 'border-blue-500' : 'border-gray-300'}
      bg-gradient-to-r from-green-400 to-green-500
      text-white shadow-lg
    `}>
      <div className="font-bold text-sm">⚡ {data.label}</div>
      <div className="text-xs opacity-80">{data.triggerType}</div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-white border-2 border-green-600"
      />
    </div>
  );
}
```

### 2.3 Node Type Definitions

Create similar components for:

**ActionNode.tsx** - For Composio/BubbleLab actions (Slack, Email, etc.)
- Has both input (top) and output (bottom) handles
- Blue gradient background
- Shows action type icon

**AINode.tsx** - For AI decision/generation nodes
- Purple gradient background
- Shows model being used
- Has input/output handles

**ConditionNode.tsx** - For branching logic
- Yellow/orange gradient
- Diamond shape or special styling
- Multiple output handles (true/false paths)

**LovableNode.tsx** - For Lovable site updates
- Pink gradient
- Shows what component is being updated

---

## Phase 3: BubbleLab Integration

### 3.1 Custom Bubble: LovableBubble.ts

```typescript
// apps/api/src/bubbles/LovableBubble.ts

interface LovableInput {
  action: 'update_price' | 'add_banner' | 'update_inventory' | 'change_layout';
  targetComponent: string;
  newValue: any;
  projectId: string;
}

interface LovableOutput {
  success: boolean;
  updatedComponent: string;
  timestamp: string;
}

export class LovableBubble {
  private config: LovableInput;

  constructor(config: LovableInput) {
    this.config = config;
  }

  async action(): Promise<{ data: LovableOutput }> {
    const { action, targetComponent, newValue, projectId } = this.config;

    // Call Lovable API (you'll need to implement based on their API)
    // This is a placeholder - check Lovable's actual API docs
    const response = await fetch(`https://api.lovable.dev/projects/${projectId}/components`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        action,
        component: targetComponent,
        value: newValue
      })
    });

    const result = await response.json();

    return {
      data: {
        success: response.ok,
        updatedComponent: targetComponent,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### 3.2 Custom Bubble: AdaptationBubble.ts

```typescript
// apps/api/src/bubbles/AdaptationBubble.ts

import Anthropic from '@anthropic-ai/sdk';

interface AdaptationInput {
  currentWorkflow: object;
  triggerEvent: object;
  businessContext: {
    recentRevenue: number;
    trend: 'up' | 'down' | 'stable';
    alerts: string[];
  };
}

interface AdaptationOutput {
  shouldAdapt: boolean;
  newWorkflow?: object;
  reasoning: string;
  changes: string[];
}

export class AdaptationBubble {
  private config: AdaptationInput;
  private anthropic: Anthropic;

  constructor(config: AdaptationInput) {
    this.config = config;
    this.anthropic = new Anthropic();
  }

  async action(): Promise<{ data: AdaptationOutput }> {
    const { currentWorkflow, triggerEvent, businessContext } = this.config;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a workflow optimization AI. Analyze the current workflow and business context, then determine if the workflow should be modified.

CURRENT WORKFLOW:
${JSON.stringify(currentWorkflow, null, 2)}

TRIGGER EVENT:
${JSON.stringify(triggerEvent, null, 2)}

BUSINESS CONTEXT:
- Recent Revenue: $${businessContext.recentRevenue}
- Trend: ${businessContext.trend}
- Active Alerts: ${businessContext.alerts.join(', ') || 'None'}

INSTRUCTIONS:
1. Analyze if the current workflow is optimal for the current business state
2. If revenue is DOWN: Consider adding discount campaigns, reducing costs, alerting team
3. If revenue is UP: Consider scaling operations, premium upsells, restocking
4. Return a JSON response with:
   - shouldAdapt: boolean
   - newWorkflow: the modified workflow (if shouldAdapt is true)
   - reasoning: why you made this decision
   - changes: array of specific changes made

Return ONLY valid JSON, no markdown.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(content.text);
    
    return { data: result };
  }
}
```

### 3.3 Workflow Engine Service

```typescript
// apps/api/src/services/workflowEngine.ts

import { BubbleFlow } from '@bubblelab/bubble-core';
import { Runtime } from '@bubblelab/bubble-runtime';
import { LovableBubble } from '../bubbles/LovableBubble';
import { AdaptationBubble } from '../bubbles/AdaptationBubble';

// Store workflows in memory (use DB in production)
const workflows = new Map<string, object>();

export class WorkflowEngine {
  private runtime: Runtime;

  constructor() {
    this.runtime = new Runtime();
  }

  // Convert React Flow graph to executable workflow
  async executeFromGraph(
    nodes: any[], 
    edges: any[], 
    triggerData: any
  ): Promise<any> {
    const results: Record<string, any> = {};
    
    // Topological sort nodes based on edges
    const sortedNodes = this.topologicalSort(nodes, edges);
    
    for (const node of sortedNodes) {
      const inputs = this.gatherInputs(node, edges, results);
      
      switch (node.type) {
        case 'trigger':
          results[node.id] = triggerData;
          break;
          
        case 'ai':
          results[node.id] = await this.executeAINode(node.data, inputs);
          break;
          
        case 'action':
          results[node.id] = await this.executeActionNode(node.data, inputs);
          break;
          
        case 'lovable':
          const lovable = new LovableBubble({
            ...node.data.config,
            // Inject dynamic values from inputs
            newValue: this.interpolate(node.data.config.newValue, inputs)
          });
          results[node.id] = await lovable.action();
          break;
          
        case 'condition':
          results[node.id] = this.evaluateCondition(node.data, inputs);
          break;
          
        case 'adaptation':
          const adaptation = new AdaptationBubble({
            currentWorkflow: { nodes, edges },
            triggerEvent: triggerData,
            businessContext: inputs.businessContext || {}
          });
          results[node.id] = await adaptation.action();
          break;
      }
      
      console.log(`✓ Executed ${node.id} (${node.type}):`, results[node.id]);
    }
    
    return results;
  }

  private topologicalSort(nodes: any[], edges: any[]): any[] {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    edges.forEach(edge => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // Kahn's algorithm
    const queue = nodes.filter(n => inDegree.get(n.id) === 0);
    const sorted: any[] = [];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      
      for (const neighbor of graph.get(node.id) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(nodes.find(n => n.id === neighbor)!);
        }
      }
    }
    
    return sorted;
  }

  private gatherInputs(node: any, edges: any[], results: Record<string, any>): any {
    const inputs: any = {};
    edges
      .filter(e => e.target === node.id)
      .forEach(e => {
        inputs[e.source] = results[e.source];
      });
    return inputs;
  }

  private interpolate(template: string, context: any): string {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, nodeId, field) => {
      return context[nodeId]?.data?.[field] || context[nodeId]?.[field] || '';
    });
  }

  private async executeAINode(data: any, inputs: any): Promise<any> {
    // Use BubbleLab's AIAgentBubble or call Claude directly
    // Implementation depends on what you need
    return { response: 'AI response placeholder' };
  }

  private async executeActionNode(data: any, inputs: any): Promise<any> {
    // Route to appropriate BubbleLab bubble based on action type
    // e.g., SlackBubble, EmailBubble, etc.
    return { success: true };
  }

  private evaluateCondition(data: any, inputs: any): boolean {
    // Simple condition evaluation
    // In production, use a proper expression parser
    try {
      const fn = new Function('inputs', `return ${data.expression}`);
      return fn(inputs);
    } catch {
      return false;
    }
  }
}

export const workflowEngine = new WorkflowEngine();
```

---

## Phase 4: Backend API

### 4.1 Main Server (index.ts)

```typescript
// apps/api/src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRouter } from './routes/webhook';
import { workflowRouter } from './routes/workflow';
import { executeRouter } from './routes/execute';

const app = new Hono();

// Middleware
app.use('*', cors());

// Routes
app.route('/webhook', webhookRouter);
app.route('/workflow', workflowRouter);
app.route('/execute', executeRouter);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
```

### 4.2 Stripe Webhook Handler

```typescript
// apps/api/src/routes/webhook.ts

import { Hono } from 'hono';
import Stripe from 'stripe';
import { workflowEngine } from '../services/workflowEngine';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookRouter = new Hono();

// In-memory store for demo (use Redis/DB in production)
let currentWorkflow = {
  nodes: [
    { id: '1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Stripe Payment', triggerType: 'stripe' } },
    { id: '2', type: 'action', position: { x: 250, y: 100 }, data: { label: 'Log to Notion', actionType: 'notion' } },
    { id: '3', type: 'condition', position: { x: 250, y: 200 }, data: { label: 'Amount > $500?', expression: 'inputs["1"].amount > 500' } },
    { id: '4', type: 'action', position: { x: 100, y: 300 }, data: { label: 'Slack Alert', actionType: 'slack' } },
    { id: '5', type: 'lovable', position: { x: 400, y: 300 }, data: { label: 'Update Pricing', config: { action: 'update_price' } } },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4', label: 'true' },
    { id: 'e3-5', source: '3', target: '5', label: 'false' },
  ]
};

// WebSocket connections for real-time updates
const wsConnections = new Set<WebSocket>();

webhookRouter.post('/stripe', async (c) => {
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // Handle payment events
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    const triggerData = {
      type: 'payment',
      amount: paymentIntent.amount / 100, // Convert cents to dollars
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      timestamp: new Date().toISOString()
    };

    // Execute current workflow
    const result = await workflowEngine.executeFromGraph(
      currentWorkflow.nodes,
      currentWorkflow.edges,
      triggerData
    );

    // Check if adaptation was triggered
    const adaptationResult = Object.values(result).find(
      (r: any) => r?.data?.shouldAdapt
    );

    if (adaptationResult?.data?.newWorkflow) {
      // Update workflow
      currentWorkflow = adaptationResult.data.newWorkflow;
      
      // Broadcast to all connected clients
      broadcastWorkflowUpdate(currentWorkflow);
    }

    // Broadcast execution result
    broadcastExecutionResult(result);

    return c.json({ received: true, result });
  }

  return c.json({ received: true });
});

// Get current workflow
webhookRouter.get('/current-workflow', (c) => {
  return c.json(currentWorkflow);
});

function broadcastWorkflowUpdate(workflow: any) {
  const message = JSON.stringify({ type: 'WORKFLOW_UPDATE', payload: workflow });
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function broadcastExecutionResult(result: any) {
  const message = JSON.stringify({ type: 'EXECUTION_RESULT', payload: result });
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export { webhookRouter, wsConnections };
```

---

## Phase 5: Real-Time Updates

### 5.1 WebSocket Hook (useWebSocket.ts)

```typescript
// apps/web/src/hooks/useWebSocket.ts

import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { setNodes, setEdges, addExecutionLog } = useWorkflowStore();

  useEffect(() => {
    ws.current = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws');

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'WORKFLOW_UPDATE':
          // Animate the transition
          setNodes(message.payload.nodes);
          setEdges(message.payload.edges);
          break;
          
        case 'EXECUTION_RESULT':
          addExecutionLog(message.payload);
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [setNodes, setEdges, addExecutionLog]);

  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return { send };
}
```

### 5.2 Zustand Store (workflowStore.ts)

```typescript
// apps/web/src/stores/workflowStore.ts

import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

interface ExecutionLog {
  timestamp: string;
  nodeId: string;
  result: any;
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  executionLogs: ExecutionLog[];
  isExecuting: boolean;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  clearLogs: () => void;
  setIsExecuting: (value: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  executionLogs: [],
  isExecuting: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addExecutionLog: (log) => set((state) => ({
    executionLogs: [...state.executionLogs, log]
  })),
  clearLogs: () => set({ executionLogs: [] }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
}));
```

---

## Phase 6: Demo Flow

### 6.1 Demo Scenario

For the hackathon demo, create this flow:

```
[Stripe Payment Trigger]
         │
         ▼
   [Log to Notion]
         │
         ▼
  [Check Revenue Trend]
         │
    ┌────┴────┐
    ▼         ▼
[Revenue UP] [Revenue DOWN]
    │              │
    ▼              ▼
[Scale Ops]  [Discount Mode]
    │              │
    ▼              ▼
[Update Lovable: Premium] [Update Lovable: Sale Banner]
         │
         ▼
  [Adaptation Check]
         │
         ▼
   [Notify Slack]
```

### 6.2 Simulated Stripe Payments

```typescript
// apps/web/src/components/DemoControls.tsx

export function DemoControls() {
  const simulatePayment = async (amount: number) => {
    await fetch('/api/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
  };

  return (
    <div className="fixed bottom-4 right-4 flex gap-2">
      <button 
        onClick={() => simulatePayment(50)}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        💸 Small Payment ($50)
      </button>
      <button 
        onClick={() => simulatePayment(500)}
        className="px-4 py-2 bg-yellow-500 text-white rounded"
      >
        💰 Medium Payment ($500)
      </button>
      <button 
        onClick={() => simulatePayment(5000)}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        🤑 Large Payment ($5000)
      </button>
      <button 
        onClick={() => simulateRevenueDrop()}
        className="px-4 py-2 bg-purple-500 text-white rounded"
      >
        📉 Simulate Revenue Drop
      </button>
    </div>
  );
}
```

---

## Environment Variables

```env
# apps/api/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
LOVABLE_API_KEY=...
GOOGLE_API_KEY=...  # For BubbleLab Pearl

# apps/web/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

---

## Key Demo Moments

1. **Initial State:** Show the workflow graph with basic nodes
2. **Payment Trigger:** Simulate a Stripe payment → watch nodes execute in sequence (highlight active node)
3. **Adaptation Trigger:** Simulate revenue drop → watch the graph VISUALLY MUTATE
   - New nodes appear with animation
   - Edges rewire
   - Colors change to indicate "crisis mode"
4. **Live Output:** Show Lovable embed updating prices in real-time
5. **Observability:** Show execution logs, token usage, timing

---

## Stretch Goals (if time permits)

1. **Multiple trigger types:** Add webhook, schedule triggers
2. **Drag-and-drop node creation:** From sidebar palette
3. **Save/load workflows:** Persist to database
4. **Workflow templates:** Pre-built adaptive workflows
5. **A/B testing node:** Automatically test different strategies

---

## Commands to Run

```bash
# Install dependencies
pnpm install

# Start development (both frontend and backend)
pnpm dev

# Or run separately:
cd apps/api && bun run dev
cd apps/web && pnpm dev

# Test Stripe webhook locally
stripe listen --forward-to localhost:3001/webhook/stripe
```

---

## Success Criteria

- [ ] React Flow canvas renders workflow
- [ ] Stripe webhook triggers workflow execution
- [ ] Nodes visually highlight during execution
- [ ] AI adaptation modifies workflow graph
- [ ] Graph visually updates in real-time (WebSocket)
- [ ] Lovable embed reflects workflow outputs
- [ ] Execution logs show full observability
- [ ] Demo runs without crashing for 5 minutes