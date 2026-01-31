import { Hono } from 'hono';
import { workflowEngine } from '../services/workflowEngine';

export const executeRouter = new Hono();

// Execute a workflow with custom trigger data
executeRouter.post('/', async (c) => {
  const body = await c.req.json();

  const { nodes, edges, triggerData, businessContext } = body;

  if (!nodes || !edges) {
    return c.json({ error: 'Workflow nodes and edges are required' }, 400);
  }

  if (!triggerData) {
    return c.json({ error: 'Trigger data is required' }, 400);
  }

  try {
    const result = await workflowEngine.executeFromGraph(
      nodes,
      edges,
      triggerData,
      businessContext
    );

    return c.json({
      success: true,
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Workflow execution failed:', error);
    return c.json(
      {
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Execute a single node (for testing)
executeRouter.post('/node', async (c) => {
  const body = await c.req.json();

  const { node, inputs } = body;

  if (!node) {
    return c.json({ error: 'Node is required' }, 400);
  }

  try {
    // Create a minimal workflow with just this node
    const result = await workflowEngine.executeFromGraph(
      [node],
      [],
      inputs || {},
      undefined
    );

    return c.json({
      success: true,
      result: result[node.id],
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Node execution failed:', error);
    return c.json(
      {
        error: 'Node execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Validate a workflow (check for cycles, missing connections, etc.)
executeRouter.post('/validate', async (c) => {
  const body = await c.req.json();

  const { nodes, edges } = body;

  if (!nodes || !edges) {
    return c.json({ error: 'Workflow nodes and edges are required' }, 400);
  }

  const issues: string[] = [];

  // Check for trigger node
  const hasTrigger = nodes.some((n: { type: string }) => n.type === 'trigger');
  if (!hasTrigger) {
    issues.push('Workflow must have at least one trigger node');
  }

  // Check for orphan nodes (no incoming or outgoing edges)
  const nodeIds = new Set(nodes.map((n: { id: string }) => n.id));
  const connectedNodes = new Set<string>();

  edges.forEach((e: { source: string; target: string }) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  nodes.forEach((n: { id: string; type: string }) => {
    if (n.type !== 'trigger' && !connectedNodes.has(n.id)) {
      issues.push(`Node "${n.id}" has no connections`);
    }
  });

  // Check for invalid edge references
  edges.forEach((e: { id: string; source: string; target: string }) => {
    if (!nodeIds.has(e.source)) {
      issues.push(`Edge "${e.id}" references non-existent source node "${e.source}"`);
    }
    if (!nodeIds.has(e.target)) {
      issues.push(`Edge "${e.id}" references non-existent target node "${e.target}"`);
    }
  });

  // Check for cycles (simple detection)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoing = edges
      .filter((e: { source: string }) => e.source === nodeId)
      .map((e: { target: string }) => e.target);

    for (const next of outgoing) {
      if (!visited.has(next)) {
        if (hasCycle(next)) return true;
      } else if (recursionStack.has(next)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        issues.push('Workflow contains a cycle');
        break;
      }
    }
  }

  return c.json({
    valid: issues.length === 0,
    issues,
  });
});
