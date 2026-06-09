// skipTraceAdapter.ts
// Bridges skipTraceEnricher scraping with the DB lead creation.
// Usage: from auto-pipeline Phase 2 or CLI trace command.

import { enrichContact, batchEnrichContacts, EnrichmentResult } from "../execution/skipTraceEnricher";
import { normalizeName } from "../execution/nameNormalization";
import { createLead, updateLead, listLeads, updateLastEnriched } from "../db/leads";
import { createRelative } from "../db/relatives";
import { db } from "../db/migrate";

export interface TraceJob {
  assetId: number;
  ownerName: string;
  state: string;
  location: string | null;
  company: string | null;
  amount: number;
}

export interface TraceReport {
  total: number;
  enriched: number;
  created: number;
  updated: number;
  failed: number;
  details: {
    assetId: number;
    name: string;
    phone: string | null;
    address: string | null;
    confidence: number;
    action: "created" | "updated" | "skipped" | "failed";
    note: string;
  }[];
}

/**
 * Perform contact enrichment for a single trace job and persist lead + relatives.
 */
export async function traceAndPersistLead(job: TraceJob): Promise<{ leadId: number | null; report: TraceReport["details"][0] }> {
  // Check if a lead already exists for this asset
  const existing = listLeads(job.assetId);
  const hasContact = existing.some(l => l.email || l.phone || l.last_enriched_at);

  // Skip if recently enriched (caching)
  if (hasContact && existing[0].last_enriched_at) {
    const lastEnriched = new Date(existing[0].last_enriched_at);
    const daysSince = (Date.now() - lastEnriched.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) {
      return {
        leadId: existing[0].id,
        report: {
          assetId: job.assetId,
          name: job.ownerName,
          phone: existing[0].phone,
          address: existing[0].address,
          confidence: existing[0].confidence,
          action: "skipped",
          note: "Cached - enriched within last 30 days.",
        },
      };
    }
  }

  try {
    const result = await enrichContact(job.ownerName, job.state, job.location, job.company);

    let leadId: number;
    let action: "created" | "updated" = "created";

    if (existing.length > 0) {
      updateLead(existing[0].id, {
        email: result.email,
        phone: result.phone,
        address: result.address,
        city: result.city,
        state: result.state,
        zip: result.zip,
        confidence: result.confidence,
        source: result.sources.join(","),
        notes: result.notes,
      });
      leadId = existing[0].id;
      action = "updated";
    } else {
      leadId = createLead({
        asset_id: job.assetId,
        full_name: job.ownerName,
        relation: "owner",
        email: result.email,
        phone: result.phone,
        address: result.address || job.location,
        city: result.city,
        state: result.state || job.state,
        zip: result.zip,
        confidence: result.confidence,
        source: result.sources.length > 0 ? result.sources.join(",") : "skip_trace",
        verified: 0,
        notes: result.notes,
        last_enriched_at: new Date().toISOString(),
      });
    }

    // Persist relatives if any
    if (result.relatives && result.relatives.length > 0) {
      for (const relName of result.relatives) {
        try {
          createRelative({
            lead_id: leadId,
            asset_id: job.assetId,
            full_name: relName,
            relation_type: "possible_relative",
            confidence: result.confidence,
            source: result.sources.join(","),
          });
        } catch (e) {
          // ignore duplicate relative errors
        }
      }
    }

    // Update last enriched timestamp
    updateLastEnriched(leadId);

    return {
      leadId,
      report: {
        assetId: job.assetId,
        name: job.ownerName,
        phone: result.phone,
        address: result.address,
        confidence: result.confidence,
        action,
        note: result.notes,
      },
    };
  } catch (e: any) {
    return {
      leadId: null,
      report: {
        assetId: job.assetId,
        name: job.ownerName,
        phone: null,
        address: null,
        confidence: 0,
        action: "failed",
        note: `Error: ${e.message}`,
      },
    };
  }
}

/**
 * Batch trace from a list of assets. Returns a full report.
 */
export async function batchTraceFromAssets(assets: any[], concurrency = 4): Promise<TraceReport> {
  const report: TraceReport = {
    total: assets.length,
    enriched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    details: [],
  };

  for (let i = 0; i < assets.length; i += concurrency) {
    const chunk = assets.slice(i, i + concurrency);
    const jobs: TraceJob[] = chunk.map(a => ({
      assetId: a.id,
      ownerName: a.owner_name,
      state: a.state,
      location: a.location,
      company: a.company,
      amount: a.amount,
    }));

    const enrichResults = await batchEnrichContacts(
      jobs.map(j => ({ ownerName: j.ownerName, state: j.state, location: j.location, company: j.company })),
      concurrency
    );

    for (let j = 0; j < chunk.length; j++) {
      const res = enrichResults[j];
      const existing = listLeads(jobs[j].assetId);

      const leadData: any = {
        asset_id: jobs[j].assetId,
        full_name: jobs[j].ownerName,
        relation: "owner",
        email: res.email,
        phone: res.phone,
        address: res.address || jobs[j].location,
        city: res.city,
        state: res.state || jobs[j].state,
        zip: res.zip,
        confidence: res.confidence,
        source: res.sources.length > 0 ? res.sources.join(",") : "skip_trace",
        verified: 0,
        notes: res.notes,
        last_enriched_at: new Date().toISOString(),
      };

      let action: "created" | "updated" | "failed" = "created";
      let leadId: number;

      try {
        if (existing.length > 0) {
          updateLead(existing[0].id, leadData);
          leadId = existing[0].id;
          action = "updated";
          report.updated++;
        } else {
          leadId = createLead(leadData);
          report.created++;
        }
        report.enriched++;

        // Persist relatives
        if (res.relatives && res.relatives.length > 0) {
          for (const relName of res.relatives) {
            try {
              createRelative({
                lead_id: leadId,
                asset_id: jobs[j].assetId,
                full_name: relName,
                relation_type: "possible_relative",
                confidence: res.confidence,
                source: res.sources.join(","),
              });
            } catch {}
          }
        }

        updateLastEnriched(leadId);
      } catch (e: any) {
        action = "failed";
        report.failed++;
        console.error(`[traceAdapter] DB error asset ${jobs[j].assetId}: ${e.message}`);
      }

      report.details.push({
        assetId: jobs[j].assetId,
        name: jobs[j].ownerName,
        phone: res.phone,
        address: res.address,
        confidence: res.confidence,
        action,
        note: res.notes,
      });
    }
  }

  return report;
}

/**
 * Re-trace a single asset by ID (CLI usage).
 */
export async function traceAssetById(assetId: number): Promise<TraceReport> {
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId) as any;
  if (!asset) {
    return { total: 0, enriched: 0, created: 0, updated: 0, failed: 0, details: [] };
  }
  return batchTraceFromAssets([asset], 1);
}
