import { useEffect, useState } from 'react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { ExecutionLog } from './components/ExecutionLog';
import { NodeDebugPanel } from './components/NodeDebugPanel';
import { useWorkflowStore } from './stores/workflowStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { nodes, edges, setNodes, setEdges, setIsExecuting, clearLogs, clearDebugData, ticker, setTicker } = useWorkflowStore();
  const [isRunning, setIsRunning] = useState(false);
  useWebSocket();

  const runWorkflow = async () => {
    if (nodes.length === 0) {
      alert('No workflow to run. Create one via chat first.');
      return;
    }

    clearLogs();
    clearDebugData();
    setIsRunning(true);
    setIsExecuting(true);

    const triggerData = {
      type: 'manual',
      timestamp: new Date().toISOString(),
      ticker,
    };

    try {
      await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          edges,
          triggerData,
        }),
      });
    } catch (error) {
      console.error('Failed to run workflow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetch('/api/webhook/current-workflow')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
        }
      })
      .catch((err) => {
        console.error('Failed to load workflow:', err);
        setNodes([
          {
            id: '1',
            type: 'trigger',
            position: { x: 250, y: 0 },
            data: { label: 'Stripe Payment', triggerType: 'stripe' },
          },
          {
            id: '2',
            type: 'action',
            position: { x: 250, y: 120 },
            data: { label: 'Log to Notion', actionType: 'notion' },
          },
          {
            id: '3',
            type: 'condition',
            position: { x: 250, y: 240 },
            data: { label: 'Amount > $500?', expression: 'inputs["1"].amount > 500' },
          },
          {
            id: '4',
            type: 'ai',
            position: { x: 80, y: 360 },
            data: { label: 'Analyze Trend', model: 'claude-sonnet' },
          },
          {
            id: '5',
            type: 'lovable',
            position: { x: 420, y: 360 },
            data: { label: 'Update Pricing', action: 'update_price', targetComponent: 'pricing-section' },
          },
        ]);
        setEdges([
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4', label: 'true' },
          { id: 'e3-5', source: '3', target: '5', label: 'false' },
        ]);
      });
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary bg-mesh">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 glass-panel flex items-center justify-between px-5 border-b border-glass-border relative overflow-hidden">
          {/* Subtle scan line effect */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-cyan/5 to-transparent" />
          </div>

          {/* Left: Logo + Title */}
          <div className="flex items-center gap-5 relative z-10">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple flex items-center justify-center">
                  <svg className="w-5 h-5 text-bg-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple blur-lg opacity-40" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-gradient-cyan tracking-tight">Executor</h1>
                <p className="text-[11px] text-text-tertiary font-medium tracking-wide uppercase">Workflow Engine</p>
              </div>
            </div>

            <div className="h-8 w-px bg-glass-border" />

            <div className="hidden md:block">
              <p className="text-sm text-text-secondary font-medium">
                Adaptive Automation
              </p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent-green/5 border border-accent-green/20">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <div className="absolute inset-0 rounded-full bg-accent-green animate-ping opacity-75" />
            </div>
            <span className="text-xs font-semibold text-accent-green tracking-wide uppercase">Live</span>
          </div>

          {/* Right: Ticker Input + Actions */}
          <div className="flex items-center gap-4 relative z-10">
            {/* Ticker Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-tertiary font-medium uppercase tracking-wide">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="
                  w-24 px-3 py-2 rounded-lg
                  bg-bg-secondary/50 border border-glass-border
                  text-sm font-mono font-semibold text-accent-cyan
                  placeholder:text-text-tertiary
                  focus:outline-none focus:border-accent-cyan/40 focus:bg-bg-secondary
                  focus:shadow-[0_0_0_3px_rgba(0,240,255,0.1)]
                  transition-all duration-200
                  uppercase
                "
              />
            </div>

            <div className="h-8 w-px bg-glass-border" />

            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className={`
                group relative px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all duration-200 overflow-hidden
                ${isRunning
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                  : 'btn-primary'}
              `}
            >
              {/* Hover gradient overlay */}
              {!isRunning && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/0 via-white/20 to-accent-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              )}

              {isRunning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="relative z-10">Execute</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative bg-dots">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
          />
        </div>
      </div>

      {/* Right panel - Execution Log */}
      <ExecutionLog />

      {/* Node Debug Panel */}
      <NodeDebugPanel />
    </div>
  );
}

export default App;
