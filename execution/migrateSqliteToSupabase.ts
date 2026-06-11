import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config();

type Args = {
  dbPath: string;
  batchSize: number;
  dryRun: boolean;
  limit?: number;
  startOffset: number;
  tables?: string[];
};

const TABLES = [
  "assets",
  "regulations",
  "campaigns",
  "leads",
  "outreach",
  "audit_log",
  "cases",
  "case_assets",
  "relatives",
] as const;

const JSON_COLUMNS: Record<string, string[]> = {
  assets: ["raw_record"],
  campaigns: ["target_filter"],
  cases: ["query_json"],
  regulations: ["required_documents"],
  audit_log: ["metadata"],
};

const BOOLEAN_COLUMNS: Record<string, string[]> = {
  assets: ["is_estate", "confirmed_deceased", "is_business"],
  leads: ["verified"],
  regulations: [
    "notarization_required",
    "heirship_affidavit_required",
    "finder_contract_required",
    "contract_must_be_notarized",
  ],
};

const DATE_COLUMNS: Record<string, string[]> = {
  assets: ["created_at", "updated_at", "claimed_at"],
  leads: ["created_at", "updated_at", "last_enriched_at"],
  campaigns: ["created_at", "updated_at", "next_run_at"],
  outreach: ["scheduled_at", "sent_at", "delivered_at", "opened_at", "replied_at", "created_at"],
  regulations: ["updated_at"],
  audit_log: ["created_at"],
  cases: ["created_at", "last_rescanned_at", "next_rescan_at"],
  relatives: ["created_at"],
};

function readArgs(argv: string[]): Args {
  const args: Args = {
    dbPath: path.resolve("data.sqlite"),
    batchSize: 1000,
    dryRun: false,
    startOffset: 0,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--db") {
      args.dbPath = path.resolve(argv[++i] || args.dbPath);
    } else if (arg === "--batch-size") {
      args.batchSize = Math.max(1, Number(argv[++i] || 1000));
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--limit") {
      const limit = Number(argv[++i]);
      args.limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;
    } else if (arg === "--start-offset") {
      const startOffset = Number(argv[++i]);
      args.startOffset = Number.isFinite(startOffset) && startOffset > 0 ? Math.floor(startOffset) : 0;
    } else if (arg === "--table") {
      args.tables = [...(args.tables || []), argv[++i]];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function parseJson(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { value };
  }
}

function normalizeDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function normalizeRow(table: string, row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (JSON_COLUMNS[table]?.includes(key)) {
      output[key] = parseJson(value);
    } else if (BOOLEAN_COLUMNS[table]?.includes(key)) {
      output[key] = Boolean(value);
    } else if (DATE_COLUMNS[table]?.includes(key)) {
      output[key] = normalizeDate(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function getTableNames(db: Database.Database, requested?: string[]) {
  const existing = new Set(
    db.prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((row: any) => row.name),
  );
  const tables = requested?.length ? requested : [...TABLES];
  return tables.filter((table) => table !== "sqlite_sequence" && existing.has(table));
}

function countRows(db: Database.Database, table: string) {
  return (db.prepare(`select count(*) as count from "${table}"`).get() as { count: number }).count;
}

async function migrateTable(supabase: any, db: Database.Database, table: string, args: Args) {
  const total = countRows(db, table);
  const startOffset = args.tables?.length === 1 ? Math.min(args.startOffset, total) : 0;
  const remaining = Math.max(0, total - startOffset);
  const target = args.limit ? Math.min(remaining, args.limit) : remaining;
  console.log(`${table}: ${target.toLocaleString()} of ${total.toLocaleString()} rows queued from offset ${startOffset.toLocaleString()}${args.dryRun ? " (dry run)" : ""}`);

  if (target === 0) return;

  const orderBy = table === "case_assets" ? "case_id, asset_id" : table === "cases" ? "id" : "id";
  const stmt = db.prepare(`select * from "${table}" order by ${orderBy} limit ? offset ?`);
  let migrated = 0;

  for (let processed = 0; processed < target; processed += args.batchSize) {
    const limit = Math.min(args.batchSize, target - processed);
    const offset = startOffset + processed;
    const rows = stmt.all(limit, offset).map((row: any) => normalizeRow(table, row));
    if (!args.dryRun) {
      const onConflict = table === "case_assets" ? "case_id,asset_id" : "id";
      const { error } = await supabase.from(table).upsert(rows, { onConflict });
      if (error) {
        throw new Error(`${table} batch at offset ${offset.toLocaleString()} failed: ${error.message}`);
      }
    }
    migrated += rows.length;
    console.log(`${table}: ${(startOffset + migrated).toLocaleString()} / ${total.toLocaleString()}`);
  }
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const db = new Database(args.dbPath, { readonly: true });
  const tables = getTableNames(db, args.tables);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRoleKey = serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY";
  if (!args.dryRun && (!supabaseUrl || !hasServiceRoleKey)) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run is used.");
  }

  const supabase = createClient(supabaseUrl || "http://localhost", serviceRoleKey || "dry-run", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Migrating from ${args.dbPath}`);
  console.log(`Tables: ${tables.join(", ")}`);
  for (const table of tables) {
    await migrateTable(supabase, db, table, args);
  }
  db.close();
  console.log(args.dryRun ? "Dry run complete." : "Migration complete. Re-run db/supabase_schema.sql to refresh id sequences.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
