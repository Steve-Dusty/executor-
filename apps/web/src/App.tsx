import { useEffect, useState } from 'react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { Sidebar } from './components/Sidebar';
import { ExecutionLog } from './components/ExecutionLog';
import { ChatPanel } from './components/ChatPanel';
import { DemoControls } from './components/DemoControls';
import { NodeDebugPanel } from './components/NodeDebugPanel';
import { useWorkflowStore } from './stores/workflowStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { nodes, edges, setNodes, setEdges, setIsExecuting, clearLogs, clearDebugData } = useWorkflowStore();
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

    // Find trigger node to determine trigger data
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const triggerData = triggerNode?.data?.triggerType === 'stripe'
      ? { type: 'payment', amount: 250, currency: 'usd', customerId: `cus_${Date.now()}`, timestamp: new Date().toISOString() }
      : { type: 'manual', timestamp: new Date().toISOString() };

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

  // Load initial workflow
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
        // Set default workflow if API fails
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
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 glass-panel flex items-center justify-between px-4 border-b border-glass-border">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-text-primary">FlowForge</h1>
                <p className="text-[11px] text-text-tertiary">Self-adapting workflows</p>
              </div>
            </div>

            <div className="h-8 w-px bg-glass-border" />

            <div className="hidden md:block">
              <p className="text-sm text-text-secondary">
                Adaptive E-commerce Flow
              </p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/20">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs font-medium text-accent-green">Live</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex px-3 py-1.5 rounded-lg text-sm font-medium bg-glass-bg border border-glass-border text-text-secondary hover:bg-glass-highlight hover:text-text-primary transition-all">
              Save
            </button>
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all
                ${isRunning
                  ? 'bg-accent-green/20 text-accent-green cursor-wait'
                  : 'bg-gradient-to-r from-accent-green to-accent-green/80 text-white shadow-lg shadow-accent-green/25 hover:shadow-accent-green/40 hover:scale-[1.02]'}
              `}
            >
              {isRunning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Run Workflow</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative bg-pattern">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
          />
        </div>
      </div>

      {/* Right panel - Execution Log */}
      <ExecutionLog />

      {/* AI Chat Panel */}
      <ChatPanel />

      {/* Demo Controls */}
      <DemoControls />

      {/* Node Debug Panel */}
      <NodeDebugPanel />
    </div>
  );
}

export default App;
