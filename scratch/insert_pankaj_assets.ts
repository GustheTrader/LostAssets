import Database from "better-sqlite3";
import * as path from "path";

const DB_PATH = path.join(process.cwd(), "data.sqlite");
const db = new Database(DB_PATH);

const realAssets = [
  {
    owner_name: "SEWAL PANKAJ",
    first_name: "PANKAJ",
    last_name: "SEWAL",
    state: "CA",
    property_type: "UNREDEEMED GIFT CERTIFICATE",
    amount: 30.07,
    company: "AMERICAN EXPRESS PREPAID CARD MANAGEMENT CO",
    location: "32663 RED MAPLE ST, UNION CITY, CA 94587",
    state_id: "991688211",
    source_url: "https://claimit.ca.gov/",
    confidence: "manual_entry"
  },
  {
    owner_name: "SEWAL PANKAJ",
    first_name: "PANKAJ",
    last_name: "SEWAL",
    state: "CA",
    property_type: "UNREDEEMED GIFT CERTIFICATE",
    amount: 0.02,
    company: "AMERICAN EXPRESS PREPAID CARD MANAGEMENT",
    location: "32663 RED MAPLE ST, UNION CITY, CA 94587",
    state_id: "1016468135",
    source_url: "https://claimit.ca.gov/",
    confidence: "manual_entry"
  },
  {
    owner_name: "SEWAL PANKAJ",
    first_name: "PANKAJ",
    last_name: "SEWAL",
    state: "CA",
    property_type: "UNREDEEMED GIFT CERTIFICATE",
    amount: 33.20,
    company: "AMERICAN EXPRESS PREPAID CARD MANAGEMENT",
    location: "32663 RED MAPLE ST, UNION CITY, CA 94587",
    state_id: "1016468136",
    source_url: "https://claimit.ca.gov/",
    confidence: "manual_entry"
  },
  {
    owner_name: "SEWAL PANKAJ",
    first_name: "PANKAJ",
    last_name: "SEWAL",
    state: "CA",
    property_type: "UNREDEEMED GIFT CERTIFICATE",
    amount: 15.29,
    company: "AMERICAN EXPRESS PREPAID CARD MANAGEMENT",
    location: "32663 RED MAPLE ST, UNION CITY, CA 94587",
    state_id: "1016468137",
    source_url: "https://claimit.ca.gov/",
    confidence: "manual_entry"
  },
  {
    owner_name: "SEWAL PANKAJ",
    first_name: "PANKAJ",
    last_name: "SEWAL",
    state: "CA",
    property_type: "UNREDEEMED GIFT CERTIFICATE",
    amount: 48.37,
    company: "AMERICAN EXPRESS PREPAID CARD MANAGEMENT",
    location: "32663 RED MAPLE ST, UNION CITY, CA 94587",
    state_id: "1016468139",
    source_url: "https://claimit.ca.gov/",
    confidence: "manual_entry"
  }
];

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO assets (
    owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Clear any existing matching assets or mock assets for this specific name from the database to keep clean
const deleteStmt = db.prepare(`
  DELETE FROM assets WHERE owner_name = 'SEWAL PANKAJ' OR owner_name = 'SEWAL, PANKAJ'
`);

const run = db.transaction(() => {
  deleteStmt.run();
  let inserted = 0;
  for (const asset of realAssets) {
    insertStmt.run(
      asset.owner_name,
      asset.first_name,
      asset.last_name,
      asset.state,
      asset.property_type,
      asset.amount,
      asset.company,
      asset.location,
      asset.state_id,
      asset.source_url,
      asset.confidence
    );
    inserted++;
  }
  return inserted;
});

try {
  const count = run();
  console.log(`Successfully populated ${count} real California assets for SEWAL PANKAJ!`);
} catch (e: any) {
  console.error("Failed to seed real assets:", e.message);
} finally {
  db.close();
}
