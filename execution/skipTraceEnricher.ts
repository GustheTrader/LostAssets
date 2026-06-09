// skipTraceEnricher.ts
// Free-tier contact enrichment for unclaimed property leads.
// Now includes relative extraction from public records.

import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { normalizeName, extractHumanName, NormalizedName } from "./nameNormalization";
import { enrichWithMaigret } from "./maigretAdapter";
import { config } from "../db/config";

export interface EnrichmentResult {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  confidence: number;
  sources: string[];
  notes: string;
  relatives?: string[];          // NEW: extracted relatives
}

// ── HTTP helpers ──────────────────────────────────────────────
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const DELAY_MS = 1400;
let lastReq = 0;

// Helper to fetch using Playwright / Cloakbrowser
async function fetchWithBrowser(url: string): Promise<string | null> {
  let browser: any = null;
  try {
    try {
      // Try standard Playwright Chromium first (clean and reliable)
      const { chromium } = await import("playwright");
      browser = await chromium.launch({ headless: true });
    } catch (e: any) {
      console.warn("[skipTraceEnricher] Standard Playwright Chromium failed to launch, trying CloakBrowser...", e.message);
      const { launch } = await import("cloakbrowser");
      browser = await launch({ headless: true });
    }

    if (!browser) {
      throw new Error("No browser engine could be launched.");
    }

    let page;
    if (browser.newContext) {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      });
      page = await context.newPage();
    } else {
      page = await browser.newPage();
      if (page.setUserAgent) {
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
      }
    }
    
    // Go to URL and wait for load
    console.log(`[skipTraceEnricher] Browser loading URL: ${url}`);
    const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    console.log(`[skipTraceEnricher] Browser loaded. Status: ${response?.status()}, Title: "${await page.title()}"`);
    
    // Allow script/Turnstile challenges to settle
    await new Promise(r => setTimeout(r, 4000));
    
    const html = await page.content();
    await browser.close();
    return html;
  } catch (error: any) {
    console.error(`[skipTraceEnricher] Browser fetch failed for ${url}:`, error.message);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return null;
  }
}

async function fetchDirect(url: string, axiosConfig?: any): Promise<AxiosResponse> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": ua,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
    },
    ...axiosConfig,
  });
}

async function politeFetch(url: string, axiosConfig?: any): Promise<AxiosResponse | null> {
  const now = Date.now();
  const wait = lastReq + DELAY_MS - now;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastReq = Date.now();

  const mode = config.SCRAPER_MODE;
  console.log(`[skipTraceEnricher] Fetching URL: ${url} (Mode: ${mode})`);

  try {
    if (mode === "scraperapi") {
      if (!config.SCRAPERAPI_KEY) {
        console.warn("[skipTraceEnricher] SCRAPERAPI_KEY is not set. Falling back to direct axios.");
        return await fetchDirect(url, axiosConfig);
      }
      const targetUrl = `http://api.scraperapi.com?api_key=${config.SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}&country_code=us&device_type=desktop`;
      return await axios.get(targetUrl, { timeout: 30000, ...axiosConfig });
    }

    if (mode === "zenrows") {
      if (!config.ZENROWS_KEY) {
        console.warn("[skipTraceEnricher] ZENROWS_KEY is not set. Falling back to direct axios.");
        return await fetchDirect(url, axiosConfig);
      }
      const targetUrl = `https://api.zenrows.com/v1/?apikey=${config.ZENROWS_KEY}&url=${encodeURIComponent(url)}&js_render=true&antibot=true&premium_proxy=true`;
      return await axios.get(targetUrl, { timeout: 30000, ...axiosConfig });
    }

    if (mode === "brightdata") {
      if (!config.BRIGHTDATA_USER || !config.BRIGHTDATA_PASS) {
        console.warn("[skipTraceEnricher] BRIGHTDATA credentials are not set. Falling back to direct axios.");
        return await fetchDirect(url, axiosConfig);
      }
      const proxy = {
        host: "zproxy.lum-superproxy.io",
        port: 22225,
        auth: {
          username: config.BRIGHTDATA_USER,
          password: config.BRIGHTDATA_PASS,
        },
      };
      return await fetchDirect(url, { ...axiosConfig, proxy });
    }

    if (mode === "browser") {
      const html = await fetchWithBrowser(url);
      if (html) {
        return {
          data: html,
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as any,
        } as AxiosResponse;
      }
      console.warn("[skipTraceEnricher] Browser fetch returned empty. Falling back to direct axios.");
      return await fetchDirect(url, axiosConfig);
    }

    // Default / legacy
    return await fetchDirect(url, axiosConfig);

  } catch (error: any) {
    console.error(`[skipTraceEnricher] Fetch error for ${url}:`, error.message);
    if (mode !== "axios") {
      console.log(`[skipTraceEnricher] Attempting fallback direct fetch for ${url}...`);
      try {
        return await fetchDirect(url, axiosConfig);
      } catch (fallbackError: any) {
        console.error(`[skipTraceEnricher] Fallback fetch failed:`, fallbackError.message);
      }
    }
    return null;
  }
}

// ── TruePeopleSearch (best for relatives) ─────────────────────
async function scrapeTruePeopleSearch(query: string, state: string): Promise<Partial<EnrichmentResult>> {
  const url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(query)}&citystatezip=${encodeURIComponent(state)}`;
  const res = await politeFetch(url);
  if (!res) return {};

  const $ = cheerio.load(res.data);
  const phones: string[] = [];
  const addresses: string[] = [];
  const relatives: string[] = [];

  // Phones
  $("[data-detail='Phone'], .detail-phone, a[href^='tel:']").each((_, el) => {
    const txt = $(el).text().trim() || $(el).attr("href")?.replace("tel:", "") || "";
    if (txt.match(/\(\d{3}\)\s?\d{3}-\d{4}/) || txt.match(/\d{10}/)) {
      phones.push(normalizePhone(txt));
    }
  });

  // Addresses
  $("[data-detail='Address'], .detail-address, .address").each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, " ");
    if (txt.length > 10 && /\d/.test(txt)) addresses.push(txt);
  });

  // Relatives (TruePeopleSearch often lists them)
  $(".relatives, .family, [class*='relative'], [class*='family-member']").each((_, el) => {
    const name = $(el).text().trim();
    if (name && name.length > 2 && !name.includes("Age") && !/\d{2,}/.test(name)) {
      relatives.push(name.replace(/[^A-Za-z\s]/g, "").trim());
    }
  });

  // Fallback: look for any text that looks like a name near "Relative" or "Associated"
  $("body").find("*").each((_, el) => {
    const txt = $(el).text();
    if (txt.includes("Relative") || txt.includes("Family") || txt.includes("Spouse")) {
      const possibleName = txt.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
      if (possibleName && possibleName[0].length > 5) {
        relatives.push(possibleName[0]);
      }
    }
  });

  const phone = normalizePhone(phones[0] || "");
  const addr = addresses[0] ?? null;
  const parsedAddr = addr ? parseAddress(addr) : { address: null, city: null, state, zip: null };

  return {
    phone: phone || null,
    ...parsedAddr,
    relatives: relatives.length > 0 ? Array.from(new Set(relatives)).slice(0, 8) : undefined,
    sources: phone ? ["truepeoplesearch"] : ["truepeoplesearch_address"],
    confidence: phone ? 0.55 : 0.35,
  };
}

// ── FastBackgroundCheck ──────────────────────────────────────
async function scrapeFreePeopleSearch(query: string, state: string): Promise<Partial<EnrichmentResult>> {
  const norm = normalizeName(query);
  const searchName = norm.searchQueries[0]?.replace(/\s+/g, "-") ?? query.replace(/\s+/g, "-");
  const url = `https://fastbackgroundcheck.com/people-search/${searchName}/${state.toLowerCase()}`;
  const res = await politeFetch(url);
  if (!res) return {};

  const $ = cheerio.load(res.data);
  const phones: string[] = [];
  const addresses: string[] = [];

  $("a[href^='tel:']").each((_, el) => {
    const href = $(el).attr("href")?.replace("tel:", "").trim();
    if (href && href.match(/\d{10}/)) phones.push(normalizePhone(href));
  });

  $("[class*='address'], [class*='location']").each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, " ");
    if (txt.length > 15 && /\d{5}/.test(txt)) addresses.push(txt);
  });

  const phone = phones[0] ?? null;
  const addr = addresses[0] ?? null;

  return {
    phone,
    ...(addr ? parseAddress(addr) : {}),
    sources: ["fastbackgroundcheck"],
    confidence: phone ? 0.45 : 0.30,
  };
}

// ── Utilities ───────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
  if (digits.length === 11 && digits[0] === "1") return `${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7,11)}`;
  return null;
}

function parseAddress(addr: string) {
  const zipMatch = addr.match(/(\d{5})/);
  const stateMatch = addr.match(/\b([A-Z]{2})\b/);
  return {
    address: addr,
    city: null,
    state: stateMatch ? stateMatch[1] : null,
    zip: zipMatch ? zipMatch[1] : null,
  };
}

// ── Main Enrichment Function ────────────────────────────────
export async function enrichContact(
  ownerName: string,
  state: string,
  location?: string | null,
  company?: string | null
): Promise<EnrichmentResult> {
  const human = extractHumanName(ownerName);
  const norm = normalizeName(human);

  const promises = [
    scrapeTruePeopleSearch(human, state),
    scrapeFreePeopleSearch(human, state),
  ];

  const results = await Promise.allSettled(promises);
  let best: Partial<EnrichmentResult> = {};
  let bestScore = -1;

  for (const r of results) {
    if (r.status === "fulfilled" && (r.value.phone || r.value.address)) {
      const score = (r.value.phone ? 0.4 : 0) + (r.value.address ? 0.3 : 0) + (r.value.relatives?.length || 0) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = r.value;
      }
    }
  }

  // Maigret for emails
  try {
    const maigret = await enrichWithMaigret(ownerName);
    if (maigret.emails.length > 0) {
      best.email = maigret.emails[0];
      best.sources = [...(best.sources || []), "maigret"];
    }
  } catch {}

  const finalAddress = best.address || location || null;
  const parsed = finalAddress ? parseAddress(finalAddress) : { address: null, city: null, state, zip: null };

  let notes = "No contact data found.";
  if (best.phone || best.address || best.relatives) {
    notes = `Found via ${best.sources?.join(", ")}.`;
    if (best.relatives && best.relatives.length > 0) {
      notes += ` Relatives: ${best.relatives.slice(0, 3).join(", ")}`;
    }
  }

  return {
    email: best.email || null,
    phone: best.phone || null,
    address: parsed.address || location || null,
    city: parsed.city,
    state: parsed.state || state,
    zip: parsed.zip,
    confidence: Math.max(best.confidence || 0.3, 0.25),
    sources: best.sources || [],
    notes,
    relatives: best.relatives || [],
  };
}

// Batch helper
export async function batchEnrichContacts(
  items: { ownerName: string; state: string; location?: string | null; company?: string | null }[],
  concurrency = 3
): Promise<EnrichmentResult[]> {
  const out: EnrichmentResult[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const res = await Promise.all(chunk.map(it => enrichContact(it.ownerName, it.state, it.location, it.company)));
    out.push(...res);
  }
  return out;
}

// ── Dedicated Relative Enrichment ────────────────────────────
export async function enrichRelatives(
  ownerName: string,
  state: string
): Promise<{ relatives: string[]; confidence: number; sources: string[] }> {
  const human = extractHumanName(ownerName);
  const norm = normalizeName(human);

  // Run both scrapers in parallel
  const [tpsResult, fbcResult] = await Promise.all([
    scrapeTruePeopleSearch(human, state),
    scrapeFreePeopleSearchImproved(human, state)  // improved version below
  ]);

  const allRelatives: string[] = [];
  
  if (tpsResult.relatives) allRelatives.push(...tpsResult.relatives);
  if (fbcResult.relatives) allRelatives.push(...fbcResult.relatives);

  const uniqueRelatives = Array.from(new Set(allRelatives))
    .filter(r => r.split(" ").length >= 2)
    .slice(0, 8);

  const confidence = uniqueRelatives.length > 0 ? 0.55 : 0.2;
  const sources = [];
  if (tpsResult.relatives?.length) sources.push("truepeoplesearch");
  if (fbcResult.relatives?.length) sources.push("fastbackgroundcheck");

  return {
    relatives: uniqueRelatives,
    confidence,
    sources
  };
}

// Improved FastBackgroundCheck with relative parsing
async function scrapeFreePeopleSearchImproved(query: string, state: string) {
  const norm = normalizeName(query);
  const searchName = norm.searchQueries[0]?.replace(/\s+/g, "-") ?? query.replace(/\s+/g, "-");
  const url = `https://fastbackgroundcheck.com/people-search/${searchName}/${state.toLowerCase()}`;
  const res = await politeFetch(url);
  if (!res) return { relatives: [] };

  const $ = cheerio.load(res.data);
  const relatives: string[] = [];

  // Look for relative sections
  $("[class*='relative'], [class*='family'], .associated").each((_, el) => {
    const text = $(el).text();
    const names = (text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}/g) || []) as string[];
    names.forEach(n => {
      if (n.length > 5 && !n.includes("Age")) relatives.push(n.trim());
    });
  });

  return { relatives: Array.from(new Set(relatives)).slice(0, 6) };
}
