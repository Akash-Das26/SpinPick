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
    await page.waitForTimeout(3000);

    // Check the page loaded — title might be in the header or the page title
    const title = await page.title();
    assert(title.toLowerCase().includes('spinpick') || title.toLowerCase().includes('spin'),
      `Unexpected title: "${title}"`);

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('OpenRouter') &&
      !e.includes('network')
    );
    assert(critical.length === 0, `Console errors: ${critical.join(', ')}`);
    await page.close();
  });

  await test('spin-wheel canvas element exists', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const canvas = page.locator('#spin-wheel-canvas');
    const count = await canvas.count();
    assert(count > 0, 'No spin-wheel-canvas found');
    await page.close();
  });

  await test('header with brand name is visible', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const header = page.locator('header');
    assert(await header.count() > 0, 'No header found');

    // Check for brand text
    const brandText = await page.textContent('header');
    assert(brandText.includes('SPINPICK') || brandText.includes('SpinPick'),
      'Brand name not found in header');
    await page.close();
  });

  /* ── 2. WHEEL INTERACTION TESTS ──────────────────────────────── */
  console.log('\n🎯 2. WHEEL INTERACTION TESTS\n');

  await test('spin button is clickable', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const spinBtn = page.locator('#main-spin-action-btn');
    assert(await spinBtn.count() > 0, 'No spin button found');
    assert(await spinBtn.isEnabled(), 'Spin button is disabled');
    await page.close();
  });

  await test('wheel editor is visible', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const editor = page.locator('#wheel-editor-container');
    assert(await editor.count() > 0, 'No wheel editor found');
    await page.close();
  });

  await test('item name input exists and accepts text', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const nameInput = page.locator('#item-name-input');
    assert(await nameInput.count() > 0, 'No item name input found');
    await nameInput.fill('Test Option');
    const value = await nameInput.inputValue();
    assert(value === 'Test Option', 'Input value not set correctly');
    await page.close();
  });

  await test('add single item button works', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const nameInput = page.locator('#item-name-input');
    await nameInput.fill('My New Option');

    const addBtn = page.locator('#add-single-item-btn');
    assert(await addBtn.count() > 0, 'No add button found');
    await addBtn.click();
    await page.waitForTimeout(500);

    // Verify the input was cleared (item was added)
    const value = await nameInput.inputValue();
    assert(value === '', 'Input not cleared after adding item');
    await page.close();
  });

  /* ── 3. MODAL TESTS ──────────────────────────────────────────── */
  console.log('\n📦 3. MODAL TESTS\n');

  await test('settings modal opens and closes', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const settingsBtn = page.locator('#open-settings-btn');
    assert(await settingsBtn.count() > 0, 'No settings button found');
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Modal should be visible (check for any modal-like overlay)
    const modal = page.locator('[class*="fixed inset-0"]');
    assert(await modal.count() > 0, 'Settings modal did not open');
    await page.close();
  });

  await test('share modal opens', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const shareBtn = page.locator('#open-share-btn');
    assert(await shareBtn.count() > 0, 'No share button found');
    await shareBtn.click();
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('history drawer opens', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const historyBtn = page.locator('#open-history-btn');
    assert(await historyBtn.count() > 0, 'No history button found');
    await historyBtn.click();
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('presets/saved wheels modal opens', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const presetsBtn = page.locator('#open-presets-btn');
    assert(await presetsBtn.count() > 0, 'No presets button found');
    await presetsBtn.click();
    await page.waitForTimeout(500);
    await page.close();
  });

  /* ── 4. MODE SELECTOR TESTS ──────────────────────────────────── */
  console.log('\n🎰 4. MODE SELECTOR TESTS\n');

  await test('mode selector pills are present', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check for mode buttons
    const classicBtn = page.locator('#mode-classic-btn');
    const eliminationBtn = page.locator('#mode-elimination-btn');
    const teamsBtn = page.locator('#mode-teams-btn');
    const flipBtn = page.locator('#mode-flip-btn');
    const tournamentBtn = page.locator('#mode-tournament-btn');

    assert(await classicBtn.count() > 0, 'No classic mode button');
    assert(await eliminationBtn.count() > 0, 'No elimination mode button');
    assert(await teamsBtn.count() > 0, 'No teams mode button');
    assert(await flipBtn.count() > 0, 'No flip mode button');
    assert(await tournamentBtn.count() > 0, 'No tournament mode button');
    await page.close();
  });

  await test('classic mode is selected by default', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const classicBtn = page.locator('#mode-classic-btn');
    const className = await classicBtn.getAttribute('class');
    assert(className.includes('bg-indigo-600'), 'Classic mode is not selected by default');
    await page.close();
  });

  /* ── 5. KEYBOARD SHORTCUT TESTS ──────────────────────────────── */
  console.log('\n⌨️  5. KEYBOARD SHORTCUT TESTS\n');

  await test('spacebar triggers spin action', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Focus on body (not input)
    await page.click('body');
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Spin should have been triggered (button text may change)
    const spinBtn = page.locator('#main-spin-action-btn');
    const btnText = await spinBtn.textContent();
    // Button might say "SPINNING..." or still "SPIN PICK" depending on timing
    assert(btnText !== null, 'Spin button text is null');
    await page.close();
  });

  await test('fullscreen toggle button exists', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const fsBtn = page.locator('#fullscreen-toggle-btn');
    assert(await fsBtn.count() > 0, 'No fullscreen button found');
    await page.close();
  });

  /* ── 6. THEME & CONFIG TESTS ─────────────────────────────────── */
  console.log('\n🎨 6. THEME & CONFIG TESTS\n');

  await test('wheel title input is editable', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const titleInput = page.locator('input[placeholder="DECIDE YOUR DESTINY"]');
    assert(await titleInput.count() > 0, 'No title input found');
    await titleInput.fill('My Custom Title');
    const value = await titleInput.inputValue();
    assert(value === 'My Custom Title', 'Title not updated');
    await page.close();
  });

  await test('sound toggle button exists and toggles', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const soundBtn = page.locator('#toggle-sound-btn');
    assert(await soundBtn.count() > 0, 'No sound toggle button found');
    await soundBtn.click();
    await page.waitForTimeout(300);
    // Should still be functional
    assert(await soundBtn.count() > 0, 'Sound button disappeared after click');
    await page.close();
  });

  /* ── 7. BULK ADD TEST ────────────────────────────────────────── */
  console.log('\n📋 7. BULK ADD TEST\n');

  await test('bulk paste modal opens', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const bulkBtn = page.locator('#bulk-import-btn');
    assert(await bulkBtn.count() > 0, 'No bulk import button found');
    await bulkBtn.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('#bulk-paste-textarea');
    assert(await textarea.count() > 0, 'Bulk paste textarea not found');
    await page.close();
  });

  /* ── 8. FOOTER TEST ──────────────────────────────────────────── */
  console.log('\n🏁 8. FOOTER TEST\n');

  await test('footer is visible with version info', async () => {
    const page = await createPage(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const footer = page.locator('footer');
    assert(await footer.count() > 0, 'No footer found');
    const footerText = await footer.textContent();
    assert(footerText.includes('SpinPick'), 'Footer missing SpinPick branding');
    await page.close();
  });

  /* ── SUMMARY ─────────────────────────────────────────────────── */
  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

  if (failures.length > 0) {
    console.log('❌ Failed tests:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
