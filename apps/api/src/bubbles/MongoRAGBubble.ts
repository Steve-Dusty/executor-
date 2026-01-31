import { getDatabase } from '../services/database';

export interface MongoRAGConfig {
  ticker: string;
  query?: string; // Optional custom query, defaults to "[ticker] financial performance"
  collections?: string[]; // Defaults to ["news_archive", "earnings", "filings"]
  topK?: number; // Defaults to 5
}

export interface RAGResult {
  ticker: string;
  collection: string;
  title: string;
  date: string;
  excerpt: string;
  score: number;
  source_url?: string;
}

export interface MongoRAGOutput {
  success: boolean;
  data: {
    results: RAGResult[];
    query: string;
    totalResults: number;
    method: 'vector_search' | 'cosine_fallback';
  } | null;
  error?: string;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_COLLECTIONS = ['news_archive', 'earnings', 'filings'];
const DEFAULT_TOP_K = 5;

export class MongoRAGBubble {
  private config: MongoRAGConfig;

  constructor(config: MongoRAGConfig) {
    this.config = config;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for MongoRAG (embeddings are 1536 dims)');
    }
  }

  /**
   * Static execute method for workflow engine integration
   */
  static async execute(
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    context?: { triggerData?: Record<string, unknown> }
  ): Promise<MongoRAGOutput> {
    let ticker = data.ticker as string;

    // Interpolate {{ticker}} from trigger data if needed
    if (ticker?.includes('{{')) {
      const triggerData = context?.triggerData || {};
      ticker = ticker.replace(/\{\{(\w+)\}\}/g, (_, field) => {
        return String(triggerData[field] || '');
      });
    }

    if (!ticker) {
      return {
        success: false,
        data: null,
        error: 'Ticker is required for MongoRAG',
      };
    }

    const bubble = new MongoRAGBubble({
      ticker,
      query: data.query as string | undefined,
      collections: data.collections as string[] | undefined,
      topK: data.topK as number | undefined,
    });

    return bubble.action();
  }

  async action(): Promise<MongoRAGOutput> {
    const {
      ticker,
      query: customQuery,
      collections = DEFAULT_COLLECTIONS,
      topK = DEFAULT_TOP_K,
    } = this.config;

    const queryString = customQuery || `${ticker} financial performance analysis`;

    try {
      console.log(`[MongoRAG] Querying for ticker: ${ticker}`);
      console.log(`[MongoRAG] Query: "${queryString}"`);
      console.log(`[MongoRAG] Collections: ${collections.join(', ')}`);

      // Get query embedding using OpenAI (stored embeddings are 1536 dims)
      const queryEmbedding = await this.getOpenAIEmbedding(queryString);
      console.log(`[MongoRAG] Got embedding with ${queryEmbedding.length} dimensions`);

      const db = await getDatabase();
      const allResults: RAGResult[] = [];
      let method: 'vector_search' | 'cosine_fallback' = 'vector_search';

      for (const collectionName of collections) {
        try {
          // Try vector search first
          const results = await this.vectorSearch(db, collectionName, queryEmbedding, ticker, topK);
          allResults.push(...results);
          console.log(`[MongoRAG] Found ${results.length} results in ${collectionName} (vector search)`);
        } catch (error: any) {
          // If vector index doesn't exist, fall back to cosine similarity
          if (error.message?.includes('index') || error.codeName === 'InvalidPipelineOperator') {
            console.log(`[MongoRAG] Vector index not found for ${collectionName}, using cosine fallback`);
            method = 'cosine_fallback';
            const results = await this.cosineSimilaritySearch(db, collectionName, queryEmbedding, ticker, topK);
            allResults.push(...results);
            console.log(`[MongoRAG] Found ${results.length} results in ${collectionName} (cosine fallback)`);
          } else {
            console.warn(`[MongoRAG] Error searching ${collectionName}:`, error.message);
          }
        }
      }

      // Sort by score and limit to topK
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      console.log(`[MongoRAG] Returning ${sortedResults.length} results`);

      return {
        success: true,
        data: {
          results: sortedResults,
          query: queryString,
          totalResults: sortedResults.length,
          method,
        },
      };
    } catch (error) {
      console.error('[MongoRAG] Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get embedding from OpenAI (text-embedding-3-small = 1536 dims)
   */
  private async getOpenAIEmbedding(text: string): Promise<number[]> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embeddings error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };

    if (!result.data?.[0]?.embedding) {
      throw new Error('Invalid OpenAI response: missing embedding');
    }

    return result.data[0].embedding;
  }

  /**
   * Perform vector search using MongoDB Atlas Vector Search index
   */
  private async vectorSearch(
    db: Awaited<ReturnType<typeof getDatabase>>,
    collectionName: string,
    queryVector: number[],
    ticker: string,
    topK: number
  ): Promise<RAGResult[]> {
    const collection = db.collection(collectionName);

    // Try with filter first, fall back to post-filtering if ticker not indexed
    let pipeline: object[];
    let usePostFilter = false;

    try {
      pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: 100,
            limit: topK,
            filter: { ticker: { $eq: ticker } },
          },
        },
        {
          $project: {
            _id: 0,
            ticker: 1,
            headline: 1,
            summary: 1,
            content: 1,
            published_at: 1,
            source_url: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      return results.map((doc) => ({
        ticker,
        collection: collectionName,
        title: doc.headline || doc.summary?.substring(0, 100) || `${collectionName} document`,
        date: doc.published_at || new Date().toISOString(),
        excerpt: doc.summary || doc.content?.substring(0, 500) || '',
        score: doc.score || 0,
        source_url: doc.source_url,
      }));
    } catch (err: any) {
      // If filter fails (ticker not indexed), use post-filtering
      if (err.message?.includes('token') || err.message?.includes('filter')) {
        usePostFilter = true;
      } else {
        throw err;
      }
    }

    // Post-filter approach: get more results and filter by ticker
    if (usePostFilter) {
      pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: 200,
            limit: topK * 10, // Get more to filter
          },
        },
        {
          $match: { ticker },
        },
        {
          $limit: topK,
        },
        {
          $project: {
            _id: 0,
            ticker: 1,
            headline: 1,
            summary: 1,
            content: 1,
            published_at: 1,
            source_url: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      return results.map((doc) => ({
        ticker,
        collection: collectionName,
        title: doc.headline || doc.summary?.substring(0, 100) || `${collectionName} document`,
        date: doc.published_at || new Date().toISOString(),
        excerpt: doc.summary || doc.content?.substring(0, 500) || '',
        score: doc.score || 0,
        source_url: doc.source_url,
      }));
    }

    return [];
  }

  /**
   * Fallback: Compute cosine similarity in-memory when vector index not available
   */
  private async cosineSimilaritySearch(
    db: Awaited<ReturnType<typeof getDatabase>>,
    collectionName: string,
    queryVector: number[],
    ticker: string,
    topK: number
  ): Promise<RAGResult[]> {
    const collection = db.collection(collectionName);

    // Fetch documents with embeddings for this ticker
    const docs = await collection
      .find({ ticker, embedding: { $exists: true } })
      .project({
        headline: 1,
        summary: 1,
        content: 1,
        published_at: 1,
        source_url: 1,
        embedding: 1,
      })
      .toArray();

    // Compute cosine similarity for each document
    const scored = docs.map((doc) => {
      const score = this.cosineSimilarity(queryVector, doc.embedding as number[]);
      return { doc, score };
    });

    // Sort by score and take top K
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    return topResults.map(({ doc, score }) => ({
      ticker,
      collection: collectionName,
      title: doc.headline || doc.summary?.substring(0, 100) || `${collectionName} document`,
      date: doc.published_at || new Date().toISOString(),
      excerpt: doc.summary || doc.content?.substring(0, 500) || '',
      score,
      source_url: doc.source_url,
    }));
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
