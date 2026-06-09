const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('missingmo') || response.url().includes('api')) {
      console.log('Response URL:', response.url());
      console.log('Response Status:', response.status());
    }
  });

  try {
    await page.goto("https://missingmoney.com/app/claim-search", { waitUntil: 'networkidle' });
    
    // Attempt to fill in John Doe and search
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error(e);
  }

  await browser.close();
})();
