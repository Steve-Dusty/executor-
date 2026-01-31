// Node types for the workflow
export type NodeType = 'trigger' | 'action' | 'ai' | 'condition' | 'lovable' | 'adaptation';

export type TriggerType = 'stripe' | 'webhook' | 'schedule';
export type ActionType = 'slack' | 'email' | 'notion' | 'custom';
export type LovableAction = 'update_price' | 'add_banner' | 'update_inventory' | 'change_layout';

// Base node data
export interface BaseNodeData {
  label: string;
}

// Trigger node
export interface TriggerNodeData extends BaseNodeData {
  triggerType: TriggerType;
  config?: Record<string, unknown>;
}

// Action node
export interface ActionNodeData extends BaseNodeData {
  actionType: ActionType;
  config?: Record<string, unknown>;
}

// AI node
export interface AINodeData extends BaseNodeData {
  model: string;
  prompt?: string;
  config?: Record<string, unknown>;
}

// Condition node
export interface ConditionNodeData extends BaseNodeData {
  expression: string;
}

// Lovable node
export interface LovableNodeData extends BaseNodeData {
  action: LovableAction;
  targetComponent: string;
  projectId?: string;
  config?: Record<string, unknown>;
}

// Adaptation node
export interface AdaptationNodeData extends BaseNodeData {
  autoAdapt: boolean;
}

// Union of all node data types
export type WorkflowNodeData =
  | TriggerNodeData
  | ActionNodeData
  | AINodeData
  | ConditionNodeData
  | LovableNodeData
  | AdaptationNodeData;

// Workflow node
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

// Workflow edge
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// Complete workflow
export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

// Business context for adaptation
export interface BusinessContext {
  recentRevenue: number;
  trend: 'up' | 'down' | 'stable';
  alerts: string[];
}

// Execution log entry
export interface ExecutionLog {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  duration?: number;
}

// WebSocket message types
export type WSMessageType = 'WORKFLOW_UPDATE' | 'EXECUTION_RESULT' | 'NODE_EXECUTING' | 'ADAPTATION_TRIGGERED';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Stripe payment event
export interface PaymentEvent {
  type: 'payment';
  amount: number;
  currency: string;
  customerId?: string;
  timestamp: string;
}

// Adaptation result
export interface AdaptationResult {
  shouldAdapt: boolean;
  newWorkflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  reasoning: string;
  changes: string[];
}
