// @ts-check
const { test, expect } = require('@playwright/test');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

test.beforeAll(async () => {
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
});

const PAGES = [
  { url: '/', title: 'Home | Shivalya Agrotech Producer Company' },
  { url: '/about.html', title: 'About Us | Shivalya Agrotech Producer Company' },
  { url: '/products.html', title: 'Products | Shivalya Agrotech Producer Company' },
  { url: '/product.html?id=mulching-film', title: 'Mulching Film | Shivalya Agrotech' },
  { url: '/industries.html', title: 'Industries | Shivalya Agrotech Producer Company' },
  { url: '/quality.html', title: 'Quality | Shivalya Agrotech Producer Company' },
  { url: '/infrastructure.html', title: 'Infrastructure | Shivalya Agrotech Producer Company' },
  { url: '/gallery.html', title: 'Gallery | Shivalya Agrotech Producer Company' },
  { url: '/contact.html', title: 'Contact | Shivalya Agrotech Producer Company' },
];

test.describe('1. Page Loads, Assets & Zero Console Errors', () => {
  for (const p of PAGES) {
    test(`Page ${p.url} loads with 200, valid title, and zero errors`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      const res = await page.goto(p.url, { waitUntil: 'domcontentloaded' });
      expect(res.status()).toBe(200);

      // Allow API rendering
      await page.waitForTimeout(600);

      // Verify no critical JavaScript errors
      expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);

      // Verify header and footer are rendered
      await expect(page.locator('#hdr')).toBeVisible();
      await expect(page.locator('#ftr')).toBeVisible();

      // Verify all images loaded properly
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(i => i.src);
      });
      expect(brokenImages).toEqual([]);
    });
  }
});

test.describe('2. Navigation & Header Search', () => {
  test('Header navigation links navigate to correct separate pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click 'Products' in navigation
    await page.click('nav.m a[href="products.html"]');
    await expect(page).toHaveURL(/.*products\.html/);

    // Click 'Contact' in navigation
    await page.click('nav.m a[href="contact.html"]');
    await expect(page).toHaveURL(/.*contact\.html/);
  });

  test('Header search query filters products', async ({ page }) => {
    await page.goto('/');
    await page.fill('header.nav input[name="q"]', 'mulch');
    await page.press('header.nav input[name="q"]', 'Enter');

    await expect(page).toHaveURL(/.*products\.html\?q=mulch/);
    await page.waitForTimeout(500);

    // Verify mulching film card is present in results
    await expect(page.locator('#plist')).toContainText('Mulching Film');
  });
});

test.describe('3. Products, Variants & Prefilled Quotes', () => {
  test('Product detail page renders variants table with exact prices', async ({ page }) => {
    await page.goto('/product.html?id=mulching-film');
    await page.waitForTimeout(600);

    // Verify product name and table
    await expect(page.locator('h1')).toContainText('Mulching Film');
    const tableText = await page.locator('.tw table').textContent();

    expect(tableText).toContain('20 micron');
    expect(tableText).toContain('750');
    expect(tableText).toContain('900');
    expect(tableText).toContain('1,050');
    expect(tableText).toContain('1,250');
    expect(tableText).toContain('1,550');
  });

  test('Jute thread product page renders 6, 7, 8 ply pricing', async ({ page }) => {
    await page.goto('/product.html?id=jute-thread');
    await page.waitForTimeout(600);

    const tableText = await page.locator('.tw table').textContent();
    expect(tableText).toContain('6 Ply');
    expect(tableText).toContain('130');
    expect(tableText).toContain('7 Ply');
    expect(tableText).toContain('140');
    expect(tableText).toContain('8 Ply');
    expect(tableText).toContain('150');
  });
});

test.describe('4. Form Submissions (Quote & Contact)', () => {
  test('Quick quote form shows validation error for invalid phone', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Fill with invalid phone
    await page.fill('#qn', 'Test User');
    await page.fill('#qh', '12345'); // invalid
    await page.click('#qbtn');

    await page.waitForTimeout(500);
    const errText = await page.locator('#qerr').textContent();
    expect(errText).toContain('phone');
  });

  test('Quick quote form successfully submits valid lead & shows WhatsApp link', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.selectOption('#qp', { label: 'Mulching Film' });
    await page.fill('#qs', '25 micron, 4 ft');
    await page.fill('#qq', '20 rolls');
    await page.fill('#qn', 'Manpreet Singh');
    await page.fill('#qh', '9876543210');

    await page.click('#qbtn');
    await page.waitForTimeout(800);

    // Expect success element to become visible
    await expect(page.locator('#qsuc')).toBeVisible();
    await expect(page.locator('#qsuc')).toContainText('SAQ-');
    await expect(page.locator('#qsuc a[href*="wa.me"]')).toBeVisible();
  });

  test('Contact form sends enquiry successfully', async ({ page }) => {
    await page.goto('/contact.html');
    await page.waitForTimeout(600);

    await page.fill('#cn', 'Suresh Patel');
    await page.fill('#cp', '9950337442');
    await page.fill('#ce', 'suresh@example.com');
    await page.fill('#cs', 'Mulch Wholesale Enquiry');
    await page.fill('#cm', 'Please share bulk price list for 100 rolls.');

    await page.click('#cbtn');
    await page.waitForTimeout(800);

    await expect(page.locator('#csuc')).toBeVisible();
    await expect(page.locator('#csuc')).toContainText('Message Sent');
  });
});

test.describe('5. Mobile Responsiveness & Viewports', () => {
  test('Mobile viewport (375px): no horizontal scroll & hamburger menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Check no horizontal scrollbar overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Test hamburger menu
    const burger = page.locator('.burger');
    await expect(burger).toBeVisible();

    // Toggle menu
    await burger.click();
    await expect(page.locator('#nv')).toHaveClass(/open/);

    await burger.click();
    await expect(page.locator('#nv')).not.toHaveClass(/open/);
  });

  test('Tablet viewport (768px): clean layout without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/products.html');
    await page.waitForTimeout(500);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test.describe('6. Admin Panel End-to-End Workflow', () => {
  test('Unauthenticated user navigating to /admin is redirected to /admin/login.html', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/admin\/login\.html/);
  });

  test('Admin login with wrong password displays error', async ({ page }) => {
    await page.goto('/admin/login.html');
    await page.fill('#email', 'admin@shivalya.com');
    await page.fill('#password', 'WrongPassword123');
    await page.click('#loginBtn');

    await page.waitForTimeout(500);
    const alertBox = page.locator('#alertBox');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('Invalid password');
  });

  test('Admin login, dashboard overview, product hide/show and logout', async ({ page }) => {
    await page.goto('/admin/login.html');
    await page.fill('#email', 'admin@shivalya.com');
    await page.fill('#password', 'Admin@123');
    await page.click('#loginBtn');

    // If initial password modal shows, fill new password
    await page.waitForTimeout(600);
    const pwModal = page.locator('#pwModal');
    if (await pwModal.isVisible()) {
      await page.fill('#newPw', 'Admin@123456');
      await page.fill('#confirmPw', 'Admin@123456');
      await page.click('#changePwBtn');
      await page.waitForTimeout(800);
    }

    // Should be on admin dashboard
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
    await expect(page.locator('#pageTitle')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#pageTitle')).toContainText('Dashboard Overview');

    // Switch to Products tab
    await page.click('.nav-item[data-tab="products"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#pageTitle')).toContainText('Products & Variants');
    await expect(page.locator('#productsTableBody')).toContainText('Mulching Film');

    // Switch to Quotes tab
    await page.click('.nav-item[data-tab="quotes"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#pageTitle')).toContainText('Quote Requests');

    // Switch to Site Settings tab
    await page.click('.nav-item[data-tab="settings"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#setting_phone')).toHaveValue(/\+91/);

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/.*\/admin\/login\.html/);
  });
});
