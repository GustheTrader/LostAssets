import { chromium } from "playwright";
import { logger } from "../db/logger";

/**
 * Automates a browser session using CloakBrowser to solve and retrieve
 * a Cloudflare Turnstile token from missingmoney.com.
 * Uses the default stealth browser context to avoid fingerprint mismatches.
 */
export async function getTurnstileToken(timeoutMs = 60000): Promise<string> {
  logger.info("[TurnstileSolver] Starting browser to solve Turnstile challenge on missingmoney.com...");
  
  let browser: any;
  try {
    const { launch } = await import("cloakbrowser");
    // Cloakbrowser headless mode is highly optimized to bypass bot checks passively
    browser = await launch({ headless: true });
    logger.info("[TurnstileSolver] Successfully launched headless CloakBrowser.");
  } catch (err: any) {
    logger.warn(`[TurnstileSolver] CloakBrowser launch failed: ${err.message}. Falling back to standard Chromium.`);
    try {
      browser = await chromium.launch({ headless: true });
    } catch (standardErr: any) {
      logger.error(`[TurnstileSolver] Standard Chromium launch failed: ${standardErr.message}.`);
      throw standardErr;
    }
  }

  try {
    // Crucial: Use browser.newPage() directly to retain CloakBrowser's pre-configured stealth context.
    // Overriding the context with a custom user-agent causes fingerprint mismatches that Turnstile flags.
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    
    const targetUrl = "https://missingmoney.com/app/claim-search";
    
    logger.info(`[TurnstileSolver] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: timeoutMs });
    
    logger.info("[TurnstileSolver] Filling search form to trigger Turnstile validation flow...");
    await page.fill('input[name="firstName"]', 'MARY');
    await page.fill('input[name="lastName"]', 'SMITH');
    
    logger.info("[TurnstileSolver] Submitting search request...");
    await page.click('button[type="submit"]');
    
    logger.info("[TurnstileSolver] Waiting for Cloudflare Turnstile token to populate passively...");
    
    await page.waitForFunction(() => {
      const input = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
      return input && input.value && input.value.trim().length > 15;
    }, null, { timeout: timeoutMs });
    
    const token = await page.evaluate(() => {
      const input = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
      return input ? input.value : "";
    });
    
    if (!token) {
      throw new Error("Turnstile response element found but value is empty.");
    }
    
    logger.info(`[TurnstileSolver] Successfully retrieved token (length: ${token.length})`);
    
    return token;
  } catch (error: any) {
    logger.error(`[TurnstileSolver] Failed to solve Turnstile: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

// Allow running directly from command line for diagnostics
if (process.argv[1] && process.argv[1].endsWith("turnstileSolver.ts")) {
  getTurnstileToken()
    .then(token => {
      console.log("\n=== SOLVED TURNSTILE TOKEN ===");
      console.log(token.slice(0, 50) + "..." + token.slice(-50));
      console.log("==============================\n");
    })
    .catch(err => {
      console.error("Direct execution failure:", err);
      process.exit(1);
    });
}
