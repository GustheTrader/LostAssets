import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://fltreasurehunt.gov/Control?dsn=TPI_Search", { waitUntil: 'networkidle' });
    console.log("Loaded Florida Treasure Hunt");
    console.log("Title:", await page.title());
  } catch (e) {
    console.error(e);
  }

  await browser.close();
})();
