import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

interface ExecutionLog {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  duration?: number;
}

interface NodeDebugData {
  nodeId: string;
  nodeType: string;
  inputs: Record<string, unknown>;
  output: unknown;
  error?: string;
  duration?: number;
  timestamp: string;
  status: 'running' | 'success' | 'error';
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  executionLogs: ExecutionLog[];
  isExecuting: boolean;
  executingNodeId: string | null;

  // Debug state
  nodeDebugData: Record<string, NodeDebugData>;
  selectedDebugNodeId: string | null;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addExecutionLog: (log: Omit<ExecutionLog, 'id'>) => void;
  updateExecutionLog: (nodeId: string, updates: Partial<ExecutionLog>) => void;
  clearLogs: () => void;
  setIsExecuting: (value: boolean) => void;
  setExecutingNodeId: (nodeId: string | null) => void;

  // Debug actions
  setNodeDebugData: (nodeId: string, data: NodeDebugData) => void;
  updateNodeDebugData: (nodeId: string, updates: Partial<NodeDebugData>) => void;
  setSelectedDebugNodeId: (nodeId: string | null) => void;
  clearDebugData: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  executionLogs: [],
  isExecuting: false,
  executingNodeId: null,

  // Debug state
  nodeDebugData: {},
  selectedDebugNodeId: null,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addExecutionLog: (log) =>
    set((state) => ({
      executionLogs: [
        ...state.executionLogs,
        { ...log, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
      ],
    })),

  updateExecutionLog: (nodeId, updates) =>
    set((state) => ({
      executionLogs: state.executionLogs.map((log) =>
        log.nodeId === nodeId ? { ...log, ...updates } : log
      ),
    })),

  clearLogs: () => set({ executionLogs: [] }),

  setIsExecuting: (isExecuting) => set({ isExecuting }),

  setExecutingNodeId: (executingNodeId) => set({ executingNodeId }),

  // Debug actions
  setNodeDebugData: (nodeId, data) =>
    set((state) => ({
      nodeDebugData: { ...state.nodeDebugData, [nodeId]: data },
    })),

  updateNodeDebugData: (nodeId, updates) =>
    set((state) => {
      const existingData = state.nodeDebugData[nodeId];
      if (!existingData) return state;
      return {
        nodeDebugData: {
          ...state.nodeDebugData,
          [nodeId]: { ...existingData, ...updates },
        },
      };
    }),

  setSelectedDebugNodeId: (selectedDebugNodeId) => set({ selectedDebugNodeId }),

  clearDebugData: () => set({ nodeDebugData: {}, selectedDebugNodeId: null }),
}));
