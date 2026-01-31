import { Handle, Position, NodeProps } from '@xyflow/react';

interface ApprovalNodeData extends Record<string, unknown> {
  label: string;
  to?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'waiting';
  hasDebugData?: boolean;
  debugStatus?: 'running' | 'success' | 'error';
}

export function ApprovalNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ApprovalNodeData;

  const getStatusColor = () => {
    switch (nodeData.status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'waiting': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-amber-500';
    }
  };

  const getStatusText = () => {
    switch (nodeData.status) {
      case 'approved': return '✓ Approved';
      case 'rejected': return '✗ Rejected';
      case 'waiting': return '⏳ Waiting...';
      default: return 'Human Approval';
    }
  };

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-amber-500/50 rounded-2xl' : ''}`}>
      {/* Glow effect */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-gradient-to-b from-amber-500/20 to-transparent
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `} />

      {/* Debug indicator */}
      {nodeData.hasDebugData && (
        <div className={`
          absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full
          flex items-center justify-center shadow-lg animate-pulse
          ${nodeData.debugStatus === 'error' ? 'bg-red-500' : nodeData.debugStatus === 'success' ? 'bg-green-500' : 'bg-amber-500'}
          text-white
        `}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Main node */}
      <div className="relative w-[200px] rounded-2xl overflow-hidden bg-gradient-to-b from-bg-tertiary to-bg-secondary border border-glass-border shadow-2xl shadow-black/50">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-500/50" />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-text-tertiary">{getStatusText()}</div>
            </div>
          </div>
          {nodeData.to && (
            <div className="mt-2 text-xs text-text-tertiary truncate">Email: {nodeData.to}</div>
          )}
          {nodeData.status === 'waiting' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Awaiting response...
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-bg-tertiary !border-2 !border-amber-500 hover:!bg-amber-500 hover:!scale-125 transition-all" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-bg-tertiary !border-2 !border-amber-500 hover:!bg-amber-500 hover:!scale-125 transition-all" />
    </div>
  );
}
