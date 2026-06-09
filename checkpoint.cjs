#!/usr/bin/env node
// Quick checkpoint the SQLite DB to squash the WAL and avoid dedup on first open
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data.sqlite');
console.log(`Checkpointing: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
console.log('Checkpoint complete');
