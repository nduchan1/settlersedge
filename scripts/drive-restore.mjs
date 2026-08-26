import { chromium } from 'playwright';
const dir = process.argv[2];
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await p.getByText("Settler's Edge").waitFor();
const gold = p.getByLabel('Gold budget'); await gold.fill('900');
const oases = p.getByLabel('Oases farmed'); await oases.fill('20');
await p.getByLabel('Advanced Start', { exact: false }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: dir + '/dirty.png' });
await p.getByRole('button', { name: /Restore defaults/ }).nth(1).click(); // oasis section
await p.waitForTimeout(150);
await p.screenshot({ path: dir + '/flash.png' });
console.log('gold after oasis-restore:', await gold.inputValue(), '| oases:', await oases.inputValue());
await b.close();
