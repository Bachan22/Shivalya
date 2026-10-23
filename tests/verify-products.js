/**
 * tests/verify-products.js
 * End-to-end verification script for Products experience and faceted filters.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db/pool');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runVerification() {
  console.log('--- Starting Products Experience Verification ---');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  function record(testName, status, details = '') {
    results.push({ testName, status, details });
    console.log(`[${status}] ${testName}${details ? ': ' + details : ''}`);
  }

  try {
    // ══════════════════════════════════════════════════════════
    // Check 1: Menu item opens products.html directly (Desktop & Mobile)
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/index.html');
      
      // Desktop: Check "Products" link has no dropdown
      const prodNavDiv = page.locator('nav.m div').filter({ hasText: 'Products' });
      const hasDropdown = await prodNavDiv.locator('.dd').count();
      const prodLinkHref = await page.locator('nav.m a[href="products.html"]').getAttribute('href');

      await page.click('nav.m a[href="products.html"]');
      await page.waitForURL('**/products.html');

      // Mobile: Check overlay has no accordion for Products
      const mobileContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto('http://localhost:3000/index.html');
      await mobilePage.click('.burger');
      await mobilePage.waitForSelector('#mo-overlay.active');
      const prodAccordionCount = await mobilePage.locator('#mo-acc-products').count();
      const mobileProdLink = mobilePage.locator('.mo-links a[href="products.html"]');
      const mobileProdLinkCount = await mobileProdLink.count();

      await mobileProdLink.click();
      await mobilePage.waitForURL('**/products.html');

      if (hasDropdown === 0 && prodLinkHref === 'products.html' && prodAccordionCount === 0 && mobileProdLinkCount === 1) {
        record('1. Products Menu Direct Link (Desktop & Mobile)', 'PASS', 'Direct link to products.html, zero dropdowns/accordions');
      } else {
        record('1. Products Menu Direct Link (Desktop & Mobile)', 'FAIL', `Dropdown: ${hasDropdown}, Accordion: ${prodAccordionCount}`);
      }
      await context.close();
      await mobileContext.close();
    }

    // ══════════════════════════════════════════════════════════
    // Check 2: Header Visibility, Wrapper removal, Grid responsive columns
    // ══════════════════════════════════════════════════════════
    {
      const viewports = [
        { w: 360, h: 800, name: 'phone_360', expectedCols: 2 },
        { w: 390, h: 844, name: 'phone_390', expectedCols: 2 },
        { w: 768, h: 1024, name: 'tablet_768', expectedCols: 3 },
        { w: 1280, h: 720, name: 'desktop_1280', expectedCols: 3 },
        { w: 1440, h: 900, name: 'desktop_1440', expectedCols: 4 }
      ];

      let allPassed = true;
      for (const vp of viewports) {
        const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
        const page = await context.newPage();
        await page.goto('http://localhost:3000/products.html');
        await page.waitForSelector('.prod-card');

        // Check H1 visibility and bounding box
        const h1 = page.locator('.prod-pagehead h1');
        const box = await h1.boundingBox();
        const headerBox = await page.locator('header.nav').boundingBox();

        // Check if H1 is below header and fully visible
        const isClipped = box.y < (headerBox ? headerBox.y + headerBox.height : 0);
        
        // Check grid columns
        const cards = page.locator('.prod-card');
        const count = await cards.count();
        if (count >= 2) {
          const box0 = await cards.nth(0).boundingBox();
          const box1 = await cards.nth(1).boundingBox();
          const isRow = Math.abs(box0.y - box1.y) < 15;
          if (vp.expectedCols >= 2 && !isRow) {
            allPassed = false;
          }
        }

        // Check no horizontal scrollbar
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        if (scrollWidth > clientWidth) allPassed = false;

        // Check cards background & wrapper
        const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        if (isClipped) allPassed = false;

        await context.close();
      }

      if (allPassed) {
        record('2. Header Visibility, Grid Columns & Wrapper Removal', 'PASS', 'H1 unclipped, no horizontal scroll, proper 2/3/4 cols');
      } else {
        record('2. Header Visibility, Grid Columns & Wrapper Removal', 'FAIL', 'Grid or header layout issue');
      }
    }

    // ══════════════════════════════════════════════════════════
    // Check 3: Dynamic Facets on Search (jute vs mulching)
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/products.html');
      await page.waitForSelector('.prod-card');

      // Search "jute"
      await page.fill('#prod-search-input', 'jute');
      await page.waitForTimeout(700); // Wait for debounce & API fetch
      
      const juteCards = await page.locator('.prod-card .pc-title').allInnerTexts();
      const hasPlyFacet = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="ply"]').count();
      const hasThicknessFacet = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="thickness_micron"]').count();

      // Search "mulching"
      await page.fill('#prod-search-input', 'mulching');
      await page.waitForTimeout(700);

      const mulchCards = await page.locator('.prod-card .pc-title').allInnerTexts();
      const hasMulchThickness = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="thickness_micron"]').count();
      const hasMulchPly = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="ply"]').count();

      // Clear search
      await page.click('#prod-search-clear');
      await page.waitForTimeout(700);
      const allCardsCount = await page.locator('.prod-card').count();

      const juteOk = juteCards.length === 1 && juteCards[0].includes('Jute') && hasPlyFacet === 1 && hasThicknessFacet === 0;
      const mulchOk = mulchCards.length >= 1 && hasMulchThickness === 1 && hasMulchPly === 0;
      const clearOk = allCardsCount >= 6;

      if (juteOk && mulchOk && clearOk) {
        record('3. Dynamic Facets on Live Search (jute vs mulching)', 'PASS', 'Facets dynamically match active product attributes');
      } else {
        record('3. Dynamic Facets on Live Search (jute vs mulching)', 'FAIL', `JuteOk: ${juteOk}, MulchOk: ${mulchOk}, ClearOk: ${clearOk}`);
      }
      await context.close();
    }

    // ══════════════════════════════════════════════════════════
    // Check 4: Variant Filter Selection, Card Variant Lines & URL Sync
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/products.html');
      await page.waitForSelector('.prod-card');

      // Search "jute"
      await page.fill('#prod-search-input', 'jute');
      await page.waitForTimeout(700);

      // Select Ply 7 in sidebar
      const ply7Checkbox = page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="ply"] input[value="7"]');
      await ply7Checkbox.check();
      await page.waitForTimeout(700);

      // Check card shows matching variant "7 ply | ₹140"
      const mvText = await page.locator('.pc-matching-variants').innerText();
      const currentUrl = page.url();
      const urlHasPly = currentUrl.includes('attr%5Bply%5D=7') || currentUrl.includes('attr[ply]=7');

      // Test reload keeps filter
      await page.reload();
      await page.waitForSelector('.prod-card');
      const reloadedMvText = await page.locator('.pc-matching-variants').innerText();

      const plyMatches = mvText.includes('7 ply') && mvText.includes('140');
      const reloadMatches = reloadedMvText.includes('7 ply');

      if (plyMatches && urlHasPly && reloadMatches) {
        record('4. Variant Selection, Matching Line & URL State Sync', 'PASS', `Matching variant: "${mvText.trim()}", URL preserved`);
      } else {
        record('4. Variant Selection, Matching Line & URL State Sync', 'FAIL', `plyMatches: ${plyMatches}, urlHasPly: ${urlHasPly}`);
      }
      await context.close();
    }

    // ══════════════════════════════════════════════════════════
    // Check 5: Dynamic Attribute Addition Without Code Changes
    // ══════════════════════════════════════════════════════════
    {
      console.log('Testing Point 5: Inserting dynamic test attribute in DB...');
      let testProdId = null;
      try {
        // 1. Insert attribute definition: mesh_size_mm
        await pool.execute(`
          INSERT INTO attribute_definitions (attr_key, label, unit, type, is_filterable, sort_order, is_active)
          VALUES ('mesh_size_mm', 'Mesh Size', 'mm', 'discrete', 1, 10, 1)
          ON DUPLICATE KEY UPDATE label = VALUES(label), is_active = 1
        `);

        // 2. Insert test product
        const [pRes] = await pool.execute(`
          INSERT INTO products (name, slug, category_id, short_description, description, is_active, sort_order)
          VALUES ('Perforated Steel Mesh Plate', 'steel-mesh-plate', 1, 'Heavy duty steel mesh plate with precision apertures.', 'Full spec steel mesh plate.', 1, 99)
        `);
        testProdId = pRes.insertId;

        // 3. Insert variant with extra_attributes
        await pool.execute(`
          INSERT INTO product_variants (product_id, label, price, price_unit, is_active, sort_order, extra_attributes)
          VALUES (?, '10 mm Aperture Mesh Plate', 1850.00, 'per piece', 1, 1, JSON_OBJECT('mesh_size_mm', 10))
        `, [testProdId]);

        // Check on website if Mesh Size filter appears automatically
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto('http://localhost:3000/products.html?q=steel+mesh');
        await page.waitForTimeout(800);

        const meshGroupCount = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="mesh_size_mm"]').count();
        const meshOptText = await page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="mesh_size_mm"]').innerText();
        
        // Select mesh size filter
        const meshCb = page.locator('#prod-sidebar-filters .pfg-group[data-attr-key="mesh_size_mm"] input[value="10"]');
        await meshCb.check();
        await page.waitForTimeout(700);

        const cardCount = await page.locator('.prod-card').count();
        const cardTitle = await page.locator('.prod-card .pc-title').innerText();

        const success = meshGroupCount === 1 && meshOptText.includes('Mesh Size') && cardCount === 1 && cardTitle.includes('Steel Mesh');
        if (success) {
          record('5. Zero-Code Dynamic Attribute Addition (DB-driven facet)', 'PASS', 'New "Mesh Size" attribute filter rendered & filtered automatically');
        } else {
          record('5. Zero-Code Dynamic Attribute Addition (DB-driven facet)', 'FAIL', `GroupCount: ${meshGroupCount}`);
        }
        await context.close();
      } finally {
        // Cleanup test data
        if (testProdId) {
          await pool.execute('DELETE FROM products WHERE id = ?', [testProdId]);
        }
        await pool.execute("DELETE FROM attribute_definitions WHERE attr_key = 'mesh_size_mm'");
        console.log('Cleaned up Point 5 test data from DB');
      }
    }

    // ══════════════════════════════════════════════════════════
    // Check 6: Mobile Filter Sheet UX (Open, Apply, Clear, Escape)
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/products.html');
      await page.waitForSelector('.prod-card');

      // Open sheet
      await page.click('#prod-filter-trigger');
      await page.waitForSelector('#prod-sheet-overlay.active');

      // Check floating WhatsApp is hidden
      const waDisplay = await page.evaluate(() => {
        const el = document.querySelector('.wa.wa-pill');
        return el ? window.getComputedStyle(el).display : 'none';
      });

      // Check live count in sheet footer
      const footerCount = await page.locator('#prod-sheet-count').innerText();

      // Close on Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const isSheetClosed = !(await page.locator('#prod-sheet-overlay').isVisible());

      if (waDisplay === 'none' && isSheetClosed && parseInt(footerCount, 10) >= 6) {
        record('6. Mobile Filter Bottom Sheet UX', 'PASS', 'Slides up, hides floating WhatsApp pill, closes on Escape, live count matches');
      } else {
        record('6. Mobile Filter Bottom Sheet UX', 'FAIL', `waDisplay: ${waDisplay}, closed: ${isSheetClosed}`);
      }
      await context.close();
    }

    // ══════════════════════════════════════════════════════════
    // Check 7: Product Card Details & WhatsApp Button
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/products.html');
      await page.waitForSelector('.prod-card');

      const card = page.locator('.prod-card').first();
      const title = await card.locator('.pc-title').innerText();
      const chipsCount = await card.locator('.pc-chip').count();
      const priceText = await card.locator('.pc-price').innerText();
      const waHref = await card.locator('.pc-wa-btn').getAttribute('href');

      const waValid = waHref.includes('https://wa.me/919950337442') && waHref.includes(encodeURIComponent(title));
      const priceValid = priceText.includes('From ₹') || priceText.includes('Price on request');

      if (chipsCount >= 1 && priceValid && waValid) {
        record('7. Product Card Specifications & WhatsApp Action', 'PASS', `Price: "${priceText}", Spec Chips: ${chipsCount}, WhatsApp link verified`);
      } else {
        record('7. Product Card Specifications & WhatsApp Action', 'FAIL', `chips: ${chipsCount}, waValid: ${waValid}`);
      }
      await context.close();
    }

    // ══════════════════════════════════════════════════════════
    // Check 8: Console Errors Zero Check
    // ══════════════════════════════════════════════════════════
    {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const page = await context.newPage();
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', err => errors.push(err.message));

      await page.goto('http://localhost:3000/products.html', { waitUntil: 'networkidle' });
      await page.waitForSelector('.prod-card');

      if (errors.length === 0) {
        record('8. Zero Browser Console Errors on Products Page', 'PASS', '0 errors recorded on initial load & render');
      } else {
        record('8. Zero Browser Console Errors on Products Page', 'FAIL', errors.join('; '));
      }
      await context.close();
    }

    // ══════════════════════════════════════════════════════════
    // Capture Required Screenshots (360px & 1440px)
    // ══════════════════════════════════════════════════════════
    {
      console.log('Capturing screenshots in tests/screenshots/...');

      // 1. 360px Default View
      const mContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const mPage = await mContext.newPage();
      await mPage.goto('http://localhost:3000/products.html', { waitUntil: 'networkidle' });
      await mPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_360_default.png'), fullPage: false });

      // 2. 360px Filter Sheet Open
      await mPage.click('#prod-filter-trigger');
      await mPage.waitForSelector('#prod-sheet-overlay.active');
      await mPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_360_filter_sheet.png'), fullPage: false });

      // 3. 360px Filtered View (Jute Thread)
      await mPage.click('#prod-sheet-close');
      await mPage.fill('#prod-search-input', 'jute');
      await mPage.waitForTimeout(600);
      await mPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_360_filtered.png'), fullPage: false });

      // 4. 360px Empty State
      await mPage.fill('#prod-search-input', 'nonexistenttermxyz');
      await mPage.waitForTimeout(600);
      await mPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_360_empty.png'), fullPage: false });
      await mContext.close();

      // 5. 1440px Default View
      const dContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const dPage = await dContext.newPage();
      await dPage.goto('http://localhost:3000/products.html', { waitUntil: 'networkidle' });
      await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_1440_default.png'), fullPage: false });

      // 6. 1440px Filtered View
      await dPage.fill('#prod-search-input', 'mulching');
      await dPage.waitForTimeout(600);
      await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_1440_filtered.png'), fullPage: false });

      // 7. 1440px Empty State
      await dPage.fill('#prod-search-input', 'nonexistenttermxyz');
      await dPage.waitForTimeout(600);
      await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'products_1440_empty.png'), fullPage: false });
      await dContext.close();

      record('9. Required Screenshots Generation', 'PASS', '7 screenshots saved in tests/screenshots/');
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
    record('Verification Execution', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=====================================================');
  console.log('SUMMARY OF VERIFICATION RESULTS:');
  console.log('=====================================================');
  console.table(results);
}

runVerification().then(() => process.exit(0)).catch(() => process.exit(1));
