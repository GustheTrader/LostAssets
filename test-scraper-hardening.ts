// test-scraper-hardening.ts
// Test script to verify the new hardened skip-trace scrapers.

import { enrichContact, enrichRelatives } from "./execution/skipTraceEnricher";
import { config } from "./db/config";

(async () => {
  console.log("==========================================");
  console.log("Starting Scraper Hardening Verification Test");
  console.log("==========================================");
  console.log(`Current Scraper Mode:  ${config.SCRAPER_MODE}`);
  console.log(`ScraperAPI Configured: ${config.SCRAPERAPI_KEY ? "YES (Key ends in ..." + config.SCRAPERAPI_KEY.slice(-5) + ")" : "NO"}`);
  console.log(`ZenRows Configured:    ${config.ZENROWS_KEY ? "YES (Key ends in ..." + config.ZENROWS_KEY.slice(-5) + ")" : "NO"}`);
  console.log(`Bright Data Configured:${config.BRIGHTDATA_USER && config.BRIGHTDATA_PASS ? "YES" : "NO"}`);
  console.log("==========================================");

  const testName = "MARY SMITH";
  const testState = "CA";

  console.log(`\nRunning contact enrichment for: ${testName} in ${testState}...`);
  try {
    const contactResult = await enrichContact(testName, testState);
    console.log("\n--- Contact Enrichment Result ---");
    console.log("Email:      ", contactResult.email);
    console.log("Phone:      ", contactResult.phone);
    console.log("Address:    ", contactResult.address);
    console.log("City:       ", contactResult.city);
    console.log("State:      ", contactResult.state);
    console.log("Zip:        ", contactResult.zip);
    console.log("Confidence: ", contactResult.confidence);
    console.log("Sources:    ", contactResult.sources);
    console.log("Notes:      ", contactResult.notes);
    console.log("Relatives:  ", contactResult.relatives);
  } catch (error: any) {
    console.error("Contact enrichment test failed:", error.message);
  }

  console.log(`\nRunning relatives enrichment for: ${testName} in ${testState}...`);
  try {
    const relativesResult = await enrichRelatives(testName, testState);
    console.log("\n--- Relatives Enrichment Result ---");
    console.log("Relatives:  ", relativesResult.relatives);
    console.log("Confidence: ", relativesResult.confidence);
    console.log("Sources:    ", relativesResult.sources);
  } catch (error: any) {
    console.error("Relatives enrichment test failed:", error.message);
  }

  console.log("\n==========================================");
  console.log("Test Completed.");
  console.log("==========================================");
})();
