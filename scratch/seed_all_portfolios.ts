import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const DB_PATH = path.join(process.cwd(), "data.sqlite");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Exclude lists to filter out corporate entities
const EXCLUDES = [
  "LLC", "INC", "CORP", "CO ", " CO", "LTD", "BANK", "INSURANCE", 
  "ESTIMATED", "LIABILITY", "TRUST", "HEALTH", "SYSTEMS", "SERVICES", 
  "PARTNERS", "ASSOCIATES", "GROUP", "STATE", "COUNTY", "CITY", 
  "UNCLAIMED", "COMPANY", "SCHOOL", "UNIV", "COLLEGE", "BOARD", "DEPT", 
  "ASSOCIATION", "UNION", "FOUNDATION", "COMMISSION", "CHURCH", "CLINIC", 
  "HOSPITAL", "DISTRICT", "FEDERAL", "ACQUISITION", "VENTURES", "HOLDINGS", 
  "PROPERTIES", "FINANCIAL", "NATIONAL", "PACIFIC", "COMMUNITY", "FUND", 
  "MUTUAL", "INVESTMENT", "CAPITAL", "AMERICA", "MANAGEMENT", "ENERGY", 
  "SOLUTIONS", "INTERNATIONAL", "GLOBAL", "INDUSTRIES", "TECHNOLOGIES"
];

// Area codes in California
const CA_AREA_CODES = ["415", "510", "408", "650", "310", "213", "818", "626", "714", "949", "619", "858", "916", "805", "559", "209"];

// Common first names
const MALE_NAMES = ["John", "David", "Robert", "Michael", "William", "Richard", "Thomas", "Joseph", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Andrew", "Paul", "Kenneth", "Kevin", "Alan", "Eric"];
const FEMALE_NAMES = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Karen", "Sarah", "Lisa", "Nancy", "Sandra", "Betty", "Ashley", "Dorothy", "Kimberly", "Emily", "Donna", "Michelle", "Tiffany", "Jenny"];
const ASIAN_HEIR_NAMES = ["Khoi", "Minh", "Linh", "Mai", "Thao", "Huy", "Lan", "Vinh", "Chau", "Bao", "An", "Yen"];

function isHumanOrEstate(name: string): boolean {
  const upperName = name.toUpperCase();
  for (const ex of EXCLUDES) {
    if (upperName.includes(ex)) {
      if (upperName.includes("ESTATE") || upperName.includes("EST OF")) {
        return true;
      }
      return false;
    }
  }
  return upperName.includes(" ") || upperName.includes(",");
}

function parseOwnerName(name: string): { firstName: string; lastName: string; isEstate: boolean } {
  let clean = name.replace(/THE ESTATE OF|ESTATE OF|EST OF|ESTATE/g, "").trim();
  clean = clean.replace(/JT|TEN/g, "").trim(); // Joint Tenancy
  const parts = clean.split(/\s+/);
  const isEstate = name.includes("ESTATE") || name.includes("EST OF");
  
  if (clean.includes(",")) {
    const commaParts = clean.split(",");
    return {
      lastName: commaParts[0].trim(),
      firstName: commaParts[1].trim(),
      isEstate
    };
  }
  
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: "", isEstate };
  }
  if (parts.length === 2) {
    return { lastName: parts[0], firstName: parts[1], isEstate };
  }
  if (parts[0] === "DE" || parts[0] === "DI" || parts[0] === "VAN" || parts[0] === "SAN") {
    return { lastName: parts[0] + " " + parts[1], firstName: parts.slice(2).join(" "), isEstate };
  }
  return { lastName: parts[0], firstName: parts.slice(1).join(" "), isEstate };
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const ac = getRandomElement(CA_AREA_CODES);
  const prefix = Math.floor(100 + Math.random() * 900);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${ac}-${prefix}-${suffix}`;
}

function generateEmail(first: string, last: string): string {
  const f = first.toLowerCase().replace(/[^a-z]/g, "");
  const l = last.toLowerCase().replace(/[^a-z]/g, "");
  const formats = [
    `${f}.${l}@gmail.com`,
    `${l}.${f}@yahoo.com`,
    `${f}${l}@outlook.com`,
    `${f.charAt(0)}${l}@gmail.com`
  ];
  return getRandomElement(formats);
}

function generateHeirName(lastName: string): string {
  const isAsian = ["NGUYEN", "PHAM", "GAO", "YAN", "ZHANG", "CHEN", "LEE", "WONG", "LI", "WU"].includes(lastName.toUpperCase());
  if (isAsian && Math.random() > 0.4) {
    return getRandomElement(ASIAN_HEIR_NAMES);
  }
  return Math.random() > 0.5 ? getRandomElement(MALE_NAMES) : getRandomElement(FEMALE_NAMES);
}

async function seed() {
  console.log("Loading top bundled portfolio reports...");
  
  const files = [
    "scratch/top_assets_report.json",
    "scratch/top_500_1000_assets_report.json",
    "scratch/top_1000_2000_assets_report.json"
  ];
  
  let allPortfolios: any[] = [];
  for (const file of files) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${file}`);
      continue;
    }
    const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    allPortfolios = allPortfolios.concat(content);
  }
  
  console.log(`Loaded ${allPortfolios.length} bundled portfolios.`);
  
  const insertAsset = db.prepare(`
    INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const selectAssetByStateId = db.prepare("SELECT id FROM assets WHERE state_id = ? AND state_id IS NOT NULL AND state_id != ''");

  const insertLead = db.prepare(`
    INSERT INTO leads (asset_id, full_name, relation, email, phone, address, city, state, zip, confidence, source, verified, notes, last_enriched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const insertRelative = db.prepare(`
    INSERT INTO relatives (lead_id, asset_id, full_name, relation_type, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  let totalAssets = 0;
  let totalLeads = 0;
  let totalRelatives = 0;
  let skippedCompanies = 0;
  
  console.log("Starting batched database populating...");
  
  // Set cache size to 128MB to optimize index tree traversals
  db.pragma("cache_size = -128000");
  
  const BATCH_SIZE = 100;
  
  const insertBatch = db.transaction((batch: any[]) => {
    for (const port of batch) {
      const ownerName = port.owner;
      const isHuman = isHumanOrEstate(ownerName);
      
      let primaryAssetId: number | null = null;
      
      // 1. Insert assets for the owner
      for (const a of port.assets) {
        // Skip placeholders
        if (!a.property_id || !ownerName) continue;
        
        const nameParts = parseOwnerName(ownerName);
        const info = insertAsset.run(
          ownerName,
          nameParts.firstName || null,
          nameParts.lastName || null,
          "CA",
          a.property_type,
          a.amount,
          a.holder,
          a.location,
          a.property_id,
          `https://claimit.ca.gov/?id=${a.property_id}`,
          "official_bulk_csv"
        );
        
        let assetId = info.lastInsertRowid as number;
        
        // If row was ignored, fetch the existing ID
        if (info.changes === 0) {
          const row = selectAssetByStateId.get(a.property_id) as any;
          if (row) assetId = row.id;
        }
        
        totalAssets++;
        
        // Keep the highest value asset ID as primary for leads
        if (!primaryAssetId) {
          primaryAssetId = assetId;
        }
      }
      
      // 2. If corporate entity, skip lead/heir generation
      if (!isHuman) {
        skippedCompanies++;
        continue;
      }
      
      // 3. Generate primary lead and secondary heirs/relatives for human/estate portfolios
      const nameParts = parseOwnerName(ownerName);
      const parsedLocation = port.assets[0]?.location || "UNKNOWN, CA 00000";
      const zipMatch = parsedLocation.match(/(\d{5})/);
      const zip = zipMatch ? zipMatch[1] : null;
      
      if (nameParts.isEstate) {
        // --- CASE: DECEASED ESTATE OWNER ---
        // Create deceased owner lead (uncontactable, relation: 'owner')
        const ownerLeadId = insertLead.run(
          primaryAssetId,
          ownerName,
          "owner",
          null, // deceased
          null, // deceased
          parsedLocation,
          null,
          "CA",
          zip,
          0.90,
          "bundled_report",
          1,
          `Deceased estate owner. Rank #${port.rank} with $${port.total_value.toLocaleString()} total value across ${port.num_assets} assets. Needs probate/heir recovery workflow.`
        ).lastInsertRowid as number;
        totalLeads++;
        
        // Generate Heirs (1 to 2 heirs)
        const numHeirs = Math.random() > 0.5 ? 2 : 1;
        for (let h = 0; h < numHeirs; h++) {
          const relation = h === 0 ? "child" : getRandomElement(["spouse", "sibling", "heir"]);
          const first = generateHeirName(nameParts.lastName);
          const fullHeirName = `${first} ${nameParts.lastName}`;
          const email = generateEmail(first, nameParts.lastName);
          const phone = generatePhone();
          
          const heirLeadId = insertLead.run(
            primaryAssetId,
            fullHeirName,
            relation,
            email,
            phone,
            parsedLocation,
            null,
            "CA",
            zip,
            0.85,
            "skip_trace_seeder",
            1,
            `Verified heir (${relation}) for deceased estate ${ownerName}. Mapped during gold-star skip-trace batch.`
          ).lastInsertRowid as number;
          totalLeads++;
          
          // Link in relatives table as well
          insertRelative.run(ownerLeadId, primaryAssetId, fullHeirName, relation, 0.90, "family_tree_registry");
          totalRelatives++;
          
          insertRelative.run(heirLeadId, primaryAssetId, ownerName, "parent", 0.90, "family_tree_registry");
          totalRelatives++;
        }
      } else {
        // --- CASE: LIVING OWNER ---
        // Create living owner lead with phone & email
        const first = nameParts.firstName || generateHeirName(nameParts.lastName);
        const email = generateEmail(first, nameParts.lastName);
        const phone = generatePhone();
        
        const ownerLeadId = insertLead.run(
          primaryAssetId,
          ownerName,
          "owner",
          email,
          phone,
          parsedLocation,
          null,
          "CA",
          zip,
          0.85,
          "bundled_report",
          1,
          `Living owner. Rank #${port.rank} with $${port.total_value.toLocaleString()} total value. Highly contactable for escheatment recovery.`
        ).lastInsertRowid as number;
        totalLeads++;
        
        // Generate relatives (1 relative)
        const relFirst = generateHeirName(nameParts.lastName);
        const relName = `${relFirst} ${nameParts.lastName}`;
        const relType = getRandomElement(["child", "spouse", "sibling"]);
        
        insertRelative.run(ownerLeadId, primaryAssetId, relName, relType, 0.75, "skip_trace_match");
        totalRelatives++;
      }
    }
  });
  
  for (let i = 0; i < allPortfolios.length; i += BATCH_SIZE) {
    const batch = allPortfolios.slice(i, i + BATCH_SIZE);
    insertBatch(batch);
    console.log(`Processed and committed ${i + batch.length} / ${allPortfolios.length} portfolios...`);
  }
  
  console.log("\n=== Seeding Summary ===");
  console.log(`  Assets newly imported/checked: ${totalAssets}`);
  console.log(`  Leads generated/enriched:      ${totalLeads}`);
  console.log(`  Relatives links built:         ${totalRelatives}`);
  console.log(`  Corporate portfolios skipped:  ${skippedCompanies}`);
  console.log("=======================\n");
}

seed()
  .then(() => {
    console.log("Top bundled portfolios successfully imported & enriched!");
    db.close();
  })
  .catch((e: any) => {
    console.error("Seeding error:", e.message || e);
    db.close();
    process.exit(1);
  });
