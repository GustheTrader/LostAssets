// Deduplicate assets by state_id, keeping only the entry with smallest ID
// and remapping all foreign key references to preserve database integrity.
import Database from 'better-sqlite3';

const db = new Database('data.sqlite');
db.pragma('journal_mode = WAL');

console.log('Finding duplicate state_id groups...');
const duplicates = db.prepare(`
  SELECT state_id, GROUP_CONCAT(id) as all_ids, MIN(id) as keep_id, COUNT(*) as count
  FROM assets 
  WHERE state_id IS NOT NULL AND state_id != '' 
  GROUP BY state_id 
  HAVING count > 1
`).all() as any[];

console.log(`Found ${duplicates.length} duplicate groups.`);

if (duplicates.length === 0) {
  console.log('No duplicates! Creating unique index...');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_state_id ON assets(state_id) WHERE state_id IS NOT NULL AND state_id != '';`);
  console.log('Unique index created.');
  db.close();
  process.exit(0);
}

const updateLeads = db.prepare("UPDATE leads SET asset_id = ? WHERE asset_id = ?");
const updateOutreach = db.prepare("UPDATE outreach SET asset_id = ? WHERE asset_id = ?");
const updateRelatives = db.prepare("UPDATE relatives SET asset_id = ? WHERE asset_id = ?");
const updateCaseAssets = db.prepare("UPDATE OR IGNORE case_assets SET asset_id = ? WHERE asset_id = ?");
const deleteCaseAssets = db.prepare("DELETE FROM case_assets WHERE asset_id = ?");
const deleteAsset = db.prepare("DELETE FROM assets WHERE id = ?");

let totalDeleted = 0;
let totalLeadsRemapped = 0;
let totalOutreachRemapped = 0;

// Execute the remapping and deletion in a single database transaction
const runDeduplication = db.transaction(() => {
  for (const group of duplicates) {
    const keepId = group.keep_id;
    const allIds = String(group.all_ids).split(',').map(Number);
    const deleteIds = allIds.filter(id => id !== keepId);

    for (const deleteId of deleteIds) {
      // 1. Remap Leads
      const leadsResult = updateLeads.run(keepId, deleteId);
      totalLeadsRemapped += leadsResult.changes;

      // 2. Remap Outreach
      const outreachResult = updateOutreach.run(keepId, deleteId);
      totalOutreachRemapped += outreachResult.changes;

      // 3. Remap Relatives
      updateRelatives.run(keepId, deleteId);

      // 4. Remap Case Assets (primary key conflicts resolved by OR IGNORE)
      updateCaseAssets.run(keepId, deleteId);
      deleteCaseAssets.run(deleteId); // Delete any leftover duplicate case links

      // 5. Delete duplicate asset row
      const assetResult = deleteAsset.run(deleteId);
      totalDeleted += assetResult.changes;
    }
  }
});

console.log('Running deduplication transaction...');
runDeduplication();

console.log(`Deduplication complete:`);
console.log(`  Duplicate asset records deleted: ${totalDeleted}`);
console.log(`  Leads remapped to kept assets:   ${totalLeadsRemapped}`);
console.log(`  Outreach logs remapped:          ${totalOutreachRemapped}`);

// Now create the unique index to prevent future duplicates
console.log('Creating unique index on state_id...');
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_state_id ON assets(state_id) WHERE state_id IS NOT NULL AND state_id != '';`);
console.log('Unique index created successfully!');

const finalCount = db.prepare("SELECT COUNT(*) as c FROM assets").get() as any;
console.log(`Final asset count in database: ${finalCount.c}`);

db.close();
