import { Hono } from 'hono';

export const workflowRouter = new Hono();

// In-memory storage for workflows (use DB in production)
const workflows = new Map<string, {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}>();

// Create a new workflow
workflowRouter.post('/', async (c) => {
  const body = await c.req.json();

  const workflow = {
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: body.name || 'Untitled Workflow',
    nodes: body.nodes || [],
    edges: body.edges || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  workflows.set(workflow.id, workflow);

  return c.json({ success: true, workflow });
});

// Get all workflows
workflowRouter.get('/', (c) => {
  const allWorkflows = Array.from(workflows.values());
  return c.json({ workflows: allWorkflows });
});

// Get a specific workflow
workflowRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const workflow = workflows.get(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  return c.json({ workflow });
});

// Update a workflow
workflowRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = workflows.get(id);
  if (!existing) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  const updated = {
    ...existing,
    name: body.name || existing.name,
    nodes: body.nodes || existing.nodes,
    edges: body.edges || existing.edges,
    updatedAt: new Date().toISOString(),
  };

  workflows.set(id, updated);

  return c.json({ success: true, workflow: updated });
});

// Delete a workflow
workflowRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  if (!workflows.has(id)) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  workflows.delete(id);

  return c.json({ success: true });
});

// Clone a workflow
workflowRouter.post('/:id/clone', (c) => {
  const id = c.req.param('id');
  const existing = workflows.get(id);

  if (!existing) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  const cloned = {
    ...existing,
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${existing.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  workflows.set(cloned.id, cloned);

  return c.json({ success: true, workflow: cloned });
});
