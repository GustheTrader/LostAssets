import { chromium } from "playwright";

async function runDiagnosis() {
  console.log("Starting SWS/Turnstile page diagnosis...");
  
  let browser: any;
  try {
    const { launch } = await import("cloakbrowser");
    browser = await launch({ headless: false });
    console.log("CloakBrowser launched.");
  } catch (err: any) {
    console.log("CloakBrowser launch failed, using standard Chromium:", err.message);
    browser = await chromium.launch({ headless: false });
  }

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    const targetUrl = "https://www.nvup.gov/app/claim-search";
    
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    
    console.log("Filling 'Smith' into Last Name...");
    const lastNameSelector = "input[name='lastName'], input#lastName, input[placeholder*='Last Name']";
    await page.waitForSelector(lastNameSelector, { timeout: 10000 });
    await page.fill(lastNameSelector, "Smith");
    
    console.log("Clicking Search...");
    const searchBtnSelector = "button[type='submit'], button:has-text('Search'), .btn-primary";
    await page.click(searchBtnSelector);
    
    console.log("Waiting 10 seconds for Turnstile to load/solve...");
    await page.waitForTimeout(10000);
    
    // Scan all iframes
    const iframes = await page.$$eval("iframe", frames => frames.map(f => ({ src: f.src, id: f.id, class: f.className })));
    console.log("\n=== IFRAMES DETECTED ===");
    console.log(iframes);
    
    // Scan all inputs
    const inputs = await page.$$eval("input", inputs => inputs.map(i => ({ name: i.name, id: i.id, type: i.type, value: i.value })));
    console.log("\n=== INPUTS DETECTED ===");
    console.log(inputs);
    
    // Scan page HTML for keywords
    const bodyText = await page.innerText("body");
    console.log("\n=== PAGE TEXT (FIRST 300 CHARS) ===");
    console.log(bodyText.slice(0, 300));
    
    // Save screenshot
    const path = ".tmp/turnstile-diagnosis.png";
    await page.screenshot({ path });
    console.log(`\nDiagnosis screenshot saved to ${path}`);
    
  } catch (error: any) {
    console.error("Diagnosis error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runDiagnosis();
