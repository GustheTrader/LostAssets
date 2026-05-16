import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://ucpi.sco.ca.gov/en/Property/SearchIndex", { waitUntil: 'load' });
    console.log("Loaded CA UCPI");
    console.log("Title:", await page.title());
    
    // Check if we can fill the form
    await page.fill('#FirstName', 'John');
    await page.fill('#LastName', 'Smith');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log("After search URL:", page.url());
    const tableHtml = await page.innerHTML('.table-responsive');
    console.log(tableHtml.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }

  await browser.close();
})();
