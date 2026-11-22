// Small helper for the browser tests. Needs: npm i playwright  (then: npx playwright install chromium)
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8123/index.html';
async function newPage(opts = {}) {
  const browser = await chromium.launch(opts.launch || {});
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1360, height: 820 }, ...(opts.context || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|integrity/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  return { browser, ctx, page, errors, BASE };
}
async function login(page, user, pass) {
  await page.fill('#loginUsername', user); await page.fill('#loginPassword', pass);
  await page.click('text=Sign In'); await page.waitForTimeout(700);
}
module.exports = { newPage, login, BASE };
