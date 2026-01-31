#!/usr/bin/env bun
/**
 * IB Dashboard Ingestion Pipeline
 * Processes 50 URLs: SEC filings, earnings releases, and news articles
 * for NVDA, AAPL, TSLA, MSFT, and AMD.
 *
 * Steps per URL:
 * 1. Fetch content via Firecrawl
 * 2. Extract/summarize via OpenAI (gpt-4o-mini)
 * 3. Chunk into ~500 word pieces
 * 4. Embed with Voyage AI voyage-finance-2 (1024 dims)
 * 5. Store in MongoDB (filings, earnings, or news_archive)
 */

import { MongoClient, type Db } from "mongodb";
import Firecrawl from "@mendable/firecrawl-js";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type DocType = "filing" | "earnings" | "news";

interface UrlEntry {
  url: string;
  ticker: string;
  docType: DocType;
  collection: "filings" | "earnings" | "news_archive";
  meta: Record<string, any>;
}

// ──────────────────────────────────────────────
// URL Definitions (ordered: earnings → filings → news)
// ──────────────────────────────────────────────

const URLS: UrlEntry[] = [
  // ─── EARNINGS RELEASES (process first) ───
  {
    url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581025000207/q2fy26pr.htm",
    ticker: "NVDA",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q2", fiscal_year: "FY26", filing_type: "Earnings Release" },
  },
  {
    url: "https://www.microsoft.com/en-us/investor/earnings/fy-2025-q4/press-release-webcast",
    ticker: "MSFT",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q4", fiscal_year: "FY25", filing_type: "Earnings Release" },
  },
  {
    url: "https://news.microsoft.com/source/2025/07/30/microsoft-cloud-and-ai-strength-fuels-fourth-quarter-results/",
    ticker: "MSFT",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q4", fiscal_year: "FY25", filing_type: "Earnings Summary" },
  },
  {
    url: "https://www.microsoft.com/en-us/investor/earnings/fy-2025-q1/intelligent-cloud-performance",
    ticker: "MSFT",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q1", fiscal_year: "FY25", filing_type: "Cloud Performance" },
  },
  {
    url: "https://www.microsoft.com/en-us/investor/earnings/fy-2025-q3/intelligent-cloud-performance",
    ticker: "MSFT",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q3", fiscal_year: "FY25", filing_type: "Cloud Performance" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/789019/000095017025010484/msft-ex99_1.htm",
    ticker: "MSFT",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q2", fiscal_year: "FY25", filing_type: "8-K Exhibit Earnings PR" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/2488/000000248825000009/q42024991.htm",
    ticker: "AMD",
    docType: "earnings",
    collection: "earnings",
    meta: { quarter: "Q4", fiscal_year: "FY24", filing_type: "Earnings Release" },
  },

  // ─── SEC FILINGS (process second) ───
  {
    url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000029/nvda-20240128.htm",
    ticker: "NVDA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY24", filed_date: "2024-01-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581025000116/nvda-20250427.htm",
    ticker: "NVDA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q1 FY26", filed_date: "2025-04-27" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000316/nvda-20241027.htm",
    ticker: "NVDA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q3 FY25", filed_date: "2024-10-27" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
    ticker: "AAPL",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY25", filed_date: "2025-09-27" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000073/aapl-20250628.htm",
    ticker: "AAPL",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q3 FY25", filed_date: "2025-06-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm",
    ticker: "AAPL",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY24", filed_date: "2024-09-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000008/aapl-20241228.htm",
    ticker: "AAPL",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q1 FY25", filed_date: "2024-12-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/1318605/000162828025003063/tsla-20241231.htm",
    ticker: "TSLA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY24", filed_date: "2024-12-31" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/1318605/000162828025035806/tsla-20250630.htm",
    ticker: "TSLA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q2 2025", filed_date: "2025-06-30" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/1318605/000162828025045968/tsla-20250930.htm",
    ticker: "TSLA",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q3 2025", filed_date: "2025-09-30" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/789019/000095017025100235/msft-20250630.htm",
    ticker: "MSFT",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY25", filed_date: "2025-06-30" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/789019/000095017024118967/msft-20240930.htm",
    ticker: "MSFT",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q1 FY25", filed_date: "2024-09-30" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/2488/000000248825000012/amd-20241228.htm",
    ticker: "AMD",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-K", period: "FY24", filed_date: "2024-12-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/2488/000000248825000108/amd-20250628.htm",
    ticker: "AMD",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q2 FY25", filed_date: "2025-06-28" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/2488/000000248825000047/amd-20250329.htm",
    ticker: "AMD",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "10-Q", period: "Q1 FY25", filed_date: "2025-03-29" },
  },
  {
    url: "https://www.sec.gov/Archives/edgar/data/2488/000000248825000039/amd-20250415.htm",
    ticker: "AMD",
    docType: "filing",
    collection: "filings",
    meta: { filing_type: "8-K", period: "FY25", filed_date: "2025-04-15" },
  },

  // ─── NEWS / ANALYSIS (process third) ───
  {
    url: "https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Kicks-Off-the-Next-Generation-of-AI-With-Rubin--Six-New-Chips-One-Incredible-AI-Supercomputer/default.aspx",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "NVIDIA Investor Relations", published_at: "2026-01-06", categories: ["product launch", "AI chips", "Rubin"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/24/nvidia-buying-ai-chip-startup-groq-for-about-20-billion-biggest-deal.html",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-24", categories: ["M&A", "Groq acquisition"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/19/us-launches-review-of-advanced-nvidia-ai-chip-sales-to-china-reuters.html",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-19", categories: ["export controls", "china", "H200"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/22/nvidia-aims-to-begin-h200-chip-shipments-to-china-by-mid-february-.html",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-22", categories: ["export controls", "china", "H200"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/10/nvidia-report-china-deepseek-ai-blackwell-chips.html",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-10", categories: ["china", "DeepSeek", "Blackwell"] },
  },
  {
    url: "https://www.trendforce.com/news/2025/12/05/news-us-lawmakers-seek-30-month-ban-on-advanced-ai-chips-to-china-hitting-nvidia-h200-and-blackwell/",
    ticker: "NVDA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "TrendForce", published_at: "2025-12-05", categories: ["export controls", "SAFE Chips Act", "legislation"] },
  },
  {
    url: "https://www.cnbc.com/2026/01/29/apple-acquires-israeli-startup-qai-.html",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2026-01-29", categories: ["M&A", "AI", "Q.ai acquisition"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/17/apple-ai-delay-siri.html",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-17", categories: ["AI", "Siri", "Apple Intelligence"] },
  },
  {
    url: "https://www.cnbc.com/2025/12/30/apple-intelligence-ai-siri-iphone.html",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2025-12-30", categories: ["AI", "Apple Intelligence", "2026 outlook"] },
  },
  {
    url: "https://www.apple.com/newsroom/2025/06/apple-intelligence-gets-even-more-powerful-with-new-capabilities-across-apple-devices/",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Apple Newsroom", published_at: "2025-06-09", categories: ["AI", "Apple Intelligence", "WWDC25"] },
  },
  {
    url: "https://www.apple.com/newsroom/topics/apple-intelligence/",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Apple Newsroom", published_at: "2025-06-01", categories: ["AI", "Apple Intelligence"] },
  },
  {
    url: "https://finance.yahoo.com/news/apple-spent-2025-setting-itself-up-for-the-future--and-its-biggest-moves-werent-about-ai-211525196.html",
    ticker: "AAPL",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Yahoo Finance", published_at: "2025-12-28", categories: ["year review", "strategy"] },
  },
  {
    url: "https://www.cnbc.com/2026/01/14/musk-tesla-full-self-driving-subscription-fsd.html",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CNBC", published_at: "2026-01-14", categories: ["FSD", "subscription", "autonomous"] },
  },
  {
    url: "https://insideevs.com/news/783157/musk-promises-2025-eoy-robotaxis/",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "InsideEVs", published_at: "2025-12-15", categories: ["robotaxi", "promises", "timeline"] },
  },
  {
    url: "https://insideevs.com/news/785765/tesla-fsd-subs-2025-finances/",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "InsideEVs", published_at: "2025-12-20", categories: ["FSD", "subscribers", "financials"] },
  },
  {
    url: "https://www.tesla.com/robotaxi",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Tesla", published_at: "2025-01-01", categories: ["robotaxi", "product page"] },
  },
  {
    url: "https://www.tesla.com/fsd",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Tesla", published_at: "2025-01-01", categories: ["FSD", "product page"] },
  },
  {
    url: "https://carboncredits.com/tesla-tests-driverless-robotaxis-in-austin-while-analysts-predict-1-million-by-2035-growth-sending-stocks-up/",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "CarbonCredits", published_at: "2025-12-01", categories: ["robotaxi", "Austin", "growth projections"] },
  },
  {
    url: "https://www.ainvest.com/news/tesla-unsupervised-robotaxi-progress-implications-autonomous-mobility-market-2512/",
    ticker: "TSLA",
    docType: "news",
    collection: "news_archive",
    meta: { source: "AInvest", published_at: "2025-12-01", categories: ["robotaxi", "analysis", "autonomous market"] },
  },
  {
    url: "https://www.microsoft.com/investor/reports/ar25/index.html",
    ticker: "MSFT",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Microsoft", published_at: "2025-10-01", categories: ["annual report", "FY25"] },
  },
  {
    url: "https://www.datacenterdynamics.com/en/news/microsoft-azure-brought-in-75bn-for-fy2025-company-deployed-2gw-data-center-capacity/",
    ticker: "MSFT",
    docType: "news",
    collection: "news_archive",
    meta: { source: "DataCenterDynamics", published_at: "2025-07-30", categories: ["Azure", "cloud revenue", "data centers"] },
  },
  {
    url: "https://msdynamicsworld.com/story/microsoft-azure-2025-year-review",
    ticker: "MSFT",
    docType: "news",
    collection: "news_archive",
    meta: { source: "MSDynamicsWorld", published_at: "2025-12-20", categories: ["Azure", "year review", "analysis"] },
  },
  {
    url: "https://finance.yahoo.com/news/amd-reveals-new-ai-pc-chips-details-next-gen-data-center-chips-at-ces-2026-041117636.html",
    ticker: "AMD",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Yahoo Finance", published_at: "2026-01-06", categories: ["CES 2026", "MI500", "AI chips"] },
  },
  {
    url: "https://finance.yahoo.com/news/analyst-says-advanced-micro-devices-171220199.html",
    ticker: "AMD",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Yahoo Finance", published_at: "2025-12-15", categories: ["analyst upgrade", "KeyBanc", "price target"] },
  },
  {
    url: "https://www.technewsworld.com/story/amds-ai-surge-challenges-nvidias-dominance-179781.html",
    ticker: "AMD",
    docType: "news",
    collection: "news_archive",
    meta: { source: "TechNewsWorld", published_at: "2025-12-01", categories: ["AI competition", "NVIDIA vs AMD"] },
  },
  {
    url: "https://mlq.ai/research/ai-chips/",
    ticker: "AMD",
    docType: "news",
    collection: "news_archive",
    meta: { source: "MLQ", published_at: "2025-11-01", categories: ["AI chip market", "deep dive", "analysis"] },
  },
  {
    url: "https://www.fool.com/investing/2025/10/24/advanced-micro-devices-amd-new-growth-ai/",
    ticker: "AMD",
    docType: "news",
    collection: "news_archive",
    meta: { source: "Motley Fool", published_at: "2025-10-24", categories: ["AI growth", "investment analysis"] },
  },
];

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "ib_dashboard";

const MAX_CONTENT_LENGTH = 80_000; // chars to send to LLM
const CHUNK_TARGET_WORDS = 500;
const EMBEDDING_BATCH_SIZE = 50; // chunks per embedding request (OpenAI allows up to 2048)
const PARALLEL_BATCH_SIZE = 5; // process 5 URLs in parallel

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

const stats = {
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  totalChunks: 0,
  totalDocs: 0,
  errors: [] as { url: string; error: string }[],
};

// ──────────────────────────────────────────────
// 1. FETCH — Firecrawl
// ──────────────────────────────────────────────

const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

async function fetchContent(url: string): Promise<string | null> {
  try {
    // v2 API: scrape() returns Document directly
    const doc = await firecrawl.scrape(url, {
      formats: ["markdown"],
      timeout: 60_000,
    });
    const md = doc.markdown || "";
    if (!md || md.length < 100) {
      console.log(`    ⚠ Content too short (${md.length} chars)`);
      return null;
    }
    console.log(`    ✓ Fetched ${md.length.toLocaleString()} chars`);
    return md;
  } catch (err: any) {
    console.log(`    ⚠ Fetch error: ${err.message}`);
    return null;
  }
}

// ──────────────────────────────────────────────
// 2. EXTRACT — OpenAI gpt-4o-mini
// ──────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userContent: string): Promise<any> {
  const truncated = userContent.slice(0, MAX_CONTENT_LENGTH);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: truncated },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function extractFiling(content: string, entry: UrlEntry): Promise<any> {
  const prompt = `You are a financial analyst. Extract key sections from this SEC filing.
Return JSON with this exact structure:
{
  "sections": [
    {
      "section_name": "Business Overview" | "Risk Factors" | "MD&A" | "Financial Highlights" | "Other Important",
      "content": "the extracted text for this section, keep the important details, numbers, and context (1000-3000 words per section)"
    }
  ],
  "summary": "A 2-3 sentence summary of the entire filing"
}
Extract only the most important sections. Focus on: revenue segments, guidance, competitive risks, regulatory issues, AI/technology strategy.`;

  return callOpenAI(prompt, content);
}

async function extractEarnings(content: string, entry: UrlEntry): Promise<any> {
  const prompt = `You are a financial analyst. Extract earnings data from this press release / earnings report.
Return JSON with this exact structure:
{
  "revenue": number or null (in USD, full number e.g. 46700000000),
  "eps": number or null,
  "gross_margin": number or null (as decimal e.g. 0.75),
  "guidance": "string describing forward guidance" or null,
  "key_highlights": ["array of 3-8 key bullet points"],
  "segment_breakdown": {"segment_name": revenue_number} or null,
  "summary": "2-3 sentence summary of the earnings"
}
Be precise with numbers. If a value isn't available, use null.`;

  return callOpenAI(prompt, content);
}

async function extractNews(content: string, entry: UrlEntry): Promise<any> {
  const prompt = `You are a financial news analyst. Extract key information from this article.
Return JSON with this exact structure:
{
  "headline": "the article headline",
  "summary": "2-4 sentence summary of the key points",
  "sentiment": "positive" | "negative" | "neutral",
  "categories": ["array", "of", "topic", "tags"],
  "key_facts": ["array of important facts and quotes"],
  "implications": "1-2 sentences on market/business implications"
}`;

  return callOpenAI(prompt, content);
}

// ──────────────────────────────────────────────
// 3. CHUNK — ~500 words per chunk
// ──────────────────────────────────────────────

function chunkText(text: string, targetWords: number = CHUNK_TARGET_WORDS): string[] {
  if (!text || text.trim().length === 0) return [];

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentWords = 0;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;

    if (currentWords + paraWords > targetWords * 1.3 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
      currentWords = paraWords;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
      currentWords += paraWords;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If we got no chunks from paragraph splitting, do simple word-based splitting
  if (chunks.length === 0 && text.trim().length > 0) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += targetWords) {
      chunks.push(words.slice(i, i + targetWords).join(" "));
    }
  }

  return chunks;
}

// ──────────────────────────────────────────────
// 4. EMBED — OpenAI text-embedding-3-small
// ──────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Truncate individual texts if too long (OpenAI has ~8k token limit per input)
  const truncated = texts.map((t) => t.slice(0, 8000));

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: truncated,
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Embeddings ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    allEmbeddings.push(...embeddings);

    if (i + EMBEDDING_BATCH_SIZE < texts.length) {
      await sleep(200); // rate limit courtesy
    }
  }

  return allEmbeddings;
}

// ──────────────────────────────────────────────
// 5. STORE — MongoDB
// ──────────────────────────────────────────────

async function storeFiling(
  db: Db,
  entry: UrlEntry,
  extracted: any,
  chunks: string[],
  embeddings: number[][]
): Promise<number> {
  const col = db.collection("filings");
  const docs = [];

  // Each section's chunks become separate documents
  const sections = extracted.sections || [];
  let chunkIdx = 0;

  for (const section of sections) {
    const sectionChunks = chunkText(section.content);
    for (const chunk of sectionChunks) {
      if (chunkIdx < embeddings.length) {
        docs.push({
          ticker: entry.ticker,
          filing_type: entry.meta.filing_type,
          period: entry.meta.period,
          filed_date: entry.meta.filed_date,
          section: section.section_name,
          content: chunk,
          summary: extracted.summary,
          source_url: entry.url,
          embedding: embeddings[chunkIdx],
          created_at: new Date(),
        });
        chunkIdx++;
      }
    }
  }

  // If sections didn't produce docs, fall back to raw chunks
  if (docs.length === 0) {
    for (let i = 0; i < chunks.length && i < embeddings.length; i++) {
      docs.push({
        ticker: entry.ticker,
        filing_type: entry.meta.filing_type,
        period: entry.meta.period,
        filed_date: entry.meta.filed_date,
        section: "General",
        content: chunks[i],
        summary: extracted.summary || "",
        source_url: entry.url,
        embedding: embeddings[i],
        created_at: new Date(),
      });
    }
  }

  if (docs.length > 0) {
    await col.insertMany(docs);
  }
  return docs.length;
}

async function storeEarnings(
  db: Db,
  entry: UrlEntry,
  extracted: any,
  chunks: string[],
  embeddings: number[][]
): Promise<number> {
  const col = db.collection("earnings");
  const docs = [];

  for (let i = 0; i < chunks.length && i < embeddings.length; i++) {
    docs.push({
      ticker: entry.ticker,
      quarter: entry.meta.quarter,
      fiscal_year: entry.meta.fiscal_year,
      revenue: extracted.revenue || null,
      eps: extracted.eps || null,
      gross_margin: extracted.gross_margin || null,
      guidance: extracted.guidance || null,
      key_highlights: extracted.key_highlights || [],
      segment_breakdown: extracted.segment_breakdown || null,
      content: chunks[i],
      summary: extracted.summary || "",
      source_url: entry.url,
      embedding: embeddings[i],
      created_at: new Date(),
    });
  }

  if (docs.length > 0) {
    await col.insertMany(docs);
  }
  return docs.length;
}

async function storeNews(
  db: Db,
  entry: UrlEntry,
  extracted: any,
  chunks: string[],
  embeddings: number[][]
): Promise<number> {
  const col = db.collection("news_archive");
  const docs = [];

  for (let i = 0; i < chunks.length && i < embeddings.length; i++) {
    docs.push({
      ticker: entry.ticker,
      headline: extracted.headline || "",
      summary: extracted.summary || "",
      source: entry.meta.source || "",
      published_at: entry.meta.published_at || null,
      sentiment: extracted.sentiment || "neutral",
      categories: extracted.categories || entry.meta.categories || [],
      content: chunks[i],
      source_url: entry.url,
      embedding: embeddings[i],
      created_at: new Date(),
    });
  }

  if (docs.length > 0) {
    await col.insertMany(docs);
  }
  return docs.length;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// MAIN PIPELINE
// ──────────────────────────────────────────────

async function processUrl(db: Db, entry: UrlEntry, index: number): Promise<void> {
  const label = `[${index + 1}/${URLS.length}]`;
  console.log(`\n${label} ${entry.ticker} | ${entry.docType} | ${entry.meta.filing_type || entry.meta.source || ""}`);
  console.log(`    URL: ${entry.url}`);

  // Check if already ingested
  const existing = await db.collection(entry.collection).findOne({ source_url: entry.url });
  if (existing) {
    console.log(`    ⏭ Already ingested — skipping`);
    stats.skipped++;
    stats.processed++;
    return;
  }

  // 1. Fetch
  const content = await fetchContent(entry.url);
  if (!content) {
    stats.failed++;
    stats.processed++;
    stats.errors.push({ url: entry.url, error: "Fetch failed" });
    return;
  }

  // 2. Extract
  console.log(`    Extracting with GPT-4o-mini...`);
  let extracted: any;
  try {
    switch (entry.docType) {
      case "filing":
        extracted = await extractFiling(content, entry);
        break;
      case "earnings":
        extracted = await extractEarnings(content, entry);
        break;
      case "news":
        extracted = await extractNews(content, entry);
        break;
    }
    console.log(`    ✓ Extraction complete`);
  } catch (err: any) {
    console.log(`    ⚠ Extraction error: ${err.message}`);
    stats.failed++;
    stats.processed++;
    stats.errors.push({ url: entry.url, error: `Extract: ${err.message}` });
    return;
  }

  // 3. Chunk
  let allChunks: string[];
  if (entry.docType === "filing" && extracted.sections) {
    // Chunk each section separately
    allChunks = [];
    for (const section of extracted.sections) {
      allChunks.push(...chunkText(section.content));
    }
  } else if (entry.docType === "earnings") {
    // For earnings, create a rich text representation and chunk it
    const earningsText = [
      extracted.summary || "",
      extracted.guidance ? `Guidance: ${extracted.guidance}` : "",
      ...(extracted.key_highlights || []).map((h: string) => `• ${h}`),
      content.slice(0, 10_000), // Also include raw content for context
    ]
      .filter(Boolean)
      .join("\n\n");
    allChunks = chunkText(earningsText);
  } else {
    // News: chunk the raw content
    allChunks = chunkText(content);
  }

  if (allChunks.length === 0) {
    console.log(`    ⚠ No chunks generated — skipping`);
    stats.failed++;
    stats.processed++;
    stats.errors.push({ url: entry.url, error: "No chunks" });
    return;
  }
  console.log(`    ✓ ${allChunks.length} chunks`);

  // 4. Embed
  console.log(`    Embedding ${allChunks.length} chunks with voyage-finance-2...`);
  let embeddings: number[][];
  try {
    embeddings = await embedTexts(allChunks);
    console.log(`    ✓ Embedded (${embeddings[0]?.length || 0} dims)`);
  } catch (err: any) {
    console.log(`    ⚠ Embedding error: ${err.message}`);
    stats.failed++;
    stats.processed++;
    stats.errors.push({ url: entry.url, error: `Embed: ${err.message}` });
    return;
  }

  // 5. Store
  let storedCount = 0;
  try {
    switch (entry.docType) {
      case "filing":
        storedCount = await storeFiling(db, entry, extracted, allChunks, embeddings);
        break;
      case "earnings":
        storedCount = await storeEarnings(db, entry, extracted, allChunks, embeddings);
        break;
      case "news":
        storedCount = await storeNews(db, entry, extracted, allChunks, embeddings);
        break;
    }
    console.log(`    ✓ Stored ${storedCount} documents → ${entry.collection}`);
    stats.succeeded++;
    stats.totalChunks += allChunks.length;
    stats.totalDocs += storedCount;
  } catch (err: any) {
    console.log(`    ⚠ Store error: ${err.message}`);
    stats.failed++;
    stats.errors.push({ url: entry.url, error: `Store: ${err.message}` });
  }

  stats.processed++;
}

function printProgress() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`PROGRESS: ${stats.processed}/${URLS.length} URLs processed`);
  console.log(`  ✓ Succeeded: ${stats.succeeded}`);
  console.log(`  ⏭ Skipped:   ${stats.skipped}`);
  console.log(`  ✗ Failed:    ${stats.failed}`);
  console.log(`  📦 Total docs stored: ${stats.totalDocs}`);
  console.log(`  🧩 Total chunks: ${stats.totalChunks}`);
  if (stats.errors.length > 0) {
    console.log(`  Errors:`);
    for (const e of stats.errors.slice(-5)) {
      console.log(`    - ${e.url.slice(0, 60)}... → ${e.error}`);
    }
  }
  console.log(`${"═".repeat(60)}\n`);
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  IB Dashboard Ingestion Pipeline                          ║");
  console.log("║  50 URLs → Firecrawl → GPT-4o-mini → OpenAI Embed → Mongo ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Validate env vars
  const missing = [];
  if (!OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!FIRECRAWL_API_KEY) missing.push("FIRECRAWL_API_KEY");
  if (!MONGODB_URI) missing.push("MONGODB_URI");
  if (missing.length > 0) {
    console.error(`❌ Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Connect to MongoDB
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  console.log(`✓ Connected to database: ${MONGODB_DB}\n`);

  // Ensure collections exist
  const existingCols = (await db.listCollections().toArray()).map((c) => c.name);
  for (const col of ["filings", "earnings", "news_archive"]) {
    if (!existingCols.includes(col)) {
      await db.createCollection(col);
      console.log(`✓ Created collection: ${col}`);
    }
  }

  console.log(`\nProcessing ${URLS.length} URLs (${PARALLEL_BATCH_SIZE} in parallel)...`);
  console.log(`  Earnings releases: ${URLS.filter((u) => u.docType === "earnings").length}`);
  console.log(`  SEC filings:       ${URLS.filter((u) => u.docType === "filing").length}`);
  console.log(`  News/analysis:     ${URLS.filter((u) => u.docType === "news").length}`);

  // Process URLs in parallel batches
  for (let i = 0; i < URLS.length; i += PARALLEL_BATCH_SIZE) {
    const batch = URLS.slice(i, i + PARALLEL_BATCH_SIZE);
    await Promise.all(batch.map((entry, idx) => processUrl(db, entry, i + idx)));

    // Progress report every 10 URLs
    if ((i + PARALLEL_BATCH_SIZE) % 10 === 0 || i + PARALLEL_BATCH_SIZE >= URLS.length) {
      printProgress();
    }
  }

  // Final report
  console.log("\n\n");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  INGESTION COMPLETE                                 ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  printProgress();

  // Show collection counts
  for (const col of ["filings", "earnings", "news_archive"]) {
    const count = await db.collection(col).countDocuments();
    console.log(`  ${col}: ${count} documents`);
  }

  await client.close();
  console.log("\n✓ Done. MongoDB connection closed.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
