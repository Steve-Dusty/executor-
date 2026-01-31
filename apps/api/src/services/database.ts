import { MongoClient, Db } from 'mongodb';

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'executor';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log(`✓ Connected to MongoDB database: ${dbName}`);

    // Create collections if they don't exist
    await initializeCollections();

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function initializeCollections(): Promise<void> {
  if (!db) {
    throw new Error('Database not connected');
  }

  const collections = ['companies', 'earnings', 'news_archive', 'filings', 'ratings'];

  for (const collectionName of collections) {
    try {
      // Check if collection exists
      const existing = await db.listCollections({ name: collectionName }).toArray();

      if (existing.length === 0) {
        // Create collection
        await db.createCollection(collectionName);
        console.log(`✓ Created collection: ${collectionName}`);

        // Create indexes based on collection type
        await createCollectionIndexes(collectionName);
      } else {
        console.log(`✓ Collection already exists: ${collectionName}`);
      }
    } catch (error) {
      console.error(`Error initializing collection ${collectionName}:`, error);
      throw error;
    }
  }
}

async function createCollectionIndexes(collectionName: string): Promise<void> {
  if (!db) {
    throw new Error('Database not connected');
  }

  const collection = db.collection(collectionName);

  switch (collectionName) {
    case 'companies':
      await collection.createIndex({ ticker: 1 }, { unique: true });
      await collection.createIndex({ name: 1 });
      await collection.createIndex({ sector: 1 });
      console.log(`  ├─ Created indexes for companies`);
      break;

    case 'earnings':
      await collection.createIndex({ ticker: 1 });
      await collection.createIndex({ quarter: 1 });
      await collection.createIndex({ fiscal_year: 1 });
      await collection.createIndex({ report_date: -1 });
      console.log(`  ├─ Created indexes for earnings`);
      break;

    case 'news_archive':
      await collection.createIndex({ ticker: 1 });
      await collection.createIndex({ published_date: -1 });
      await collection.createIndex({ source: 1 });
      await collection.createIndex({ title: 'text' });
      console.log(`  ├─ Created indexes for news_archive (note: vector indexes for embeddings should be created manually in Atlas UI)`);
      break;

    case 'filings':
      await collection.createIndex({ ticker: 1 });
      await collection.createIndex({ filing_type: 1 });
      await collection.createIndex({ filing_date: -1 });
      await collection.createIndex({ fiscal_year: 1 });
      console.log(`  ├─ Created indexes for filings`);
      break;

    case 'ratings':
      await collection.createIndex({ ticker: 1 });
      await collection.createIndex({ rating_date: -1 });
      await collection.createIndex({ analyst: 1 });
      console.log(`  ├─ Created indexes for ratings`);
      break;
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    return connectDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('✓ Closed MongoDB connection');
  }
}

export function getCollection(name: string) {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db.collection(name);
}

// Collection type definitions
export interface Company {
  _id?: any;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap?: number;
  employees?: number;
  founded?: number;
  website?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Earnings {
  _id?: any;
  company_id: string;
  ticker: string;
  quarter: number;
  fiscal_year: number;
  revenue: number;
  eps: number;
  net_income: number;
  operating_income: number;
  report_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NewsArchive {
  _id?: any;
  ticker: string;
  title: string;
  content: string;
  source: string;
  published_date: Date;
  url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Filing {
  _id?: any;
  ticker: string;
  filing_type: string; // '10-K', '10-Q', '8-K', etc.
  fiscal_year: number;
  filing_date: Date;
  url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Rating {
  _id?: any;
  ticker: string;
  analyst: string;
  rating: string; // 'BUY', 'HOLD', 'SELL'
  target_price?: number;
  rating_date: Date;
  created_at: Date;
  updated_at: Date;
}
