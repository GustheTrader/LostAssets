import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://ucpi.sco.ca.gov/en/Property/SearchIndex", { waitUntil: 'load' });
    
    await page.fill('#lastNameJumbotron', 'Smith');
    await page.fill('#firstNameJumbotron', 'John');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.click('button:has-text("Search Properties")')
    ]);
    
    console.log("After search URL:", page.url());
    // let's grab the results table
    const results = await page.$$eval('table tbody tr', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(c => c.innerText.trim());
      })
    );
    console.log(results);
  } catch (e) {
    console.error(e.message);
  }

  await browser.close();
})();
