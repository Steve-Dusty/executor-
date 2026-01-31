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
    description: 'Trigger on payments',
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
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5zM3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14zM14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM14 20.5c0-.83.67-1.5 1.5-1.5H17v1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5zM10 9.5c0 .83-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5zM10 3.5c0 .83-.67 1.5-1.5 1.5H7V3.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z" strokeLinecap="round" strokeLinejoin="round"/>
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
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 2v4M16 2v4M2 10h20" strokeLinecap="round" strokeLinejoin="round"/>
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
    description: 'Claude/GPT',
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

const colorClasses: Record<string, string> = {
  green: 'bg-accent-green/10 text-accent-green border-accent-green/20 hover:bg-accent-green/20 hover:border-accent-green/30',
  blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 hover:bg-accent-blue/20 hover:border-accent-blue/30',
  purple: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20 hover:bg-accent-purple/20 hover:border-accent-purple/30',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 hover:bg-accent-amber/20 hover:border-accent-amber/30',
  pink: 'bg-accent-pink/10 text-accent-pink border-accent-pink/20 hover:bg-accent-pink/20 hover:border-accent-pink/30',
};

const iconBgClasses: Record<string, string> = {
  green: 'bg-accent-green/20',
  blue: 'bg-accent-blue/20',
  purple: 'bg-accent-purple/20',
  amber: 'bg-accent-amber/20',
  pink: 'bg-accent-pink/20',
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
    <aside className="w-64 h-full glass-panel border-r border-glass-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-text-primary">Components</h2>
        <p className="text-xs text-text-tertiary mt-0.5">Drag to canvas</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-glass-border">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
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
            className="w-full bg-glass-bg border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm
                     text-text-primary placeholder:text-text-tertiary
                     focus:outline-none focus:border-accent-purple/50 focus:ring-2 focus:ring-accent-purple/20
                     transition-all"
          />
        </div>
      </div>

      {/* Node Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Triggers */}
        {groupedTemplates.triggers.length > 0 && (
          <div>
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2 px-1">
              Triggers
            </h3>
            <div className="space-y-1.5">
              {groupedTemplates.triggers.map((template, index) => (
                <NodePaletteItem
                  key={`trigger-${index}`}
                  template={template}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {groupedTemplates.actions.length > 0 && (
          <div>
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2 px-1">
              Actions
            </h3>
            <div className="space-y-1.5">
              {groupedTemplates.actions.map((template, index) => (
                <NodePaletteItem
                  key={`action-${index}`}
                  template={template}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI & Logic */}
        {groupedTemplates.ai.length > 0 && (
          <div>
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2 px-1">
              AI & Logic
            </h3>
            <div className="space-y-1.5">
              {groupedTemplates.ai.map((template, index) => (
                <NodePaletteItem
                  key={`ai-${index}`}
                  template={template}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        {groupedTemplates.output.length > 0 && (
          <div>
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2 px-1">
              Output
            </h3>
            <div className="space-y-1.5">
              {groupedTemplates.output.map((template, index) => (
                <NodePaletteItem
                  key={`output-${index}`}
                  template={template}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-sm">
            No nodes found
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-glass-border">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            <span>Triggers</span>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            <span>Actions</span>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-accent-purple" />
            <span>AI</span>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-accent-pink" />
            <span>Output</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface NodePaletteItemProps {
  template: (typeof nodeTemplates)[0];
  onDragStart: (event: React.DragEvent, nodeType: string, label: string) => void;
}

function NodePaletteItem({ template, onDragStart }: NodePaletteItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, template.type, template.label)}
      className={`
        flex items-center gap-3 p-2.5 rounded-xl border cursor-grab
        transition-all duration-200 group active:cursor-grabbing
        ${colorClasses[template.color]}
      `}
    >
      <div className={`w-8 h-8 rounded-lg ${iconBgClasses[template.color]} flex items-center justify-center`}>
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{template.label}</div>
        <div className="text-[11px] text-text-tertiary truncate">{template.description}</div>
      </div>
      <svg
        className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="5" r="1" fill="currentColor" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="19" r="1" fill="currentColor" />
        <circle cx="15" cy="5" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="15" cy="19" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}
