import { db } from "./migrate";

export interface Lead {
  id: number;
  asset_id: number | null;
  full_name: string;
  relation: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  confidence: number;
  source: string | null;
  verified: number;
  notes: string | null;
  last_enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createLead(lead: Omit<Lead, "id" | "created_at" | "updated_at">): number {
  const info = db.prepare(
    `INSERT INTO leads (asset_id, full_name, relation, email, phone, address, city, state, zip, confidence, source, verified, notes, last_enriched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(lead.asset_id, lead.full_name, lead.relation, lead.email, lead.phone, lead.address, lead.city, lead.state, lead.zip, lead.confidence, lead.source, lead.verified, lead.notes, lead.last_enriched_at || null);
  return info.lastInsertRowid as number;
}

export function listLeads(assetId?: number, state?: string): Lead[] {
  if (assetId) {
    return db.prepare("SELECT * FROM leads WHERE asset_id = ? ORDER BY confidence DESC").all(assetId) as Lead[];
  }
  if (state) {
    return db.prepare("SELECT * FROM leads WHERE state = ? ORDER BY confidence DESC").all(state) as Lead[];
  }
  return db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 500").all() as Lead[];
}

export function getLead(id: number): Lead | undefined {
  return db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
}

export function updateLead(id: number, patch: Partial<Omit<Lead, "id" | "created_at" | "updated_at">>) {
  const fields = Object.keys(patch).filter((k) => patch[k as keyof typeof patch] !== undefined);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => patch[f as keyof typeof patch]);
  db.prepare(`UPDATE leads SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
}

export function deleteLead(id: number) {
  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
}

export function updateLastEnriched(id: number) {
  db.prepare("UPDATE leads SET last_enriched_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}
