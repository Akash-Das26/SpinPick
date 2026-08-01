import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

/** Create a page with the onboarding tour pre-dismissed (localStorage flag set) */
async function createPage(browser) {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('spinpick_tour_seen', 'true');
  });
  return page;
}

async function main() {
  console.log('\n🚀 SpinPick E2E Tests\n' + '='.repeat(50) + '\n');

  const browser = await chromium.launch({
    // Use system Chrome when available (local dev), else fall back to Playwright's bundled Chromium (CI)
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  /* ── 1. SMOKE TEST ────────────────────────────────────────────── */
  console.log('📄 1. SMOKE TEST\n');

  await test('homepage loads with correct title and no console errors', async () => {
    const page = await createPage(browser);
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 10000 });
    await page.waitForTimeout(2000);

    assert(await page.title() === 'SpinPick Decision Studio', 'Wrong title');
    // Ignore expected browser-level noise: favicon, SPA 404 fallbacks, third-party
    // extensions, and AI-upstream HTTP status errors (the app gracefully falls back
    // to the offline keyword engine when the OpenRouter proxy rejects the request).
    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('Third-party') &&
      !/Failed to load resource: the server responded with a status of [45]\d\d/.test(e)
    );
    assert(critical.length === 0, `Console errors: ${critical.join(', ')}`);
    await page.close();
  });

  await test('onboarding tour appears on first visit (regression check)', async () => {
    // Fresh context — no localStorage override → tour should fire
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Tour fires 1.5s after options load
    await page.waitForTimeout(4000);
    const body = await page.textContent('body');
    assert(
      /welcome|onboarding|tour/i.test(body),
      'Onboarding tour not detected on first visit'
    );
    await page.close();
    await context.close();
  });

  /* ── 2. NAVBAR ────────────────────────────────────────────────── */
  console.log('\n🔗 2. NAVBAR\n');

  await test('all main tabs visible', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });
    for (const tab of ['Studio', 'Tournament', 'Builder', 'Discover', 'History']) {
      assert(await page.locator(`button:has-text("${tab}")`).first().isVisible(), `Tab "${tab}" not visible`);
    }
    await page.close();
  });

  await test('settings gear opens modal with Restart Tour option', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    const settings = page.locator('button[aria-label*="Settings" i]').first();
    await settings.click();
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    assert(body.includes('Restart Tour'), 'Restart Tour not found in settings');
    await page.keyboard.press('Escape');
    await page.close();
  });

  await test('Surprise Me button updates prompt', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    const surprise = page.locator('button[aria-label*="surprise" i]').first();
    await surprise.click();
    await page.waitForTimeout(1500);
    const val = await page.locator('input[aria-label*="decision"]').inputValue();
    assert(val.length > 0, 'Prompt input not updated after Surprise Me');
    await page.close();
  });

  /* ── 3. PROMPT & GENERATE ─────────────────────────────────────── */
  console.log('\n🎯 3. PROMPT & GENERATE\n');

  await test('typing prompt + Generate creates wheel options', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('input[aria-label*="decision"]', { timeout: 5000 });

    const input = page.locator('input[aria-label*="decision"]');
    await input.clear();
    await input.fill('What movie should I watch tonight?');
    await page.getByRole('button', { name: /generate wheel/i }).click();
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 10000 });
    assert((await page.locator('[data-testid="wheel-disc"] path').count()) >= 2, 'Not enough wheel paths');
    await page.close();
  });

  await test('quick chip generates wheel options', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('input[aria-label*="decision"]', { timeout: 5000 });

    await page.locator('button.chip').first().click();
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 10000 });
    assert((await page.locator('[data-testid="wheel-disc"] path').count()) >= 2, 'Not enough wheel paths');
    await page.close();
  });

  /* ── 4. SPIN THE WHEEL ────────────────────────────────────────── */
  console.log('\n🔄 4. SPIN THE WHEEL\n');

  await test('SPIN button shows verdict card', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('[data-testid="wheel-hub-btn"]').click();
    // Wait for verdict to appear (spin is ~3.5s)
    await page.waitForFunction(
      () => /the wheel landed|spinpick evaluated|reasoning|verdict/i.test(document.body.textContent),
      { timeout: 12000 }
    );
    await page.close();
  });

  /* ── 5. MODALS ────────────────────────────────────────────────── */
  console.log('\n🔧 5. MODALS\n');

  await test('Slices modal opens/closes via Escape', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button').filter({ hasText: /slices/i }).first().click();
    await page.waitForTimeout(800);
    const modal = page.locator('[role="dialog"]').first();
    assert(await modal.isVisible(), 'Modal not visible');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    assert(!(await modal.isVisible()), 'Modal still visible after Escape');
    await page.close();
  });

  await test('AI Tuner modal opens/closes', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button').filter({ hasText: /ai tuner/i }).first().click();
    await page.waitForTimeout(800);
    const modal = page.locator('[role="dialog"]').first();
    assert(await modal.isVisible(), 'Modal not visible');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    assert(!(await modal.isVisible()), 'Modal still visible after Escape');
    await page.close();
  });

  await test('Export modal shows PNG/CSV/JSON options', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button').filter({ hasText: /export/i }).first().click();
    await page.waitForTimeout(1000);
    assert(/PNG|CSV|JSON/i.test(await page.textContent('body')), 'Export formats not found');
    await page.keyboard.press('Escape');
    await page.close();
  });

  /* ── 6. TAB SWITCHING ─────────────────────────────────────────── */
  console.log('\n📋 6. TABS\n');

  const tabChecks = [
    { name: 'Tournament', pattern: /tournament|bracket|match|champion|round|eliminate/i },
    { name: 'Builder', pattern: /builder|custom|option|load|wheel|label/i },
    { name: 'Discover', pattern: /discover|preset|gallery|explore|category/i },
    { name: 'History', pattern: /history|decision|spin|past/i },
  ];
  for (const { name, pattern } of tabChecks) {
    await test(`${name} tab loads content`, async () => {
      const page = await createPage(browser);
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.locator(`button:has-text("${name}")`).first().click();
      await page.waitForTimeout(2000);
      assert(pattern.test(await page.textContent('body')), `${name} content not found`);
      await page.close();
    });
  }

  /* ── 7. TOURNAMENT MODE ──────────────────────────────────────── */
  console.log('\n🏆 7. TOURNAMENT MODE\n');

  await test('Tournament tab shows header, bracket log, and spin button', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    // Navigate to Tournament tab
    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    assert(body.includes('TOURNAMENT'), 'Tournament heading not found');
    assert(body.includes('TOURNAMENT BRACKET LOG'), 'Bracket log not found');
    assert(body.includes('Spin 1v1 Match'), 'Spin button not found');
    await page.close();
  });

  await test('Spin 1v1 Match button appears and starts spinning', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);

    // Verify spin button exists
    const spinBtn = page.locator('button:has-text("Spin 1v1 Match")').first();
    assert(await spinBtn.isVisible(), 'Spin 1v1 Match button not visible');

    // Click spin and verify it changes to SPINNING MATCH
    await spinBtn.click();
    await page.waitForTimeout(500);
    const body = await page.textContent('body');
    assert(body.includes('SPINNING MATCH'), 'Button did not show spinning state');
    await page.close();
  });

  await test('After spin animation, Advance Winner button appears', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);

    // Click spin and wait for animation to complete
    await page.locator('button:has-text("Spin 1v1 Match")').first().click();
    await page.waitForFunction(
      () => /Advance Winner/i.test(document.body.textContent),
      { timeout: 10000 }
    );

    const body = await page.textContent('body');
    assert(body.includes('Advance Winner'), 'Advance Winner button did not appear after spin');
    assert(body.includes('CORNER A') || body.includes('CORNER B'), 'Match corners not shown');
    await page.close();
  });

  await test('Advancing winner updates bracket log and moves to next match', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);

    // Spin match 1
    await page.locator('button:has-text("Spin 1v1 Match")').first().click();
    await page.waitForFunction(
      () => /Advance Winner/i.test(document.body.textContent),
      { timeout: 10000 }
    );

    // Advance to next match
    await page.locator('button:has-text("Advance Winner")').first().click();
    await page.waitForTimeout(1000);

    // Bracket log should now show a winner for match 1
    const bodyAfter = await page.textContent('body');
    assert(bodyAfter.includes('Winner:'), 'Bracket log did not show winner label after advancing');
    
    // Should now show Match #2 or champion
    const hasNextMatch = bodyAfter.includes('Spin 1v1 Match #2') || 
                         bodyAfter.includes('MATCH #2 OF') ||
                         bodyAfter.includes('GRAND CHAMPION');
    assert(hasNextMatch, 'Did not advance to next match or crown champion');
    await page.close();
  });

  await test('Full tournament: spin through all 7 matches and crown a champion', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    // Navigate to Tournament tab and wait for lazy load
    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);

    // Verify we have matches (8 options = 4 matches in round 1)
    let body = await page.textContent('body');
    assert(body.includes('MATCH #1 OF 4'), 'Expected 4 matches in round 1');

    // Spin through all matches (4 + 2 + 1 = 7)
    for (let matchNum = 1; matchNum <= 7; matchNum++) {
      // Click the spin button
      await page.locator('button:has-text("Spin 1v1 Match")').first().click();

      // Wait for spin animation to complete (3.8s + buffer)
      await page.waitForFunction(
        () => /Advance Winner/i.test(document.body.textContent),
        { timeout: 10000 }
      );

      // Verify winner was determined
      body = await page.textContent('body');
      assert(body.includes('Advance Winner:'), `Match ${matchNum} did not produce a winner`);

      // On the final match (7th), after advancing, the champion should be crowned
      if (matchNum === 7) {
        await page.locator('button:has-text("Advance Winner")').first().click();
        await page.waitForTimeout(1000);
        body = await page.textContent('body');
        assert(body.includes('GRAND CHAMPION'), 'Final did not crown a champion');
        // The champion label is an h2 with the winner's option label text
        assert(await page.locator('button:has-text("Load Champion into Studio")').isVisible(), 'Load Champion button missing');
        console.log('       🏆 Champion crowned!');
      } else {
        // Advance to next match
        await page.locator('button:has-text("Advance Winner")').first().click();
        await page.waitForTimeout(500);
      }
    }

    await page.close();
  });

  await test('Exit Tournament button returns to studio', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    await page.locator('button:has-text("Tournament")').first().click();
    await page.waitForTimeout(2000);
    assert(await page.textContent('body').then(b => b.includes('TOURNAMENT')), 'Tournament not visible');

    await page.locator('button:has-text("Exit Tournament")').first().click();
    await page.waitForTimeout(1000);

    const body = await page.textContent('body');
    assert(body.includes('Generate Wheel') || body.includes('decision'), 'Did not return to studio');
    await page.close();
  });

  /* ── 8. COMPARE PAGES ─────────────────────────────────────────── */
  console.log('\n🔗 8. COMPARE PAGES\n');

  await test('Compare hub loads', async () => {
    const page = await createPage(browser);
    const resp = await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    assert(resp.status() === 200, `Status ${resp.status()}`);
    assert(/compare|spinpick|vs/i.test(await page.textContent('body')), 'Compare content not found');
    await page.close();
  });

  await test('Wheel of Names detail page shows verdict and FAQ', async () => {
    const page = await createPage(browser);
    const resp = await page.goto(`${BASE}/compare/wheel-of-names`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    assert(resp.status() === 200, `Status ${resp.status()}`);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    assert(/Verdict/i.test(body), 'Verdict section not found');
    assert(/FAQ|Frequently/i.test(body), 'FAQ section not found');
    await page.close();
  });

  await test('Slug alias redirect works: wheelofnames → wheel-of-names', async () => {
    const page = await createPage(browser);
    const resp = await page.goto(`${BASE}/compare/wheelofnames`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    assert(resp.status() === 200, `Status ${resp.status()}`);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    assert(/Verdict/i.test(body), 'Alias slug did not resolve to the comparison page');
    assert(/Wheel of Names/i.test(body), 'Wrong competitor rendered after alias redirect');
    await page.close();
  });

  /* ── 9. SPA ROUTING ───────────────────────────────────────────── */
  console.log('\n🛣️ 9. SPA ROUTING\n');

  const routes = [
    '/compare/wheel-of-names',
    '/compare/picker-wheel',
    '/compare/wheel-decide',
    '/compare/spin-wheel',
    '/compare/wooclap',
    '/compare/random-name-picker',
    // Slug aliases (should also resolve correctly)
    '/compare/wheelofnames',
    '/compare/pickerwheel',
    '/compare/decision-wheel',
    '/pickerwheel',
    '/wheelofnames',
  ];
  for (const route of routes) {
    await test(`Route ${route} returns 200`, async () => {
      const page = await createPage(browser);
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      assert(resp.status() === 200, `${route} returned ${resp.status()}`);
      await page.close();
    });
  }

  /* ── 10. BUILDER TAB ─────────────────────────────────────────── */
  console.log('\n🔧 10. BUILDER TAB\n');

  await test('Builder tab shows heading and 4 default slices', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    assert(body.includes('CUSTOM BUILDER'), 'Builder heading not found');
    assert(body.includes('Custom Builder'), 'Builder title not found');
    assert(body.includes('Wheel Slices (4)'), 'Expected 4 default slices');
    // Check input values for slice labels (inputs don't contribute to textContent)
    const slice1 = await page.locator('[aria-label="Title for slice 1"]').inputValue();
    assert(slice1 === 'Option A', `Slice 1 label: expected "Option A", got "${slice1}"`);
    const slice2 = await page.locator('[aria-label="Title for slice 2"]').inputValue();
    assert(slice2 === 'Option B', `Slice 2 label: expected "Option B", got "${slice2}"`);
    const slice4 = await page.locator('[aria-label="Title for slice 4"]').inputValue();
    assert(slice4 === 'Option D', `Slice 4 label: expected "Option D", got "${slice4}"`);
    await page.close();
  });

  await test('Add Slice creates a 5th slice entry', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    // Click Add Slice
    await page.locator('button[aria-label="Add new wheel slice"]').first().click();
    await page.waitForTimeout(500);

    const body = await page.textContent('body');
    assert(body.includes('Wheel Slices (5)'), 'Expected 5 slices after adding');
    // Check 5th slice label via input value (not in textContent)
    const slice5 = await page.locator('[aria-label="Title for slice 5"]').inputValue();
    assert(slice5 === 'Option E', `Slice 5 label: expected "Option E", got "${slice5}"`);
    await page.close();
  });

  await test('Remove slice button deletes a slice', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    // Click remove on the last slice (Option D)
    await page.locator('[aria-label="Remove slice Option D"]').first().click();
    await page.waitForTimeout(500);

    const body = await page.textContent('body');
    assert(body.includes('Wheel Slices (3)'), 'Expected 3 slices after removal');
    assert(!body.includes('Option D'), 'Option D should be removed');
    await page.close();
  });

  await test('Edit slice label updates the slice name', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    // Edit the first slice title
    const titleInput = page.locator('[aria-label="Title for slice 1"]').first();
    await titleInput.clear();
    await titleInput.fill('Pizza');
    await page.waitForTimeout(300);

    // Check the input value directly (inputs don't contribute to textContent)
    const slice1Val = await titleInput.inputValue();
    assert(slice1Val === 'Pizza', `Slice 1 label should be "Pizza", got "${slice1Val}"`);
    await page.close();
  });

  await test('Save & Launch button loads wheel into studio tab', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    // Go to Builder tab
    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    // Edit the title so we can identify the wheel after launch
    const titleInput = page.locator('#custom-wheel-title').first();
    await titleInput.clear();
    await titleInput.fill('Test Custom Wheel');
    await page.waitForTimeout(300);

    // Click Save & Launch
    await page.locator('button:has-text("Save & Launch Wheel in Studio")').first().click();
    await page.waitForTimeout(1500);

    // Should land in studio tab with the custom wheel title as prompt
    const studioInput = page.locator('input[aria-label*="decision"]');
    const inputVal = await studioInput.inputValue();
    assert(inputVal.includes('Test Custom Wheel'), `Custom wheel title "Test Custom Wheel" not found in studio input (got "${inputVal}")`);
    // Should also have wheel paths generated from the custom options
    const paths = await page.locator('[data-testid="wheel-disc"] path').count();
    assert(paths >= 2, 'Custom wheel did not generate visible wheel paths');
    await page.close();
  });

  /* ── 11. DISCOVER TAB ─────────────────────────────────────────── */
  console.log('\n💡 11. DISCOVER TAB\n');

  await test('Discover tab shows heading and Decision Templates', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Discover")').first().click();
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    assert(body.includes('DISCOVER'), 'Discover heading not found');
    assert(body.includes('Select any curated template'), 'Templates title not found');
    assert(body.includes('curated template'), 'Description not found');
    await page.close();
  });

  await test('Discover shows preset cards with categories and option tags', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.locator('button:has-text("Discover")').first().click();
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    // Should have category badges and option tags
    assert(/General|Food|Travel|Entertainment/i.test(body), 'No category badge found');
    // Should have at least one Load Wheel button
    const loadBtns = page.locator('button[aria-label*="wheel into studio" i]');
    assert(await loadBtns.count() >= 1, 'No Load Wheel buttons found');
    await page.close();
  });

  await test('Load preset from Discover populates studio wheel', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    // Go to Discover tab
    await page.locator('button:has-text("Discover")').first().click();
    await page.waitForTimeout(2000);

    // Get the first preset name before clicking
    const loadBtn = page.locator('button[aria-label*="wheel into studio" i]').first();
    const ariaLabel = await loadBtn.getAttribute('aria-label');
    const titleMatch = ariaLabel.match(/Load "([^"]+)" wheel/i);
    const presetTitle = titleMatch ? titleMatch[1] : '';
    assert(presetTitle.length > 0, `Could not find a preset title in aria-label: "${ariaLabel}"`);

    // Click the first Load Wheel button
    await page.locator('button[aria-label*="wheel into studio" i]').first().click();
    await page.waitForTimeout(1500);      // Should be back in studio tab with the preset's title as prompt
    const studioInput = page.locator('input[aria-label*="decision"]');
    const inputVal = await studioInput.inputValue();
    assert(inputVal === presetTitle, `Preset title "${presetTitle}" not found in studio input (got "${inputVal}")`);
    // Should have wheel paths from preset options
    const paths = await page.locator('[data-testid="wheel-disc"] path').count();
    assert(paths >= 2, 'Preset wheel did not generate visible wheel paths');
    await page.close();
  });

  /* ── 12. ERROR HANDLING ──────────────────────────────────────── */
  console.log('\n⚠️ 12. ERROR HANDLING\n');

  await test('Empty prompt disables Generate Wheel button', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('input[aria-label*="decision"]', { timeout: 5000 });

    const input = page.locator('input[aria-label*="decision"]');
    await input.clear();
    await page.waitForTimeout(300);

    const genBtn = page.getByRole('button', { name: /generate wheel/i });
    assert(await genBtn.isDisabled(), 'Generate button should be disabled when prompt is empty');
    await page.close();
  });

  await test('Generate button becomes enabled after generation completes', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for the initial auto-generation (via setTimeout(0)) to finish
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 10000 });

    // After completion, button should be enabled with 'Generate Wheel' text
    const genBtn = page.getByRole('button', { name: /generate wheel/i });
    assert(await genBtn.isEnabled(), 'Generate button should be enabled after generation completes');
    await page.close();
  });

  await test('Wheel SPIN button is disabled while spinning', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    // Click SPIN
    await page.locator('[data-testid="wheel-hub-btn"]').click();
    await page.waitForTimeout(500);

    // Check the hub button shows spinning state
    const hubBtn = page.locator('[data-testid="wheel-hub-btn"]');
    assert(await hubBtn.isDisabled(), 'SPIN button should be disabled while spinning');
    const btnText = await hubBtn.textContent();
    assert(btnText.includes('SPIN...'), `Expected SPIN... text but got "${btnText}"`);

    // Wait for spin to complete
    await page.waitForTimeout(4000);
    assert(!(await hubBtn.isDisabled()), 'SPIN button should be re-enabled after spin');
    await page.close();
  });

  await test('Eliminate Winner & Respin button appears after verdict', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="wheel-disc"] path', { timeout: 15000 });

    // Spin the wheel
    await page.locator('[data-testid="wheel-hub-btn"]').click();
    await page.waitForFunction(
      () => /eliminate winner/i.test(document.body.textContent),
      { timeout: 12000 }
    );

    // Verify the eliminate button is visible
    const eliminateBtn = page.locator('button[aria-label="Eliminate winning slice and respin"]');
    assert(await eliminateBtn.isVisible(), 'Eliminate Winner button not visible after verdict');
    await page.close();
  });

  await test('Alert prevents eliminating below 2 options using Builder 3-slice wheel', async () => {
    const page = await createPage(browser);
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('nav', { timeout: 5000 });

    // Navigate to Builder tab
    await page.locator('button:has-text("Builder")').first().click();
    await page.waitForTimeout(2000);

    // Remove one slice (go from 4 default to 3)
    await page.locator('[aria-label="Remove slice Option D"]').first().click();
    await page.waitForTimeout(500);

    // Verify we now have 3 slices
    const body = await page.textContent('body');
    assert(body.includes('Wheel Slices (3)'), 'Expected 3 slices after removal');

    // Launch to studio
    await page.locator('button:has-text("Save & Launch Wheel in Studio")').first().click();
    await page.waitForTimeout(1500);

    // Should now be in studio tab with 3 options
    const paths = await page.locator('[data-testid="wheel-disc"] path').count();
    assert(paths === 3, `Expected 3 wheel paths, got ${paths}`);

    // Spin 1 — pick a winner from 3 options
    await page.locator('[data-testid="wheel-hub-btn"]').click();
    await page.waitForFunction(
      () => /eliminate winner/i.test(document.body.textContent),
      { timeout: 12000 }
    );

    // Eliminate winner (3 → 2 options)
    const eliminateBtn = page.locator('button[aria-label="Eliminate winning slice and respin"]');
    await eliminateBtn.click();
    await page.waitForTimeout(1000);

    // Spin 2 — pick winner from 2 options
    await page.locator('[data-testid="wheel-hub-btn"]').click();
    await page.waitForFunction(
      () => /eliminate winner/i.test(document.body.textContent),
      { timeout: 12000 }
    );

    // Try to eliminate again — should trigger alert (2 options, need > 2 to eliminate)
    await page.locator('button[aria-label="Eliminate winning slice and respin"]').first().click();
    await page.waitForTimeout(1000);

    assert(alertMessage.includes('Need at least 2'), `Expected alert about minimum options, got: "${alertMessage}"`);
    await page.close();
  });

  /* ── SUMMARY ──────────────────────────────────────────────────── */
  await browser.close();

  const total = passed + failed;
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} passed`);
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} FAILED:`);
    for (const f of failures) {
      console.log(`   - ${f.name}`);
      console.log(`     ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
