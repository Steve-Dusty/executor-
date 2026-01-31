import { Hono } from 'hono';

export const dashboardRouter = new Hono();

// Dashboard content store - this is what the workflow updates
export let dashboardContent = {
  stockPrices: [
    { symbol: 'AAPL', price: 178.72, change: 2.34, changePercent: 1.33, volume: '52.3M', high: 179.89, low: 176.21 },
    { symbol: 'MSFT', price: 378.91, change: -1.23, changePercent: -0.32, volume: '18.7M', high: 381.20, low: 377.45 },
    { symbol: 'GOOGL', price: 141.80, change: 3.45, changePercent: 2.49, volume: '24.1M', high: 142.50, low: 138.90 },
    { symbol: 'NVDA', price: 875.28, change: 12.67, changePercent: 1.47, volume: '41.2M', high: 882.00, low: 860.15 },
    { symbol: 'AMZN', price: 178.25, change: -0.89, changePercent: -0.50, volume: '31.8M', high: 180.10, low: 177.30 },
    { symbol: 'META', price: 505.95, change: 8.23, changePercent: 1.65, volume: '12.4M', high: 508.70, low: 497.80 },
  ],
  portfolioStats: {
    totalValue: 2847293.45,
    dayChange: 34521.89,
    dayChangePercent: 1.23,
    totalReturn: 847293.45,
    totalReturnPercent: 42.36,
    sharpeRatio: 1.87,
    beta: 1.12,
    alpha: 3.24,
  },
  newsSummary: [
    {
      id: '1',
      headline: 'Fed Signals Potential Rate Cuts in Q2 2024',
      summary: 'Federal Reserve Chair indicates monetary policy shift as inflation shows signs of cooling. Markets respond positively to dovish commentary.',
      source: 'Reuters',
      timestamp: '2 min ago',
      sentiment: 'bullish' as const,
      relevance: 98,
    },
    {
      id: '2',
      headline: 'NVIDIA Reports Record Data Center Revenue',
      summary: 'AI chip demand continues to surge as enterprise adoption accelerates. Revenue beats estimates by 12%.',
      source: 'Bloomberg',
      timestamp: '15 min ago',
      sentiment: 'bullish' as const,
      relevance: 95,
    },
    {
      id: '3',
      headline: 'European Markets Face Headwinds Amid ECB Policy',
      summary: 'Uncertainty in eurozone monetary policy creates volatility. Analysts recommend defensive positioning.',
      source: 'FT',
      timestamp: '32 min ago',
      sentiment: 'bearish' as const,
      relevance: 72,
    },
  ],
  quarterlyMetrics: [
    { label: 'Revenue', value: '$24.8B', change: 12.4, trend: [18, 20, 19, 22, 24, 24.8] },
    { label: 'EBITDA', value: '$8.2B', change: 8.7, trend: [6.5, 7.0, 7.2, 7.5, 7.8, 8.2] },
    { label: 'Net Income', value: '$5.1B', change: 15.2, trend: [3.8, 4.0, 4.2, 4.5, 4.8, 5.1] },
    { label: 'EPS', value: '$4.28', change: 18.9, trend: [3.2, 3.4, 3.5, 3.8, 4.0, 4.28] },
  ],
  lastUpdated: new Date().toISOString(),
};

// WebSocket broadcast function - will be set by main server
let broadcastFn: ((message: { type: string; payload: unknown; timestamp: string }) => void) | null = null;

export function setDashboardBroadcast(fn: typeof broadcastFn) {
  broadcastFn = fn;
}

export function broadcastDashboardUpdate() {
  if (broadcastFn) {
    broadcastFn({
      type: 'DASHBOARD_UPDATE',
      payload: dashboardContent,
      timestamp: new Date().toISOString(),
    });
  }
}

// Get current dashboard content
dashboardRouter.get('/content', (c) => {
  return c.json(dashboardContent);
});

// Update dashboard content (called by workflow after approval)
dashboardRouter.post('/update', async (c) => {
  const body = await c.req.json();

  // Merge updates into dashboard content
  if (body.stockPrices) {
    dashboardContent.stockPrices = body.stockPrices;
  }
  if (body.portfolioStats) {
    dashboardContent.portfolioStats = { ...dashboardContent.portfolioStats, ...body.portfolioStats };
  }
  if (body.newsSummary) {
    dashboardContent.newsSummary = body.newsSummary;
  }
  if (body.quarterlyMetrics) {
    dashboardContent.quarterlyMetrics = body.quarterlyMetrics;
  }

  dashboardContent.lastUpdated = new Date().toISOString();

  // Broadcast update to all connected dashboard clients
  broadcastDashboardUpdate();

  console.log('[Dashboard] Content updated:', Object.keys(body).join(', '));

  return c.json({ success: true, content: dashboardContent });
});

// Update a specific stock price
dashboardRouter.post('/update-stock', async (c) => {
  const body = await c.req.json();
  const { symbol, price, change, changePercent, volume, high, low } = body;

  const stockIndex = dashboardContent.stockPrices.findIndex(s => s.symbol === symbol);

  if (stockIndex >= 0) {
    dashboardContent.stockPrices[stockIndex] = {
      ...dashboardContent.stockPrices[stockIndex],
      ...(price !== undefined && { price }),
      ...(change !== undefined && { change }),
      ...(changePercent !== undefined && { changePercent }),
      ...(volume !== undefined && { volume }),
      ...(high !== undefined && { high }),
      ...(low !== undefined && { low }),
    };
  } else {
    // Add new stock
    dashboardContent.stockPrices.push({
      symbol,
      price: price || 0,
      change: change || 0,
      changePercent: changePercent || 0,
      volume: volume || '0',
      high: high || price || 0,
      low: low || price || 0,
    });
  }

  dashboardContent.lastUpdated = new Date().toISOString();
  broadcastDashboardUpdate();

  return c.json({ success: true, stock: dashboardContent.stockPrices.find(s => s.symbol === symbol) });
});

// Add a news item
dashboardRouter.post('/add-news', async (c) => {
  const body = await c.req.json();
  const { headline, summary, source, sentiment = 'neutral', relevance = 50 } = body;

  const newItem = {
    id: `news-${Date.now()}`,
    headline,
    summary,
    source,
    timestamp: 'Just now',
    sentiment: sentiment as 'bullish' | 'bearish' | 'neutral',
    relevance,
  };

  // Add to front of news array
  dashboardContent.newsSummary.unshift(newItem);

  // Keep only latest 10 items
  if (dashboardContent.newsSummary.length > 10) {
    dashboardContent.newsSummary = dashboardContent.newsSummary.slice(0, 10);
  }

  dashboardContent.lastUpdated = new Date().toISOString();
  broadcastDashboardUpdate();

  return c.json({ success: true, news: newItem });
});

// Update quarterly metrics
dashboardRouter.post('/update-metrics', async (c) => {
  const body = await c.req.json();
  const { metrics } = body;

  if (Array.isArray(metrics)) {
    dashboardContent.quarterlyMetrics = metrics;
  }

  dashboardContent.lastUpdated = new Date().toISOString();
  broadcastDashboardUpdate();

  return c.json({ success: true, metrics: dashboardContent.quarterlyMetrics });
});

// Simulate workflow completion - updates dashboard with "processed" data
dashboardRouter.post('/simulate-workflow-update', async (c) => {
  const body = await c.req.json();
  const { ticker = 'NVDA', company = 'NVIDIA' } = body;

  // Simulate data that would come from Firecrawl + Reducto + AI processing
  const randomChange = (Math.random() - 0.3) * 10;
  const basePrice = ticker === 'NVDA' ? 875 : ticker === 'AAPL' ? 178 : 200;
  const newPrice = basePrice + randomChange;

  // Update stock price
  const stockIndex = dashboardContent.stockPrices.findIndex(s => s.symbol === ticker);
  if (stockIndex >= 0) {
    dashboardContent.stockPrices[stockIndex] = {
      ...dashboardContent.stockPrices[stockIndex],
      price: Number(newPrice.toFixed(2)),
      change: Number(randomChange.toFixed(2)),
      changePercent: Number(((randomChange / basePrice) * 100).toFixed(2)),
    };
  }

  // Add news item
  const sentiments = ['bullish', 'bearish', 'neutral'] as const;
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

  dashboardContent.newsSummary.unshift({
    id: `news-${Date.now()}`,
    headline: `${company} Stock Update - AI Analysis Complete`,
    summary: `Automated workflow completed analysis of ${company} (${ticker}). Current price: $${newPrice.toFixed(2)}. Market sentiment analysis indicates ${sentiment} outlook based on recent trading patterns.`,
    source: 'FlowForge AI',
    timestamp: 'Just now',
    sentiment,
    relevance: 95,
  });

  // Keep only latest 5 news items for cleaner demo
  dashboardContent.newsSummary = dashboardContent.newsSummary.slice(0, 5);

  dashboardContent.lastUpdated = new Date().toISOString();
  broadcastDashboardUpdate();

  return c.json({
    success: true,
    message: `Dashboard updated with ${company} data`,
    content: dashboardContent
  });
});
