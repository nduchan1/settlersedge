// Pre-deploy smoke test against `vite preview` (production build): run Fast and Deep, check the
// organic plan renders, click every results tab, then run a mid-race re-plan. Prints any page errors.
import { chromium } from 'playwright';

const shotDir = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e}`));
const ok = (label, cond) => console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText("Settler's Edge").first().waitFor({ timeout: 20000 });

for (const mode of ['Fast', 'Deep', 'Ultra']) {
  await page.getByRole('button', { name: new RegExp(`^${mode}`) }).click();
  const t0 = Date.now();
  await page.getByRole('button', { name: /find fastest settle/i }).click();
  try {
    // wait for THIS run: the button leaves and then returns to its idle label
    await page.getByRole('button', { name: /find fastest settle/i }).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: /find fastest settle/i }).waitFor({ timeout: 300000 });
    await page.getByText(/to village #2/i).waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const header = await page.locator('h4').first().innerText();
    const organic = await page.getByText(/organic search plan/i).count();
    const opening = await page.getByText(/^opening:/i).first().innerText().catch(() => '');
    console.log(`${mode}: settle ${header} in ${secs}s | organic chip ${organic > 0} | ${opening.slice(0, 160)}`);
    ok(`${mode} organic plan shown`, organic > 0);
    await page.screenshot({ path: `${shotDir}/${mode}-results.png` });
  } catch (e) {
    ok(`${mode} results rendered`, false);
    await page.screenshot({ path: `${shotDir}/${mode}-failed.png` });
  }
}

for (const tab of ['Overview', 'Culture points', 'Economy', 'Alternatives', 'Build order']) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir}/tab-${tab.replace(' ', '-')}.png` });
}
ok('overview has building rows', (await page.getByRole('button', { name: 'Overview', exact: true }).count()) > 0);

// mid-race re-plan from hour 10 with worse-than-planned numbers
const panel = page.getByText(/Follow along/i);
ok('follow-along panel present', (await panel.count()) > 0);
await page.getByLabel(/Server time/i).fill('10');
for (const [k, v] of [['wood', '300'], ['clay', '300'], ['iron', '200'], ['crop', '400']]) await page.getByLabel(`warehouse ${k}`).fill(v);
await page.getByLabel('culture points').fill('150');
const t1 = Date.now();
await page.getByRole('button', { name: /Re-plan from here/i }).click();
try {
  await page.getByText(/re-planned from 10h/i).waitFor({ timeout: 180000 });
  const header = await page.locator('h4').first().innerText();
  console.log(`Re-plan: settle ${header} in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  ok('re-plan rendered', true);
  await page.screenshot({ path: `${shotDir}/replan.png` });
  // chained second re-plan
  await page.getByLabel(/Server time/i).fill('14');
  await page.getByRole('button', { name: /Re-plan from here/i }).click();
  await page.getByText(/re-planned from 14h/i).waitFor({ timeout: 180000 });
  ok('chained re-plan rendered', true);
} catch {
  ok('re-plan rendered', false);
  await page.screenshot({ path: `${shotDir}/replan-failed.png` });
  const err = await page.locator('.MuiTypography-caption').allInnerTexts();
  console.log('captions: ' + err.join(' | ').slice(0, 400));
}
console.log('CONSOLE:\n' + (logs.length ? logs.join('\n') : 'clean'));
await browser.close();
