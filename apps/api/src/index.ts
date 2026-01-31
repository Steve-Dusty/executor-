import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRouter, addWSConnection, removeWSConnection } from './routes/webhook';
import { workflowRouter } from './routes/workflow';
import { executeRouter } from './routes/execute';
import { chatRouter } from './routes/chat';
import { testRouter } from './routes/test';
import { approveRouter } from './routes/approve';

const app = new Hono();

// Middleware
app.use('*', cors());

// Routes
app.route('/webhook', webhookRouter);
app.route('/workflow', workflowRouter);
app.route('/execute', executeRouter);
app.route('/chat', chatRouter);
app.route('/test', testRouter);
app.route('/approve', approveRouter);

// Simulation endpoints (proxied from frontend)
app.post('/simulate-payment', async (c) => {
  const body = await c.req.json();
  console.log('[Proxy] /simulate-payment received:', JSON.stringify(body));
  // Forward to webhook router's simulate endpoint
  const response = await fetch(`http://localhost:${process.env.PORT || 3001}/webhook/simulate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return c.json(await response.json());
});

app.post('/simulate-revenue-drop', async (c) => {
  const response = await fetch(`http://localhost:${process.env.PORT || 3001}/webhook/simulate-revenue-drop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return c.json(await response.json());
});

app.post('/trigger-adaptation', async (c) => {
  const response = await fetch(`http://localhost:${process.env.PORT || 3001}/webhook/trigger-adaptation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return c.json(await response.json());
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Start server with WebSocket support
const port = Number(process.env.PORT) || 3001;

console.log(`Starting server on port ${port}...`);

// Create a server reference that we can use in the fetch handler
let server: ReturnType<typeof Bun.serve>;

server = Bun.serve({
  port,
  fetch(request, serverInstance) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(request);
      if (upgraded) {
        return undefined as unknown as Response;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Handle regular HTTP requests via Hono
    return app.fetch(request, serverInstance);
  },
  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
      addWSConnection(ws);
    },
    message(ws, message) {
      console.log('WebSocket message received:', message);
    },
    close(ws) {
      console.log('WebSocket client disconnected');
      removeWSConnection(ws);
    },
  },
});

console.log(`Server running at http://localhost:${port}`);
console.log(`WebSocket available at ws://localhost:${port}/ws`);
