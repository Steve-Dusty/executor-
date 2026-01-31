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
    running: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    success: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    error: 'text-accent-red border-accent-red/30 bg-accent-red/5',
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
    <div className="fixed bottom-4 left-[420px] z-50 w-[500px] max-h-[600px] glass-panel rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-amber to-accent-orange flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Node Debug: {(node?.data as { label?: string })?.label || selectedDebugNodeId}
            </h3>
            <p className="text-[11px] text-text-tertiary">
              Type: {debugData?.nodeType || node?.type || 'unknown'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedDebugNodeId(null)}
          className="p-1.5 rounded-lg hover:bg-glass-bg transition-colors group"
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
          <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${statusColors[debugData.status]}`}>
            {statusIcons[debugData.status]}
            <span className="text-sm font-medium capitalize">{debugData.status}</span>
            {debugData.duration && (
              <span className="text-xs opacity-70 ml-auto font-mono">{debugData.duration}ms</span>
            )}
          </div>
        )}

        {/* Error */}
        {debugData?.error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-3">
            <div className="text-[11px] text-accent-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Error
            </div>
            <pre className="text-xs text-accent-red font-mono whitespace-pre-wrap break-words">
              {debugData.error}
            </pre>
          </div>
        )}

        {/* Inputs */}
        <div className="rounded-lg border border-glass-border bg-glass-bg/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-glass-border bg-glass-bg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-accent-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">Inputs</span>
            {debugData?.inputs && Object.keys(debugData.inputs).length > 0 && (
              <span className="text-[10px] text-text-tertiary ml-auto">
                {Object.keys(debugData.inputs).length} source(s)
              </span>
            )}
          </div>
          <div className="p-3">
            {debugData?.inputs && Object.keys(debugData.inputs).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(debugData.inputs).map(([sourceId, value]) => (
                  <div key={sourceId} className="rounded-lg border border-glass-border bg-bg-primary/50 overflow-hidden">
                    <div className="px-2 py-1 border-b border-glass-border bg-glass-bg/50">
                      <span className="text-[10px] text-accent-purple font-mono">from node "{sourceId}"</span>
                    </div>
                    <pre className="p-2 text-xs font-mono text-text-secondary overflow-x-auto max-h-[150px] overflow-y-auto">
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
        <div className="rounded-lg border border-glass-border bg-glass-bg/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-glass-border bg-glass-bg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-accent-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">Output</span>
          </div>
          <div className="p-3">
            {debugData?.output !== null && debugData?.output !== undefined ? (
              <pre className="text-xs font-mono text-text-secondary overflow-x-auto max-h-[200px] overflow-y-auto bg-bg-primary/50 rounded-lg p-2 border border-glass-border">
                {truncateString(formatJson(debugData.output), 2000)}
              </pre>
            ) : debugData?.status === 'running' ? (
              <div className="text-xs text-accent-blue italic flex items-center gap-2">
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
          <div className="text-[10px] text-text-tertiary text-right">
            Last updated: {new Date(debugData.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
