// Create the unique index from within the project where better-sqlite3 is available
import Database from 'better-sqlite3';

const db = new Database('/home/jeffgus/lostassets-data/data.sqlite');
db.pragma('journal_mode = WAL');

console.log('Creating unique index on state_id...');
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_state_id 
    ON assets(state_id) 
    WHERE state_id IS NOT NULL AND state_id != '';
  `);
  console.log('Index created successfully.');
} catch(e) {
  console.log('Index error:', e.message);
  console.log('Creating non-unique index instead...');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_state_id_nonuniq ON assets(state_id);`);
  console.log('Non-unique index created.');
}

const idx = db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='index' AND name LIKE '%state_id%'").get() as any;
console.log('State ID indexes:', idx.c);
db.close();
