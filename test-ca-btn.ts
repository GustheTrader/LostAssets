import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://ucpi.sco.ca.gov/en/Property/SearchIndex", { waitUntil: 'load' });
    const html = await page.content();
    console.log("Buttons:", await page.$$eval('button', buttons => buttons.map(b => b.innerText.trim() + ' id=' + b.id)));
  } catch (e) {
    console.error(e.message);
  }

  await browser.close();
})();
