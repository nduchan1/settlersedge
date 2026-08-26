import { chromium } from 'playwright';

const shotDir = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e}`));

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText("Settler's Edge").waitFor({ timeout: 20000 });
await page.getByRole('button', { name: /find fastest settle/i }).click();
try {
  await page.getByText(/to village #2/i).waitFor({ timeout: 30000 });
  await page.screenshot({ path: shotDir + '/02-results.png' });
  console.log('RESULTS RENDERED');
  await page.getByRole('button', { name: /culture points/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shotDir + '/03-chart.png' });
} catch {
  await page.screenshot({ path: shotDir + '/02-failed.png' });
  console.log('RESULTS DID NOT RENDER');
}
console.log('CONSOLE:\n' + (logs.length ? logs.join('\n') : 'clean'));
await browser.close();
