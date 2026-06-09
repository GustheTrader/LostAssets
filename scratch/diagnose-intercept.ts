import { launch } from "cloakbrowser";

async function runDiagnosis() {
  console.log("Starting SWS Intercept Diagnostic...");
  
  let browser: any;
  try {
    browser = await launch({ headless: true });
    console.log("CloakBrowser launched.");
  } catch (err: any) {
    console.log("CloakBrowser launch failed:", err.message);
    return;
  }

  try {
    const page = await browser.newPage();
    const targetUrl = "https://missingmoney.com/app/claim-search";
    
    // Log all response events
    page.on("response", async response => {
      const url = response.url();
      if (url.includes("/SWS/")) {
        console.log(`\n=> INTERCEPTED SWS RESPONSE: ${url}`);
        console.log(`   Status: ${response.status()}`);
        try {
          const text = await response.text();
          console.log(`   Response Body Preview: ${text.slice(0, 300)}`);
        } catch (e: any) {
          console.log(`   Could not read text: ${e.message}`);
        }
      }
    });

    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    
    console.log("Filling inputs...");
    await page.fill('input[name="firstName"]', 'MARY');
    await page.fill('input[name="lastName"]', 'SMITH');
    
    const stateSelector = "select[name='state'], select#stateCode, select[placeholder*='State']";
    if (await page.$(stateSelector)) {
      console.log("Selecting state dropdown value: NV");
      await page.selectOption(stateSelector, "NV");
    }

    console.log("Clicking Search...");
    await page.click('button[type="submit"]');
    
    console.log("Awaiting network response events for 15s...");
    await page.waitForTimeout(15000);
    
    // Capture page content screenshot
    const path = ".tmp/intercept-diagnosis.png";
    await page.screenshot({ path });
    console.log(`\nDiagnosis complete. Screenshot saved to ${path}`);
    
  } catch (error: any) {
    console.error("Diagnosis error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runDiagnosis();
