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
    <div className={`relative group ${selected ? 'ring-2 ring-accent-amber/50 rounded-2xl' : ''}`}>
      {/* Debug indicator badge */}
      {nodeData.hasDebugData && (
        <div className={`
          absolute -top-1 -right-1 z-10
          w-5 h-5 rounded-full
          flex items-center justify-center
          ${nodeData.debugStatus === 'error'
            ? 'bg-accent-red text-white'
            : nodeData.debugStatus === 'success'
            ? 'bg-accent-green text-white'
            : 'bg-accent-blue text-white'}
          shadow-lg cursor-pointer
        `} title="Click node to view debug data">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-accent-amber/20
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `} />

      {/* Main node */}
      <div className="
        relative w-[180px] rounded-2xl overflow-hidden
        bg-gradient-to-br from-accent-amber/20 to-accent-amber/5
        border border-accent-amber/30
        shadow-lg shadow-accent-amber/10
        transition-all duration-200
      ">
        {/* Content */}
        <div className="p-4 text-center">
          <div className="
            w-10 h-10 rounded-xl mx-auto mb-2
            bg-accent-amber/20 border border-accent-amber/30
            flex items-center justify-center
            text-accent-amber
          ">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="font-semibold text-text-primary text-sm">{nodeData.label}</div>
          <div className="text-xs text-text-tertiary mt-1">Condition</div>
        </div>

        {/* Output labels */}
        <div className="flex justify-between px-4 pb-3 text-[10px] font-medium">
          <span className="text-accent-green">true</span>
          <span className="text-accent-red">false</span>
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-accent-amber
          hover:!bg-accent-amber hover:!scale-125 transition-all
        "
      />

      {/* True output handle (left) */}
      <Handle
        type="source"
        position={Position.Left}
        id="true"
        className="
          !w-3 !h-3 !bg-accent-green !border-0
          hover:!scale-125 transition-all
        "
        style={{ top: '75%' }}
      />

      {/* False output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="
          !w-3 !h-3 !bg-accent-red !border-0
          hover:!scale-125 transition-all
        "
        style={{ top: '75%' }}
      />
    </div>
  );
}
