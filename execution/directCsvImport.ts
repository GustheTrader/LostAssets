/**
 * STREAMING CSV → SQLite importer for large CA unclaimed property files.
 * Uses csv-parse streaming to avoid OOM on 267MB files.
 *
 * Usage: npx tsx execution/directCsvImport.ts "/path/to/From_500_To_Beyond_*.csv"
 */

import Database from "better-sqlite3";
import { parse } from "csv-parse";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { Transform, TransformCallback } from "stream";
import {
  buildLocation,
  detectColumnMapping,
  parseAmount,
  pickFirst,
  type CsvColumnMapping,
} from "./csvAssetMapping";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "..", "data.sqlite");
const BATCH_SIZE = 5000;

function importCsv(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Reading: ${filePath} ===`);
    const stat = fs.statSync(filePath);
    console.log(`  Size: ${(stat.size / 1_048_576).toFixed(1)} MB`);

    const filename = path.basename(filePath);
    const sourceUrl = `upload:${filename}`;

    const db = new Database(DB_PATH);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = OFF");
    db.pragma("cache_size = -65536");

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;
    let rowCount = 0;
    let colMap: CsvColumnMapping | null = null;
    let batch: Record<string, string>[] = [];
    const startTime = Date.now();

    const insertBatch = db.transaction((rows: Record<string, string>[]) => {
      for (const row of rows) {
        const ownerName = pickFirst(row, colMap!.ownerName) || "Unknown";
        const state = pickFirst(row, colMap!.state) || "";
        const propertyType = pickFirst(row, colMap!.propertyType) || undefined;
        const amount = parseAmount(pickFirst(row, colMap!.amount));
        const company = pickFirst(row, colMap!.company) || undefined;
        const location = buildLocation(row, colMap!);
        const stateId = pickFirst(row, colMap!.stateId) || undefined;

        if (!state && ownerName === "Unknown") {
          skipped++;
          continue;
        }

        stmt.run(
          ownerName,
          undefined,
          undefined,
          state,
          propertyType,
          amount,
          company,
          location,
          stateId,
          sourceUrl,
          "manual_entry"
        );
        imported++;
      }
    });

    const readStream = fs.createReadStream(filePath, { encoding: "utf-8" });

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    // Buffer rows into batches
    const batcher = new Transform({
      objectMode: true,
      transform(row: Record<string, string>, _encoding: BufferEncoding, callback: TransformCallback) {
        if (!colMap) {
          const headers = Object.keys(row);
          colMap = detectColumnMapping(headers);
          console.log(`  Columns: ${headers.length}, mapping:`);
          console.log(`    ownerName: ${colMap.ownerName}`);
          console.log(`    state: ${colMap.state}`);
          console.log(`    amount: ${colMap.amount}`);
          console.log(`    company: ${colMap.company}`);
        }

        batch.push(row);
        rowCount++;

        if (batch.length >= BATCH_SIZE) {
          insertBatch(batch);
          batch = [];
          const pct = (rowCount / 1000000 * 100).toFixed(1); // rough % based on 1M rows per file
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          process.stdout.write(`\r  [${elapsed}s] ${rowCount.toLocaleString()} rows, ${imported.toLocaleString()} imported...`);
        }
        callback();
      },
    });

    parser.on("error", (err: Error) => {
      reject(err);
    });

    readStream.on("error", (err: Error) => {
      reject(err);
    });

    readStream
      .pipe(parser)
      .pipe(batcher)
      .on("finish", () => {
        // Flush remaining batch
        if (batch.length > 0) {
          insertBatch(batch);
        }

        const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\r  Done: ${rowCount.toLocaleString()} rows, ${imported.toLocaleString()} imported, ${skipped} skipped in ${totalSec}s`);
        db.close();
        resolve();
      })
      .on("error", (err: Error) => {
        reject(err);
      });
  });
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npx tsx execution/directCsvImport.ts <csv_file_or_glob...>");
  process.exit(1);
}

(async () => {
  for (const arg of args) {
    if (arg.includes("*")) {
      const { execSync } = await import("child_process");
      const result = execSync(`ls ${arg} 2>/dev/null`, { encoding: "utf-8" });
      const files = result.trim().split("\n").filter(Boolean);
      for (const file of files) await importCsv(file);
    } else if (fs.existsSync(arg)) {
      await importCsv(arg);
    } else {
      console.error(`File not found: ${arg}`);
    }
  }
  console.log("\n=== All imports complete ===");
})();
