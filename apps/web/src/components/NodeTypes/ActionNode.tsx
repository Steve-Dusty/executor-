import { Handle, Position, NodeProps } from '@xyflow/react';

interface ActionNodeData extends Record<string, unknown> {
  label: string;
  actionType: 'slack' | 'email' | 'notion' | 'custom';
  config?: Record<string, unknown>;
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function ActionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;

  const getIcon = () => {
    switch (nodeData.actionType) {
      case 'slack':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        );
      case 'email':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'notion':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.02c-.42-.326-.98-.7-2.055-.607L3.01 2.72c-.466.046-.56.28-.374.466l1.823 1.022zm.793 3.172v13.851c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.746.326-.746.886zm14.337.42c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.747 0-.933-.234-1.493-.933l-4.571-7.186v6.952l1.446.327s0 .84-1.166.84l-3.219.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.233 4.758 7.279v-6.44l-1.213-.14c-.093-.514.28-.886.746-.933l3.23-.187z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-node-action/50 rounded-2xl' : ''}`}>
      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-node-action/30
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
      `} />

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

      {/* Main node */}
      <div className="
        relative w-[200px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-elevated to-bg-tertiary
        border border-node-action/30
        shadow-xl shadow-black/40
        transition-all duration-200
        hover:border-node-action/50
      ">
        {/* Header accent line */}
        <div className="h-1 bg-gradient-to-r from-node-action via-node-action/70 to-node-action/40" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10 rounded-xl
              bg-node-action/10 border border-node-action/30
              flex items-center justify-center
              text-node-action
              transition-transform group-hover:scale-105
            ">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-text-tertiary capitalize">{nodeData.actionType}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-action
          hover:!bg-node-action hover:!scale-150 !transition-all !duration-200
        "
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-action
          hover:!bg-node-action hover:!scale-150 !transition-all !duration-200
        "
      />
    </div>
  );
}
