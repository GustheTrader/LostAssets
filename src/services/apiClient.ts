// API client for auto-flowing search results into leads + campaigns
import { AssetRecord } from "../types";

export async function createLeadFromAsset(asset: AssetRecord, overrides?: { full_name?: string; email?: string; phone?: string; relation?: string }) {
  const body = {
    asset_id: Number(asset.id.replace(/\D/g, "")) || null,
    full_name: overrides?.full_name || asset.name,
    relation: overrides?.relation || "owner",
    email: overrides?.email || null,
    phone: overrides?.phone || null,
    address: asset.address || "",
    city: null,
    state: asset.state || "",
    zip: null,
    confidence: 0.8,
    source: "search_auto",
    verified: 0,
    notes: `Auto-created from search result: ${asset.type} @ ${asset.holderCompany} ($${asset.amount})`,
  };
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create lead");
  const data = await res.json();
  return data.id as number;
}

export async function createCampaign(name: string, type: "email" | "call" | "mixed", targetFilter: any) {
  const res = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, target_filter: targetFilter, schedule_cron: "0 9 * * 1-5" }),
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  return await res.json();
}

/**
 * One-click: create lead from asset, create a campaign targeting that state,
 * queue outreach, and optionally execute immediately.
 */
export async function autoLeadAndCampaign(asset: AssetRecord, options?: { channel?: "email" | "call" | "mixed"; execute?: boolean }) {
  const leadId = await createLeadFromAsset(asset);
  const campaign = await createCampaign(
    `${asset.state} — ${asset.name.slice(0, 25)}`,
    options?.channel || "mixed",
    { states: [asset.state], minConfidence: 0.5, verifiedOnly: false }
  );
  const queueRes = await fetch(`/api/campaigns/${campaign.id}/queue`, { method: "POST" });
  const queueData = await queueRes.json();
  let execData = null;
  if (options?.execute) {
    const execRes = await fetch(`/api/campaigns/${campaign.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 5 }),
    });
    execData = await execRes.json();
  }
  return { leadId, campaign, queued: queueData, executed: execData };
}
