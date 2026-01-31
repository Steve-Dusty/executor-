import { Handle, Position, NodeProps } from '@xyflow/react';

interface TriggerNodeData extends Record<string, unknown> {
  label: string;
  triggerType: 'stripe' | 'webhook' | 'schedule';
  config?: Record<string, unknown>;
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData;

  const getIcon = () => {
    switch (nodeData.triggerType) {
      case 'stripe':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'webhook':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.34-3 3.01-3H18M6 7.01h5.99c1.66 0 3.01 1.34 3.01 3s-1.34 3-3.01 3H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'schedule':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-node-trigger/50 rounded-2xl' : ''}`}>
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

      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-node-trigger/30
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
      `} />

      {/* Main node */}
      <div className="
        relative w-[200px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-elevated to-bg-tertiary
        border border-node-trigger/30
        shadow-xl shadow-black/40
        transition-all duration-200
        hover:border-node-trigger/50
      ">
        {/* Header accent line */}
        <div className="h-1 bg-gradient-to-r from-node-trigger via-node-trigger/70 to-node-trigger/40" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10 rounded-xl
              bg-node-trigger/10 border border-node-trigger/30
              flex items-center justify-center
              text-node-trigger
              transition-transform group-hover:scale-105
            ">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-text-tertiary capitalize">{nodeData.triggerType}</div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-node-trigger" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-node-trigger animate-ping opacity-75" />
            </div>
            <span className="text-xs text-text-secondary font-medium">Listening</span>
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-trigger
          hover:!bg-node-trigger hover:!scale-150 !transition-all !duration-200
        "
      />
    </div>
  );
}
