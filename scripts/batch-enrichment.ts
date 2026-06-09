import Database from 'better-sqlite3';

/**
 * Batch Enrichment Seed Script
 * 
 * This script identifies the top 50 high-value cases from the assets table
 * and enriches them with new columns: is_estate, heir_notes, and priority_tier.
 */

const db = new Database('data.sqlite');

function setupSchema() {
  console.log("Setting up schema for enrichment...");
  try {
    db.exec(`
      ALTER TABLE assets ADD COLUMN is_estate BOOLEAN DEFAULT 0;
      ALTER TABLE assets ADD COLUMN heir_notes TEXT DEFAULT '';
      ALTER TABLE assets ADD COLUMN priority_tier INTEGER DEFAULT 3;
    `);
  } catch (err: any) {
    if (!err.message.includes('duplicate column name')) {
      console.error("Error altering table:", err);
    }
  }
}

function processTopCases() {
  setupSchema();
  
  console.log("Fetching top 50 cases by value...");
  const topCases = db.prepare(`
    SELECT id, owner_name, amount
    FROM assets
    ORDER BY amount DESC
    LIMIT 50
  `).all() as any[];

  const updateStmt = db.prepare(`
    UPDATE assets 
    SET is_estate = ?, priority_tier = ?, heir_notes = ?
    WHERE id = ?
  `);

  let count = 0;
  const updateMany = db.transaction((cases) => {
    for (const row of cases) {
      if (!row.owner_name) continue;
      const nameStr = row.owner_name.toUpperCase();
      let isEstate = 0;
      let notes = 'High value priority target.';
      let tier = 1;

      if (nameStr.includes('ESTATE') || nameStr.includes('TRUST')) {
        isEstate = 1;
        notes = 'Estate or Trust case; requires specialized approach with Successor Trustee or Executor.';
      }

      const amountVal = parseFloat(String(row.amount).replace(/[^0-9.]/g, '')) || 0;

      if (amountVal > 1000000) {
        tier = 1;
        notes += ' (Tier 1: > $1M)';
      } else if (amountVal > 500000) {
        tier = 2;
        notes += ' (Tier 2: > $500k)';
      } else {
        tier = 3;
      }

      updateStmt.run(isEstate, tier, notes, row.id);
      count++;
    }
  });

  updateMany(topCases);
  console.log(`Enriched ${count} high-value cases in the database.`);
}

try {
  processTopCases();
} catch (e) {
  console.error("Enrichment failed:", e);
} finally {
  db.close();
}
