import { launch } from 'cloakbrowser';

(async () => {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  page.on('response', res => console.log("=>", res.url(), res.status()));
  
  try {
    await page.goto("https://missingmoney.com/app/claim-search", { waitUntil: 'load' });
    console.log("Title:", await page.title());
    
    await page.fill('input[name="firstName"]', 'MARY');
    await page.fill('input[name="lastName"]', 'SMITH');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(10000);
    
  } catch (e: any) {
    console.error("Error:", e.message);
  }

  await browser.close();
})();
