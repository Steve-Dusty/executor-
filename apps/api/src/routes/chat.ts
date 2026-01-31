import { Hono } from 'hono';
import { AIAgentBubble } from '@bubblelab/bubble-core';
import { CredentialType } from '@bubblelab/shared-schemas';

export const chatRouter = new Hono();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Conversation history per session
const conversations = new Map<string, ChatMessage[]>();

const SYSTEM_PROMPT = `You are an AI workflow builder assistant. You help users create automated workflows that respond to business events.

You can create workflows with the following node types:
1. **trigger** - Starts the workflow (types: stripe, webhook, schedule)
2. **action** - Performs an action (types: slack, notion, http, email)
3. **ai** - Uses AI to analyze/process data
4. **condition** - Branches based on a condition (expression field uses JavaScript)
5. **lovable** - Updates a Lovable website (actions: update_price, add_banner, update_inventory, change_layout)
6. **adaptation** - AI analyzes and potentially modifies the workflow based on business context

When the user describes what they want, generate a workflow as JSON with this structure:
{
  "nodes": [
    { "id": "1", "type": "trigger", "position": { "x": 250, "y": 0 }, "data": { "label": "Name", "triggerType": "stripe" } },
    { "id": "2", "type": "action", "position": { "x": 250, "y": 120 }, "data": { "label": "Name", "actionType": "slack", "channel": "#general", "message": "..." } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}

Position nodes vertically with ~120px spacing. For condition nodes, use sourceHandle "true" or "false" for branching edges.

IMPORTANT: When you create a workflow, respond with ONLY the JSON object, no markdown code blocks. If the user is just chatting, respond normally.

When the user asks to modify an existing workflow, you'll receive the current workflow in the context. Make incremental changes rather than rebuilding from scratch.`;

chatRouter.post('/', async (c) => {
  if (!process.env.OPENAI_API_KEY) {
    return c.json({ error: 'OPENAI_API_KEY is required' }, 500);
  }

  const body = await c.req.json();
  const { message, sessionId = 'default', currentWorkflow } = body;

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  // Get or create conversation history
  let history = conversations.get(sessionId) || [];

  // Build the message with context
  let userMessage = message;
  if (currentWorkflow) {
    userMessage = `Current workflow:\n${JSON.stringify(currentWorkflow, null, 2)}\n\nUser request: ${message}`;
  }

  // Add user message to history
  history.push({ role: 'user', content: userMessage });

  // Build messages for AI
  const aiMessages = [
    { role: 'user' as const, content: SYSTEM_PROMPT },
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
  ];

  try {
    const aiAgent = new AIAgentBubble({
      message: aiMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      model: {
        model: 'openai/gpt-5',
      },
      credentials: {
        [CredentialType.OPENAI_CRED]: process.env.OPENAI_API_KEY!,
      },
    });

    const result = await aiAgent.action();

    // Extract the response
    const responseText = typeof result.data === 'string'
      ? result.data
      : (result.data as { response?: string })?.response || JSON.stringify(result.data);

    // Add assistant response to history
    history.push({ role: 'assistant', content: responseText });
    conversations.set(sessionId, history);

    // Try to parse as workflow JSON
    let workflow = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
      if (jsonMatch) {
        workflow = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Not a workflow response, that's OK
    }

    return c.json({
      response: responseText,
      workflow,
      sessionId,
    });
  } catch (error) {
    console.error('[Chat] AI error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'AI request failed',
    }, 500);
  }
});

// Clear conversation history
chatRouter.delete('/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  conversations.delete(sessionId);
  return c.json({ success: true });
});

// Get conversation history
chatRouter.get('/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const history = conversations.get(sessionId) || [];
  return c.json({ history, sessionId });
});
