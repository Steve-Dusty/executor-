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
    success: 'border-accent-green/30 bg-accent-green/5',
    pending: 'border-accent-blue/30 bg-accent-blue/5',
    error: 'border-accent-red/30 bg-accent-red/5',
  };

  const statusIcons = {
    success: (
      <svg className="w-3.5 h-3.5 text-accent-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    pending: (
      <svg className="w-3.5 h-3.5 text-accent-blue animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
    error: (
      <svg className="w-3.5 h-3.5 text-accent-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };

  return (
    <div className={`rounded-lg border ${statusColors[status]} overflow-hidden`}>
      <button
        onClick={() => children && setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-5 h-5 rounded bg-glass-bg border border-glass-border flex items-center justify-center">
          <svg className="w-3 h-3 text-accent-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary truncate">{toolName}</div>
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
        <div className="px-3 py-2 border-t border-glass-border bg-bg-primary/30">
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

    parts.push(
      <ToolCallCard
        key="workflow-gen"
        toolName="generate_workflow"
        status="success"
        summary={`${nodeCount} nodes, ${edgeCount} edges`}
      >
        <div className="space-y-2">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Nodes</div>
          <div className="flex flex-wrap gap-1">
            {workflow.nodes?.map(node => (
              <span
                key={node.id}
                className="px-2 py-0.5 rounded text-[10px] bg-glass-bg border border-glass-border text-text-secondary"
              >
                {node.data?.label || node.id}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mt-2">Types</div>
          <div className="flex flex-wrap gap-1">
            {nodeTypes.map(type => (
              <span
                key={type}
                className="px-2 py-0.5 rounded text-[10px] bg-accent-purple/10 border border-accent-purple/20 text-accent-purple"
              >
                {type}
              </span>
            ))}
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
    parts.push(<span key="text">{cleanContent}</span>);
  }

  return parts.length > 0 ? parts : [<span key="empty">{content}</span>];
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
          p-3 rounded-2xl
          bg-gradient-to-br from-accent-purple to-accent-pink
          text-white shadow-lg shadow-accent-purple/25
          hover:shadow-accent-purple/40 hover:scale-105 transition-all
          flex items-center gap-2
        "
        title="Open AI Chat"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-sm font-medium">AI Builder</span>
      </button>
    );
  }

  return (
    <div className="
      fixed bottom-4 left-4 z-50
      w-96 h-[500px]
      glass-panel rounded-2xl
      shadow-2xl shadow-black/50
      flex flex-col overflow-hidden
    ">
      {/* Header */}
      <div className="p-3 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">AI Builder</h3>
            <p className="text-[11px] text-text-tertiary">Describe in plain English</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-glass-bg transition-colors group"
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-pink/20 border border-accent-purple/20 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-sm text-text-secondary">Describe your workflow</div>
            <div className="text-xs text-text-tertiary mt-2 max-w-[250px] mx-auto">
              "Send a Slack notification when a payment over $500 is received"
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-2xl px-3.5 py-2.5
                ${msg.role === 'user'
                  ? 'bg-gradient-to-r from-accent-purple to-accent-pink text-white'
                  : 'bg-glass-bg border border-glass-border text-text-primary'}
              `}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-2">
                  {parseMessageContent(msg.content, msg.workflow as WorkflowData)}
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-glass-bg border border-glass-border rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-text-secondary">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-glass-border">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow..."
            className="
              w-full bg-glass-bg border border-glass-border rounded-xl
              px-3.5 py-2.5 pr-12 text-sm text-text-primary resize-none
              placeholder:text-text-tertiary
              focus:outline-none focus:border-accent-purple/50 focus:ring-2 focus:ring-accent-purple/20
              transition-all
            "
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="
              absolute right-2 bottom-2 p-2 rounded-lg
              bg-gradient-to-r from-accent-purple to-accent-pink text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:opacity-90 transition-all
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
