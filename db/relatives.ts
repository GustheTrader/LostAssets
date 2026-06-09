import { db } from "./migrate";

export interface Relative {
  id: number;
  lead_id: number | null;
  asset_id: number | null;
  full_name: string;
  relation_type: string | null;
  confidence: number;
  source: string | null;
  created_at: string;
}

export function createRelative(relative: Omit<Relative, "id" | "created_at">): number {
  const info = db.prepare(`
    INSERT INTO relatives (lead_id, asset_id, full_name, relation_type, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    relative.lead_id,
    relative.asset_id,
    relative.full_name,
    relative.relation_type,
    relative.confidence,
    relative.source
  );
  return info.lastInsertRowid as number;
}

export function listRelativesByLead(leadId: number): Relative[] {
  return db.prepare("SELECT * FROM relatives WHERE lead_id = ? ORDER BY confidence DESC").all(leadId) as Relative[];
}

export function listRelativesByAsset(assetId: number): Relative[] {
  return db.prepare("SELECT * FROM relatives WHERE asset_id = ? ORDER BY confidence DESC").all(assetId) as Relative[];
}
