import Database from "better-sqlite3";
import path from "path";

const db = new Database("data.sqlite");

console.log("=== TABLE INFO ===");
const tableInfo = db.prepare("PRAGMA table_info(assets)").all();
console.log(tableInfo);

console.log("\n=== SAMPLE ROWS (TOP 15) ===");
const sampleRows = db.prepare("SELECT * FROM assets LIMIT 15").all();
console.log(sampleRows);

console.log("\n=== SAMPLE DISTINCT PROPERTY TYPES ===");
const propTypes = db.prepare("SELECT property_type, COUNT(*) as count FROM assets GROUP BY property_type ORDER BY count DESC LIMIT 20").all();
console.log(propTypes);

console.log("\n=== SAMPLE OWNER NAMES CONTAINING CO/INC/LLC ===");
const bizSample = db.prepare("SELECT owner_name, first_name, last_name, property_type FROM assets WHERE owner_name LIKE '%INC%' OR owner_name LIKE '%LLC%' OR owner_name LIKE '%CO%' LIMIT 10").all();
console.log(bizSample);

console.log("\n=== SAMPLE OWNER NAMES CONTAINING ESTATE/EST/DEC ===");
const estateSample = db.prepare("SELECT owner_name, first_name, last_name, property_type FROM assets WHERE owner_name LIKE '%ESTATE%' OR owner_name LIKE '%EST%' OR owner_name LIKE '%DEC%' LIMIT 10").all();
console.log(estateSample);
