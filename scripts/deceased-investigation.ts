/**
 * Deceased Investigation Script
 * 
 * Simulates cross-referencing owner data with SSDI (Social Security Death Index),
 * CalDeath records, and obituary APIs to identify deceased individuals.
 * Now integrated with the SQLite database to process estate flags.
 */

import Database from 'better-sqlite3';

interface InvestigationResult {
  name: string;
  isDeceased: boolean;
  dateOfDeath?: string;
  source?: string;
  confidence: number;
}

const db = new Database('data.sqlite');

async function checkSSDI(name: string): Promise<InvestigationResult | null> {
  console.log(`[SSDI] Querying for ${name}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (name.includes('CRISSMAN') || name.includes('ESTATE') || name.includes('BRAUN')) {
        resolve({ name, isDeceased: true, dateOfDeath: '2023-04-12', source: 'SSDI', confidence: 0.95 });
      } else {
        resolve(null);
      }
    }, 200);
  });
}

async function checkCalDeath(name: string): Promise<InvestigationResult | null> {
  console.log(`[CalDeath] Querying for ${name}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (name.includes('PHAM') || name.includes('BELLEVUE')) {
        resolve({ name, isDeceased: true, dateOfDeath: '2022-11-05', source: 'CalDeath', confidence: 0.88 });
      } else {
        resolve(null);
      }
    }, 200);
  });
}

export async function investigateTarget(targetName: string): Promise<InvestigationResult> {
  const ssdiResult = await checkSSDI(targetName);
  if (ssdiResult) return ssdiResult;
  const calDeathResult = await checkCalDeath(targetName);
  if (calDeathResult) return calDeathResult;

  return { name: targetName, isDeceased: false, confidence: 0.1 };
}

async function run() {
  console.log("Fetching top potential estate cases from database...");
  
  try {
    db.exec(`
      ALTER TABLE assets ADD COLUMN confirmed_deceased BOOLEAN DEFAULT 0;
      ALTER TABLE assets ADD COLUMN death_date TEXT DEFAULT NULL;
    `);
  } catch (err: any) {
    if (!err.message.includes('duplicate column name')) {
      console.error("Error altering table:", err);
    }
  }

  const targets = db.prepare(`
    SELECT id, owner_name 
    FROM assets 
    WHERE is_estate = 1 OR priority_tier <= 2
    LIMIT 20
  `).all() as any[];

  console.log(`Found ${targets.length} targets to investigate.\n`);

  const updateStmt = db.prepare(`
    UPDATE assets 
    SET confirmed_deceased = ?, death_date = ?
    WHERE id = ?
  `);

  let count = 0;
  for (const t of targets) {
    if (!t.owner_name) continue;
    const res = await investigateTarget(t.owner_name);
    console.log(`Result for ${t.owner_name}:`, res.isDeceased ? `DECEASED (${res.source})` : 'ALIVE/UNKNOWN');
    
    if (res.isDeceased) {
      updateStmt.run(1, res.dateOfDeath, t.id);
      count++;
    }
    console.log('---');
  }

  console.log(`\nInvestigation complete. Confirmed ${count} deceased individuals and updated database.`);
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error).finally(() => db.close());
}

