import { launch } from "cloakbrowser";

async function runDiagnosis() {
  console.log("Starting MissingMoney Turnstile page diagnosis...");
  
  let browser: any;
  try {
    browser = await launch({ headless: true });
    console.log("CloakBrowser (headless: true) launched.");
  } catch (err: any) {
    console.log("CloakBrowser launch failed:", err.message);
    return;
  }

  try {
    const page = await browser.newPage();
    const targetUrl = "https://missingmoney.com/app/claim-search";
    
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    
    console.log("Filling 'MARY SMITH'...");
    await page.fill('input[name="firstName"]', 'MARY');
    await page.fill('input[name="lastName"]', 'SMITH');
    
    console.log("Clicking Search...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting 15 seconds to see if Turnstile token populates...");
    for (let i = 1; i <= 3; i++) {
      await page.waitForTimeout(5000);
      const token = await page.evaluate(() => {
        const input = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
        return input ? input.value : null;
      });
      console.log(`[${i * 5}s] Token value: ${token ? (token.slice(0, 15) + "..." + token.slice(-15)) : "empty"}`);
      if (token) {
        console.log(`SUCCESS! MissingMoney Turnstile token solved in ${i * 5}s. Length: ${token.length}`);
        
        // Let's print all inputs to see if there are other hidden fields
        const inputs = await page.$$eval("input", inputs => inputs.map(i => ({ name: i.name, type: i.type, value: i.value })));
        console.log("\n=== INPUTS DETECTED ===");
        console.log(inputs);
        break;
      }
    }
    
    // Save screenshot
    const path = ".tmp/turnstile-diagnosis-mm.png";
    await page.screenshot({ path });
    console.log(`Diagnosis screenshot saved to ${path}`);
    
  } catch (error: any) {
    console.error("Diagnosis error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runDiagnosis();
