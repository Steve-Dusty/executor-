import { Handle, Position, NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../stores/workflowStore';

interface AINodeData extends Record<string, unknown> {
  label: string;
  model: string;
  prompt?: string;
  config?: Record<string, unknown>;
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function AINode({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as AINodeData;
  const { executingNodeId } = useWorkflowStore();
  const isExecuting = executingNodeId === id;

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-node-ai/50 rounded-2xl' : ''}`}>
      {/* Debug indicator badge */}
      {nodeData.hasDebugData && (
        <div className={`
          absolute -top-1.5 -right-1.5 z-10
          w-5 h-5 rounded-full
          flex items-center justify-center
          ${nodeData.debugStatus === 'error'
            ? 'bg-error text-bg-primary'
            : nodeData.debugStatus === 'success'
            ? 'bg-success text-bg-primary'
            : 'bg-info text-bg-primary'}
          shadow-lg cursor-pointer
        `} title="Click node to view debug data">
          {nodeData.debugStatus === 'success' ? (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : nodeData.debugStatus === 'running' ? (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}

      {/* Animated gradient border when executing */}
      {isExecuting && (
        <div className="
          absolute -inset-[2px] rounded-2xl
          bg-gradient-to-r from-node-ai via-accent-pink to-node-ai
          bg-[length:200%_100%] animate-shimmer
        " />
      )}

      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-gradient-to-br from-node-ai/40 to-accent-pink/30
        ${selected || isExecuting ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
      `} />

      {/* Main node */}
      <div className="
        relative w-[220px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-elevated to-bg-tertiary
        border border-node-ai/40
        shadow-xl shadow-black/40
        transition-all duration-200
        hover:border-node-ai/60
      ">
        {/* Shimmer header */}
        <div className="h-1 bg-gradient-to-r from-node-ai via-accent-pink to-node-ai bg-[length:200%_100%] animate-shimmer" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10 rounded-xl
              bg-gradient-to-br from-node-ai/20 to-accent-pink/15
              border border-node-ai/40
              flex items-center justify-center
              text-node-ai
              transition-transform group-hover:scale-105
            ">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-node-ai/80 font-medium">{nodeData.model || 'Claude'}</div>
            </div>
          </div>

          {isExecuting && (
            <div className="mt-3 flex items-center gap-2 text-node-ai">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs font-medium">Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-ai
          hover:!bg-node-ai hover:!scale-150 !transition-all !duration-200
        "
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-ai
          hover:!bg-node-ai hover:!scale-150 !transition-all !duration-200
        "
      />
    </div>
  );
}
