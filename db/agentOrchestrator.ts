import { db } from "./migrate";
import { sendEmail } from "./emailService";
import { sendCall, generateCallScript } from "./twilioService";
import { createOutreach, listOutreach, updateOutreachStatus, getCampaign, updateCampaignStatus, listCampaigns, type Outreach } from "./campaigns";
import { getLead, listLeads } from "./leads";
import { generateMailLetter } from "../execution/mailLetter";
import { logger } from "./logger";
import { generateAIOutreachEmail } from "./aiOutreachService";
import { validateGeminiConfig } from "./config";

interface AssetContext {
  ownerName: string;
  amount: number;
  state: string;
  propertyType: string;
  company: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function generateTrustEmail(leadName: string, relation: string | null, asset: AssetContext, step: number): { subject: string; html: string; text: string } {
  const amountText = formatCurrency(asset.amount);
  const firstName = leadName.split(" ")[0];

  if (step === 1) {
    const subject = `Important: Unclaimed property in ${asset.state} for ${asset.ownerName}`;
    const html = `
<p>Hi ${firstName},</p>
<p>My name is Alex from the Lost Asset Recovery Team. I specialize in helping individuals and families reunite with unclaimed property held by state treasuries.</p>
<p>I located a record in ${asset.state} for <strong>${asset.ownerName}</strong> — ${asset.propertyType} valued at approximately <strong>${amountText}</strong>, currently held by ${asset.company}.</p>
<p>You appear as ${relation || "a potential contact"} in my research. I want to help connect the rightful owner or heir to this asset.</p>
<p><strong>What I need from you:</strong></p>
<ul>
  <li>Confirmation of your relationship to ${asset.ownerName}</li>
  <li>A valid photo ID and proof of address</li>
  <li>If claiming as an heir: a small-estate affidavit or probate documents (I can guide you)</li>
</ul>
<p>I operate transparently: no upfront fees. I only earn when you successfully claim the property, and my compensation is a modest percentage capped by ${asset.state} law.</p>
<p>Please reply if you are the rightful owner or can help me reach them. I can also schedule a 5-minute call to answer any questions.</p>
<p>Best regards,<br/>Alex<br/>Lost Asset Recovery Team</p>
<hr/>
<p style="font-size:12px;color:#666;">This is not legal advice. State regulations apply. You may also claim directly through the state treasury at no cost.</p>
`;
    return { subject, html, text: html.replace(/<[^>>]+>/g, " ").replace(/\s{2,}/g, " ").trim() };
  }

  if (step === 2) {
    const subject = `Following up — unclaimed property for ${asset.ownerName} (${amountText})`;
    const html = `
<p>Hi ${firstName},</p>
<p>I wanted to follow up on my previous message about the unclaimed ${asset.propertyType} in ${asset.state} valued at ${amountText}.</p>
<p>If you are the owner or a direct heir, I can walk you through the claim process at no upfront cost. The state requires specific documentation, and I have experience preparing claims exactly as each state treasury wants them.</p>
<p><strong>Next steps if you are interested:</strong></p>
<ol>
  <li>Reply to this email with your phone number and a good time to call.</li>
  <li>I will send you the exact document checklist for ${asset.state}.</li>
  <li>We file together. You get the check.</li>
</ol>
<p>If this does not apply to you, please let me know so I can stop reaching out.</p>
<p>Best,<br/>Alex</p>
`;
    return { subject, html, text: html.replace(/<[^>>]+>/g, " ").replace(/\s{2,}/g, " ").trim() };
  }

  // Step 3+ — final notice
  const subject = `Final notice: unclaimed property for ${asset.ownerName}`;
  const html = `
<p>Hi ${firstName},</p>
<p>This is my final attempt to reach you regarding the unclaimed property for <strong>${asset.ownerName}</strong> in ${asset.state} (${amountText}).</p>
<p>If I do not hear back, I will assume this record is no longer actionable and close my file. The property will remain with the state treasury until claimed or escheated.</p>
<p>If you change your mind, you can always reach me at this address.</p>
<p>Best,<br/>Alex<br/>Lost Asset Recovery Team</p>
`;
  return { subject, html, text: html.replace(/<[^>>]+>/g, " ").replace(/\s{2,}/g, " ").trim() };
}

export async function queueOutreachForCampaign(campaignId: number, leadIds?: number[]): Promise<{ queued: number; skipped: number; errors: string[] }> {
  const campaign = getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "draft" && campaign.status !== "running") {
    throw new Error(`Campaign status is ${campaign.status}, cannot queue`);
  }

  let filter: any = {};
  try { filter = JSON.parse(campaign.target_filter || "{}"); } catch {}

  // Build lead query based on filter or specific list
  let leads = listLeads();
  if (leadIds) {
    leads = leads.filter((l) => leadIds.includes(l.id));
  } else {
    if (filter.states?.length) {
      leads = leads.filter((l) => filter.states.includes(l.state?.toUpperCase()));
    }
    if (filter.verifiedOnly) {
      leads = leads.filter((l) => l.verified === 1);
    }
    if (filter.minConfidence > 0) {
      leads = leads.filter((l) => (l.confidence || 0) >= filter.minConfidence);
    }
  }

  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    // For call campaigns, phone is required; for email, email is required
    const hasEmail = !!lead.email;
    const hasPhone = !!lead.phone;
    if (campaign.type === "call" && !hasPhone) { skipped++; continue; }
    if (campaign.type === "email" && !hasEmail) { skipped++; continue; }
    if (campaign.type === "mixed" && !hasEmail && !hasPhone) { skipped++; continue; }

    // Check if outreach already exists for this lead+campaign+step
    const existing = db.prepare(
      "SELECT COUNT(*) as c FROM outreach WHERE campaign_id = ? AND lead_id = ? AND sequence_step = 1"
    ).get(campaignId, lead.id) as { c: number };
    if (existing.c > 0) { skipped++; continue; }

    // Mail fallback: if no email or phone, but we have an address + owner name, queue physical mail instead
    const hasAddress = !!(lead.address || lead.city || lead.zip);
    const canMail = hasAddress && !hasEmail && !hasPhone;
    if (!hasEmail && !hasPhone && !canMail) { skipped++; continue; }

    // Pull linked asset context
    let assetCtx: AssetContext | null = null;
    if (lead.asset_id) {
      const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(lead.asset_id) as any;
      if (asset) {
        assetCtx = {
          ownerName: asset.owner_name,
          amount: asset.amount,
          state: asset.state,
          propertyType: asset.property_type || "property",
          company: asset.company || "State Treasury",
        };
      }
    }

    if (!assetCtx) {
      assetCtx = {
        ownerName: lead.full_name,
        amount: 0,
        state: lead.state || "Unknown",
        propertyType: "Unclaimed Property",
        company: "State Treasury",
      };
    }

    // Determine channel — mail if no digital channel available
    let channel: Outreach["channel"] = campaign.type === "call" ? "call" : campaign.type === "email" ? "email" : (hasEmail ? "email" : hasPhone ? "call" : "mail");

    if (channel === "call") {
      const script = generateCallScript(lead.full_name, assetCtx.ownerName, assetCtx.amount, assetCtx.state, assetCtx.propertyType, assetCtx.company);
      try {
        createOutreach({
          campaign_id: campaignId,
          lead_id: lead.id,
          asset_id: lead.asset_id,
          channel: "call",
          sequence_step: 1,
          subject: `Call: ${assetCtx.ownerName} — ${formatCurrency(assetCtx.amount)}`,
          body_html: null,
          body_text: script.fullScript,
          status: "pending",
          message_id: null,
          scheduled_at: null,
          sent_at: null,
          delivered_at: null,
          opened_at: null,
          replied_at: null,
          error_log: null,
        });
        queued++;
      } catch (e: any) {
        errors.push(`${lead.full_name}: ${e.message}`);
      }
      continue;
    }

    // Mail fallback path — no digital contact available; queue for physical letter
    // Mail fallback path — production letter

    if (channel === "mail") {

      const letter = generateMailLetter({

        leadName: lead.full_name,

        ownerName: assetCtx.ownerName,

        amount: assetCtx.amount,

        state: assetCtx.state,

        propertyType: assetCtx.propertyType,

        company: assetCtx.company,

        address: lead.address || undefined,

      });



      try {

        createOutreach({

          campaign_id: campaignId,

          lead_id: lead.id,

          asset_id: lead.asset_id,

          channel: "mail",

          sequence_step: 1,

          subject: letter.subject,

          body_html: null,

          body_text: letter.body,

          status: "pending",

          message_id: null,

          scheduled_at: null,

          sent_at: null,

          delivered_at: null,

          opened_at: null,

          replied_at: null,

          error_log: null,

        });

        queued++;

      } catch (e: any) {

        errors.push(`${lead.full_name}: ${e.message}`);

      }

      continue;

    }

    // Email path (default)
    let subject = "";
    let bodyHtml = "";
    let bodyText = "";

    let aiDraft = null;
    if (validateGeminiConfig().ok) {
      try {
        aiDraft = await generateAIOutreachEmail({
          leadName: lead.full_name,
          relation: lead.relation,
          ownerName: assetCtx.ownerName,
          amount: assetCtx.amount,
          state: assetCtx.state,
          propertyType: assetCtx.propertyType,
          company: assetCtx.company,
          address: lead.address,
          step: 1,
        });
      } catch (err: any) {
        logger.warn(`[Orchestrator] AI outreach generation failed, falling back: ${err.message}`);
      }
    }

    if (aiDraft) {
      subject = aiDraft.subject;
      bodyHtml = aiDraft.html;
      bodyText = aiDraft.text;
    } else {
      const draft = generateTrustEmail(lead.full_name, lead.relation, assetCtx, 1);
      subject = draft.subject;
      bodyHtml = draft.html;
      bodyText = draft.text;
    }

    try {
      createOutreach({
        campaign_id: campaignId,
        lead_id: lead.id,
        asset_id: lead.asset_id,
        channel: "email",
        sequence_step: 1,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        status: "pending",
        message_id: null,
        scheduled_at: null,
        sent_at: null,
        delivered_at: null,
        opened_at: null,
        replied_at: null,
        error_log: null,
      });
      queued++;
    } catch (e: any) {
      errors.push(`${lead.full_name}: ${e.message}`);
    }
  }
  return { queued, skipped, errors };
}

export async function executePendingOutreach(limit = 20): Promise<{ sent: number; failed: number; details: string[] }> {
  const pending = listOutreach(undefined, "pending").slice(0, limit);
  let sent = 0;
  let failed = 0;
  const details: string[] = [];

  for (const msg of pending) {
    const lead = getLead(msg.lead_id);
    if (!lead) {
      updateOutreachStatus(msg.id, "skipped", { errorLog: "Lead not found" });
      failed++;
      details.push(`#${msg.id} skipped: lead not found`);
      continue;
    }

    // Call path
    if (msg.channel === "call") {
      if (!lead.phone) {
        updateOutreachStatus(msg.id, "skipped", { errorLog: "No phone number" });
        failed++;
        details.push(`#${msg.id} skipped: no phone`);
        continue;
      }
      const scriptText = msg.body_text || "Hello, this is the Lost Asset Recovery Team calling.";
      // We need asset context for the script — reconstruct if possible, or pass through stored body_text
      const result = await sendCall(lead.phone, {
        intro: scriptText.slice(0, 160),
        body: scriptText.slice(160, 320),
        close: scriptText.slice(320),
        fullScript: scriptText,
        durationSec: Math.ceil(scriptText.split(" ").length / 2.5),
      });
      if (result.success) {
        updateOutreachStatus(msg.id, "sent", { sentAt: new Date().toISOString() });
        sent++;
        details.push(`#${msg.id} call sent to ${lead.phone} (sid: ${result.sid})`);
      } else {
        updateOutreachStatus(msg.id, "failed", { errorLog: result.error || "Unknown error" });
        failed++;
        details.push(`#${msg.id} call failed: ${result.error}`);
      }
      continue;
    }

    // Mail path — requires manual fulfillment; auto-mark as sent for pipeline flow
    if (msg.channel === "mail") {
      updateOutreachStatus(msg.id, "sent", { sentAt: new Date().toISOString() });
      sent++;
      details.push(`#${msg.id} mail queued → ${lead.address || "no address"}`);
      continue;
    }

    // Email path
    if (!lead.email) {
      updateOutreachStatus(msg.id, "skipped", { errorLog: "No email address" });
      failed++;
      details.push(`#${msg.id} skipped: no email`);
      continue;
    }

    const result = await sendEmail({
      to: lead.email,
      subject: msg.subject || "Unclaimed Property Notice",
      html: msg.body_html || msg.body_text || "",
      text: msg.body_text || undefined,
    });

    if (result.success) {
      updateOutreachStatus(msg.id, "sent", { sentAt: new Date().toISOString() });
      sent++;
      details.push(`#${msg.id} sent to ${lead.email}`);
    } else {
      updateOutreachStatus(msg.id, "failed", { errorLog: result.error || "Unknown error" });
      failed++;
      details.push(`#${msg.id} failed: ${result.error}`);
    }
  }

  return { sent, failed, details };
}

export async function runCampaignScheduler(): Promise<{ campaignsChecked: number; messagesQueued: number; messagesSent: number }> {
  const now = new Date().toISOString();
  const campaigns = listCampaigns("running");
  let messagesQueued = 0;
  let messagesSent = 0;

  for (const campaign of campaigns) {
    if (campaign.next_run_at && campaign.next_run_at > now) continue;

    // Queue any new leads matching filter
    const queueResult = await queueOutreachForCampaign(campaign.id);
    messagesQueued += queueResult.queued;

    // Send pending
    const execResult = await executePendingOutreach(10);
    messagesSent += execResult.sent;

    // Update next_run_at (simple: +1 day for now, cron parsing can be added)
    const next = new Date();
    next.setDate(next.getDate() + 1);
    db.prepare("UPDATE campaigns SET next_run_at = ? WHERE id = ?").run(next.toISOString(), campaign.id);
  }

  return { campaignsChecked: campaigns.length, messagesQueued, messagesSent };
}
