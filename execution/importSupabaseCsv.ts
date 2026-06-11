import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { buildLocation, detectColumnMapping, parseAmount, pickFirst, type CsvColumnMapping } from "./csvAssetMapping";

dotenv.config();

type Args = {
  files: string[];
  batchSize: number;
  defaultState: string;
  dryRun: boolean;
  limit?: number;
};

type AssetInsert = {
  owner_name: string;
  first_name: string | null;
  last_name: string | null;
  state: string;
  property_type: string | null;
  amount: number;
  company: string | null;
  location: string | null;
  state_id: string | null;
  source_url: string;
  confidence: "official_bulk_csv" | "manual_entry";
  claim_status: "unclaimed";
  source_file: string;
  source_row: number;
  raw_record: Record<string, unknown>;
};

function readArgs(argv: string[]): Args {
  const args: Args = {
    files: [],
    batchSize: 1000,
    defaultState: "CA",
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--batch-size") {
      args.batchSize = Math.max(1, Number(argv[++i] || 1000));
    } else if (arg === "--state") {
      args.defaultState = String(argv[++i] || "CA").trim().toUpperCase();
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--limit") {
      const limit = Number(argv[++i]);
      args.limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.files.push(arg);
    }
  }

  if (args.files.length === 0) {
    throw new Error("Usage: npx tsx execution/importSupabaseCsv.ts [--dry-run] [--state CA] [--batch-size 1000] <file-or-folder>...");
  }

  return args;
}

function expandCsvFiles(inputs: string[]): string[] {
  const files: string[] = [];
  for (const input of inputs) {
    const fullPath = path.resolve(input);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(fullPath)) {
        const child = path.join(fullPath, entry);
        if (fs.statSync(child).isFile() && child.toLowerCase().endsWith(".csv")) {
          files.push(child);
        }
      }
    } else if (fullPath.toLowerCase().endsWith(".csv")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function normalizeAsset(row: Record<string, unknown>, colMap: CsvColumnMapping, sourceFile: string, sourceRow: number, defaultState: string): AssetInsert | null {
  const ownerName = pickFirst(row, colMap.ownerName) || "Unknown";
  const state = (pickFirst(row, colMap.state) || defaultState).trim().toUpperCase();
  const stateId = pickFirst(row, colMap.stateId);

  if (!state && ownerName === "Unknown" && !stateId) return null;

  return {
    owner_name: ownerName,
    first_name: pickFirst(row, colMap.firstName),
    last_name: pickFirst(row, colMap.lastName),
    state,
    property_type: pickFirst(row, colMap.propertyType),
    amount: parseAmount(pickFirst(row, colMap.amount)),
    company: pickFirst(row, colMap.company),
    location: buildLocation(row, colMap),
    state_id: stateId,
    source_url: `upload:${path.basename(sourceFile)}`,
    confidence: "official_bulk_csv",
    claim_status: "unclaimed",
    source_file: path.basename(sourceFile),
    source_row: sourceRow,
    raw_record: row,
  };
}

async function insertBatch(supabase: any, batch: AssetInsert[], dryRun: boolean) {
  if (batch.length === 0 || dryRun) return;

  const { error } = await supabase.from("assets").upsert(batch, {
    onConflict: "source_file,source_row",
    ignoreDuplicates: true,
  });
  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}

async function importFile(supabase: any, filePath: string, args: Args) {
  let colMap: CsvColumnMapping | null = null;
  let headers: string[] = [];
  let sourceRow = 0;
  let imported = 0;
  let skipped = 0;
  let batch: AssetInsert[] = [];

  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (detectedHeaders) => {
      headers = detectedHeaders;
      colMap = detectColumnMapping(detectedHeaders);
      return detectedHeaders;
    },
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }));

  for await (const row of parser) {
    sourceRow++;
    if (args.limit && sourceRow > args.limit) break;
    if (!colMap) throw new Error("CSV headers were not detected.");

    const asset = normalizeAsset(row, colMap, filePath, sourceRow, args.defaultState);
    if (!asset) {
      skipped++;
      continue;
    }

    batch.push(asset);
    imported++;

    if (batch.length >= args.batchSize) {
      await insertBatch(supabase, batch, args.dryRun);
      console.log(`${path.basename(filePath)}: ${imported.toLocaleString()} rows prepared${args.dryRun ? " (dry run)" : ""}`);
      batch = [];
    }
  }

  await insertBatch(supabase, batch, args.dryRun);
  return { filePath, imported, skipped, headers, mapping: colMap };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const files = expandCsvFiles(args.files);
  if (files.length === 0) throw new Error("No CSV files found.");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRoleKey = serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY";
  if (!args.dryRun && (!supabaseUrl || !hasServiceRoleKey)) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run is used.");
  }

  const supabase = createClient(supabaseUrl || "http://localhost", serviceRoleKey || "dry-run", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalImported = 0;
  let totalSkipped = 0;
  for (const file of files) {
    console.log(`Importing ${file}`);
    const result = await importFile(supabase, file, args);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    console.log(`Finished ${path.basename(file)}: ${result.imported.toLocaleString()} prepared, ${result.skipped.toLocaleString()} skipped.`);
    console.log(`Detected columns: ${result.headers.join(", ")}`);
  }

  console.log(`Done. ${totalImported.toLocaleString()} records ${args.dryRun ? "validated" : "inserted"}; ${totalSkipped.toLocaleString()} skipped.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
