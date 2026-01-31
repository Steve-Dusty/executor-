import { Handle, Position, NodeProps } from '@xyflow/react';

interface ConditionNodeData extends Record<string, unknown> {
  label: string;
  expression: string;
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData;

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-node-condition/50 rounded-2xl' : ''}`}>
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
        bg-node-condition/30
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
      `} />

      {/* Main node */}
      <div className="
        relative w-[180px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-elevated to-bg-tertiary
        border border-node-condition/40
        shadow-xl shadow-black/40
        transition-all duration-200
        hover:border-node-condition/60
      ">
        {/* Header accent line */}
        <div className="h-1 bg-gradient-to-r from-node-condition via-node-condition/70 to-node-condition/40" />

        {/* Content */}
        <div className="p-4 text-center">
          <div className="
            w-10 h-10 rounded-xl mx-auto mb-2
            bg-node-condition/15 border border-node-condition/30
            flex items-center justify-center
            text-node-condition
            transition-transform group-hover:scale-105
          ">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="font-semibold text-text-primary text-sm">{nodeData.label}</div>
          <div className="text-xs text-text-tertiary mt-1">Condition</div>
        </div>

        {/* Output labels */}
        <div className="flex justify-between px-4 pb-3 text-[10px] font-semibold">
          <span className="text-success">true</span>
          <span className="text-error">false</span>
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-node-condition
          hover:!bg-node-condition hover:!scale-150 !transition-all !duration-200
        "
      />

      {/* True output handle (left) */}
      <Handle
        type="source"
        position={Position.Left}
        id="true"
        className="
          !w-3 !h-3 !bg-success !border-0
          hover:!scale-150 !transition-all !duration-200
        "
        style={{ top: '75%' }}
      />

      {/* False output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="
          !w-3 !h-3 !bg-error !border-0
          hover:!scale-150 !transition-all !duration-200
        "
        style={{ top: '75%' }}
      />
    </div>
  );
}
