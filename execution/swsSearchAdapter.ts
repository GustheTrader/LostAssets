import { chromium } from "playwright";
import { StateSearchInput, StateSearchRecord, AssetType } from "./stateSearchAdapters";
import { logger } from "../db/logger";
import * as fs from "fs";
import * as path from "path";

const SWS_API_URL = "/SWS/properties";

/**
 * Normalizes property types from SWS format to our standard AssetType.
 */
function normalizeSwsAssetType(value?: string): AssetType {
  const text = (value || "").toLowerCase();
  if (text.includes("insurance")) return "Life Insurance";
  if (text.includes("safe") || text.includes("box")) return "Safe Deposit Box";
  if (text.includes("deposit")) return "Utility Deposit";
  if (text.includes("check") || text.includes("warrant")) return "Uncashed Check";
  if (text.includes("account") || text.includes("cash") || text.includes("security") || text.includes("securities")) return "Bank Account";
  return "Uncashed Check"; // default
}

/**
 * Searches SWS by filling the form, triggering search, and intercepting the
 * browser's own SWS API network response. Bypasses AWS WAF and Turnstile.
 */
export async function searchSws(input: StateSearchInput): Promise<StateSearchRecord[]> {
  const stateCode = input.state.toUpperCase();
  const lastName = input.lastName?.trim() || "";
  const firstName = input.firstName?.trim() || "";
  const limit = input.recordLimit || 20;

  logger.info(`[swsSearchAdapter] Initiating SWS intercept search on missingmoney.com for state=${stateCode}, name="${lastName}, ${firstName}"`);

  // Ensure .tmp directory exists
  const tmpDir = path.resolve(process.cwd(), ".tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  let browser: any;
  let page: any;
  try {
    const { launch } = await import("cloakbrowser");
    browser = await launch({ headless: true });
    logger.info("[swsSearchAdapter] Successfully launched headless CloakBrowser.");
  } catch (err: any) {
    logger.warn(`[swsSearchAdapter] CloakBrowser launch failed: ${err.message}. Falling back to standard Chromium.`);
    try {
      browser = await chromium.launch({ headless: true });
    } catch (standardErr: any) {
      logger.error(`[swsSearchAdapter] Standard Chromium launch failed: ${standardErr.message}.`);
      return [];
    }
  }

  try {
    page = await browser.newPage();
    const targetUrl = "https://missingmoney.com/app/claim-search";
    
    logger.info(`[swsSearchAdapter] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 45000 });
    
    logger.info("[swsSearchAdapter] Waiting for form inputs...");
    const lastNameSelector = "input[name='lastName']";
    await page.waitForSelector(lastNameSelector, { timeout: 10000 });
    
    // Fill search criteria conditionally to avoid empty string validation issues
    if (lastName) {
      logger.info(`[swsSearchAdapter] Filling Last Name: ${lastName}`);
      await page.fill(lastNameSelector, lastName);
    }
    
    if (firstName) {
      logger.info(`[swsSearchAdapter] Filling First Name: ${firstName}`);
      await page.fill("input[name='firstName']", firstName);
    }
    
    const stateSelector = "select[name='state']";
    const stateSelectExists = await page.$(stateSelector).catch(() => null);
    if (stateSelectExists) {
      logger.info(`[swsSearchAdapter] Selecting state dropdown value: ${stateCode}`);
      await page.selectOption(stateSelector, stateCode).catch(() => {});
    }

    // Set up Playwright network response interceptor for SWS properties endpoint
    logger.info("[swsSearchAdapter] Preparing network intercept listener...");
    const responsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        // Specifically match SWS properties query and ignore configuration/widget calls
        return url.endsWith(SWS_API_URL) && response.status() === 200;
      },
      { timeout: 35000 }
    );
    
    logger.info("[swsSearchAdapter] Submitting search form to trigger SWS endpoint...");
    await page.click('button[type="submit"]');
    
    // Wait for the intercepted response
    logger.info("[swsSearchAdapter] Awaiting intercepted API JSON response...");
    const swsResponse = await responsePromise;
    const data = await swsResponse.json();
    
    const properties = Array.isArray(data) ? data : (data && Array.isArray(data.properties) ? data.properties : []);
    logger.info(`[swsSearchAdapter] Intercepted SWS response successfully. Extracted ${properties.length} properties.`);

    // Map properties to normalized StateSearchRecord format
    const records: StateSearchRecord[] = properties.slice(0, limit).map((r: any, index: number) => {
      const ownerName = r.reportedOwnerName || r.ownerName || `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Unknown Owner";
      const cashVal = parseFloat(r.cashAmount || r.amount || "0");
      const company = r.holderName || r.source || "State Unclaimed Property Division";
      const location = `${r.street || ""}, ${r.city || ""}, ${r.stateCode || stateCode} ${r.zipCode || ""}`.trim().replace(/^,|,$/g, "").replace(/\s+/g, " ");

      return {
        ownerName: ownerName.toUpperCase(),
        firstName: r.firstName || firstName || "Unknown",
        lastName: r.lastName || lastName || "Unknown",
        state: r.stateCode || stateCode,
        propertyType: normalizeSwsAssetType(r.propertyType),
        amount: Number.isFinite(cashVal) ? cashVal : 0,
        company,
        location: location || `${stateCode} Unclaimed Property Division`,
        stateId: r.propertyId || r.id || `SWS-${stateCode}-${Date.now().toString().slice(-4)}-${index}`,
        sourceUrl: `https://missingmoney.com/app/claim-search?id=${r.propertyId || ""}`,
        confidence: "live_portal_protected" as const,
      };
    });

    return records;
  } catch (error: any) {
    logger.error(`[swsSearchAdapter] SWS intercept search failed: ${error.message}`);
    // Save error screenshot
    try {
      await page.screenshot({ path: path.join(tmpDir, "sws-search-error.png") });
      logger.info("[swsSearchAdapter] Saved error screenshot to .tmp/sws-search-error.png");
    } catch {}
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
