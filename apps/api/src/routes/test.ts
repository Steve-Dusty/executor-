import { Hono } from 'hono';
import { FirecrawlBubble } from '../bubbles/FirecrawlBubble';
import { ResendBubble } from '../bubbles/ResendBubble';
import { ReductoBubble } from '../bubbles/ReductoBubble';

const testRouter = new Hono();

// Test Firecrawl scrape
testRouter.post('/firecrawl/scrape', async (c) => {
  const { url, actions } = await c.req.json();

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  console.log(`[Test] Firecrawl scrape: ${url}`);

  const firecrawl = new FirecrawlBubble({
    mode: 'scrape',
    url,
    formats: ['markdown'],
    actions,
  });

  const result = await firecrawl.action();
  return c.json(result);
});

// Test Firecrawl search
testRouter.post('/firecrawl/search', async (c) => {
  const { query, limit = 5 } = await c.req.json();

  if (!query) {
    return c.json({ error: 'Query is required' }, 400);
  }

  console.log(`[Test] Firecrawl search: "${query}"`);

  const firecrawl = new FirecrawlBubble({
    mode: 'search',
    query,
    limit,
  });

  const result = await firecrawl.action();
  return c.json(result);
});

// Test Firecrawl crawl
testRouter.post('/firecrawl/crawl', async (c) => {
  const { url, limit = 3 } = await c.req.json();

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  console.log(`[Test] Firecrawl crawl: ${url}`);

  const firecrawl = new FirecrawlBubble({
    mode: 'crawl',
    url,
    limit,
    formats: ['markdown'],
  });

  const result = await firecrawl.action();
  return c.json(result);
});

// Test Firecrawl extract (AI-powered structured extraction)
testRouter.post('/firecrawl/extract', async (c) => {
  const { url, urls, schema, prompt } = await c.req.json();

  if (!url && !urls) {
    return c.json({ error: 'URL or URLs required' }, 400);
  }
  if (!schema && !prompt) {
    return c.json({ error: 'Schema or prompt required' }, 400);
  }

  console.log(`[Test] Firecrawl extract: ${url || urls}`);

  const firecrawl = new FirecrawlBubble({
    mode: 'extract',
    url,
    urls,
    schema,
    prompt,
  });

  const result = await firecrawl.action();
  return c.json(result);
});

// Test Firecrawl map (discover all URLs)
testRouter.post('/firecrawl/map', async (c) => {
  const { url, limit = 100 } = await c.req.json();

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  console.log(`[Test] Firecrawl map: ${url}`);

  const firecrawl = new FirecrawlBubble({
    mode: 'map',
    url,
    limit,
  });

  const result = await firecrawl.action();
  return c.json(result);
});

// Test Reducto parse (with polling)
testRouter.post('/reducto/parse', async (c) => {
  const { documentUrl, waitForCompletion = true } = await c.req.json();

  if (!documentUrl) {
    return c.json({ error: 'documentUrl is required' }, 400);
  }

  console.log(`[Test] Reducto parse: ${documentUrl}`);

  const reducto = new ReductoBubble({
    mode: 'parse',
    documentUrl,
    waitForCompletion,
    maxWaitMs: 60000,
  });

  const result = await reducto.action();
  return c.json(result);
});

// Test Reducto extract
testRouter.post('/reducto/extract', async (c) => {
  const { documentUrl, schema, waitForCompletion = true } = await c.req.json();

  if (!documentUrl || !schema) {
    return c.json({ error: 'documentUrl and schema are required' }, 400);
  }

  console.log(`[Test] Reducto extract: ${documentUrl}`);

  const reducto = new ReductoBubble({
    mode: 'extract',
    documentUrl,
    schema,
    waitForCompletion,
  });

  const result = await reducto.action();
  return c.json(result);
});

// Test Resend email
testRouter.post('/resend/send', async (c) => {
  const { to, subject, content } = await c.req.json();

  if (!to || !subject) {
    return c.json({ error: 'to and subject are required' }, 400);
  }

  console.log(`[Test] Resend email to: ${to}`);

  const resend = new ResendBubble({
    to,
    subject,
    contentHtml: content || '<p>Test email from workflow system</p>',
  });

  const result = await resend.action();
  return c.json(result);
});

// Test Resend approval email
testRouter.post('/resend/approval', async (c) => {
  const { to, runId, data } = await c.req.json();

  if (!to) {
    return c.json({ error: 'to is required' }, 400);
  }

  const testRunId = runId || `test-${Date.now()}`;
  console.log(`[Test] Resend approval email to: ${to}, runId: ${testRunId}`);

  const resend = new ResendBubble({
    to,
    subject: '🔔 Approval Required: Workflow Update',
    approvalMode: true,
    runId: testRunId,
    approvalData: data || {
      action: 'Update stock prices',
      source: 'Yahoo Finance',
      affectedComponents: ['stock-ticker', 'price-chart'],
      timestamp: new Date().toISOString(),
    },
  });

  const result = await resend.action();
  return c.json({ ...result, runId: testRunId });
});

// Check env vars
testRouter.get('/env-check', (c) => {
  return c.json({
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    reducto: !!process.env.REDUCTO_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    apiBaseUrl: process.env.API_BASE_URL || 'not set (using localhost:3001)',
  });
});

export { testRouter };
