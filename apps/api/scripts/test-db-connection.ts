#!/usr/bin/env bun
import { MongoClient } from 'mongodb';

async function testConnection() {
  const mongoUrl = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'executor';

  if (!mongoUrl) {
    console.error('❌ Error: MONGODB_URI not found in environment variables');
    console.error('   Please set MONGODB_URI in your .env file');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB Atlas connection...\n');
  console.log(`📍 Database: ${dbName}`);
  console.log(`🔗 Attempting to connect...\n`);

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    // Connect
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Get database
    const db = client.db(dbName);

    // Ping the database
    const pingResult = await db.admin().ping();
    console.log('✅ Database ping successful');
    console.log(`   Response: ${JSON.stringify(pingResult)}\n`);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📚 Collections found: ${collections.length}`);

    if (collections.length === 0) {
      console.log('   (None - collections will be created on first server startup)\n');
    } else {
      console.log('   Collections:');
      for (const collection of collections) {
        const col = db.collection(collection.name);
        const count = await col.countDocuments();
        console.log(`   ├─ ${collection.name} (${count} documents)`);
      }
      console.log();
    }

    // Check for expected collections
    const expectedCollections = ['companies', 'earnings', 'news_archive', 'filings', 'ratings'];
    const existingNames = collections.map(c => c.name);
    const missing = expectedCollections.filter(name => !existingNames.includes(name));

    if (missing.length > 0) {
      console.log('⚠️  Expected collections not yet created:');
      missing.forEach(name => console.log(`   ├─ ${name}`));
      console.log('\n   These will be created automatically when you start the server.');
    } else {
      console.log('✅ All expected collections exist!');
    }

    console.log('\n✅ MongoDB Atlas connection test passed!\n');

  } catch (error: any) {
    console.error('❌ Connection test failed!\n');
    console.error('Error details:');
    console.error(`   Type: ${error.name}`);
    console.error(`   Message: ${error.message}`);

    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Hint: Check that your connection string is correct');
      console.error('   Example: mongodb+srv://user:pass@cluster.mongodb.net/');
    } else if (error.message.includes('authentication')) {
      console.error('\n💡 Hint: Check your MongoDB Atlas username and password');
    } else if (error.message.includes('ENETRESET') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Hint: Check that you have network access enabled in Atlas');
      console.error('   Go to: Cluster → Network Access → Add IP Address');
    }

    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Connection closed.');
    }
  }
}

testConnection();
