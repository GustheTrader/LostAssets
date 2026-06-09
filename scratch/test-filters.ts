import Database from "better-sqlite3";

const db = new Database("data.sqlite");

console.log("=== TESTING BUSINESS FILTER ===");
// Let's try matching with space boundaries
const bizFilter = `
  owner_name LIKE '% INC%' OR 
  owner_name LIKE '% LLC%' OR 
  owner_name LIKE '% CORP%' OR 
  owner_name LIKE '% CO %' OR 
  owner_name LIKE '% CO' OR 
  owner_name LIKE '% LTD%' OR 
  owner_name LIKE '%COMPANY%' OR 
  owner_name LIKE '%ASSOCIATION%' OR 
  owner_name LIKE '%PARTNERS%' OR 
  owner_name LIKE '%TRUST%' OR 
  owner_name LIKE '%FOUNDATION%' OR 
  owner_name LIKE '%BANK%' OR 
  owner_name LIKE '% SYS%' OR
  owner_name LIKE '% INT%' OR
  owner_name LIKE '% SVC%' OR
  owner_name LIKE '% SERV%' OR
  owner_name LIKE '% CLUB%' OR
  owner_name LIKE '% DEPT%' OR
  owner_name LIKE '% GROUP%' OR
  owner_name LIKE '% UNION%' OR
  owner_name LIKE '% SOC%' OR
  owner_name LIKE '% CLINIC%' OR
  owner_name LIKE '% HOSP%' OR
  owner_name LIKE '% CTR%' OR
  owner_name LIKE '% CENTER%' OR
  owner_name LIKE '% CORP'
`;

const bizCount = db.prepare(`SELECT COUNT(DISTINCT owner_name) as c FROM assets WHERE ${bizFilter}`).get() as any;
console.log(`Total Distinct Business Names found: ${bizCount.c}`);

console.log("\nSample Business Names:");
const bizSample = db.prepare(`SELECT DISTINCT owner_name FROM assets WHERE ${bizFilter} LIMIT 20`).all();
console.log(bizSample.map((r: any) => r.owner_name));


console.log("\n=== TESTING ESTATE FILTER ===");
const estateFilter = `
  is_estate = 1 OR 
  owner_name LIKE '%ESTATE%' OR 
  owner_name LIKE '%EST OF%' OR 
  owner_name LIKE '%DECEASED%' OR 
  owner_name LIKE '% DEC %' OR 
  owner_name LIKE '% DEC' OR 
  property_type LIKE '%LIFE INS%'
`;

const estateCount = db.prepare(`SELECT COUNT(DISTINCT owner_name) as c FROM assets WHERE ${estateFilter}`).get() as any;
console.log(`Total Distinct Estate Names found: ${estateCount.c}`);

console.log("\nSample Estate Names:");
const estateSample = db.prepare(`SELECT DISTINCT owner_name FROM assets WHERE ${estateFilter} LIMIT 20`).all();
console.log(estateSample.map((r: any) => r.owner_name));


console.log("\n=== TESTING INDIVIDUAL FILTER ===");
// An individual is anything that is NOT a business and NOT an estate
const indFilter = `
  NOT (${bizFilter}) AND NOT (${estateFilter})
`;

const indCount = db.prepare(`SELECT COUNT(DISTINCT owner_name) as c FROM assets WHERE ${indFilter}`).get() as any;
console.log(`Total Distinct Individual Names found: ${indCount.c}`);

console.log("\nSample Individual Names:");
const indSample = db.prepare(`SELECT DISTINCT owner_name FROM assets WHERE ${indFilter} LIMIT 20`).all();
console.log(indSample.map((r: any) => r.owner_name));
