/**
 * Capture Kairo product screenshots for the README.
 * Requires: frontend on :3000, backend on :8000, demo user seeded.
 *
 *   node scripts/capture_screenshots.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'images');
const BASE = 'http://localhost:3000';
const DEMO_EMAIL = 'jack.tucker@example.com';
const DEMO_PASSWORD = 'password123';

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(opts.settle ?? 500);
  if (opts.locator) {
    await opts.locator.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  }
  console.log('✓', name);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    permissions: ['microphone', 'geolocation'],
  });

  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // --- Auth ---
  await page.waitForSelector('text=Welcome back');
  await shot(page, 'auth-page');

  // --- Login ---
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button.btn-primary');
  await page.waitForSelector('.dashboard-container', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // --- Dashboard (hero + recent entries with emotion badges) ---
  await shot(page, 'dashboard');

  // --- Journal / voice capture UI ---
  await page.locator('.nav-item', { hasText: 'New Entry' }).first().click();
  await page.waitForSelector('.create-entry-section', { timeout: 15000 });
  await page.waitForTimeout(600);

  // Crop to the New Entry composer (voice-first story)
  const compose = page.locator('.create-entry-section').first();
  await compose.scrollIntoViewIfNeeded();
  await shot(page, 'voice-recording', { locator: compose });

  // Full page context for voice flow (sidebar + compose)
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'voice-recording-full');
  // Prefer full-page version as the gallery image
  fs.copyFileSync(path.join(OUT, 'voice-recording-full.png'), path.join(OUT, 'voice-recording.png'));
  fs.unlinkSync(path.join(OUT, 'voice-recording-full.png'));

  // --- Save a joy entry so emotion badge is visible ---
  const joyText =
    'I am so happy and grateful today. Everything went wonderfully and I am filled with pure joy.';
  await page.fill('textarea.neo-textarea', joyText);
  await page.locator('button.neo-button', { hasText: 'Save Entry' }).click();
  await page.waitForSelector('.entry-card .sentiment-badge', { timeout: 20000 });
  await page.waitForTimeout(800);

  // Scroll first entry into view and capture it as "transcription + emotion"
  const firstEntry = page.locator('.entries-list .entry-card').first();
  await firstEntry.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // Capture a viewport that shows entry + badge (scroll entry toward top third)
  await page.evaluate(() => {
    const entry = document.querySelector('.entries-list .entry-card');
    if (entry) {
      const y = entry.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await shot(page, 'entry-with-emotion');

  // --- History: filter joy and show several cards ---
  const moodSelect = page.locator('select.neo-input').first();
  await moodSelect.selectOption('joy');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const list = document.querySelector('.entries-list');
    if (list) {
      const y = list.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await shot(page, 'entry-history');
  await moodSelect.selectOption('All');
  await page.waitForTimeout(500);

  // --- Chat RAG ---
  await page.evaluate(() => {
    const chat = document.querySelector('.chat-interface');
    if (chat) {
      const y = chat.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await page.locator('.chat-interface input.neo-input').first().fill('What have I been feeling joyful about?');
  await page.locator('.chat-interface button.neo-button', { hasText: 'Ask' }).click();
  await page.waitForSelector('.chat-answer', { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const chat = document.querySelector('.chat-interface');
    if (chat) {
      const y = chat.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await shot(page, 'chat-rag');

  // --- Notebooks: generate weekly notebook for richer UI ---
  await page.locator('.nav-item', { hasText: 'All Journals' }).first().click();
  await page.waitForSelector('.library-view', { timeout: 15000 });
  await page.waitForTimeout(600);

  const autoGen = page.locator('button.neo-button', { hasText: 'Auto-Generate' });
  if (await autoGen.count()) {
    await autoGen.click();
    await page.waitForSelector('.create-notebook-modal', { timeout: 5000 });
    // Weekly range for more entries
    await page.locator('.create-notebook-modal select.neo-input').selectOption('weekly');
    await page.waitForTimeout(300);
    const genConfirm = page.locator('.create-notebook-modal button.neo-button', {
      hasText: /Generate|Create/i,
    });
    if (await genConfirm.count()) {
      await genConfirm.first().click();
      await page.waitForTimeout(2500);
    } else {
      // close modal if label differs
      const cancel = page.locator('.create-notebook-modal button.neo-button', { hasText: /Cancel/i });
      if (await cancel.count()) await cancel.first().click();
    }
  }

  await page.waitForTimeout(800);
  // ensure modal closed
  if (await page.locator('.create-notebook-modal').count()) {
    await page.locator('.create-notebook-modal button.neo-button', { hasText: /Cancel/i }).click().catch(() => {});
  }
  await page.waitForTimeout(500);
  await shot(page, 'notebooks');

  await browser.close();
  console.log('\nDone →', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
