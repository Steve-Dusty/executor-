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
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Execution Log</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Real-time workflow trace</p>
        </div>
        <button
          onClick={clearLogs}
          className="p-2 rounded-lg hover:bg-glass-bg transition-colors group"
          title="Clear logs"
        >
          <svg
            className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors"
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
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-glass-bg border border-glass-border mx-auto mb-3 flex items-center justify-center">
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
            <div className="text-sm text-text-secondary">No executions yet</div>
            <div className="text-xs text-text-tertiary mt-1">Trigger a payment to start</div>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-glass-border" />

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
        <div className="p-4 border-t border-glass-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
            <span className="text-sm text-accent-blue">Processing workflow...</span>
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

  const statusConfig: Record<string, { dot: string; bg: string; border: string; text: string }> = {
    success: {
      dot: 'bg-accent-green',
      bg: 'bg-accent-green/5',
      border: 'border-accent-green/20',
      text: 'text-accent-green',
    },
    running: {
      dot: 'bg-accent-blue animate-pulse',
      bg: 'bg-accent-blue/5',
      border: 'border-accent-blue/20',
      text: 'text-accent-blue',
    },
    error: {
      dot: 'bg-accent-red',
      bg: 'bg-accent-red/5',
      border: 'border-accent-red/20',
      text: 'text-accent-red',
    },
    pending: {
      dot: 'bg-text-tertiary',
      bg: 'bg-glass-bg',
      border: 'border-glass-border',
      text: 'text-text-tertiary',
    },
  };

  const config = statusConfig[log.status] || statusConfig.pending;

  const getStatusIcon = () => {
    switch (log.status) {
      case 'success':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'running':
        return (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className={`
        absolute left-[11px] top-3 w-2 h-2 rounded-full
        ${config.dot}
        ${isLatest && log.status === 'success' ? 'ring-4 ring-accent-green/20' : ''}
      `} />

      {/* Card */}
      <div
        className={`
          rounded-xl border overflow-hidden transition-all cursor-pointer
          ${config.bg} ${config.border}
          hover:border-opacity-40
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header row */}
        <div className="p-3 flex items-center gap-3">
          <div className={`
            w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-semibold
            ${log.status === 'success' ? 'bg-accent-green/20 text-accent-green' :
              log.status === 'error' ? 'bg-accent-red/20 text-accent-red' :
              log.status === 'running' ? 'bg-accent-blue/20 text-accent-blue' :
              'bg-glass-bg text-text-secondary'}
          `}>
            {index}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">{log.nodeId}</span>
              <span className={config.text}>{getStatusIcon()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span className="capitalize">{log.nodeType}</span>
              {log.duration && (
                <>
                  <span className="text-glass-border">|</span>
                  <span className="font-mono">{log.duration}ms</span>
                </>
              )}
            </div>
          </div>

          <svg
            className={`w-4 h-4 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
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
          <div className="border-t border-glass-border">
            {/* Timestamp */}
            <div className="px-3 py-2 text-xs text-text-tertiary border-b border-glass-border">
              {new Date(log.timestamp).toLocaleString()}
            </div>

            {/* Output preview */}
            {log.result !== undefined && log.result !== null && (
              <div className="p-3">
                <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Output</div>
                <pre className="
                  text-xs font-mono text-text-secondary
                  bg-bg-primary/50 rounded-lg p-3
                  overflow-x-auto max-h-[200px]
                  border border-glass-border
                ">
                  {formatResult(log.result)}
                </pre>
              </div>
            )}

            {/* Error */}
            {log.error && (
              <div className="p-3">
                <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Error</div>
                <div className="text-xs text-accent-red bg-accent-red/10 rounded-lg p-3 border border-accent-red/20">
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
