import { launch } from "cloakbrowser";

async function runDiagnosis() {
  console.log("Starting SWS/Turnstile passive page diagnosis...");
  
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
    const targetUrl = "https://www.nvup.gov/app/claim-search";
    
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    
    console.log("Waiting passively for 15 seconds to see if Turnstile token populates...");
    for (let i = 1; i <= 3; i++) {
      await page.waitForTimeout(5000);
      const token = await page.evaluate(() => {
        const input = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
        return input ? input.value : null;
      });
      console.log(`[${i * 5}s] Token value: ${token ? (token.slice(0, 15) + "..." + token.slice(-15)) : "empty"}`);
      if (token) {
        console.log(`SUCCESS! Passive Turnstile token solved in ${i * 5}s. Length: ${token.length}`);
        break;
      }
    }
  } catch (error: any) {
    console.error("Diagnosis error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runDiagnosis();
