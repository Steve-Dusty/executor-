#!/usr/bin/env bun
import { connectDatabase, closeDatabase } from '../src/services/database';

async function setupDatabase() {
  try {
    console.log('🔧 Setting up MongoDB database...\n');
    await connectDatabase();
    console.log('\n✅ Database setup complete!\n');
    console.log('Collections created:');
    console.log('  ├─ companies');
    console.log('  ├─ earnings');
    console.log('  ├─ news_archive');
    console.log('  ├─ filings');
    console.log('  └─ ratings');
    await closeDatabase();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
