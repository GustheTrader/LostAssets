import { db } from "./migrate";
// ── Campaign CRUD ───────────────────────────────────────
export interface Campaign {
  id: number;
  name: string;
  status: "draft" | "running" | "paused" | "completed" | "failed";
  type: "email" | "call" | "mixed";
  target_filter: string;
  schedule_cron: string | null;
  client_id: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Outreach {
  id: number;
  campaign_id: number;
  lead_id: number;
  asset_id: number | null;
  channel: "email" | "call" | "sms" | "mail";
  sequence_step: number;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  status: "pending" | "queued" | "sent" | "delivered" | "opened" | "replied" | "bounced" | "failed" | "skipped";
  message_id: string | null;  // SendGrid msg-id or Twilio CallSid for delivery tracking
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  error_log: string | null;
  created_at: string;
}

export function listCampaigns(status?: string): Campaign[] {
  if (status) {
    return db.prepare("SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC").all(status) as Campaign[];
  }
  return db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all() as Campaign[];
}

export function getCampaign(id: number): Campaign | undefined {
  return db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as Campaign | undefined;
}

export function createCampaign(name: string, type: Campaign["type"], targetFilter: any, scheduleCron?: string, clientId?: string): Campaign {
  const info = db.prepare(
    `INSERT INTO campaigns (name, status, type, target_filter, schedule_cron, client_id)
     VALUES (?, 'draft', ?, ?, ?, ?)`
  ).run(name, type, JSON.stringify(targetFilter), scheduleCron || null, clientId || null);
  return getCampaign(info.lastInsertRowid as number)!;
}

export function updateCampaignStatus(id: number, status: Campaign["status"]) {
  db.prepare("UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
}

export function deleteCampaign(id: number) {
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}

export function createOutreach(out: Omit<Outreach, "id" | "created_at">): number {
  const info = db.prepare(
    `INSERT INTO outreach (campaign_id, lead_id, asset_id, channel, sequence_step, subject, body_html, body_text, status, scheduled_at, message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(out.campaign_id, out.lead_id, out.asset_id, out.channel, out.sequence_step, out.subject, out.body_html, out.body_text, out.status, out.scheduled_at, out.message_id || null);
  return info.lastInsertRowid as number;
}

export function listOutreach(campaignId?: number, status?: string): Outreach[] {
  if (campaignId && status) {
    return db.prepare("SELECT * FROM outreach WHERE campaign_id = ? AND status = ? ORDER BY sequence_step, scheduled_at").all(campaignId, status) as Outreach[];
  }
  if (campaignId) {
    return db.prepare("SELECT * FROM outreach WHERE campaign_id = ? ORDER BY sequence_step, scheduled_at").all(campaignId) as Outreach[];
  }
  if (status) {
    return db.prepare("SELECT * FROM outreach WHERE status = ? ORDER BY scheduled_at").all(status) as Outreach[];
  }
  return db.prepare("SELECT * FROM outreach ORDER BY created_at DESC LIMIT 500").all() as Outreach[];
}

export function updateOutreachStatus(id: number, status: Outreach["status"], meta?: { sentAt?: string; openedAt?: string; repliedAt?: string; errorLog?: string }) {
  const sets = ["status = ?"];
  const vals: any[] = [status];
  if (meta?.sentAt) { sets.push("sent_at = ?"); vals.push(meta.sentAt); }
  if (meta?.openedAt) { sets.push("opened_at = ?"); vals.push(meta.openedAt); }
  if (meta?.repliedAt) { sets.push("replied_at = ?"); vals.push(meta.repliedAt); }
  if (meta?.errorLog) { sets.push("error_log = ?"); vals.push(meta.errorLog); }
  vals.push(id);
  db.prepare(`UPDATE outreach SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function getOutreachStats(campaignId: number) {
  const row = db.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
      SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
     FROM outreach WHERE campaign_id = ?`
  ).get(campaignId) as any;
  return row || { total:0, sent:0, delivered:0, opened:0, replied:0, bounced:0, failed:0, pending:0 };
}
