import { useState } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

function formatResult(result: unknown): string {
  if (result === null || result === undefined) return '';
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

export function ExecutionLog() {
  const { executionLogs, isExecuting, clearLogs } = useWorkflowStore();

  return (
    <aside className="w-80 h-full glass-panel border-l border-glass-border flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-glass-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary tracking-wide">Execution Log</h2>
          <p className="text-xs text-text-tertiary mt-1">Real-time trace</p>
        </div>
        <button
          onClick={clearLogs}
          className="p-2 rounded-lg hover:bg-bg-secondary border border-transparent hover:border-glass-border transition-all group"
          title="Clear logs"
        >
          <svg
            className="w-4 h-4 text-text-tertiary group-hover:text-accent-red transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {executionLogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-bg-secondary border border-glass-border flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-text-tertiary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-text-secondary">No executions yet</div>
            <div className="text-xs text-text-tertiary mt-1.5">Click Execute to run workflow</div>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-accent-cyan/30 via-accent-purple/20 to-transparent" />

            {/* Log entries */}
            <div className="space-y-3">
              {executionLogs.map((log, index) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  index={index + 1}
                  isLatest={index === executionLogs.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      {isExecuting && (
        <div className="p-4 border-t border-glass-border bg-accent-cyan/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-accent-cyan" />
              <div className="absolute inset-0 rounded-full bg-accent-cyan animate-ping" />
            </div>
            <span className="text-sm font-medium text-accent-cyan">Processing workflow...</span>
          </div>
        </div>
      )}
    </aside>
  );
}

interface LogEntryProps {
  log: {
    id: string;
    timestamp: string;
    nodeId: string;
    nodeType: string;
    status: string;
    result?: unknown;
    error?: string;
    duration?: number;
  };
  index: number;
  isLatest: boolean;
}

function LogEntry({ log, index, isLatest }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<string, {
    dot: string;
    bg: string;
    border: string;
    text: string;
    glow?: string;
  }> = {
    success: {
      dot: 'bg-success',
      bg: 'bg-success/5',
      border: 'border-success/20',
      text: 'text-success',
      glow: 'shadow-[0_0_12px_rgba(0,255,148,0.2)]',
    },
    running: {
      dot: 'bg-info animate-pulse',
      bg: 'bg-info/5',
      border: 'border-info/30',
      text: 'text-info',
      glow: 'shadow-[0_0_16px_rgba(0,240,255,0.25)]',
    },
    error: {
      dot: 'bg-error',
      bg: 'bg-error/5',
      border: 'border-error/20',
      text: 'text-error',
      glow: 'shadow-[0_0_12px_rgba(255,71,87,0.2)]',
    },
    pending: {
      dot: 'bg-text-tertiary',
      bg: 'bg-bg-secondary/50',
      border: 'border-glass-border',
      text: 'text-text-tertiary',
    },
  };

  const config = statusConfig[log.status] || statusConfig.pending;

  const getStatusIcon = () => {
    switch (log.status) {
      case 'success':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'running':
        return (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative pl-9 animate-fade-in">
      {/* Timeline dot */}
      <div className={`
        absolute left-[11px] top-4 w-2.5 h-2.5 rounded-full
        ${config.dot}
        ${isLatest && log.status === 'success' ? 'ring-4 ring-success/20' : ''}
        ${isLatest && log.status === 'running' ? 'ring-4 ring-info/20' : ''}
      `} />

      {/* Card */}
      <div
        className={`
          rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer
          ${config.bg} ${config.border} ${config.glow || ''}
          hover:border-opacity-60
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header row */}
        <div className="p-3.5 flex items-center gap-3">
          {/* Index badge */}
          <div className={`
            w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold
            ${log.status === 'success' ? 'bg-success/15 text-success' :
              log.status === 'error' ? 'bg-error/15 text-error' :
              log.status === 'running' ? 'bg-info/15 text-info' :
              'bg-bg-elevated text-text-secondary'}
          `}>
            {index}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary truncate">{log.nodeId}</span>
              <span className={config.text}>{getStatusIcon()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
              <span className="font-medium capitalize">{log.nodeType}</span>
              {log.duration !== undefined && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="font-mono text-text-secondary">{log.duration.toLocaleString()}ms</span>
                </>
              )}
            </div>
          </div>

          <svg
            className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-glass-border animate-slide-up">
            {/* Timestamp */}
            <div className="px-3.5 py-2.5 text-xs text-text-tertiary flex items-center gap-2 bg-bg-primary/30">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span>
            </div>

            {/* Output preview */}
            {log.result !== undefined && log.result !== null && (
              <div className="p-3.5 border-t border-glass-border">
                <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-2.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Output
                </div>
                <pre className="code-block text-xs text-text-secondary p-3 overflow-x-auto max-h-[200px] whitespace-pre-wrap break-words">
                  {formatResult(log.result)}
                </pre>
              </div>
            )}

            {/* Error */}
            {log.error && (
              <div className="p-3.5 border-t border-glass-border">
                <div className="flex items-center gap-2 text-[11px] text-error uppercase tracking-wider font-semibold mb-2.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Error
                </div>
                <div className="text-xs text-error bg-error/10 rounded-lg p-3 border border-error/20 font-mono">
                  {log.error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
