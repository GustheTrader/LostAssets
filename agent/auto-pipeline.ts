#!/usr/bin/env node
// Autonomous Pipeline Runner — Scheduled by Hermes Agent via cron
// This runs the complete asset recovery pipeline across all 7 states
// independently — no user input needed.
//
// Schedule: Every 6 hours (recommended)
//
// Flow:
//   1. Scan each state for new unclaimed property
//   2. Fast lead creation from asset data (address from location)
//   3. Secondary enrichment for email/phone (optional)
//   4. Generate state-compliant recovery contracts
//   5. Queue and send outreach emails/calls/mail
//   6. Report results
//
// Run: npx tsx agent/auto-pipeline.ts [--states CA,AZ,NV,TX,TN,IL,FL] [--dry-run]

import { db } from '../db/migrate';
import * as campaignsDb from '../db/campaigns';
import * as leadsDb from '../db/leads';
import { searchState, searchBatch, StateSearchInput, StateSearchRecord } from '../execution/stateSearchAdapters';
import { queueOutreachForCampaign, executePendingOutreach } from '../db/agentOrchestrator';
import { batchEnrichContacts } from '../execution/skipTraceEnricher';
import { getStateRegulation } from '../letters/regulations-data';

const DEFAULT_STATES = ['CA', 'AZ', 'NV', 'TX', 'TN', 'IL', 'FL'];

interface PipelineReport {
  timestamp: string;
  states: string[];
  assetsFound: number;
  newLeadsCreated: number;
  campaignsCreated: number;
  outreachQueued: number;
  outreachSent: number;
  errors: string[];
  perState: Record<string, { assets: number; leads: number; value: number }>;
}

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function parseStateArg(): string[] {
  const idx = process.argv.indexOf('--states');
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  }
  return DEFAULT_STATES;
}

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

async function runPipeline(): Promise<PipelineReport> {
  const states = parseStateArg();
  const dryRun = isDryRun();
  const report: PipelineReport = {
    timestamp: new Date().toISOString(),
    states,
    assetsFound: 0,
    newLeadsCreated: 0,
    campaignsCreated: 0,
    outreachQueued: 0,
    outreachSent: 0,
    errors: [],
    perState: {},
  };

  if (dryRun) log('*** DRY RUN MODE — No data will be written ***');
  log(`Pipeline started for states: ${states.join(', ')}`);

  // Phase 1: Scan all states for high-value property
  log('--- PHASE 1: Scanning states ---');
  const scanInputs: StateSearchInput[] = states.map(st => ({
    state: st,
    highValue: true,
    recordLimit: 50,
  }));

  const scanResults = await searchBatch(scanInputs);
  let totalAssets = 0;

  for (const result of scanResults) {
    const st = result.state;
    const records = result.records;
    const totalValue = records.reduce((s, r) => s + r.amount, 0);
    totalAssets += records.length;

    report.perState[st] = {
      assets: records.length,
      leads: 0,
      value: totalValue,
    };

    log(`  ${st}: ${records.length} assets, $${totalValue.toFixed(2)} total value`);
  }

  report.assetsFound = totalAssets;

  // Phase 2: Fast lead creation from asset data (primary)
  // Uses known location as address. Enrichment for email/phone is secondary.
  log('--- PHASE 2: Fast lead creation from asset data ---');
  let totalLeads = 0;
  let enrichedCount = 0;

  for (const st of states) {
    const unclaimed = db.prepare(`
      SELECT a.* FROM assets a
      LEFT JOIN leads l ON l.asset_id = a.id
      WHERE a.state = ? AND a.claim_status = 'unclaimed' AND l.id IS NULL
      ORDER BY a.amount DESC
      LIMIT 25
    `).all(st) as any[];

    if (unclaimed.length === 0) {
      log(`  ${st}: No unclaimed assets without leads`);
      continue;
    }

    if (dryRun) {
      log(`  ${st}: [DRY RUN] Would create ${unclaimed.length} fast leads`);
      totalLeads += unclaimed.length;
      continue;
    }

    let created = 0;
    for (const asset of unclaimed) {
      try {
        // Fast path: use asset.location as the address
        const leadData = {
          asset_id: asset.id,
          full_name: asset.owner_name,
          relation: 'owner',
          email: null,
          phone: null,
          address: asset.location || null,
          city: null,
          state: st,
          zip: null,
          confidence: 0.65,
          source: 'asset_location',
          verified: 0,
          notes: `Fast-created from ${st} scan. Asset: ${asset.state_id}. Location from holder report.`,
        };
        leadsDb.createLead(leadData);
        created++;
      } catch (e: any) {
        if (!e.message?.includes('UNIQUE')) {
          report.errors.push(`${st}: Lead create error for ${asset.owner_name} — ${e.message}`);
        }
      }
    }

    report.perState[st].leads += created;
    totalLeads += created;
    if (created > 0) log(`  ${st}: Created ${created} fast leads (address from asset.location)`);
  }

  report.newLeadsCreated = totalLeads;

  // Phase 2b: Secondary enrichment (email/phone) — limited to top-value leads
  // This is async / background friendly. Skips if scrapers are blocked.
  log('--- PHASE 2b: Secondary enrichment (email/phone) ---');
  try {
    // Only try enrichment on the highest-value un-enriched leads (top 10 per state)
    const placeholders = states.map(() => '?').join(',');
    const toEnrich = db.prepare(`
      SELECT l.*, a.location, a.company 
      FROM leads l
      JOIN assets a ON a.id = l.asset_id
      WHERE l.phone IS NULL AND l.email IS NULL
        AND l.state IN (${placeholders})
      ORDER BY a.amount DESC
      LIMIT 20
    `).all(...states) as any[];

    if (toEnrich.length > 0 && !dryRun) {
      const enrichJobs = toEnrich.map((l: any) => ({
        ownerName: l.full_name,
        state: l.state,
        location: l.location || l.address,
        company: l.company,
      }));

      const enrichResults = await batchEnrichContacts(enrichJobs, 3); // lower concurrency

      for (let i = 0; i < toEnrich.length; i++) {
        const res = enrichResults[i];
        const lead = toEnrich[i];
        if (res.phone || res.email) {
          leadsDb.updateLead(lead.id, {
            email: res.email,
            phone: res.phone,
            source: (lead.source || '') + ',' + (res.sources.join(',') || 'enriched'),
            notes: (lead.notes || '') + ' | ' + res.notes,
          });
          enrichedCount++;
        }
      }
      log(`  Enriched ${enrichedCount}/${toEnrich.length} leads with phone/email`);
    } else {
      log(`  No enrichment targets or dry-run — skipping secondary trace`);
    }
  } catch (e: any) {
    report.errors.push(`Secondary enrichment error: ${e.message}`);
  }

  // Phase 3: Generate campaign for each state with leads
  log('--- PHASE 3: Creating campaigns ---');
  let totalCampaigns = 0;
  let totalQueued = 0;

  for (const st of states) {
    // Check if there are leads with assets we haven't contacted
    const pendingLeads = db.prepare(`
      SELECT COUNT(*) as c FROM leads l
      JOIN assets a ON a.id = l.asset_id
      WHERE l.state = ? AND a.claim_status = 'unclaimed'
      AND l.id NOT IN (
        SELECT lead_id FROM outreach WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE target_filter LIKE ?
        )
      )
    `).get(st, `%${st}%`) as { c: number };

    if (pendingLeads.c === 0) {
      log(`  ${st}: No pending leads to queue outreach for`);
      continue;
    }

    if (dryRun) {
      log(`  ${st}: [DRY RUN] Would create campaign for ${pendingLeads.c} leads`);
      totalQueued += pendingLeads.c;
      totalCampaigns++;
      continue;
    }

    try {
      const campaign = campaignsDb.createCampaign(
        `${st} Auto-Pipeline ${new Date().toISOString().slice(0, 10)}`,
        'mixed',  // mixed so address-only leads can route to mail
        { states: [st], minConfidence: 0.3, verifiedOnly: false },
        '0 9 * * 1-5'
      );

      const queueResult = await queueOutreachForCampaign(campaign.id);
      campaignsDb.updateCampaignStatus(campaign.id, 'running');

      totalCampaigns++;
      totalQueued += queueResult.queued;

      log(`  ${st}: Campaign #${campaign.id} — ${queueResult.queued} queued, ${queueResult.skipped} skipped`);
    } catch (e: any) {
      report.errors.push(`${st}: Campaign error — ${e.message}`);
    }
  }

  report.campaignsCreated = totalCampaigns;
  report.outreachQueued = totalQueued;

  // Phase 4: Send outreach
  log('--- PHASE 4: Sending outreach ---');
  if (dryRun) {
    log(`  [DRY RUN] Would send up to 20 pending outreach messages`);
    report.outreachSent = 20;
  } else {
    try {
      const sendResult = await executePendingOutreach(20);
      report.outreachSent = sendResult.sent;
      log(`  Sent: ${sendResult.sent}, Failed: ${sendResult.failed}`);
      if (sendResult.failed > 0) {
        report.errors.push(`${sendResult.failed} outreach messages failed`);
      }
    } catch (e: any) {
      report.errors.push(`Send error: ${e.message}`);
    }
  }

  log('--- PIPELINE COMPLETE ---');
  log(`States:     ${states.join(', ')}`);
  log(`Assets:     ${report.assetsFound} found`);
  log(`Leads:      ${report.newLeadsCreated} created`);
  log(`Campaigns:  ${report.campaignsCreated} active`);
  log(`Queued:     ${report.outreachQueued} messages`);
  log(`Sent:       ${report.outreachSent} messages`);
  if (report.errors.length > 0) {
    log(`Errors:     ${report.errors.length}`);
    report.errors.slice(0, 3).forEach(e => log(`  ✗ ${e}`));
  }

  return report;
}

// Run and output JSON report
runPipeline()
  .then(report => {
    // Also save report to DB
    try {
      const existing = db.prepare("SELECT COUNT(*) as c FROM audit_log WHERE entity_type = 'pipeline' AND created_at > datetime('now', '-1 hour')").get() as { c: number };
      if (existing.c === 0) {
        db.prepare(
          "INSERT INTO audit_log (entity_type, entity_id, action, actor, metadata) VALUES ('pipeline', 1, 'run', 'auto_pipeline', ?)"
        ).run(JSON.stringify(report));
      }
    } catch {}

    // Print compact summary for cron delivery
    console.log(`\n=== PIPELINE SUMMARY ===`);
    console.log(`Found: ${report.assetsFound} assets | Leads: ${report.newLeadsCreated} | Queued: ${report.outreachQueued} | Sent: ${report.outreachSent}`);
    if (report.errors.length > 0) {
      console.log(`Warnings: ${report.errors.length}`);
    }
  })
  .catch(err => {
    console.error('Pipeline fatal error:', err);
    process.exit(1);
  });
