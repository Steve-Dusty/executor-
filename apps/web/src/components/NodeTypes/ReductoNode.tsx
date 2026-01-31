import { Handle, Position, NodeProps } from '@xyflow/react';

interface ReductoNodeData extends Record<string, unknown> {
  label: string;
  mode: 'parse' | 'extract';
  documentUrl?: string;
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function ReductoNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ReductoNodeData;

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-cyan-500/50 rounded-2xl' : ''}`}>
      {/* Glow effect */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-gradient-to-b from-cyan-500/20 to-transparent
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `} />

      {/* Debug indicator */}
      {nodeData.hasDebugData && (
        <div className={`
          absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full
          flex items-center justify-center shadow-lg animate-pulse
          ${nodeData.debugStatus === 'error' ? 'bg-red-500' : nodeData.debugStatus === 'success' ? 'bg-green-500' : 'bg-cyan-500'}
          text-white
        `}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Main node */}
      <div className="relative w-[200px] rounded-2xl overflow-hidden bg-gradient-to-b from-bg-tertiary to-bg-secondary border border-glass-border shadow-2xl shadow-black/50">
        <div className="h-1 bg-gradient-to-r from-cyan-500 to-cyan-500/50" />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-text-tertiary capitalize">{nodeData.mode || 'parse'}</div>
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-bg-tertiary !border-2 !border-cyan-500 hover:!bg-cyan-500 hover:!scale-125 transition-all" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-bg-tertiary !border-2 !border-cyan-500 hover:!bg-cyan-500 hover:!scale-125 transition-all" />
    </div>
  );
}
