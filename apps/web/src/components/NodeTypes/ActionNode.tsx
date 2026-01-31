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
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
            <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
            <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
            <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
            <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
            <path d="M10 9.5c0 .83-.67 1.5-1.5 1.5h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5z"/>
            <path d="M8.5 5H10V3.5c0-.83-.67-1.5-1.5-1.5S7 2.67 7 3.5 7.67 5 8.5 5z"/>
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
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 2v4M16 2v4M2 10h20" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div className={`relative group ${selected ? 'ring-2 ring-accent-blue/50 rounded-2xl' : ''}`}>
      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-gradient-to-b from-accent-blue/20 to-transparent
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `} />

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
          animate-pulse
        `} title="Click node to view debug data">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Main node */}
      <div className="
        relative w-[200px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-tertiary to-bg-secondary
        border border-glass-border
        shadow-2xl shadow-black/50
        transition-all duration-200
      ">
        {/* Header accent line */}
        <div className="h-1 bg-gradient-to-r from-accent-blue to-accent-blue/50" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10 rounded-xl
              bg-accent-blue/10 border border-accent-blue/20
              flex items-center justify-center
              text-accent-blue
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
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-accent-blue
          hover:!bg-accent-blue hover:!scale-125 transition-all
        "
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-accent-blue
          hover:!bg-accent-blue hover:!scale-125 transition-all
        "
      />
    </div>
  );
}
