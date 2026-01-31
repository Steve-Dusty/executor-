import { useCallback, useEffect } from 'react';
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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from './NodeTypes/TriggerNode';
import { ActionNode } from './NodeTypes/ActionNode';
import { AINode } from './NodeTypes/AINode';
import { ConditionNode } from './NodeTypes/ConditionNode';
import { LovableNode } from './NodeTypes/LovableNode';
import { FirecrawlNode } from './NodeTypes/FirecrawlNode';
import { ReductoNode } from './NodeTypes/ReductoNode';
import { ResendNode } from './NodeTypes/ResendNode';
import { ApprovalNode } from './NodeTypes/ApprovalNode';
import { useWorkflowStore } from '../stores/workflowStore';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AINode,
  condition: ConditionNode,
  lovable: LovableNode,
  firecrawl: FirecrawlNode,
  reducto: ReductoNode,
  resend: ResendNode,
  approval: ApprovalNode,
};

interface WorkflowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void;
}

export function WorkflowCanvas({
  initialNodes,
  initialEdges,
  onWorkflowChange,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { executingNodeId, setSelectedDebugNodeId, nodeDebugData } = useWorkflowStore();

  // Sync with store when initial values change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node click for debugging
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Only open debug panel if there's debug data for this node
      if (nodeDebugData[node.id]) {
        setSelectedDebugNodeId(node.id);
      }
    },
    [nodeDebugData, setSelectedDebugNodeId]
  );

  // Notify parent of changes
  useEffect(() => {
    onWorkflowChange?.(nodes, edges);
  }, [nodes, edges, onWorkflowChange]);

  // Add executing class and debug indicator to nodes
  const nodesWithExecutionState = nodes.map((node) => {
    const hasDebugData = !!nodeDebugData[node.id];
    const debugStatus = nodeDebugData[node.id]?.status;
    return {
      ...node,
      className: [
        node.id === executingNodeId ? 'node-executing' : '',
        hasDebugData ? 'has-debug-data' : '',
        debugStatus === 'error' ? 'has-error' : '',
      ].filter(Boolean).join(' '),
      data: {
        ...node.data,
        hasDebugData,
        debugStatus,
      },
    };
  });

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodesWithExecutionState}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: 'rgba(139, 92, 246, 0.5)',
            strokeWidth: 2,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255, 255, 255, 0.03)"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#22c55e';
              case 'action':
                return '#3b82f6';
              case 'ai':
                return '#8b5cf6';
              case 'condition':
                return '#f59e0b';
              case 'lovable':
                return '#ec4899';
              case 'firecrawl':
                return '#f97316';
              case 'reducto':
                return '#06b6d4';
              case 'resend':
                return '#8b5cf6';
              case 'approval':
                return '#f59e0b';
              default:
                return '#6b7280';
            }
          }}
          nodeStrokeWidth={3}
          maskColor="rgba(10, 10, 15, 0.9)"
          style={{
            backgroundColor: 'rgba(18, 18, 26, 0.9)',
          }}
        />
      </ReactFlow>
    </div>
  );
}
