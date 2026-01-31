import { Hono } from 'hono';
import { FirecrawlBubble } from '../bubbles/FirecrawlBubble';
import { ResendBubble } from '../bubbles/ResendBubble';
import { ReductoBubble } from '../bubbles/ReductoBubble';
import { MongoRAGBubble } from '../bubbles/MongoRAGBubble';

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

// Test MongoRAG vector search
testRouter.post('/mongo-rag', async (c) => {
  const { ticker, query, collections, topK } = await c.req.json();

  if (!ticker) {
    return c.json({ error: 'ticker is required' }, 400);
  }

  console.log(`[Test] MongoRAG search for ticker: ${ticker}`);

  try {
    const mongoRag = new MongoRAGBubble({
      ticker,
      query,
      collections,
      topK,
    });

    const result = await mongoRag.action();
    return c.json(result);
  } catch (error) {
    console.error('[Test] MongoRAG error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Check env vars
testRouter.get('/env-check', (c) => {
  return c.json({
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    reducto: !!process.env.REDUCTO_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    voyage: !!process.env.VOYAGE_API_KEY,
    mongodb: !!process.env.MONGODB_URI,
    apiBaseUrl: process.env.API_BASE_URL || 'not set (using localhost:3001)',
  });
});

// Test dashboard update with mock workflow data
testRouter.post('/dashboard-update', async (c) => {
  const { ticker = 'AAPL' } = await c.req.json();

  // Import the workflow engine to test the updateDashboard method
  const { workflowEngine } = await import('../services/workflowEngine');

  // Simulate realistic inputs from workflow nodes
  const mockInputs = {
    // Firecrawl news results
    'fc-news': {
      data: {
        results: [
          {
            url: 'https://reuters.com/technology/nvidia-ai-chip-demand',
            title: `${ticker} Reports Record Revenue Amid AI Boom`,
            description: `${ticker} shares surge as quarterly earnings beat analyst expectations. The company reported strong growth driven by AI infrastructure demand.`,
          },
          {
            url: 'https://bloomberg.com/markets/stocks',
            title: `Wall Street Upgrades ${ticker} to Buy Rating`,
            description: 'Multiple analysts upgrade the stock citing strong fundamentals and growth prospects in emerging markets.',
          },
          {
            url: 'https://cnbc.com/investing',
            title: `${ticker} Announces Strategic Partnership`,
            description: 'New partnership expected to drive significant revenue growth over the next fiscal year.',
          },
        ],
      },
    },
    // Reducto extracted financial data
    'reducto-1': {
      data: {
        extracted: {
          company_name: ticker,
          fiscal_period: 'Q4 2024',
          revenue: '$35.1B',
          revenue_yoy_change: '+122%',
          net_income: '$18.5B',
          earnings_per_share: '4.93',
          gross_margin: '76.0%',
          guidance: 'Management raised full-year guidance citing continued strong demand for AI accelerators and data center products.',
          key_highlights: [
            'Data center revenue grew 279% year-over-year',
            'Gaming segment returned to growth with 15% increase',
            'Automotive revenue reached $326M, up 21%',
          ],
        },
      },
    },
    // AI analysis
    'ai-combine': {
      data: {
        response: `## Executive Summary
${ticker} demonstrates exceptional financial performance with record-breaking revenue growth. The company's dominant position in AI infrastructure positions it well for continued outperformance.

## Key Metrics
- Revenue: $35.1B (+122% YoY)
- EPS: $4.93 (beat estimates by 15%)
- Gross Margin: 76.0%

## Investment Recommendation
**BUY** with high conviction. The company's technological moat in AI accelerators, combined with expanding enterprise adoption, supports continued price appreciation. Target price: $1,200.

## Risk Factors
- Geopolitical tensions affecting supply chain
- Potential market saturation in gaming segment
- Regulatory scrutiny in key markets`,
      },
    },
    // Approval node findings
    'approval-1': {
      findings: {
        'AI Analysis': `Comprehensive research completed for ${ticker}. Strong fundamentals with bullish outlook. Key catalysts include AI infrastructure expansion and new product launches.`,
        ticker,
      },
    },
  };

  // Call the workflow engine's executeActionNode which calls updateDashboard
  // We need to test through the action node path
  try {
    const result = await (workflowEngine as any).executeActionNode(
      { actionType: 'dashboard' },
      mockInputs
    );

    return c.json({
      success: true,
      message: `Dashboard updated with comprehensive ${ticker} data`,
      result,
      inputNodes: Object.keys(mockInputs),
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export { testRouter };
