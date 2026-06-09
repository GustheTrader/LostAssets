// @ts-ignore — express default import works with esModuleInterop at runtime (tsx/esbuild)
import express, { Request, Response, NextFunction } from "express";
import * as path from "path";
// @ts-ignore — cors default import works with esModuleInterop at runtime
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
// @ts-ignore — Vite dev-server types have a rollup/parseAst resolution issue in TS 5.8 bundler mode
import { createServer as createViteServer } from "vite";
import cron from "node-cron";

// Config + logging
import { config, validateEmailConfig, validateTwilioConfig, validateGeminiConfig } from "./db/config";
import { logger } from "./db/logger";

// DB + migrations
import "./db/migrate";
import { db } from "./db/migrate";
import * as campaignsDb from "./db/campaigns";
import * as leadsDb from "./db/leads";
import * as regulationsDb from "./db/regulations";
import * as agent from "./db/agentOrchestrator";
import type { Outreach, Campaign } from "./db/campaigns";

import { searchBatch, searchState, StateSearchInput, StateSearchRecord } from "./execution/stateSearchAdapters";
import { tracePerson, traceUsername } from "./execution/traceAdapters";
import { buildLocation, detectColumnMapping, parseAmount, pickFirst } from "./execution/csvAssetMapping";

const app = express();
const PORT = config.PORT;

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// ── Middleware: request logging + security headers ─────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ── Global error handler ────────────────────────────────
// Must be registered AFTER all routes
function persistRecords(records: StateSearchRecord[]) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return records.map((record) => {
    const info = stmt.run(
      record.ownerName,
      record.firstName,
      record.lastName,
      record.state,
      record.propertyType,
      record.amount,
      record.company,
      record.location,
      record.stateId,
      record.sourceUrl,
      record.confidence,
    );

    let id = info.lastInsertRowid;
    if (info.changes === 0 && record.stateId) {
      const existing = db.prepare("SELECT id FROM assets WHERE state_id = ?").get(record.stateId) as { id: number } | undefined;
      if (existing) {
        id = existing.id;
      }
    }

    return {
      id,
      ownerName: record.ownerName,
      firstName: record.firstName,
      lastName: record.lastName,
      state: record.state,
      type: record.propertyType,
      amount: record.amount,
      company: record.company,
      location: record.location,
      stateId: record.stateId,
      sourceUrl: record.sourceUrl,
      confidence: record.confidence,
    };
  });
}

function readSearchInput(query: any): StateSearchInput {
  const parsedLimit = Number(query.recordLimit);
  return {
    firstName: typeof query.firstName === "string" ? query.firstName : undefined,
    lastName: typeof query.lastName === "string" ? query.lastName : undefined,
    state: typeof query.state === "string" && query.state ? query.state : "CA",
    assetType: typeof query.assetType === "string" ? query.assetType : undefined,
    highValue: query.highValue === "true" || query.highValue === true,
    recordLimit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
  };
}

async function handleSingleSearch(req: any, res: any) {
  try {
    const input = readSearchInput(req.query);
    const records = persistRecords(await searchState(input));
    res.json({
      message: records.length > 0
        ? `Search complete. ${records.length} normalized records returned from the ${input.state} adapter.`
        : `No records found for ${input.state}.`,
      records,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed", message: error.message });
  }
}

app.get("/api/search", handleSingleSearch);
app.get("/api/scrape", handleSingleSearch);

app.post("/api/batch-search", async (req, res) => {
  try {
    const leads = Array.isArray(req.body?.leads) ? req.body.leads : [];
    const totalLimit = Math.max(1, Math.min(100, Math.floor(Number(req.body?.recordLimit) || 10)));
    let remaining = totalLimit;
    const inputs = leads
      .map((lead: any) => ({
        firstName: String(lead.firstName || "").trim(),
        lastName: String(lead.lastName || "").trim(),
        state: String(lead.state || "").trim().toUpperCase(),
        assetType: lead.assetType,
        highValue: Boolean(lead.highValue),
        recordLimit: Math.max(1, Math.min(100, Math.floor(Number(lead.recordLimit || totalLimit) || totalLimit))),
      }))
      .filter((lead: StateSearchInput) => lead.state && (lead.highValue || lead.firstName || lead.lastName));

    const results = [];
    for (const input of inputs) {
      if (remaining <= 0) break;
      const batch = (await searchBatch([{ ...input, recordLimit: remaining }]))[0];
      const cappedRecords = batch.records.slice(0, remaining);
      remaining -= cappedRecords.length;
      results.push({
        ...batch,
        records: persistRecords(cappedRecords),
      });
    }

    res.json({
      searched: inputs.length,
      results,
      recordCount: results.reduce((sum, batch) => sum + batch.records.length, 0),
      recordLimit: totalLimit,
    });
  } catch (error: any) {
    console.error("Batch search error:", error);
    res.status(500).json({ error: "Batch search failed", message: error.message });
  }
});

app.post("/api/rescan", async (req, res) => {
  try {
    const cases = Array.isArray(req.body?.cases) ? req.body.cases : [];
    const rescans = [];

    for (const savedCase of cases) {
      const query = savedCase.query || {};
      const stateSet = new Set<string>();
      if (query.targetState) stateSet.add(String(query.targetState).toUpperCase());
      for (const asset of savedCase.assets || []) {
        if (asset.state) stateSet.add(String(asset.state).toUpperCase());
      }
      if (stateSet.size === 0) stateSet.add("CA");

      const inputs = Array.from(stateSet).map((state) => ({
        firstName: query.firstName,
        lastName: query.lastName,
        state,
        assetType: query.assetType,
        highValue: Boolean(query.generalHighValue),
        recordLimit: query.recordLimit,
      }));

      const batches = await searchBatch(inputs);
      const records = persistRecords(batches.flatMap((batch) => batch.records));
      rescans.push({
        caseId: savedCase.id,
        records,
        rescannedAt: Date.now(),
        nextRescanAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.json({ rescans });
  } catch (error: any) {
    console.error("Rescan error:", error);
    res.status(500).json({ error: "Rescan failed", message: error.message });
  }
});

// ── Assets / Records ────────────────────────────────────
app.get("/api/records", (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const state = req.query.state as string | undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    let sql = "SELECT * FROM assets WHERE 1=1";
    const params: any[] = [];
    if (status) { sql += " AND claim_status = ?"; params.push(status); }
    if (state)  { sql += " AND state = ?"; params.push(state.toUpperCase()); }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: "Database error", message: error.message });
  }
});

app.get("/api/records/search-bundled", (req, res) => {
  try {
    console.log("=== SEARCH BUNDLED QUERY ===", req.query);
    const name = req.query.name as string | undefined;
    const minAmount = req.query.minAmount ? Number(req.query.minAmount) : undefined;
    const maxAmount = req.query.maxAmount ? Number(req.query.maxAmount) : undefined;
    const limit = Math.min(5000, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    let countSql = `
      SELECT COUNT(DISTINCT owner_name) as c
      FROM assets
      WHERE 1=1
    `;
    let sql = `
      SELECT owner_name, SUM(amount) AS total_amount, COUNT(*) AS asset_count
      FROM assets
      WHERE 1=1
    `;
    const params: any[] = [];

    if (name && name.trim()) {
      const escapedName = `%${name.trim()}%`;
      sql += " AND owner_name LIKE ?";
      countSql += " AND owner_name LIKE ?";
      params.push(escapedName);
    }
    if (minAmount !== undefined && !isNaN(minAmount)) {
      sql += " AND amount >= ?";
      countSql += " AND amount >= ?";
      params.push(minAmount);
    }
    if (maxAmount !== undefined && !isNaN(maxAmount)) {
      sql += " AND amount <= ?";
      countSql += " AND amount <= ?";
      params.push(maxAmount);
    }

    const ownerType = req.query.ownerType as string | undefined;
    const bizFilter = " AND is_business = 1";
    const estateFilter = " AND is_estate = 1";
    const indFilter = " AND is_business = 0 AND is_estate = 0";

    if (ownerType === "business") {
      sql += bizFilter;
      countSql += bizFilter;
    } else if (ownerType === "estate") {
      sql += estateFilter;
      countSql += estateFilter;
    } else if (ownerType === "individual") {
      sql += indFilter;
      countSql += indFilter;
    }

    sql += " GROUP BY owner_name ORDER BY total_amount DESC LIMIT ? OFFSET ?";
    
    const countParams = [...params];
    const totalBundlesRow = db.prepare(countSql).get(...countParams) as { c: number };
    const totalBundles = totalBundlesRow ? totalBundlesRow.c : 0;

    const queryParams = [...params, limit, offset];
    const bundles = db.prepare(sql).all(...queryParams) as Array<{ owner_name: string; total_amount: number; asset_count: number }>;

    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // Optimization: query all assets for these bundles in a single batched IN query
    const ownerNames = bundles.map(b => b.owner_name);
    let assetsByOwner: Record<string, any[]> = {};
    if (ownerNames.length > 0) {
      const chunks = chunkArray(ownerNames, 900);
      for (const chunk of chunks) {
        const placeholders = chunk.map(() => "?").join(",");
        const allAssets = db.prepare(`SELECT * FROM assets WHERE owner_name IN (${placeholders}) ORDER BY amount DESC`).all(...chunk) as any[];
        for (const asset of allAssets) {
          if (!assetsByOwner[asset.owner_name]) {
            assetsByOwner[asset.owner_name] = [];
          }
          assetsByOwner[asset.owner_name].push(asset);
        }
      }
    }

    const bundledResults = bundles.map((b) => {
      return {
        ownerName: b.owner_name,
        totalAmount: b.total_amount,
        assetCount: b.asset_count,
        assets: assetsByOwner[b.owner_name] || []
      };
    });

    // Look up leads linked to these assets
    const allAssetIds = bundledResults.flatMap(b => b.assets.map(a => a.id));
    let leadIds: number[] = [];
    if (allAssetIds.length > 0) {
      const chunks = chunkArray(allAssetIds, 900);
      for (const chunk of chunks) {
        const placeholders = chunk.map(() => "?").join(",");
        const rows = db.prepare(`SELECT id FROM leads WHERE asset_id IN (${placeholders})`).all(...chunk) as any[];
        leadIds = leadIds.concat(rows.map(r => r.id));
      }
    }

    res.json({
      bundles: bundledResults,
      total: totalBundles,
      limit,
      offset,
      leadIds
    });
  } catch (error: any) {
    res.status(500).json({ error: "Database error", message: error.message });
  }
});

app.post("/api/campaigns/build-from-bundled-search", async (req, res) => {
  try {
    const { campaignName, campaignType, nameQuery, minAmount, maxAmount, limit, ownerType } = req.body || {};
    if (!campaignName || !campaignType) {
      return res.status(400).json({ error: "campaignName and campaignType are required" });
    }

    const searchLimit = Math.min(5000, Math.max(1, Number(limit || 100)));

    // 1. Find assets matching the query
    let sql = `
      SELECT owner_name, SUM(amount) AS total_amount, COUNT(*) AS asset_count
      FROM assets
      WHERE 1=1
    `;
    const params: any[] = [];

    if (nameQuery && nameQuery.trim()) {
      const escapedName = `%${nameQuery.trim()}%`;
      sql += " AND owner_name LIKE ?";
      params.push(escapedName);
    }
    if (minAmount !== undefined && !isNaN(minAmount) && minAmount !== null && minAmount !== "") {
      sql += " AND amount >= ?";
      params.push(Number(minAmount));
    }
    if (maxAmount !== undefined && !isNaN(maxAmount) && maxAmount !== null && maxAmount !== "") {
      sql += " AND amount <= ?";
      params.push(Number(maxAmount));
    }

    const bizFilter = " AND is_business = 1";
    const estateFilter = " AND is_estate = 1";
    const indFilter = " AND is_business = 0 AND is_estate = 0";

    if (ownerType === "business") {
      sql += bizFilter;
    } else if (ownerType === "estate") {
      sql += estateFilter;
    } else if (ownerType === "individual") {
      sql += indFilter;
    }

    sql += " GROUP BY owner_name ORDER BY total_amount DESC LIMIT ?";
    params.push(searchLimit);

    const bundles = db.prepare(sql).all(...params) as Array<{ owner_name: string; total_amount: number; asset_count: number }>;

    // Chunk helper
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // Query all assets for these bundles
    const ownerNames = bundles.map(b => b.owner_name);
    let assetsByOwner: Record<string, any[]> = {};
    if (ownerNames.length > 0) {
      const chunks = chunkArray(ownerNames, 900);
      for (const chunk of chunks) {
        const placeholders = chunk.map(() => "?").join(",");
        const allAssets = db.prepare(`SELECT * FROM assets WHERE owner_name IN (${placeholders}) ORDER BY amount DESC`).all(...chunk) as any[];
        for (const asset of allAssets) {
          if (!assetsByOwner[asset.owner_name]) {
            assetsByOwner[asset.owner_name] = [];
          }
          assetsByOwner[asset.owner_name].push(asset);
        }
      }
    }

    // 2. Ensure leads exist for these assets
    const allAssetIds = bundles.flatMap(b => (assetsByOwner[b.owner_name] || []).map(a => a.id));
    
    let existingLeadsByAssetId: Record<number, number> = {};
    if (allAssetIds.length > 0) {
      const chunks = chunkArray(allAssetIds, 900);
      for (const chunk of chunks) {
        const placeholders = chunk.map(() => "?").join(",");
        const rows = db.prepare(`SELECT id, asset_id FROM leads WHERE asset_id IN (${placeholders})`).all(...chunk) as Array<{ id: number; asset_id: number }>;
        for (const r of rows) {
          if (r.asset_id) {
            existingLeadsByAssetId[r.asset_id] = r.id;
          }
        }
      }
    }

    const finalLeadIds: number[] = [];

    // Start a transaction to insert new leads quickly
    const insertLead = db.prepare(`
      INSERT INTO leads (asset_id, full_name, relation, email, phone, address, city, state, zip, confidence, source, verified, notes, last_enriched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const createLeadsTransaction = db.transaction(() => {
      for (const b of bundles) {
        const ownerAssets = assetsByOwner[b.owner_name] || [];
        if (ownerAssets.length === 0) continue;

        let existingLeadId: number | null = null;
        for (const asset of ownerAssets) {
          if (existingLeadsByAssetId[asset.id]) {
            existingLeadId = existingLeadsByAssetId[asset.id];
            break;
          }
        }

        if (existingLeadId) {
          finalLeadIds.push(existingLeadId);
        } else {
          const primaryAsset = ownerAssets[0];
          const parsedLocation = primaryAsset.location || "UNKNOWN, CA 00000";
          const zipMatch = parsedLocation.match(/(\d{5})/);
          const zip = zipMatch ? zipMatch[1] : null;

          const info = insertLead.run(
            primaryAsset.id,
            b.owner_name,
            "owner",
            null,
            null,
            parsedLocation,
            null,
            primaryAsset.state || "CA",
            zip,
            0.8,
            "bundled_workbench_autobuild",
            0,
            `Auto-created lead from CA Bundling workbench. Grouped total amount: $${b.total_amount}`
          );
          finalLeadIds.push(info.lastInsertRowid as number);
        }
      }
    });

    createLeadsTransaction();

    // 3. Create the campaign
    const targetFilter = {
      states: ["CA"],
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      nameQuery: nameQuery || undefined
    };
    const campaign = campaignsDb.createCampaign(campaignName.trim(), campaignType, targetFilter, "0 9 * * 1-5");

    // 4. Queue the leads for this campaign
    let queued = 0;
    let skipped = 0;
    if (finalLeadIds.length > 0) {
      const queueResult = await agent.queueOutreachForCampaign(campaign.id, finalLeadIds);
      queued = queueResult.queued;
      skipped = queueResult.skipped;
    }

    res.json({
      success: true,
      campaign,
      totalAssetsFound: allAssetIds.length,
      totalOwnersFound: bundles.length,
      leadCount: finalLeadIds.length,
      queued,
      skipped
    });

  } catch (error: any) {
    logger.error("Failed to build campaign from search", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/assets/:id/status", (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    const valid = ["unclaimed","contacted","in_progress","claimed","expired","rejected"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
    db.prepare("UPDATE assets SET claim_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Leads ───────────────────────────────────────────────
app.get("/api/leads", (req, res) => {
  try {
    const assetId = req.query.assetId ? Number(req.query.assetId) : undefined;
    const state = req.query.state as string | undefined;
    res.json(leadsDb.listLeads(assetId, state));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/leads", (req, res) => {
  try {
    const body = req.body || {};
    const id = leadsDb.createLead({
      asset_id: body.asset_id ?? null,
      full_name: String(body.full_name || ""),
      relation: body.relation ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip: body.zip ?? null,
      confidence: Number(body.confidence ?? 0.5),
      source: body.source ?? "manual",
      verified: body.verified ? 1 : 0,
      notes: body.notes ?? null,
      last_enriched_at: null,
    });
    res.json({ id, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/leads/:id", (req, res) => {
  try {
    leadsDb.updateLead(Number(req.params.id), req.body || {});
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/leads/:id", (req, res) => {
  try {
    leadsDb.deleteLead(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Regulations ─────────────────────────────────────────
app.get("/api/regulations", (req, res) => {
  try {
    const filter = req.query.filter as string | undefined;
    if (filter === "notarization") return res.json(regulationsDb.getRegulationsNeedingNotarization());
    if (filter === "probate") return res.json(regulationsDb.getRegulationsWithProbateThreshold());
    if (filter === "finder_fee") return res.json(regulationsDb.getRegulationsWithFinderFeeCap());
    res.json(regulationsDb.getAllRegulations());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/regulations/:state", (req, res) => {
  try {
    const row = regulationsDb.getRegulation(req.params.state);
    if (!row) return res.status(404).json({ error: "State not found" });
    res.json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Campaigns ───────────────────────────────────────────
app.get("/api/campaigns", (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    res.json(campaignsDb.listCampaigns(status));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/campaigns", (req, res) => {
  try {
    const { name, type, target_filter, schedule_cron, client_id } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: "name and type required" });
    const c = campaignsDb.createCampaign(name, type, target_filter, schedule_cron, client_id);
    res.json(c);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/campaigns/:id/status", (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    campaignsDb.updateCampaignStatus(id, status);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/campaigns/:id", (req, res) => {
  try {
    campaignsDb.deleteCampaign(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/campaigns/:id/queue", async (req, res) => {
  try {
    const leadIds = req.body?.leadIds ? req.body.leadIds.map(Number) : undefined;
    const result = await agent.queueOutreachForCampaign(Number(req.params.id), leadIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/campaigns/:id/run", async (req, res) => {
  try {
    const execResult = await agent.executePendingOutreach(req.body.limit || 20);
    res.json(execResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/campaigns/:id/stats", (req, res) => {
  try {
    res.json(campaignsDb.getOutreachStats(Number(req.params.id)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/campaigns/:id/outreach-details", (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const sql = `
      SELECT 
        o.id AS outreach_id,
        o.channel,
        o.sequence_step,
        o.status AS outreach_status,
        o.scheduled_at,
        o.sent_at,
        o.delivered_at,
        o.opened_at,
        o.replied_at,
        l.id AS lead_id,
        l.full_name AS lead_name,
        l.relation AS lead_relation,
        l.email AS lead_email,
        l.phone AS lead_phone,
        l.address AS lead_address,
        l.notes AS lead_notes,
        a.id AS asset_id,
        a.owner_name AS asset_owner,
        a.amount AS asset_amount,
        a.company AS asset_company,
        a.property_type AS asset_type,
        a.claim_status AS asset_claim_status
      FROM outreach o
      LEFT JOIN leads l ON o.lead_id = l.id
      LEFT JOIN assets a ON o.asset_id = a.id
      WHERE o.campaign_id = ?
      ORDER BY o.sequence_step, o.created_at DESC
    `;
    const rows = db.prepare(sql).all(campaignId) as any[];
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/outreach/:id/status", (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    const valid = ["pending", "queued", "sent", "delivered", "opened", "replied", "bounced", "failed", "skipped"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
    campaignsDb.updateOutreachStatus(id, status as any);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Twilio Webhook ───────────────────────────────────────
app.post("/api/webhooks/twilio-status", (req, res) => {
  try {
    const { CallSid, CallStatus, To } = req.body || {};
    logger.info("Twilio callback", { sid: CallSid, status: CallStatus, to: To });
    // Map Twilio status to outreach status
    const statusMap: Record<string, Outreach["status"]> = {
      completed: "delivered",
      answered: "sent",
      "no-answer": "failed",
      busy: "failed",
      failed: "failed",
      canceled: "failed",
    };
    if (CallSid && statusMap[CallStatus]) {
      // Update matching outreach row by tracking SID stored in message_id column
      db.prepare("UPDATE outreach SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE message_id = ?")
        .run(statusMap[CallStatus], CallSid);
    }
    res.status(200).send("<?xml version='1.0' encoding='UTF-8'?><Response/>");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Outreach ─────────────────────────────────────────────
app.get("/api/outreach", (req, res) => {
  try {
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;
    const status = req.query.status as string | undefined;
    res.json(campaignsDb.listOutreach(campaignId, status));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Agent Scheduler ─────────────────────────────────────
app.post("/api/agent/execute", async (req, res) => {
  try {
    const result = await agent.runCampaignScheduler();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Hermes Agent Command Endpoint ─────────────────────────
app.post("/api/agent/command", async (req, res) => {
  try {
    const text = String(req.body?.command || "").trim().toLowerCase();
    if (!text) return res.status(400).json({ error: "command required" });

    const log: string[] = [];
    let result: any = null;

    if (text.includes("search") || text.includes("find")) {
      const nameMatch = text.match(/(?:for|name)\s+([a-z]+)\s+([a-z]+)/i);
      const stateMatch = text.match(/(?:in|state)\s+([a-z]{2})/i);
      const limitMatch = text.match(/(?:top|limit)\s*(\d+)/i);
      const firstName = nameMatch?.[1] || "";
      const lastName = nameMatch?.[2] || "";
      const state = (stateMatch?.[1] || "CA").toUpperCase();
      const limit = Math.min(100, Math.max(1, Number(limitMatch?.[1] || 10)));

      const records = persistRecords(await searchState({ firstName, lastName, state, recordLimit: limit }));
      result = { action: "search", records, count: records.length };
      log.push(`Searched ${state} for ${firstName} ${lastName} → ${records.length} records`);
    }

    else if (text.includes("campaign") || text.includes("outreach")) {
      const stateMatch = text.match(/(?:in|for)\s+([a-z]{2})/i);
      const typeMatch = text.match(/(email|call|mixed)/i);
      const state = (stateMatch?.[1] || "CA").toUpperCase();
      const type = (typeMatch?.[1] || "mixed").toLowerCase() as Campaign["type"];
      const name = `${state} Hermes Campaign`;

      const c = campaignsDb.createCampaign(name, type, { states: [state], minConfidence: 0.5, verifiedOnly: false }, "0 9 * * 1-5");
      const queue = await agent.queueOutreachForCampaign(c.id);
      result = { action: "campaign_created", campaign: c, queued: queue.queued, skipped: queue.skipped };
      log.push(`Created campaign #${c.id} for ${state} → queued ${queue.queued} messages`);
    }

    else if (text.includes("lead") || text.includes("add")) {
      const nameMatch = text.match(/(?:lead|name)\s+([a-z\s]+)/i);
      const stateMatch = text.match(/(?:in|state)\s+([a-z]{2})/i);
      const fullName = (nameMatch?.[1] || "Unknown Owner").trim().toUpperCase();
      const state = (stateMatch?.[1] || "CA").toUpperCase();

      const id = leadsDb.createLead({
        asset_id: null, full_name: fullName, relation: "owner", email: null, phone: null,
        address: null, city: null, state, zip: null, confidence: 0.5, source: "hermes_agent", verified: 0, notes: `Created by Hermes agent: "${text}"`,
        last_enriched_at: null,
      });
      result = { action: "lead_created", leadId: id };
      log.push(`Created lead #${id}: ${fullName} (${state})`);
    }

    else if (text.includes("run") || text.includes("send") || text.includes("execute")) {
      const exec = await agent.executePendingOutreach(req.body?.limit || 10);
      result = { action: "execute", ...exec };
      log.push(`Executed outreach → sent ${exec.sent}, failed ${exec.failed}`);
    }

    else if (text.includes("status") || text.includes("stats")) {
      const stats = {
        assets: (db.prepare("SELECT COUNT(*) as c FROM assets").get() as any).c,
        leads: (db.prepare("SELECT COUNT(*) as c FROM leads").get() as any).c,
        campaigns: (db.prepare("SELECT COUNT(*) as c FROM campaigns").get() as any).c,
        outreachPending: (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'pending'").get() as any).c,
        outreachSent: (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'sent'").get() as any).c,
      };
      result = { action: "status", stats };
      log.push(`Status: ${stats.assets} assets, ${stats.leads} leads, ${stats.campaigns} campaigns, ${stats.outreachPending} pending, ${stats.outreachSent} sent`);
    }

    else if (text.includes("enrich") || text.includes("research") || text.includes("trace")) {
      const stateMatch = text.match(/(?:in|state)\s+([a-z]{2})/i);
      const state = (stateMatch?.[1] || "CA").toUpperCase();
      
      let nameTarget = text
        .replace(/enrich/g, "")
        .replace(/research/g, "")
        .replace(/case/g, "")
        .replace(/trace/g, "")
        .replace(/in\s+[a-z]{2}/g, "")
        .replace(/state\s+[a-z]{2}/g, "")
        .trim();
        
      if (!nameTarget) {
        return res.status(400).json({ error: "Owner name is required for enrichment. Example: 'enrich case John Doe'" });
      }
      
      nameTarget = nameTarget.toUpperCase();
      log.push(`Initiated Hermes enrichment agent for owner: "${nameTarget}" in state ${state}`);
      
      const assets = db.prepare("SELECT * FROM assets WHERE owner_name = ? OR owner_name LIKE ?")
        .all(nameTarget, `%${nameTarget}%`) as any[];
        
      if (assets.length === 0) {
        log.push(`No assets found in state registry for owner name: "${nameTarget}"`);
        result = { action: "enrich_case", success: false, message: `No assets found in local registry matching "${nameTarget}"` };
      } else {
        log.push(`Found ${assets.length} assets matching owner "${nameTarget}".`);
        log.push(`Executing web scrapers for contact & heir details on TruePeopleSearch and FastBackgroundCheck...`);
        
        const { batchTraceFromAssets } = await import("./execution/skipTraceAdapter");
        const traceReport = await batchTraceFromAssets(assets, 2);
        
        log.push(`Skip-trace completed. Created ${traceReport.created} new leads, updated ${traceReport.updated}.`);
        
        const leadRows = db.prepare(`
          SELECT * FROM leads 
          WHERE asset_id IN (${assets.map(() => "?").join(",")})
          OR full_name LIKE ?
        `).all(...assets.map(a => a.id), `%${nameTarget}%`) as any[];
        
        const leadIds = leadRows.map(l => l.id);
        let relativeRows: any[] = [];
        if (leadIds.length > 0) {
          relativeRows = db.prepare(`
            SELECT * FROM relatives 
            WHERE lead_id IN (${leadIds.map(() => "?").join(",")})
          `).all(...leadIds) as any[];
        }
        
        log.push(`Located ${leadRows.length} contact records and ${relativeRows.length} possible relatives/heir matches.`);
        
        result = {
          action: "enrich_case",
          success: true,
          ownerName: nameTarget,
          assetsCount: assets.length,
          leads: leadRows,
          relatives: relativeRows,
          traceReport
        };
      }
    }

    else {
      result = { action: "unknown", message: `I understand: search, campaign, lead, run, status, enrich. Try: "enrich case John Smith"` };
      log.push(`Unknown command: "${text}"`);
    }

    logger.info("Hermes command local parse", { command: text, action: result.action });

    // If an OpenAI API Key is provided, route through OpenAI Chat completions
    if (req.body?.openaiKey && String(req.body.openaiKey).trim()) {
      let ownerAssets: any[] = [];
      let ownerLeads: any[] = [];
      let ownerRelatives: any[] = [];

      if (req.body.ownerName) {
        const oName = String(req.body.ownerName).toUpperCase();
        ownerAssets = db.prepare("SELECT * FROM assets WHERE owner_name = ? OR owner_name LIKE ?").all(oName, `%${oName}%`) as any[];
        
        if (ownerAssets.length > 0) {
          const assetIds = ownerAssets.map(a => a.id);
          ownerLeads = db.prepare(`
            SELECT * FROM leads 
            WHERE asset_id IN (${assetIds.map(() => "?").join(",")})
            OR full_name LIKE ?
          `).all(...assetIds, `%${oName}%`) as any[];
        } else {
          ownerLeads = db.prepare("SELECT * FROM leads WHERE full_name LIKE ?").all(`%${oName}%`) as any[];
        }

        if (ownerLeads.length > 0) {
          const leadIds = ownerLeads.map(l => l.id);
          ownerRelatives = db.prepare(`
            SELECT * FROM relatives 
            WHERE lead_id IN (${leadIds.map(() => "?").join(",")})
          `).all(...leadIds) as any[];
        }
      }

      const stats = {
        assets: (db.prepare("SELECT COUNT(*) as c FROM assets").get() as any).c,
        leads: (db.prepare("SELECT COUNT(*) as c FROM leads").get() as any).c,
        campaigns: (db.prepare("SELECT COUNT(*) as c FROM campaigns").get() as any).c,
        outreachPending: (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'pending'").get() as any).c,
        outreachSent: (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'sent'").get() as any).c,
      };

      const formattedMessages: any[] = [];
      const systemPrompt = `You are Hermes, the Quant Swarm quantitative asset recovery and enrichment agent.
Your primary role is to assist the user in locating lost assets, skip tracing owners/heirs, and drafting outreach communication.

Current Case context:
- Target Owner Name: "${req.body.ownerName || "Unknown"}"
- Local database matches for this owner:
  - Assets: ${JSON.stringify(ownerAssets)}
  - Leads: ${JSON.stringify(ownerLeads)}
  - Relatives/Heirs: ${JSON.stringify(ownerRelatives)}

Global System Stats:
- Total assets: ${stats.assets}
- Total leads: ${stats.leads}
- Total campaigns: ${stats.campaigns}
- Outreach pending: ${stats.outreachPending}
- Outreach sent: ${stats.outreachSent}

We have run a command parser check. If a local command was executed, here is the result:
- Command entered: "${req.body.command}"
- Action resolved: "${result?.action || "none"}"
- Logs generated: ${JSON.stringify(log)}
- Result data: ${JSON.stringify(result)}

Instructions:
1. If a local command was executed (like "enrich case" or "search"), summarize the findings (e.g. newly discovered contact info, addresses, relatives) clearly and professionally in markdown format. Explain what action was taken and what the result is.
2. If the user asks general questions, drafts, or general chat, answer their request. Use the local matches (assets, leads, relatives) to draft outreach communications (emails, SMS, letters) that are tailored to the owner's case.
3. Keep the tone friendly, helpful, quantitative, and professional. Use markdown formatting to make your responses easy to read.`;

      formattedMessages.push({ role: "system", content: systemPrompt });

      if (Array.isArray(req.body.chatHistory)) {
        req.body.chatHistory.forEach((msg: any) => {
          if (msg.role === "user") {
            formattedMessages.push({ role: "user", content: msg.text });
          } else if (msg.role === "agent") {
            formattedMessages.push({ role: "assistant", content: msg.text });
          }
        });
      }

      const lastMsg = formattedMessages[formattedMessages.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== req.body.command) {
        formattedMessages.push({ role: "user", content: req.body.command });
      }

      try {
        const openAiRes = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o",
            messages: formattedMessages,
            temperature: 0.7,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${String(req.body.openaiKey).trim()}`,
            },
          }
        );

        const aiReply = openAiRes.data?.choices?.[0]?.message?.content || "No reply generated by OpenAI.";

        if (result?.leads) {
          // Keep local leads
        } else if (ownerLeads.length > 0) {
          result = { ...result, leads: ownerLeads, relatives: ownerRelatives };
        }

        res.json({
          ok: true,
          action: result?.action || "openai_chat",
          result,
          log,
          text: aiReply
        });
      } catch (openAiError: any) {
        const errMsg = openAiError.response?.data?.error?.message || openAiError.message;
        res.status(500).json({ error: `OpenAI API Error: ${errMsg}`, log });
      }
    } else {
      res.json({ ok: true, action: result.action, result, log });
    }
  } catch (error: any) {
    logger.error("Hermes command error", { message: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ── Get Case Enrichment Details ─────────────────────────
app.get("/api/cases/enrichment", (req, res) => {
  try {
    const ownerName = String(req.query.ownerName || "").trim();
    if (!ownerName) return res.status(400).json({ error: "ownerName required" });

    const oName = ownerName.toUpperCase();
    
    // Find matching assets
    const assets = db.prepare("SELECT * FROM assets WHERE owner_name = ? OR owner_name LIKE ?")
      .all(oName, `%${oName}%`) as any[];
      
    let leads: any[] = [];
    if (assets.length > 0) {
      const assetIds = assets.map(a => a.id);
      leads = db.prepare(`
        SELECT * FROM leads 
        WHERE asset_id IN (${assetIds.map(() => "?").join(",")})
        OR full_name LIKE ?
      `).all(...assetIds, `%${oName}%`) as any[];
    } else {
      leads = db.prepare("SELECT * FROM leads WHERE full_name LIKE ?").all(`%${oName}%`) as any[];
    }
    
    let relatives: any[] = [];
    if (leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      relatives = db.prepare(`
        SELECT * FROM relatives 
        WHERE lead_id IN (${leadIds.map(() => "?").join(",")})
      `).all(...leadIds) as any[];
    }
    
    res.json({ success: true, leads, relatives });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Dashboard Stats ─────────────────────────────────────
app.get("/api/stats", (req, res) => {
  try {
    const assetsTotal = db.prepare("SELECT COUNT(*) as c FROM assets").get() as { c: number };
    const assetsValue = db.prepare("SELECT COALESCE(SUM(amount),0) as c FROM assets WHERE claim_status = 'unclaimed'").get() as { c: number };
    const leadsTotal = db.prepare("SELECT COUNT(*) as c FROM leads").get() as { c: number };
    const campaignsTotal = db.prepare("SELECT COUNT(*) as c FROM campaigns").get() as { c: number };
    const outreachPending = db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'pending'").get() as { c: number };
    const outreachSent = db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status = 'sent'").get() as { c: number };
    res.json({
      assets: assetsTotal.c,
      assetsUnclaimedValue: assetsValue.c,
      leads: leadsTotal.c,
      campaigns: campaignsTotal.c,
      outreachPending: outreachPending.c,
      outreachSent: outreachSent.c,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── CSV Upload ──────────────────────────────────────────
// Accepts base64-encoded CSV in JSON body. Auto-detects column mappings
// for state unclaimed property weekly files with varying formats.
app.post("/api/upload-csv", async (req, res) => {
  try {
    const { csvData, filename } = req.body || {};
    if (!csvData) return res.status(400).json({ error: "csvData (base64) required" });

    const raw = Buffer.from(csvData, "base64").toString("utf-8");

    // Parse CSV dynamically
    const { parse } = await import("csv-parse/sync");
    const records: any[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    if (records.length === 0) return res.json({ imported: 0, message: "No rows found in CSV." });

    // Auto-detect column mapping from headers
    const headers = Object.keys(records[0]);
    const colMap = detectColumnMapping(headers);

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type, amount, company, location, state_id, source_url, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sourceUrl = filename ? `upload:${filename}` : "upload:csv";

    let imported = 0;
    const insertAll = db.transaction(() => {
      for (const row of records) {
        const ownerName = pickFirst(row, colMap.ownerName) || "Unknown";
        const firstName = pickFirst(row, colMap.firstName) || undefined;
        const lastName = pickFirst(row, colMap.lastName) || undefined;
        const state = pickFirst(row, colMap.state) || "";
        const propertyType = pickFirst(row, colMap.propertyType) || undefined;
        const amount = parseAmount(pickFirst(row, colMap.amount));
        const company = pickFirst(row, colMap.company) || undefined;
        const location = buildLocation(row, colMap);
        const stateId = pickFirst(row, colMap.stateId) || undefined;

        // Skip rows with no useful data
        if (!state && !ownerName) continue;

        stmt.run(ownerName, firstName, lastName, state, propertyType, amount,
          company, location, stateId, sourceUrl, "manual_entry");
        imported++;
      }
    });

    insertAll();

    logger.info("CSV imported", { filename, rows: records.length, imported, columns: headers.length });
    res.json({
      imported,
      total: records.length,
      columns: headers,
      mapping: colMap,
      message: `Imported ${imported} records from ${records.length} rows (${headers.length} columns detected).`,
    });
  } catch (error: any) {
    logger.error("CSV upload error", { message: error.message });
    res.status(500).json({ error: "CSV parse failed", message: error.message });
  }
});

// ── Trace ───────────────────────────────────────────────
app.post("/api/trace/username", async (req, res) => {
  try {
    const target = String(req.body?.target || "").trim();
    const result = await traceUsername(target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trace/person", async (req, res) => {
  try {
    const target = String(req.body?.target || "").trim();
    const result = await tracePerson(target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Health ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const email = validateEmailConfig();
  const twilio = validateTwilioConfig();
  const gemini = validateGeminiConfig();
  res.json({
    ok: true,
    time: new Date().toISOString(),
    env: config.NODE_ENV,
    db: config.DB_PATH,
    providers: {
      email: { configured: email.ok, provider: email.provider },
      twilio: { configured: twilio.ok },
      gemini: { configured: gemini.ok },
    },
    scheduler: !config.DISABLE_SCHEDULER,
  });
});

// ── Global error handler ────────────────────────────────
// Must be registered AFTER all routes
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", { path: req.path, message: err?.message, stack: err?.stack });
  res.status(500).json({ error: "Internal server error", requestId: req.headers["x-request-id"] || "unknown" });
});

// ── Background Agent Scheduler ──────────────────────────
// Runs every 10 minutes to process running campaigns
if (!config.DISABLE_SCHEDULER) {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const result = await agent.runCampaignScheduler();
      if (result.messagesQueued > 0 || result.messagesSent > 0) {
        logger.info(`Scheduled run`, { queued: result.messagesQueued, sent: result.messagesSent, campaigns: result.campaignsChecked });
      }
    } catch (err: any) {
      logger.error("Scheduler error", { message: err.message });
    }
  });
  logger.info("Background scheduler enabled (every 10 min)");
}

// ── Server start ────────────────────────────────────────
async function startServer() {
  if (config.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running`, { url: `http://0.0.0.0:${PORT}`, env: config.NODE_ENV });
  });
}

startServer();
