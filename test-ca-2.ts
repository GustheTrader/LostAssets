import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://ucpi.sco.ca.gov/en/Property/SearchIndex", { waitUntil: 'load' });
    const html = await page.content();
    console.log(html.substring(0, 1000));
    console.log("Inputs:", await page.$$eval('input', inputs => inputs.map(i => i.id || i.name)));
  } catch (e) {
    console.error(e.message);
  }

  await browser.close();
})();
