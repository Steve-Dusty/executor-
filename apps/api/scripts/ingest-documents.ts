#!/usr/bin/env bun
/**
 * Financial Document Ingestion Pipeline
 * Handles: SEC filings, earnings transcripts, news, analyst ratings
 *
 * Usage:
 *   bun run scripts/ingest-documents.ts --type=all
 *   bun run scripts/ingest-documents.ts --type=sec
 *   bun run scripts/ingest-documents.ts --type=earnings
 *   bun run scripts/ingest-documents.ts --type=news
 *   bun run scripts/ingest-documents.ts --type=analyst
 */

import { MongoClient, type Db } from "mongodb";
import Firecrawl from "@mendable/firecrawl-js";

// ──────────────────────────────────────────────
// Document Sources Config
// ──────────────────────────────────────────────

const DOCUMENT_SOURCES = {
  sec_filings: [
    { ticker: "AAPL", cik: "0000320193" },
    { ticker: "NVDA", cik: "0001045810" },
    { ticker: "TSLA", cik: "0001318605" },
    { ticker: "MSFT", cik: "0000789019" },
    { ticker: "GOOGL", cik: "0001652044" },
    { ticker: "AMZN", cik: "0001018724" },
    { ticker: "META", cik: "0001326801" },
  ],
  earnings_transcripts: [
    { ticker: "AAPL", url: "https://www.fool.com/earnings/call-transcripts/2024/11/01/apple-aapl-q4-2024-earnings-call-transcript/", quarter: "Q4 2024" },
    { ticker: "AAPL", url: "https://www.fool.com/earnings/call-transcripts/2024/08/02/apple-aapl-q3-2024-earnings-call-transcript/", quarter: "Q3 2024" },
    { ticker: "NVDA", url: "https://www.fool.com/earnings/call-transcripts/2024/11/21/nvidia-nvda-q3-2025-earnings-call-transcript/", quarter: "Q3 FY25" },
    { ticker: "NVDA", url: "https://www.fool.com/earnings/call-transcripts/2024/08/29/nvidia-nvda-q2-2025-earnings-call-transcript/", quarter: "Q2 FY25" },
    { ticker: "TSLA", url: "https://www.fool.com/earnings/call-transcripts/2024/10/24/tesla-tsla-q3-2024-earnings-call-transcript/", quarter: "Q3 2024" },
    { ticker: "TSLA", url: "https://www.fool.com/earnings/call-transcripts/2024/07/24/tesla-tsla-q2-2024-earnings-call-transcript/", quarter: "Q2 2024" },
    { ticker: "MSFT", url: "https://www.fool.com/earnings/call-transcripts/2024/10/31/microsoft-msft-q1-2025-earnings-call-transcript/", quarter: "Q1 FY25" },
    { ticker: "GOOGL", url: "https://www.fool.com/earnings/call-transcripts/2024/10/30/alphabet-googl-q3-2024-earnings-call-transcript/", quarter: "Q3 2024" },
    { ticker: "AMZN", url: "https://www.fool.com/earnings/call-transcripts/2024/10/31/amazon-amzn-q3-2024-earnings-call-transcript/", quarter: "Q3 2024" },
    { ticker: "META", url: "https://www.fool.com/earnings/call-transcripts/2024/10/31/meta-platforms-meta-q3-2024-earnings-call-transcript/", quarter: "Q3 2024" },
  ],
  news_sources: [
    { ticker: "AAPL", url: "https://finance.yahoo.com/quote/AAPL/news/" },
    { ticker: "NVDA", url: "https://finance.yahoo.com/quote/NVDA/news/" },
    { ticker: "TSLA", url: "https://finance.yahoo.com/quote/TSLA/news/" },
    { ticker: "MSFT", url: "https://finance.yahoo.com/quote/MSFT/news/" },
    { ticker: "GOOGL", url: "https://finance.yahoo.com/quote/GOOGL/news/" },
    { ticker: "AMZN", url: "https://finance.yahoo.com/quote/AMZN/news/" },
    { ticker: "META", url: "https://finance.yahoo.com/quote/META/news/" },
  ],
  analyst_ratings: [
    { ticker: "AAPL", url: "https://www.tipranks.com/stocks/aapl/forecast" },
    { ticker: "NVDA", url: "https://www.tipranks.com/stocks/nvda/forecast" },
    { ticker: "TSLA", url: "https://www.tipranks.com/stocks/tsla/forecast" },
    { ticker: "MSFT", url: "https://www.tipranks.com/stocks/msft/forecast" },
    { ticker: "GOOGL", url: "https://www.tipranks.com/stocks/googl/forecast" },
    { ticker: "AMZN", url: "https://www.tipranks.com/stocks/amzn/forecast" },
    { ticker: "META", url: "https://www.tipranks.com/stocks/meta/forecast" },
  ],
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type DocType = "sec_10k" | "sec_10q" | "sec_8k" | "earnings_transcript" | "news" | "analyst_rating";

interface Document {
  ticker: string;
  doc_type: DocType;
  title: string;
  content: string;
  chunk_index: number;
  date: Date | null;
  quarter: string | null;
  source_url: string;
  embedding: number[];
  created_at: Date;
}

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "ib_dashboard";

const CHUNK_TARGET_TOKENS = 500;
const PARALLEL_BATCH_SIZE = 5;
const COLLECTION_NAME = "documents";

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

const stats = {
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  totalDocs: 0,
  errors: [] as { source: string; error: string }[],
};

// ──────────────────────────────────────────────
// Firecrawl Client
// ──────────────────────────────────────────────

const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const doc = await firecrawl.scrape(url, {
      formats: ["markdown"],
      timeout: 60_000,
    });
    const md = doc.markdown || "";
    if (!md || md.length < 100) {
      return null;
    }
    return md;
  } catch (err: any) {
    console.log(`    ⚠ Fetch error: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

// ──────────────────────────────────────────────
// OpenAI Embeddings
// ──────────────────────────────────────────────

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

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

// ──────────────────────────────────────────────
// Chunking
// ──────────────────────────────────────────────

function chunkText(text: string, targetTokens: number = CHUNK_TARGET_TOKENS): string[] {
  if (!text || text.trim().length === 0) return [];

  // Approximate tokens as words * 1.3
  const targetWords = Math.floor(targetTokens / 1.3);
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

  return chunks;
}

// Chunk by speaker turns for transcripts
function chunkTranscript(text: string): string[] {
  // Split by speaker patterns like "John Smith -- CEO" or "Analyst:"
  const speakerPattern = /\n(?=[A-Z][a-zA-Z\s]+(?:--|:|\s--\s))/g;
  const turns = text.split(speakerPattern).filter((t) => t.trim().length > 50);

  // If turns are too long, further chunk them
  const chunks: string[] = [];
  for (const turn of turns) {
    if (turn.split(/\s+/).length > 600) {
      chunks.push(...chunkText(turn, 500));
    } else {
      chunks.push(turn.trim());
    }
  }

  return chunks.length > 0 ? chunks : chunkText(text, 500);
}

// ──────────────────────────────────────────────
// Deduplication Check
// ──────────────────────────────────────────────

async function documentExists(
  db: Db,
  ticker: string,
  docType: DocType,
  sourceUrl: string,
  chunkIndex: number
): Promise<boolean> {
  const existing = await db.collection(COLLECTION_NAME).findOne({
    ticker,
    doc_type: docType,
    source_url: sourceUrl,
    chunk_index: chunkIndex,
  });
  return !!existing;
}

async function urlProcessed(db: Db, sourceUrl: string): Promise<boolean> {
  const existing = await db.collection(COLLECTION_NAME).findOne({
    source_url: sourceUrl,
  });
  return !!existing;
}

// ──────────────────────────────────────────────
// SEC Filing Ingestion
// ──────────────────────────────────────────────

async function ingestSecFilings(db: Db): Promise<void> {
  console.log("\n=== Ingesting SEC Filings ===");

  for (const { ticker, cik } of DOCUMENT_SOURCES.sec_filings) {
    console.log(`\n[SEC] ${ticker} (CIK: ${cik})`);

    // Use SEC EDGAR JSON API for company filings
    const cikPadded = cik.replace(/^0+/, "").padStart(10, "0");
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;

    try {
      const res = await fetch(submissionsUrl, {
        headers: { "User-Agent": "IB-Dashboard contact@example.com" },
      });

      if (!res.ok) {
        console.log(`    ⚠ SEC API returned ${res.status}`);
        stats.failed++;
        continue;
      }

      const data = await res.json();
      const filings = data.filings?.recent || {};
      const forms = filings.form || [];
      const accessionNumbers = filings.accessionNumber || [];
      const primaryDocs = filings.primaryDocument || [];

      // Find 10-K and 10-Q filings
      const filingLinks: { url: string; type: DocType; title: string }[] = [];

      for (let i = 0; i < forms.length && filingLinks.length < 4; i++) {
        const form = forms[i];
        const accession = accessionNumbers[i]?.replace(/-/g, "");
        const primaryDoc = primaryDocs[i];

        if ((form === "10-K" || form === "10-Q") && accession && primaryDoc) {
          const url = `https://www.sec.gov/Archives/edgar/data/${cikPadded.replace(/^0+/, "")}/${accession}/${primaryDoc}`;
          filingLinks.push({
            url,
            type: form === "10-K" ? "sec_10k" : "sec_10q",
            title: `${ticker} ${form}`,
          });
        }
      }

      console.log(`    Found ${filingLinks.length} filings`);

      // Process each filing
      for (const filing of filingLinks) {
        if (await urlProcessed(db, filing.url)) {
          console.log(`    ⏭ ${filing.type} already ingested`);
          stats.skipped++;
          continue;
        }

        console.log(`    Fetching ${filing.type}...`);
        const content = await scrapeUrl(filing.url);

        if (!content) {
          stats.failed++;
          stats.errors.push({ source: `${ticker} ${filing.type}`, error: "Fetch failed" });
          continue;
        }

        const chunks = chunkText(content, 500);
        if (chunks.length === 0) continue;

        console.log(`    Embedding ${chunks.length} chunks...`);
        const embeddings = await embedTexts(chunks);

        const docs: Document[] = chunks.map((chunk, idx) => ({
          ticker,
          doc_type: filing.type,
          title: filing.title,
          content: chunk,
          chunk_index: idx,
          date: new Date(),
          quarter: null,
          source_url: filing.url,
          embedding: embeddings[idx],
          created_at: new Date(),
        }));

        await db.collection(COLLECTION_NAME).insertMany(docs);
        console.log(`    ✓ Stored ${docs.length} chunks`);
        stats.succeeded++;
        stats.totalDocs += docs.length;
      }
    } catch (err: any) {
      console.log(`    ⚠ Error: ${err.message}`);
      stats.failed++;
      stats.errors.push({ source: `${ticker} SEC`, error: err.message });
    }

    stats.processed++;
  }
}

// ──────────────────────────────────────────────
// Earnings Transcript Ingestion
// ──────────────────────────────────────────────

async function ingestEarningsTranscripts(db: Db): Promise<void> {
  console.log("\n=== Ingesting Earnings Transcripts ===");

  // Process in parallel batches
  const transcripts = DOCUMENT_SOURCES.earnings_transcripts;

  for (let i = 0; i < transcripts.length; i += PARALLEL_BATCH_SIZE) {
    const batch = transcripts.slice(i, i + PARALLEL_BATCH_SIZE);

    await Promise.all(batch.map(async ({ ticker, url, quarter }) => {
      console.log(`\n[Earnings] ${ticker} ${quarter}`);

      if (await urlProcessed(db, url)) {
        console.log(`    ⏭ Already ingested`);
        stats.skipped++;
        stats.processed++;
        return;
      }

      const content = await scrapeUrl(url);
      if (!content) {
        stats.failed++;
        stats.processed++;
        stats.errors.push({ source: `${ticker} ${quarter}`, error: "Fetch failed" });
        return;
      }

      console.log(`    ✓ Fetched ${content.length.toLocaleString()} chars`);

      // Chunk by speaker turns
      const chunks = chunkTranscript(content);
      if (chunks.length === 0) {
        stats.failed++;
        stats.processed++;
        return;
      }

      console.log(`    Embedding ${chunks.length} chunks...`);
      const embeddings = await embedTexts(chunks);

      const docs: Document[] = chunks.map((chunk, idx) => ({
        ticker,
        doc_type: "earnings_transcript" as DocType,
        title: `${ticker} ${quarter} Earnings Call`,
        content: chunk,
        chunk_index: idx,
        date: new Date(),
        quarter,
        source_url: url,
        embedding: embeddings[idx],
        created_at: new Date(),
      }));

      await db.collection(COLLECTION_NAME).insertMany(docs);
      console.log(`    ✓ Ingested ${ticker} ${quarter} (${docs.length} chunks)`);
      stats.succeeded++;
      stats.totalDocs += docs.length;
      stats.processed++;
    }));
  }
}

// ──────────────────────────────────────────────
// News Ingestion
// ──────────────────────────────────────────────

async function ingestNews(db: Db): Promise<void> {
  console.log("\n=== Ingesting News ===");

  for (const { ticker, url } of DOCUMENT_SOURCES.news_sources) {
    console.log(`\n[News] ${ticker}`);

    // Yahoo Finance news pages need special handling
    const content = await scrapeUrl(url);
    if (!content) {
      console.log(`    ⚠ Failed to fetch news page`);
      stats.failed++;
      stats.processed++;
      continue;
    }

    console.log(`    ✓ Fetched ${content.length.toLocaleString()} chars`);

    // Extract individual article sections
    const articlePattern = /#{1,3}\s+\[([^\]]+)\]/g;
    const articles: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = articlePattern.exec(content)) !== null) {
      if (lastIndex > 0) {
        articles.push(content.slice(lastIndex, match.index).trim());
      }
      lastIndex = match.index;
    }
    if (lastIndex > 0) {
      articles.push(content.slice(lastIndex).trim());
    }

    // If no articles found, treat whole page as one doc
    const chunks = articles.length > 0 ? articles.slice(0, 10) : chunkText(content, 500);

    // Filter out already processed
    const newChunks: { chunk: string; idx: number }[] = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      if (!(await documentExists(db, ticker, "news", url, idx))) {
        newChunks.push({ chunk: chunks[idx], idx });
      }
    }

    if (newChunks.length === 0) {
      console.log(`    ⏭ All articles already ingested`);
      stats.skipped++;
      stats.processed++;
      continue;
    }

    console.log(`    Embedding ${newChunks.length} articles...`);
    const embeddings = await embedTexts(newChunks.map((c) => c.chunk));

    const docs: Document[] = newChunks.map(({ chunk, idx }, i) => ({
      ticker,
      doc_type: "news" as DocType,
      title: `${ticker} News`,
      content: chunk,
      chunk_index: idx,
      date: new Date(),
      quarter: null,
      source_url: url,
      embedding: embeddings[i],
      created_at: new Date(),
    }));

    await db.collection(COLLECTION_NAME).insertMany(docs);
    console.log(`    ✓ Stored ${docs.length} articles`);
    stats.succeeded++;
    stats.totalDocs += docs.length;
    stats.processed++;
  }
}

// ──────────────────────────────────────────────
// Analyst Ratings Ingestion
// ──────────────────────────────────────────────

async function ingestAnalystRatings(db: Db): Promise<void> {
  console.log("\n=== Ingesting Analyst Ratings ===");

  for (const { ticker, url } of DOCUMENT_SOURCES.analyst_ratings) {
    console.log(`\n[Analyst] ${ticker}`);

    if (await urlProcessed(db, url)) {
      console.log(`    ⏭ Already ingested`);
      stats.skipped++;
      stats.processed++;
      continue;
    }

    const content = await scrapeUrl(url);
    if (!content) {
      console.log(`    ⚠ Failed to fetch (TipRanks may block)`);
      stats.failed++;
      stats.processed++;
      stats.errors.push({ source: `${ticker} analyst`, error: "Fetch failed" });
      continue;
    }

    console.log(`    ✓ Fetched ${content.length.toLocaleString()} chars`);

    // Chunk the content
    const chunks = chunkText(content, 500);
    if (chunks.length === 0) {
      stats.failed++;
      stats.processed++;
      continue;
    }

    console.log(`    Embedding ${chunks.length} chunks...`);
    const embeddings = await embedTexts(chunks);

    const docs: Document[] = chunks.map((chunk, idx) => ({
      ticker,
      doc_type: "analyst_rating" as DocType,
      title: `${ticker} Analyst Ratings`,
      content: chunk,
      chunk_index: idx,
      date: new Date(),
      quarter: null,
      source_url: url,
      embedding: embeddings[idx],
      created_at: new Date(),
    }));

    await db.collection(COLLECTION_NAME).insertMany(docs);
    console.log(`    ✓ Stored ${docs.length} chunks`);
    stats.succeeded++;
    stats.totalDocs += docs.length;
    stats.processed++;
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const typeArg = args.find((a) => a.startsWith("--type="));
  const ingestType = typeArg?.split("=")[1] || "all";

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Financial Document Ingestion Pipeline                    ║");
  console.log(`║  Mode: ${ingestType.padEnd(52)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝");

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
  console.log("\nConnecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  console.log(`✓ Connected to database: ${MONGODB_DB}`);

  // Ensure collection and indexes exist
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  if (!collections.includes(COLLECTION_NAME)) {
    await db.createCollection(COLLECTION_NAME);
    console.log(`✓ Created collection: ${COLLECTION_NAME}`);
  }

  // Create indexes for deduplication
  await db.collection(COLLECTION_NAME).createIndex(
    { ticker: 1, doc_type: 1, source_url: 1, chunk_index: 1 },
    { unique: true, background: true }
  );
  await db.collection(COLLECTION_NAME).createIndex({ ticker: 1 });
  await db.collection(COLLECTION_NAME).createIndex({ doc_type: 1 });

  // Run ingestion based on type
  const startTime = Date.now();

  try {
    switch (ingestType) {
      case "sec":
        await ingestSecFilings(db);
        break;
      case "earnings":
        await ingestEarningsTranscripts(db);
        break;
      case "news":
        await ingestNews(db);
        break;
      case "analyst":
        await ingestAnalystRatings(db);
        break;
      case "all":
        await ingestSecFilings(db);
        await ingestEarningsTranscripts(db);
        await ingestNews(db);
        await ingestAnalystRatings(db);
        break;
      default:
        console.error(`Unknown type: ${ingestType}`);
        console.log("Valid types: all, sec, earnings, news, analyst");
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`Fatal error: ${err.message}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Final report
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  INGESTION COMPLETE                                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(`  Time: ${elapsed}s`);
  console.log(`  ✓ Succeeded: ${stats.succeeded}`);
  console.log(`  ⏭ Skipped:   ${stats.skipped}`);
  console.log(`  ✗ Failed:    ${stats.failed}`);
  console.log(`  📦 Total docs stored: ${stats.totalDocs}`);

  if (stats.errors.length > 0) {
    console.log("\n  Errors:");
    for (const e of stats.errors.slice(-5)) {
      console.log(`    - ${e.source}: ${e.error.slice(0, 50)}`);
    }
  }

  // Show collection count
  const docCount = await db.collection(COLLECTION_NAME).countDocuments();
  console.log(`\n  Collection '${COLLECTION_NAME}': ${docCount} total documents`);

  await client.close();
  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
