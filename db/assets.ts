import { db } from "./migrate";

export interface Asset {
  id: number;
  owner_name: string;
  first_name: string | null;
  last_name: string | null;
  state: string;
  property_type: string | null;
  amount: number;
  company: string | null;
  location: string | null;
  state_id: string | null;
  source_url: string | null;
  confidence: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  claim_status: string;
}

export function listAssets(opts?: { status?: string; state?: string; minAmount?: number; limit?: number }): Asset[] {
  let sql = "SELECT * FROM assets WHERE 1=1";
  const params: any[] = [];
  if (opts?.status) { sql += " AND claim_status = ?"; params.push(opts.status); }
  if (opts?.state) { sql += " AND state = ?"; params.push(opts.state.toUpperCase()); }
  if (opts?.minAmount) { sql += " AND amount >= ?"; params.push(opts.minAmount); }
  sql += " ORDER BY amount DESC LIMIT ?";
  params.push(Math.min(500, Math.max(1, opts?.limit || 100)));
  return db.prepare(sql).all(...params) as Asset[];
}

export function getAsset(id: number): Asset | undefined {
  return db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as Asset | undefined;
}

export function createAsset(record: Omit<Asset, "id" | "created_at" | "updated_at" | "claimed_at" | "claim_status">): number {
  const info = db.prepare(
    `INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.owner_name,
    record.first_name,
    record.last_name,
    record.state,
    record.property_type,
    record.amount,
    record.company,
    record.location,
    record.state_id,
    record.source_url,
    record.confidence
  );
  if (info.changes === 0 && record.state_id) {
    const existing = db.prepare("SELECT id FROM assets WHERE state_id = ?").get(record.state_id) as { id: number } | undefined;
    if (existing) {
      return existing.id;
    }
  }
  return info.lastInsertRowid as number;
}

export function updateAssetClaimStatus(id: number, status: string) {
  const valid = ["unclaimed", "contacted", "in_progress", "claimed", "expired", "rejected"];
  if (!valid.includes(status)) throw new Error("Invalid claim_status");
  db.prepare("UPDATE assets SET claim_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
}

export function getAssetWithLeads(id: number): { asset: Asset; leads: any[] } {
  const asset = getAsset(id);
  if (!asset) throw new Error("Asset not found");
  const leads = db.prepare("SELECT * FROM leads WHERE asset_id = ? ORDER BY confidence DESC").all(id);
  return { asset, leads };
}
