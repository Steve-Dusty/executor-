import { useWorkflowStore } from '../stores/workflowStore';

function formatJson(data: unknown): string {
  if (data === null || data === undefined) return 'null';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function truncateString(str: string, maxLength: number = 500): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function NodeDebugPanel() {
  const { selectedDebugNodeId, nodeDebugData, nodes, setSelectedDebugNodeId } = useWorkflowStore();

  if (!selectedDebugNodeId) return null;

  const debugData = nodeDebugData[selectedDebugNodeId];
  const node = nodes.find((n) => n.id === selectedDebugNodeId);

  const statusColors = {
    running: 'text-info border-info/30 bg-info/5',
    success: 'text-success border-success/30 bg-success/5',
    error: 'text-error border-error/30 bg-error/5',
  };

  const statusIcons = {
    running: (
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-4 left-[420px] z-50 w-[520px] max-h-[600px] glass-panel rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between bg-bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-amber to-accent-orange flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-bg-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-amber to-accent-orange blur-lg opacity-40" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-text-primary">
              {(node?.data as { label?: string })?.label || selectedDebugNodeId}
            </h3>
            <p className="text-[11px] text-text-tertiary">
              Type: <span className="text-text-secondary font-medium">{debugData?.nodeType || node?.type || 'unknown'}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedDebugNodeId(null)}
          className="p-2 rounded-lg hover:bg-bg-secondary border border-transparent hover:border-glass-border transition-all group"
        >
          <svg
            className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        {debugData && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusColors[debugData.status]}`}>
            {statusIcons[debugData.status]}
            <span className="text-sm font-semibold capitalize">{debugData.status}</span>
            {debugData.duration !== undefined && (
              <span className="text-xs opacity-70 ml-auto font-mono bg-bg-primary/30 px-2 py-1 rounded-lg">
                {debugData.duration.toLocaleString()}ms
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {debugData?.error && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-4">
            <div className="text-[11px] text-error uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Error
            </div>
            <pre className="text-xs text-error font-mono whitespace-pre-wrap break-words">
              {debugData.error}
            </pre>
          </div>
        )}

        {/* Inputs */}
        <div className="rounded-xl border border-glass-border bg-bg-secondary/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-glass-border bg-bg-secondary/50 flex items-center gap-2.5">
            <svg className="w-4 h-4 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs text-text-primary uppercase tracking-wider font-semibold">Inputs</span>
            {debugData?.inputs && Object.keys(debugData.inputs).length > 0 && (
              <span className="text-[10px] text-text-tertiary ml-auto font-medium">
                {Object.keys(debugData.inputs).length} source(s)
              </span>
            )}
          </div>
          <div className="p-4">
            {debugData?.inputs && Object.keys(debugData.inputs).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(debugData.inputs).map(([sourceId, value]) => (
                  <div key={sourceId} className="rounded-xl border border-glass-border bg-bg-primary/50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-glass-border bg-bg-secondary/30">
                      <span className="text-[10px] text-node-ai font-mono font-medium">from node "{sourceId}"</span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-text-secondary overflow-x-auto max-h-[150px] overflow-y-auto">
                      {truncateString(formatJson(value), 1000)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-tertiary italic">No inputs (trigger node or no connections)</div>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="rounded-xl border border-glass-border bg-bg-secondary/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-glass-border bg-bg-secondary/50 flex items-center gap-2.5">
            <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-text-primary uppercase tracking-wider font-semibold">Output</span>
          </div>
          <div className="p-4">
            {debugData?.output !== null && debugData?.output !== undefined ? (
              <pre className="code-block text-xs text-text-secondary overflow-x-auto max-h-[200px] overflow-y-auto p-3">
                {truncateString(formatJson(debugData.output), 2000)}
              </pre>
            ) : debugData?.status === 'running' ? (
              <div className="text-xs text-info italic flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Executing...
              </div>
            ) : (
              <div className="text-xs text-text-tertiary italic">No output yet</div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {debugData?.timestamp && (
          <div className="text-[10px] text-text-tertiary text-right font-mono">
            Last updated: {new Date(debugData.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
