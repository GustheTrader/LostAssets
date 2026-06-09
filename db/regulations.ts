import { db } from "./migrate";

export interface Regulation {
  id: number;
  state: string;
  state_name: string;
  claim_form_url: string | null;
  required_documents: string | null; // JSON array string
  notarization_required: number;
  heirship_affidavit_required: number;
  probate_required_threshold: number;
  finder_fee_cap: number | null;
  finder_contract_required: number;
  contract_must_be_notarized: number;
  cooling_off_days: number;
  legal_reference: string | null;
  notes: string | null;
  updated_at: string;
}

export function getAllRegulations(): Regulation[] {
  return db.prepare("SELECT * FROM regulations ORDER BY state_name").all() as Regulation[];
}

export function getRegulation(state: string): Regulation | undefined {
  return db.prepare("SELECT * FROM regulations WHERE state = ?").get(state.toUpperCase()) as Regulation | undefined;
}

export function getRegulationsNeedingNotarization(): Regulation[] {
  return db.prepare("SELECT * FROM regulations WHERE notarization_required = 1 OR heirship_affidavit_required = 1 ORDER BY state_name").all() as Regulation[];
}

export function getRegulationsWithProbateThreshold(): Regulation[] {
  return db.prepare("SELECT * FROM regulations WHERE probate_required_threshold > 0 ORDER BY probate_required_threshold DESC").all() as Regulation[];
}

export function getRegulationsWithFinderFeeCap(): Regulation[] {
  return db.prepare("SELECT * FROM regulations WHERE finder_fee_cap IS NOT NULL ORDER BY finder_fee_cap DESC").all() as Regulation[];
}

export function updateRegulation(state: string, patch: Partial<Regulation>) {
  const fields = Object.keys(patch).filter((k) => k !== "id" && k !== "updated_at" && patch[k as keyof Regulation] !== undefined);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => patch[f as keyof Regulation]);
  db.prepare(`UPDATE regulations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE state = ?`).run(...values, state.toUpperCase());
}
