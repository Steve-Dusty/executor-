import { Handle, Position, NodeProps } from '@xyflow/react';

interface LovableNodeData extends Record<string, unknown> {
  label: string;
  action: 'update_price' | 'add_banner' | 'update_inventory' | 'change_layout';
  targetComponent: string;
  projectId?: string;
  config?: Record<string, unknown>;
}

export function LovableNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as LovableNodeData;

  const getIcon = () => {
    switch (nodeData.action) {
      case 'update_price':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'add_banner':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 9h18" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'update_inventory':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'change_layout':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return (
    <div className={`relative group ${selected ? 'ring-2 ring-accent-pink/50 rounded-2xl' : ''}`}>
      {/* Glow effect behind node */}
      <div className={`
        absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300
        bg-gradient-to-br from-accent-pink/20 to-accent-purple/10
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `} />

      {/* Main node */}
      <div className="
        relative w-[200px] rounded-2xl overflow-hidden
        bg-gradient-to-b from-bg-tertiary to-bg-secondary
        border border-accent-pink/30
        shadow-2xl shadow-black/50
        transition-all duration-200
      ">
        {/* Header accent line */}
        <div className="h-1 bg-gradient-to-r from-accent-pink to-accent-purple/50" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10 rounded-xl
              bg-accent-pink/10 border border-accent-pink/20
              flex items-center justify-center
              text-accent-pink
            ">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{nodeData.label}</div>
              <div className="text-xs text-text-tertiary truncate">{nodeData.targetComponent}</div>
            </div>
          </div>

          {/* Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-pink/10 border border-accent-pink/20">
            <svg className="w-3 h-3 text-accent-pink" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="text-[10px] font-medium text-accent-pink">Lovable</span>
          </div>
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-accent-pink
          hover:!bg-accent-pink hover:!scale-125 transition-all
        "
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !w-3 !h-3 !bg-bg-tertiary !border-2 !border-accent-pink
          hover:!bg-accent-pink hover:!scale-125 transition-all
        "
      />
    </div>
  );
}
