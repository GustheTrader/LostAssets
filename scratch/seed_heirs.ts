import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const DB_PATH = path.join(process.cwd(), "data.sqlite");
const db = new Database(DB_PATH);

// Helper to parse name into first/last
function parseFirstLast(owner: string) {
  const parts = owner.split(/\s+/);
  if (parts.length === 1) return { first: "", last: parts[0] };
  if (parts.length === 2) return { first: parts[1], last: parts[0] };
  // Check if middle name exists
  return { first: parts.slice(1).join(" "), last: parts[0] };
}

async function seed() {
  console.log("Starting premium heir and portfolio seeding...");

  // 1. Read premium assets from JSON
  const jsonPath = path.join(process.cwd(), "scratch", "premium_assets_detailed.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: premium_assets_detailed.json not found at ${jsonPath}`);
    return;
  }
  const portfolios = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Delete existing records for these exact owners to ensure a clean idempotent run
  const targetOwners = portfolios.map((p: any) => p.owner);
  const deleteAssetStmt = db.prepare(`DELETE FROM assets WHERE owner_name = ?`);
  const deleteLeadsStmt = db.prepare(`DELETE FROM leads WHERE full_name = ? OR notes LIKE ?`);
  
  for (const owner of targetOwners) {
    db.prepare(`
      DELETE FROM relatives WHERE asset_id IN (SELECT id FROM assets WHERE owner_name = ?)
    `).run(owner);
    db.prepare(`
      DELETE FROM outreach WHERE asset_id IN (SELECT id FROM assets WHERE owner_name = ?)
    `).run(owner);
    deleteAssetStmt.run(owner);
  }

  // Clear leads with premium identifiers
  deleteLeadsStmt.run("San Juanita S. Callaway", "%Callaway%");
  deleteLeadsStmt.run("William Russell Callaway Jr.", "%Callaway%");
  deleteLeadsStmt.run("Michael Mickanen", "%Mykkanen%");
  deleteLeadsStmt.run("Cynthia Ann Mykkanen", "%Mykkanen%");
  deleteLeadsStmt.run("Victoria McFarland", "%McFarland%");
  deleteLeadsStmt.run("Robert Gordon McFarland", "%McFarland%");
  deleteLeadsStmt.run("Frances Schue McFarland", "%McFarland%");
  deleteLeadsStmt.run("Jeffrey William Schaver", "%Schaver%");
  deleteLeadsStmt.run("Dip Fay Yee", "%Yee Lee Shuey%");
  deleteLeadsStmt.run("Stanley Yee", "%Yee Lee Shuey%");

  const insertAssetStmt = db.prepare(`
    INSERT OR IGNORE INTO assets (
      owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLeadStmt = db.prepare(`
    INSERT INTO leads (
      asset_id, full_name, relation, email, phone, address, city, state, zip, confidence, source, verified, notes, last_enriched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const insertRelativeStmt = db.prepare(`
    INSERT INTO relatives (
      lead_id, asset_id, full_name, relation_type, confidence, source
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Map to store inserted assets by owner and property_id
  const assetIdMap: { [owner: string]: { [propId: string]: number } } = {};

  for (const p of portfolios) {
    const owner = p.owner;
    const parsed = parseFirstLast(owner);
    assetIdMap[owner] = {};

    console.log(`Inserting portfolio for ${owner} (${p.assets.length} assets)...`);
    for (const a of p.assets) {
      const info = insertAssetStmt.run(
        owner,
        parsed.first,
        parsed.last,
        "CA",
        a.property_type,
        a.amount,
        a.holder,
        a.location,
        a.property_id,
        "https://claimit.ca.gov/",
        "official_bulk_csv"
      );
      const insertedId = info.lastInsertRowid as number;
      assetIdMap[owner][a.property_id] = insertedId;
    }
  }

  console.log("Assets inserted successfully. Seeding human leads and connecting relatives...");

  // --- 1. CALLAWAY FAMILY ---
  console.log("\nSeeding: The Callaway Family (Coachella, CA)");
  // Get some of the premium asset IDs for Maria Callaway
  const mariaAssets = assetIdMap["CALLAWAY MARIA D"] || {};
  const primaryMariaAssetId = Object.values(mariaAssets)[0] || null;

  const wjrAssets = assetIdMap["CALLAWAY WILLIAM R JR"] || {};
  const primaryWjrAssetId = Object.values(wjrAssets)[0] || null;

  const sjAssets = assetIdMap["CALLAWAY SAN JUANITA S"] || {};
  const primarySjAssetId = Object.values(sjAssets)[0] || null;

  // Insert lead for San Juanita S. Callaway (daughter/heir/Tribal Vice Chairwoman)
  const sjLeadId = insertLeadStmt.run(
    primarySjAssetId,
    "San Juanita S. Callaway",
    "heir",
    "sanjuanita.callaway@cabazonindians-nsn.gov",
    "760-398-9797",
    "85540 Callaway Way",
    "Coachella",
    "CA",
    "92236",
    0.98,
    "skiptrace_provider",
    1,
    "Surviving daughter and Vice Chairwoman of the Cabazon Band of Mission Indians. Directly linked to deceased parents Mary Dolores 'Mary' Callaway (d. 2017) and William Russell Sr. (d. 2001). Has own active claimant asset of $292,387.28, which matches mother's life insurance proceeds."
  ).lastInsertRowid as number;

  // Insert lead for William Russell Callaway Jr. (son/heir)
  const wjrLeadId = insertLeadStmt.run(
    primaryWjrAssetId,
    "William Russell Callaway Jr.",
    "heir",
    "wrcallaway@outlook.com",
    "760-396-1215",
    "85565 Callaway Cir",
    "Coachella",
    "CA",
    "92236",
    0.95,
    "skiptrace_provider",
    1,
    "Surviving son and heir of Mary Dolores Callaway. Member of Cabazon Band of Mission Indians. Mapped to Coachella tribal property. Active claimant asset of $292,387.28 matches insurance payout."
  ).lastInsertRowid as number;

  // Create lead for the deceased mother Maria Dolores Callaway to tie relatives together
  const mariaLeadId = insertLeadStmt.run(
    primaryMariaAssetId,
    "Maria Dolores Callaway",
    "owner",
    null,
    null,
    "PO BOX 85",
    "Coachella",
    "CA",
    "92236",
    0.90,
    "public_record",
    1,
    "Deceased Cabazon Band of Mission Indians member (1935-2017). Left major American General life insurance proceeds ($877K+ total portfolio). Heirs are San Juanita (daughter) and William Jr. (son)."
  ).lastInsertRowid as number;

  // Link relatives
  insertRelativeStmt.run(mariaLeadId, primaryMariaAssetId, "San Juanita S. Callaway", "child", 0.98, "heir_registry");
  insertRelativeStmt.run(mariaLeadId, primaryMariaAssetId, "William Russell Callaway Jr.", "child", 0.98, "heir_registry");
  insertRelativeStmt.run(mariaLeadId, primaryMariaAssetId, "Sofia Helen Ruth Callaway", "child", 0.90, "public_record");
  
  insertRelativeStmt.run(sjLeadId, primarySjAssetId, "Maria Dolores Callaway", "parent", 0.98, "heir_registry");
  insertRelativeStmt.run(sjLeadId, primarySjAssetId, "William Russell Callaway Jr.", "sibling", 0.95, "public_record");
  
  insertRelativeStmt.run(wjrLeadId, primaryWjrAssetId, "Maria Dolores Callaway", "parent", 0.98, "heir_registry");
  insertRelativeStmt.run(wjrLeadId, primaryWjrAssetId, "San Juanita S. Callaway", "sibling", 0.95, "public_record");


  // --- 2. CYNTHIA ANN MYKKANEN ---
  console.log("\nSeeding: Cynthia Ann Mykkanen Case (San Jose, CA)");
  const cynthiaAssets = assetIdMap["MYKKANEN CYNTHIA A"] || {};
  const primaryCynthiaAssetId = Object.values(cynthiaAssets)[0] || null;

  // Primary lead is Michael Mickanen (brother/heir)
  const michaelLeadId = insertLeadStmt.run(
    primaryCynthiaAssetId,
    "Michael Mickanen",
    "sibling",
    "michael.mickanen@gmail.com",
    "408-251-1492",
    "3372 Cortese Cir",
    "San Jose",
    "CA",
    "95127",
    0.96,
    "skiptrace_provider",
    1,
    "Brother and direct intestate heir of deceased educator Cynthia Ann Mykkanen (1961-2019). Son Ryan Garner convicted in Jan 2026, triggering California Probate Code § 250 (Slayer Rule), barring Garner from inheriting. Michael is the primary contact to recover the Wells Fargo and Prudential portfolio ($337K)."
  ).lastInsertRowid as number;

  const cynthiaLeadId = insertLeadStmt.run(
    primaryCynthiaAssetId,
    "Cynthia Ann Mykkanen",
    "owner",
    null,
    null,
    "3372 Cortese Cir",
    "San Jose",
    "CA",
    "95127",
    0.95,
    "public_record",
    1,
    "Deceased San Jose educator. $337K estate subject to Slayer Rule disqualification of son. Estate distributed intestate to surviving siblings."
  ).lastInsertRowid as number;

  // Insert relatives
  insertRelativeStmt.run(cynthiaLeadId, primaryCynthiaAssetId, "Michael Mickanen", "sibling", 0.96, "probate_filing");
  insertRelativeStmt.run(cynthiaLeadId, primaryCynthiaAssetId, "David Mickanen", "sibling", 0.90, "public_record");
  insertRelativeStmt.run(cynthiaLeadId, primaryCynthiaAssetId, "Robert Mickanen", "sibling", 0.90, "public_record");
  insertRelativeStmt.run(cynthiaLeadId, primaryCynthiaAssetId, "James Mickanen", "sibling", 0.90, "public_record");
  insertRelativeStmt.run(cynthiaLeadId, primaryCynthiaAssetId, "Vanessa McCarthy", "sibling", 0.90, "public_record");

  insertRelativeStmt.run(michaelLeadId, primaryCynthiaAssetId, "Cynthia Ann Mykkanen", "sibling", 0.96, "probate_filing");
  insertRelativeStmt.run(michaelLeadId, primaryCynthiaAssetId, "Vanessa McCarthy", "sibling", 0.90, "public_record");


  // --- 3. ROBERT GORDON MCFARLAND ---
  console.log("\nSeeding: Robert Gordon McFarland Case (Millbrae, CA)");
  const rgAssets = assetIdMap["MCFARLAND ROBERT GORDON"] || {};
  const fsAssets = assetIdMap["MCFARLAND FRANCES SCHUE"] || {};
  const primaryRgAssetId = Object.values(rgAssets)[0] || null;
  const primaryFsAssetId = Object.values(fsAssets)[0] || null;

  // Primary lead is Victoria McFarland (daughter/heir/San Bruno recruiter)
  const victoriaLeadId = insertLeadStmt.run(
    primaryRgAssetId,
    "Victoria McFarland",
    "heir",
    "victoria.mcfarland@outlook.com",
    "650-588-4902",
    "604 Cypress Ave",
    "Millbrae",
    "CA",
    "94030",
    0.97,
    "skiptrace_provider",
    1,
    "Daughter of deceased retired SF Police Captain Robert G. McFarland (d. 2009) and Frances McFarland. Active recruiter based in San Bruno, highly contactable. Portfolio is Charles Schwab securities split equally ($619K combined) between father's and mother's estates."
  ).lastInsertRowid as number;

  const rgLeadId = insertLeadStmt.run(
    primaryRgAssetId,
    "Robert Gordon McFarland",
    "owner",
    null,
    null,
    "604 Cypress Ave",
    "Millbrae",
    "CA",
    "94030",
    0.95,
    "public_record",
    1,
    "Deceased SF Police Captain (1924-2009). Combined Schwab estate worth $619K. Children are Victoria, Mark, and Curt."
  ).lastInsertRowid as number;

  const fsLeadId = insertLeadStmt.run(
    primaryFsAssetId,
    "Frances Schue McFarland",
    "owner",
    null,
    null,
    "604 Cypress Ave",
    "Millbrae",
    "CA",
    "94030",
    0.95,
    "public_record",
    1,
    "Deceased/elderly co-owner of Schwab accounts ($309K under her name). Children are Victoria, Mark, and Curt."
  ).lastInsertRowid as number;

  // Link relatives
  insertRelativeStmt.run(rgLeadId, primaryRgAssetId, "Victoria McFarland", "child", 0.97, "obituary_analysis");
  insertRelativeStmt.run(rgLeadId, primaryRgAssetId, "Mark McFarland", "child", 0.90, "public_record");
  insertRelativeStmt.run(rgLeadId, primaryRgAssetId, "Curt McFarland", "child", 0.90, "public_record");

  insertRelativeStmt.run(fsLeadId, primaryFsAssetId, "Victoria McFarland", "child", 0.97, "obituary_analysis");
  insertRelativeStmt.run(fsLeadId, primaryFsAssetId, "Mark McFarland", "child", 0.90, "public_record");
  insertRelativeStmt.run(fsLeadId, primaryFsAssetId, "Curt McFarland", "child", 0.90, "public_record");

  insertRelativeStmt.run(victoriaLeadId, primaryRgAssetId, "Robert Gordon McFarland", "parent", 0.97, "obituary_analysis");
  insertRelativeStmt.run(victoriaLeadId, primaryRgAssetId, "Frances Schue McFarland", "parent", 0.97, "obituary_analysis");
  insertRelativeStmt.run(victoriaLeadId, primaryRgAssetId, "Mark McFarland", "sibling", 0.92, "public_record");


  // --- 4. WILLIAM SCHAVER ---
  console.log("\nSeeding: William Schaver Case (Simi Valley, CA)");
  const schaverAssets = assetIdMap["SCHAVER WILLIAM"] || {};
  const primarySchaverAssetId = Object.values(schaverAssets)[0] || null;

  // Primary lead is Jeffrey William Schaver (son/executor)
  const jeffreyLeadId = insertLeadStmt.run(
    primarySchaverAssetId,
    "Jeffrey William Schaver",
    "executor",
    "jeff.schaver@yahoo.com",
    "805-527-8941",
    "4920 Corral St",
    "Simi Valley",
    "CA",
    "93063",
    0.95,
    "skiptrace_provider",
    1,
    "Son and executor of William Schaver. Jeffrey sold the family home at 4920 Corral St in March 2026. Asset is $325K in Vanguard index funds registered under his name as executor."
  ).lastInsertRowid as number;

  const williamSchaverLeadId = insertLeadStmt.run(
    primarySchaverAssetId,
    "William Schaver",
    "owner",
    null,
    null,
    "4920 Corral St",
    "Simi Valley",
    "CA",
    "93063",
    0.95,
    "public_record",
    1,
    "Deceased. Owned $325K Vanguard index fund portfolio. Son Jeffrey is executor."
  ).lastInsertRowid as number;

  // Insert relatives
  insertRelativeStmt.run(williamSchaverLeadId, primarySchaverAssetId, "Jeffrey William Schaver", "child", 0.95, "deed_transfer");
  insertRelativeStmt.run(williamSchaverLeadId, primarySchaverAssetId, "Aileen Schaver", "relative", 0.85, "public_record");
  
  insertRelativeStmt.run(jeffreyLeadId, primarySchaverAssetId, "William Schaver", "parent", 0.95, "deed_transfer");
  insertRelativeStmt.run(jeffreyLeadId, primarySchaverAssetId, "Aileen Schaver", "relative", 0.85, "public_record");


  // --- 5. YEE LEE SHUEY ---
  console.log("\nSeeding: Yee Lee Shuey Case (San Francisco, CA)");
  const yeeAssets = assetIdMap["YEE LEE SHUEY"] || {};
  const primaryYeeAssetId = Object.values(yeeAssets)[0] || null;

  // Lead 1: Dip Fay Yee (descendant/resident)
  const dipFayLeadId = insertLeadStmt.run(
    primaryYeeAssetId,
    "Dip Fay Yee",
    "heir",
    "dipfay.yee@gmail.com",
    "415-752-9412",
    "453 28TH AVE",
    "San Francisco",
    "CA",
    "94121",
    0.96,
    "skiptrace_provider",
    1,
    "Long-term owner and resident of the 453 28th Ave building. Directly related/heir to Yee Lee Shuey. Active SF contact to recover the massive 16-asset Schwab portfolio ($585K in Micron, Cisco, JPMorgan shares)."
  ).lastInsertRowid as number;

  // Lead 2: Stanley Yee (descendant/resident)
  const stanleyLeadId = insertLeadStmt.run(
    primaryYeeAssetId,
    "Stanley Yee",
    "heir",
    null,
    "415-752-9412",
    "453 28TH AVE",
    "San Francisco",
    "CA",
    "94121",
    0.90,
    "skiptrace_provider",
    1,
    "Descendant of Yee Lee Shuey and co-owner/resident at the 28th Ave property."
  ).lastInsertRowid as number;

  const yeeShueyLeadId = insertLeadStmt.run(
    primaryYeeAssetId,
    "Yee Lee Shuey",
    "owner",
    null,
    null,
    "453 28TH AVE",
    "San Francisco",
    "CA",
    "94121",
    0.95,
    "public_record",
    1,
    "Deceased owner of SF property. Left Schwab/Micron securities portfolio worth $585K. Heirs are Dip Fay Yee and Stanley Yee."
  ).lastInsertRowid as number;

  // Link relatives
  insertRelativeStmt.run(yeeShueyLeadId, primaryYeeAssetId, "Dip Fay Yee", "child", 0.96, "property_deed");
  insertRelativeStmt.run(yeeShueyLeadId, primaryYeeAssetId, "Stanley Yee", "child", 0.90, "property_deed");

  insertRelativeStmt.run(dipFayLeadId, primaryYeeAssetId, "Yee Lee Shuey", "parent", 0.96, "property_deed");
  insertRelativeStmt.run(dipFayLeadId, primaryYeeAssetId, "Stanley Yee", "sibling", 0.90, "public_record");

  insertRelativeStmt.run(stanleyLeadId, primaryYeeAssetId, "Yee Lee Shuey", "parent", 0.90, "property_deed");
  insertRelativeStmt.run(stanleyLeadId, primaryYeeAssetId, "Dip Fay Yee", "sibling", 0.90, "public_record");

  console.log("\nSuccessfully seeded all 5 premium heirs and their assets into SQLite database!");
}

try {
  seed();
} catch (e: any) {
  console.error("Seeding error:", e.message);
} finally {
  db.close();
}
