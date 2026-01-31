# MongoDB Atlas Setup Guide

## Collections

Your MongoDB Atlas database contains 5 collections with the following structure:

### 1. **companies**
Stores company information
- Unique index on `ticker`
- Indexes on `name`, `sector`

### 2. **earnings**
Stores quarterly/annual earnings reports
- Indexes on `ticker`, `quarter`, `fiscal_year`, `report_date`

### 3. **news_archive**
Stores news articles related to companies
- Indexes on `ticker`, `published_date`, `source`
- Full-text search index on `title`
- **Vector search index**: Create manually for embeddings field (if using)

### 4. **filings**
Stores SEC filings (10-K, 10-Q, 8-K, etc.)
- Indexes on `ticker`, `filing_type`, `filing_date`, `fiscal_year`

### 5. **ratings**
Stores analyst ratings and price targets
- Indexes on `ticker`, `rating_date`, `analyst`

## Connection

Update your `.env` file with your MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=executor
```

## Vector Search Indexes (if needed)

To create vector search indexes for embedding-based queries:

1. Go to your MongoDB Atlas cluster
2. Navigate to **Indexes** → **Atlas Vector Search**
3. For each collection with embeddings, create a vector index:
   - **Collection**: Choose the collection (e.g., `news_archive`)
   - **Index name**: e.g., `embedding_index`
   - **Field**: `embedding` (or your embedding field name)
   - **Dimensions**: 1536 (for OpenAI embeddings) or match your model
   - **Similarity**: Cosine

Example for news_archive:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

## Regular Indexes

All regular (non-vector) indexes are automatically created when the application starts:
- No additional setup needed
- Optimized for filtering and sorting queries

## Running the Application

```bash
# Install dependencies
bun install

# Start the API server
cd apps/api
bun run dev
```

The database service will automatically connect to Atlas and verify all collections exist on startup.
