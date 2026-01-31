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
            stroke: 'rgba(0, 240, 255, 0.4)',
            strokeWidth: 2,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255, 255, 255, 0.04)"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#00ff94';
              case 'action':
                return '#4d7cff';
              case 'ai':
                return '#a855f7';
              case 'condition':
                return '#ffb800';
              case 'lovable':
                return '#ff2d92';
              case 'firecrawl':
                return '#ff6b35';
              case 'reducto':
                return '#00f0ff';
              case 'resend':
                return '#a855f7';
              case 'approval':
                return '#ffb800';
              default:
                return '#4a4a55';
            }
          }}
          nodeStrokeWidth={3}
          maskColor="rgba(3, 3, 8, 0.92)"
          style={{
            backgroundColor: 'rgba(12, 12, 20, 0.95)',
          }}
        />
      </ReactFlow>
    </div>
  );
}
