import { useState } from 'react';

const nodeTemplates = [
  {
    type: 'trigger',
    label: 'Stripe Payment',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'green',
    description: 'Payment events',
    category: 'triggers',
  },
  {
    type: 'trigger',
    label: 'Webhook',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.34-3 3.01-3H18M6 7.01h5.99c1.66 0 3.01 1.34 3.01 3s-1.34 3-3.01 3H6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'green',
    description: 'HTTP trigger',
    category: 'triggers',
  },
  {
    type: 'action',
    label: 'Slack Message',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    color: 'blue',
    description: 'Send message',
    category: 'actions',
  },
  {
    type: 'action',
    label: 'Email',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'blue',
    description: 'Send email',
    category: 'actions',
  },
  {
    type: 'action',
    label: 'Notion Log',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.02c-.42-.326-.98-.7-2.055-.607L3.01 2.72c-.466.046-.56.28-.374.466l1.823 1.022zm.793 3.172v13.851c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.746.326-.746.886zm14.337.42c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.747 0-.933-.234-1.493-.933l-4.571-7.186v6.952l1.446.327s0 .84-1.166.84l-3.219.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.233 4.758 7.279v-6.44l-1.213-.14c-.093-.514.28-.886.746-.933l3.23-.187z"/>
      </svg>
    ),
    color: 'blue',
    description: 'Log to database',
    category: 'actions',
  },
  {
    type: 'ai',
    label: 'AI Analysis',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'purple',
    description: 'Claude / GPT',
    category: 'ai',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'amber',
    description: 'Branch logic',
    category: 'ai',
  },
  {
    type: 'lovable',
    label: 'Update Site',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'pink',
    description: 'Lovable output',
    category: 'output',
  },
];

const colorConfig: Record<string, { bg: string; border: string; text: string; icon: string; glow: string }> = {
  green: {
    bg: 'bg-node-trigger/5',
    border: 'border-node-trigger/20 hover:border-node-trigger/40',
    text: 'text-node-trigger',
    icon: 'bg-node-trigger/15 text-node-trigger',
    glow: 'hover:shadow-[0_0_20px_rgba(0,255,148,0.15)]',
  },
  blue: {
    bg: 'bg-node-action/5',
    border: 'border-node-action/20 hover:border-node-action/40',
    text: 'text-node-action',
    icon: 'bg-node-action/15 text-node-action',
    glow: 'hover:shadow-[0_0_20px_rgba(77,124,255,0.15)]',
  },
  purple: {
    bg: 'bg-node-ai/5',
    border: 'border-node-ai/20 hover:border-node-ai/40',
    text: 'text-node-ai',
    icon: 'bg-node-ai/15 text-node-ai',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  },
  amber: {
    bg: 'bg-node-condition/5',
    border: 'border-node-condition/20 hover:border-node-condition/40',
    text: 'text-node-condition',
    icon: 'bg-node-condition/15 text-node-condition',
    glow: 'hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
  },
  pink: {
    bg: 'bg-node-output/5',
    border: 'border-node-output/20 hover:border-node-output/40',
    text: 'text-node-output',
    icon: 'bg-node-output/15 text-node-output',
    glow: 'hover:shadow-[0_0_20px_rgba(255,45,146,0.15)]',
  },
};

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredTemplates = nodeTemplates.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTemplates = {
    triggers: filteredTemplates.filter((t) => t.category === 'triggers'),
    actions: filteredTemplates.filter((t) => t.category === 'actions'),
    ai: filteredTemplates.filter((t) => t.category === 'ai'),
    output: filteredTemplates.filter((t) => t.category === 'output'),
  };

  return (
    <aside className="w-72 h-full glass-panel border-r border-glass-border flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-glass-border">
        <h2 className="text-sm font-display font-bold text-text-primary tracking-wide">Components</h2>
        <p className="text-xs text-text-tertiary mt-1">Drag to canvas to build</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-glass-border">
        <div className="relative group">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-cyan transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary/50 border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-sm
                     text-text-primary placeholder:text-text-tertiary
                     focus:outline-none focus:border-accent-cyan/40 focus:bg-bg-secondary
                     focus:shadow-[0_0_0_3px_rgba(0,240,255,0.1)]
                     transition-all duration-200"
          />
        </div>
      </div>

      {/* Node Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Triggers */}
        {groupedTemplates.triggers.length > 0 && (
          <NodeGroup title="Triggers" color="green">
            {groupedTemplates.triggers.map((template, index) => (
              <NodePaletteItem
                key={`trigger-${index}`}
                template={template}
                onDragStart={onDragStart}
              />
            ))}
          </NodeGroup>
        )}

        {/* Actions */}
        {groupedTemplates.actions.length > 0 && (
          <NodeGroup title="Actions" color="blue">
            {groupedTemplates.actions.map((template, index) => (
              <NodePaletteItem
                key={`action-${index}`}
                template={template}
                onDragStart={onDragStart}
              />
            ))}
          </NodeGroup>
        )}

        {/* AI & Logic */}
        {groupedTemplates.ai.length > 0 && (
          <NodeGroup title="AI & Logic" color="purple">
            {groupedTemplates.ai.map((template, index) => (
              <NodePaletteItem
                key={`ai-${index}`}
                template={template}
                onDragStart={onDragStart}
              />
            ))}
          </NodeGroup>
        )}

        {/* Output */}
        {groupedTemplates.output.length > 0 && (
          <NodeGroup title="Output" color="pink">
            {groupedTemplates.output.map((template, index) => (
              <NodePaletteItem
                key={`output-${index}`}
                template={template}
                onDragStart={onDragStart}
              />
            ))}
          </NodeGroup>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-glass-border mx-auto mb-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm text-text-tertiary">No nodes found</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-glass-border bg-bg-secondary/30">
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <LegendItem color="bg-node-trigger" label="Triggers" />
          <LegendItem color="bg-node-action" label="Actions" />
          <LegendItem color="bg-node-ai" label="AI" />
          <LegendItem color="bg-node-output" label="Output" />
        </div>
      </div>
    </aside>
  );
}

function NodeGroup({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const dotColor: Record<string, string> = {
    green: 'bg-node-trigger',
    blue: 'bg-node-action',
    purple: 'bg-node-ai',
    pink: 'bg-node-output',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor[color]}`} />
        <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-text-tertiary">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="font-medium">{label}</span>
    </div>
  );
}

interface NodePaletteItemProps {
  template: (typeof nodeTemplates)[0];
  onDragStart: (event: React.DragEvent, nodeType: string, label: string) => void;
}

function NodePaletteItem({ template, onDragStart }: NodePaletteItemProps) {
  const config = colorConfig[template.color];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, template.type, template.label)}
      className={`
        group flex items-center gap-3 p-3 rounded-xl border cursor-grab
        transition-all duration-200 active:cursor-grabbing active:scale-[0.98]
        ${config.bg} ${config.border} ${config.glow}
      `}
    >
      <div className={`w-9 h-9 rounded-lg ${config.icon} flex items-center justify-center transition-transform group-hover:scale-110`}>
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{template.label}</div>
        <div className="text-[11px] text-text-tertiary truncate">{template.description}</div>
      </div>
      {/* Drag indicator */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          className="w-4 h-4 text-text-tertiary"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>
    </div>
  );
}
