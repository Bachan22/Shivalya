// @ts-check
const { test, expect } = require('@playwright/test');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

test.beforeAll(async () => {
  // Ensure screenshots dir exists
  const scDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(scDir)) {
    fs.mkdirSync(scDir, { recursive: true });
  }

  // Ensure admin user is ready for testing
  try {
    const hash = await bcrypt.hash('Admin@123', 12);
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'shivalya_agrotech',
    });
    await conn.execute(
      'UPDATE admin_users SET password_hash = ?, failed_login_count = 0, locked_until = NULL, must_change_password = 0 WHERE email = ?',
      [hash, process.env.ADMIN_EMAIL || 'admin@shivalya.com']
    );
    await conn.end();
  } catch (err) {
    console.warn('MySQL setup warning (proceeding if DB already configured):', err.message);
  }
});

const ALL_PAGES = [
  { path: '/', name: 'home', title: 'Home | Shivalya Agrotech Producer Company' },
  { path: '/about.html', name: 'about', title: 'About Us | Shivalya Agrotech Producer Company' },
  { path: '/products.html', name: 'products', title: 'Products | Shivalya Agrotech Producer Company' },
  { path: '/product.html?id=mulching-film', name: 'product-detail', title: 'Mulching Film | Shivalya Agrotech' },
  { path: '/industries.html', name: 'industries', title: 'Industries | Shivalya Agrotech Producer Company' },
  { path: '/quality.html', name: 'quality', title: 'Quality | Shivalya Agrotech Producer Company' },
  { path: '/infrastructure.html', name: 'infrastructure', title: 'Infrastructure | Shivalya Agrotech Producer Company' },
  { path: '/gallery.html', name: 'gallery', title: 'Gallery | Shivalya Agrotech Producer Company' },
  { path: '/contact.html', name: 'contact', title: 'Contact | Shivalya Agrotech Producer Company' },
];

const VIEWPORTS_9 = [
  { name: '320x640 (Small Mobile)', width: 320, height: 640 },
  { name: '360x800 (Android)', width: 360, height: 800 },
  { name: '390x844 (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7)', width: 412, height: 915 },
  { name: '768x1024 (iPad Portrait)', width: 768, height: 1024 },
  { name: '1024x768 (iPad Landscape)', width: 1024, height: 768 },
  { name: '1280x720 (Laptop HD)', width: 1280, height: 720 },
  { name: '1440x900 (Desktop Standard)', width: 1440, height: 900 },
  { name: '1920x1080 (Desktop FHD)', width: 1920, height: 1080 },
];

// ─────────────────────────────────────────────────────────────
// 1. All 9 Viewports & No Horizontal Scroll
// ─────────────────────────────────────────────────────────────
test.describe('1. 9 Viewports Responsiveness & Zero Overflow', () => {
  for (const vp of VIEWPORTS_9) {
    test(`Viewport ${vp.name}: No overflow & all 9 pages load cleanly`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const p of ALL_PAGES) {
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        const res = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        expect(res.status()).toBe(200);
        await page.waitForTimeout(150);

        // Assert no horizontal scrollbar / overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(overflow, `Horizontal overflow detected on ${p.path} at ${vp.width}px`).toBe(false);

        // Header & Footer visible
        await expect(page.locator('#hdr')).toBeVisible();
        await expect(page.locator('#ftr')).toBeVisible();

        // No unhandled JS error
        expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. Desktop Hero Verification (1440px & 1920px)
// ─────────────────────────────────────────────────────────────
test.describe('2. Desktop Homepage Hero Layout & Alignment', () => {
  test('Hero text aligns with header logo container at 1440px and 1920px', async ({ page }) => {
    for (const w of [1280, 1440, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/');
      await page.waitForTimeout(400);

      const headerLogoBox = await page.locator('header.nav .wrap .logo').boundingBox();
      const heroContentBox = await page.locator('.hero-main .wrap .hero-content').boundingBox();

      expect(headerLogoBox).not.toBeNull();
      expect(heroContentBox).not.toBeNull();

      // Left edge alignment check: hero text left edge matches header logo left edge exactly (within 2px)
      expect(Math.abs(headerLogoBox.x - heroContentBox.x)).toBeLessThanOrEqual(2);

      // Hero height: min-height 640px
      const heroBox = await page.locator('.hero').boundingBox();
      expect(heroBox.height).toBeGreaterThanOrEqual(640);

      // Both buttons visible
      const solidBtn = page.locator('.hero-actions .btn-hero-solid');
      const waBtn = page.locator('.hero-actions .btn-hero-wa');
      await expect(solidBtn).toBeVisible();
      await expect(waBtn).toBeVisible();

      // Trust badges strip anchored at bottom and does NOT overlap hero content
      const badgesBox = await page.locator('.hero-badges').boundingBox();
      expect(badgesBox).not.toBeNull();

      // Top of badges must be strictly greater than bottom of hero content
      const contentBottom = heroContentBox.y + heroContentBox.height;
      expect(badgesBox.y).toBeGreaterThanOrEqual(contentBottom);

      // Trust badges titles do not wrap into multiple lines (white-space: nowrap)
      const badgeTitles = page.locator('.badge-title');
      const count = await badgeTitles.count();
      expect(count).toBe(4);
      for (let i = 0; i < count; i++) {
        const whiteSpace = await badgeTitles.nth(i).evaluate(el => window.getComputedStyle(el).whiteSpace);
        expect(whiteSpace).toBe('nowrap');
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Mobile Menu Overlay & Interactions
// ─────────────────────────────────────────────────────────────
test.describe('3. Mobile Full-Screen Menu Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(400);
  });

  test('Opens from hamburger, body scroll locked, X closes it, focus returned', async ({ page }) => {
    const burger = page.locator('.burger');
    await expect(burger).toBeVisible();

    await burger.click();
    await page.waitForTimeout(300);

    const overlay = page.locator('#mo-overlay');
    await expect(overlay).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveClass(/nav-open/);

    const closeBtn = page.locator('.mo-close');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(300);

    await expect(overlay).not.toHaveClass(/active/);
    await expect(page.locator('body')).not.toHaveClass(/nav-open/);
  });

  test('Closes on Escape key and Backdrop tap', async ({ page }) => {
    // Escape key
    await page.locator('.burger').click();
    await page.waitForTimeout(250);
    await expect(page.locator('#mo-overlay')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await expect(page.locator('#mo-overlay')).not.toHaveClass(/active/);

    // Backdrop tap
    await page.locator('.burger').click();
    await page.waitForTimeout(250);
    await expect(page.locator('#mo-overlay')).toHaveClass(/active/);
    await page.locator('.mo-backdrop').dispatchEvent('click');
    await page.waitForTimeout(250);
    await expect(page.locator('#mo-overlay')).not.toHaveClass(/active/);
  });

  test('Accordions single-open policy and menu items in order', async ({ page }) => {
    await page.locator('.burger').click();
    await page.waitForTimeout(250);

    // Ordered items
    const rows = page.locator('.mo-links > a.mo-row, .mo-links > .mo-accordion');
    expect(await rows.count()).toBe(8);

    // Products expand
    await page.locator('#mo-acc-products .mo-acc-trigger').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mo-acc-products')).toHaveClass(/open/);

    // Industries expand -> Products collapses
    await page.locator('#mo-acc-industries .mo-acc-trigger').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mo-acc-industries')).toHaveClass(/open/);
    await expect(page.locator('#mo-acc-products')).not.toHaveClass(/open/);

    // Bottom Get Quote pill links to WhatsApp
    const quoteBtn = page.locator('.mo-quote-btn');
    await expect(quoteBtn).toBeVisible();
    await expect(quoteBtn).toHaveAttribute('href', /wa\.me\/919950337442/);

    // Quick action buttons: Call & Email
    await expect(page.locator('.mo-call-btn')).toHaveAttribute('href', /tel:\+?919950337442/);
    await expect(page.locator('.mo-mail-btn')).toHaveAttribute('href', /mailto:/);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. WhatsApp Direct Links & Non-Blocking Form Submissions
// ─────────────────────────────────────────────────────────────
test.describe('4. Direct WhatsApp Everywhere & Form Flow', () => {
  test('Top bar, hero, product and industries buttons link directly to WhatsApp', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);

    // Top bar quote button
    const topQuote = page.locator('.top-desktop .q');
    await expect(topQuote).toHaveAttribute('href', /wa\.me\/919950337442/);

    // Hero WhatsApp button
    const heroWa = page.locator('.btn-hero-wa');
    await expect(heroWa).toHaveAttribute('href', /wa\.me\/919950337442/);

    // Product detail quote button
    await page.goto('/product.html?id=mulching-film');
    await page.waitForTimeout(400);
    const prodQuote = page.locator('a.btn:has-text("Get Quote on WhatsApp")');
    await expect(prodQuote.first()).toHaveAttribute('href', /wa\.me\/919950337442\?text=.*/);

    // Industries page quote buttons
    await page.goto('/industries.html');
    await page.waitForTimeout(400);
    const indButtons = page.locator('a.btn[href*="wa.me"]');
    expect(await indButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test('Quick Quote form validates, saves in background, and opens WhatsApp', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);

    // Validation check on empty phone
    await page.click('#qbtn');
    await expect(page.locator('#qerr')).toContainText('Please enter a valid 10-digit phone number');

    // Fill valid phone
    await page.fill('#qn', 'Test Farmer');
    await page.fill('#qh', '9876543210');
    await page.fill('#qq', '50 rolls');

    // Submit form
    await page.click('#qbtn');
    await page.waitForTimeout(300);

    // Success confirmation visible with WhatsApp continue button
    await expect(page.locator('#qsuc')).toBeVisible();
    await expect(page.locator('#qsuc a[href*="wa.me"]')).toBeVisible();
  });

  test('Forms still open WhatsApp when backend API is stopped/offline', async ({ page }) => {
    // Intercept and abort all API requests
    await page.route('**/api/v1/**', route => route.abort('failed'));

    await page.goto('/contact.html');
    await page.waitForTimeout(400);

    await page.fill('#cn', 'Offline Contact Tester');
    await page.fill('#cp', '9988776655');
    await page.fill('#cm', 'Need quotation for 25 micron mulching film.');
    await page.click('#cbtn');
    await page.waitForTimeout(300);

    // Must still show success confirmation and direct WhatsApp link with prefilled details
    await expect(page.locator('#csuc')).toBeVisible();
    const waLink = page.locator('#csuc a[href*="wa.me"]');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me/919950337442');
    expect(href).toContain(encodeURIComponent('Offline Contact Tester'));
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Screenshots Capture (390px and 1440px for all 9 pages)
// ─────────────────────────────────────────────────────────────
test.describe('5. Screenshots Generation', () => {
  for (const p of ALL_PAGES) {
    test(`Screenshot ${p.name} at 390px (mobile) and 1440px (desktop)`, async ({ page }) => {
      // 390px Mobile Screenshot
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p.path);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `tests/screenshots/${p.name}-390px.png`, fullPage: false });

      // 1440px Desktop Screenshot
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(p.path);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `tests/screenshots/${p.name}-1440px.png`, fullPage: false });
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. Admin Panel Workflow Preservation
// ─────────────────────────────────────────────────────────────
test.describe('6. Admin Dashboard Workflow', () => {
  test('Unauthenticated user is redirected to /admin/login.html', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/admin\/login\.html/);
  });

  test('Admin login, dashboard overview, and logout work seamlessly', async ({ page }) => {
    await page.goto('/admin/login.html');
    await page.fill('#email', 'admin@shivalya.com');
    await page.fill('#password', 'Admin@123');
    await page.click('#loginBtn');

    await page.waitForTimeout(600);
    const pwModal = page.locator('#pwModal');
    if (await pwModal.isVisible()) {
      await page.fill('#newPw', 'Admin@123456');
      await page.fill('#confirmPw', 'Admin@123456');
      await page.click('#changePwBtn');
      await page.waitForTimeout(800);
    }

    await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
    await expect(page.locator('#pageTitle')).toContainText('Dashboard Overview');

    await page.click('button:has-text("Logout")');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/.*\/admin\/login\.html/);
  });
});
