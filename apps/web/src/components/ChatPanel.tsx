import { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

// Tool call component for MCP-style display
function ToolCallCard({
  toolName,
  status,
  summary,
  children
}: {
  toolName: string;
  status: 'success' | 'pending' | 'error';
  summary?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    success: 'border-success/30 bg-success/5',
    pending: 'border-info/30 bg-info/5',
    error: 'border-error/30 bg-error/5',
  };

  const statusIcons = {
    success: (
      <svg className="w-3.5 h-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    pending: (
      <svg className="w-3.5 h-3.5 text-info animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
    error: (
      <svg className="w-3.5 h-3.5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };

  return (
    <div className={`rounded-xl border ${statusColors[status]} overflow-hidden`}>
      <button
        onClick={() => children && setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-node-ai/20 border border-node-ai/30 flex items-center justify-center">
          <svg className="w-3 h-3 text-node-ai" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary truncate">{toolName}</div>
          {summary && <div className="text-[10px] text-text-tertiary truncate">{summary}</div>}
        </div>
        {statusIcons[status]}
        {children && (
          <svg
            className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      {expanded && children && (
        <div className="px-3 py-2.5 border-t border-glass-border bg-bg-primary/50 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
}

// Parse message content to extract tool calls and text
function parseMessageContent(content: string, workflow?: WorkflowData): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // If there's a workflow, add it as a tool call
  if (workflow) {
    const nodeCount = workflow.nodes?.length || 0;
    const edgeCount = workflow.edges?.length || 0;
    const nodeTypes = [...new Set(workflow.nodes?.map(n => n.type) || [])];

    const typeColors: Record<string, string> = {
      trigger: 'bg-node-trigger/10 border-node-trigger/20 text-node-trigger',
      action: 'bg-node-action/10 border-node-action/20 text-node-action',
      ai: 'bg-node-ai/10 border-node-ai/20 text-node-ai',
      condition: 'bg-node-condition/10 border-node-condition/20 text-node-condition',
      lovable: 'bg-node-output/10 border-node-output/20 text-node-output',
    };

    parts.push(
      <ToolCallCard
        key="workflow-gen"
        toolName="generate_workflow"
        status="success"
        summary={`${nodeCount} nodes, ${edgeCount} edges`}
      >
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">Nodes</div>
            <div className="flex flex-wrap gap-1.5">
              {workflow.nodes?.map(node => (
                <span
                  key={node.id}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-bg-secondary border border-glass-border text-text-secondary"
                >
                  {node.data?.label || node.id}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">Types</div>
            <div className="flex flex-wrap gap-1.5">
              {nodeTypes.map(type => (
                <span
                  key={type}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${typeColors[type] || 'bg-bg-secondary border-glass-border text-text-secondary'}`}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ToolCallCard>
    );
  }

  // Clean up content - remove raw JSON if workflow was parsed
  let cleanContent = content;
  if (workflow) {
    // Remove JSON block from content
    cleanContent = content.replace(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/, '').trim();
  }

  // Add remaining text if any
  if (cleanContent) {
    parts.push(<span key="text" className="text-sm leading-relaxed">{cleanContent}</span>);
  }

  return parts.length > 0 ? parts : [<span key="empty" className="text-sm leading-relaxed">{content}</span>];
}

interface WorkflowData {
  nodes: Array<{ id: string; type: string; data: { label?: string } }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  workflow?: WorkflowData;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          currentWorkflow: { nodes, edges },
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            workflow: data.workflow,
          },
        ]);

        // If a workflow was generated, offer to apply it
        if (data.workflow?.nodes && data.workflow?.edges) {
          // Auto-apply the workflow
          setNodes(data.workflow.nodes);
          setEdges(data.workflow.edges);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to connect to server' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="
          fixed bottom-4 left-4 z-50
          group relative p-3.5 rounded-2xl overflow-hidden
          bg-gradient-to-br from-node-ai to-accent-pink
          text-white
          hover:scale-105 transition-all duration-200
          flex items-center gap-2.5
        "
        title="Open AI Chat"
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-node-ai to-accent-pink opacity-50 blur-xl group-hover:opacity-75 transition-opacity" />

        <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-sm font-semibold relative z-10">AI Builder</span>
      </button>
    );
  }

  return (
    <div className="
      fixed bottom-4 left-4 z-50
      w-96 h-[520px]
      glass-panel rounded-2xl
      shadow-2xl shadow-black/60
      flex flex-col overflow-hidden
      animate-scale-in
    ">
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between bg-bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-node-ai to-accent-pink flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-node-ai to-accent-pink blur-lg opacity-40" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-text-primary">AI Builder</h3>
            <p className="text-[11px] text-text-tertiary">Describe workflows in plain English</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-lg hover:bg-bg-secondary border border-transparent hover:border-glass-border transition-all group"
        >
          <svg
            className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-14">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-node-ai/30 to-accent-pink/30 animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-bg-secondary border border-glass-border flex items-center justify-center">
                <svg className="w-6 h-6 text-node-ai" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-text-secondary">Describe your workflow</div>
            <div className="text-xs text-text-tertiary mt-2 max-w-[260px] mx-auto leading-relaxed">
              "Send a Slack notification when a payment over $500 is received"
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`
                max-w-[85%] rounded-2xl px-4 py-3
                ${msg.role === 'user'
                  ? 'bg-gradient-to-r from-node-ai to-accent-pink text-white'
                  : 'glass-card text-text-primary'}
              `}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-2.5">
                  {parseMessageContent(msg.content, msg.workflow as WorkflowData)}
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-slide-up">
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-node-ai rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-node-ai rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-node-ai rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-text-secondary">Generating...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-glass-border bg-bg-secondary/30">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow..."
            className="
              w-full bg-bg-secondary/50 border border-glass-border rounded-xl
              px-4 py-3 pr-14 text-sm text-text-primary resize-none
              placeholder:text-text-tertiary
              focus:outline-none focus:border-node-ai/40 focus:bg-bg-secondary
              focus:shadow-[0_0_0_3px_rgba(168,85,247,0.1)]
              transition-all duration-200
            "
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="
              absolute right-3 bottom-3 p-2.5 rounded-xl
              bg-gradient-to-r from-node-ai to-accent-pink text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:opacity-90 hover:scale-105 active:scale-100
              transition-all duration-200
            "
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="text-[11px] text-text-tertiary mt-2 px-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
