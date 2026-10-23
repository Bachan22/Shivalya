/**
 * js/main.js
 * Renders header, mobile overlay menu, footer, product cards, product detail, gallery, and forms.
 * All data is fetched from the backend API via api.js with robust fallback handling.
 */

// ── Fallback config (used if API is down) ─────────────────────
const FALLBACK_CFG = {
  company_name: 'Shivalya Agrotech Producer Company',
  phone: '+91 99503 37442',
  whatsapp_number: '919950337442',
  email: 'shivalyaagrotechproducercompany@gmail.com',
  gstin: '06ABCCS6046A1ZQ',
  address: '674, Sector 8, Ambala City, Ambala, Haryana, 134003',
  contact_person: 'Rahul Meena',
};

// Default products fallback list
const FALLBACK_PRODUCTS = [
  { name: 'Agricultural Mulching Film', slug: 'mulching-film', short_description: 'UV stabilized 20 to 50 micron mulch film for vegetable & fruit crops.', image_path: 'img/black-rolls.jpg' },
  { name: 'Jute Thread / Sutli', slug: 'jute-thread', short_description: '6, 7 and 8 ply natural jute thread for crop support, trellising & packaging.', image_path: 'img/jute-hanks.jpg' },
  { name: 'Agricultural Plastic Rolls', slug: 'agricultural-plastic-rolls', short_description: 'Heavy duty polyethylene rolls for farm covering and low tunnels.', image_path: 'img/silver-black-roll.jpg' },
  { name: 'Pre-Cut Mulch Sheets', slug: 'pre-cut-mulch-sheets', short_description: 'Ready-to-lay pre-punched mulch sheets for nurseries and bed planting.', image_path: 'img/kothari-sheet.jpg' },
  { name: 'Cotton & Yarn Cones', slug: 'yarn-cones', short_description: 'High tensile yarn cones for agricultural tying, stitching and weaving.', image_path: 'img/cones-stack.jpg' },
  { name: 'Custom & Industrial Films', slug: 'custom-films', short_description: 'Tailored width, GSM and micron plastic films for specific industrial applications.', image_path: 'img/sudarshan-big.jpg' }
];

let CFG = { ...FALLBACK_CFG };
let PRODUCTS = [...FALLBACK_PRODUCTS];
let PRODUCTS_LOADED = false;

const here = location.pathname.split('/').pop() || 'index.html';
const wa = t => `https://wa.me/${CFG.whatsapp_number}?text=${encodeURIComponent(t)}`;

// ── Official WhatsApp SVG Glyph (Green #25D366, White Glyph) ─
function waIcon(size = 20, className = '') {
  return `<svg class="wa-icon ${className}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#25D366"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4a8 8 0 0 0-6.89 12.06L4 20l4.06-1.07A8 8 0 1 0 12 4zm4.72 11.36c-.2.56-1.16 1.08-1.6 1.12-.42.04-.96.06-2.8-.68-2.35-.95-3.86-3.34-3.98-3.5-.12-.16-.94-1.25-.94-2.38 0-1.14.6-1.7.81-1.93.2-.24.45-.3.6-.3.16 0 .32 0 .46.01.15.01.35-.06.55.42.2.49.7 1.7.76 1.83.06.12.1.27.02.43-.08.16-.12.26-.24.4-.12.14-.25.32-.36.43-.12.12-.25.25-.11.49.14.24.62 1.02 1.33 1.65.91.81 1.68 1.06 1.92 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.14 1.14z" fill="#FFFFFF"/>
  </svg>`;
}

// ── Escape HTML for safe rendering ───────────────────────────
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Load settings from API ────────────────────────────────────
async function loadSettings() {
  try {
    const data = await api.getSettings();
    Object.assign(CFG, data);
  } catch {
    // Keep fallback
  }
}

// ── Load products from API ────────────────────────────────────
async function loadProducts() {
  try {
    const data = await api.getProducts();
    if (data && data.length) {
      PRODUCTS = data;
      PRODUCTS_LOADED = true;
    }
  } catch {
    // Keep fallback products
    PRODUCTS_LOADED = false;
  }
}

// ── Mobile Menu Controls ──────────────────────────────────────
function toggleMobileMenu(open) {
  const overlay = document.getElementById('mo-overlay');
  const burger = document.querySelector('.burger');
  const nv = document.getElementById('nv');
  
  const shouldOpen = typeof open === 'boolean' ? open : !overlay.classList.contains('active');
  
  if (shouldOpen) {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (burger) {
      burger.setAttribute('aria-expanded', 'true');
    }
    if (nv) {
      nv.classList.add('open'); // For test compatibility
    }
    document.body.classList.add('nav-open');
    
    // Focus first focusable item in overlay
    const firstFocusable = overlay.querySelector('button, [href], input');
    if (firstFocusable) firstFocusable.focus();
  } else {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.focus(); // Return focus to trigger button
    }
    if (nv) {
      nv.classList.remove('open');
    }
    document.body.classList.remove('nav-open');
  }
}

// Toggle mobile accordion (Only one open at a time)
function toggleAccordion(id) {
  const acc = document.getElementById(id);
  if (!acc) return;
  const wasOpen = acc.classList.contains('open');
  
  // Close all accordions in overlay
  document.querySelectorAll('.mo-accordion').forEach(el => {
    el.classList.remove('open');
    const btn = el.querySelector('.mo-acc-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const content = el.querySelector('.mo-acc-content');
    if (content) content.style.maxHeight = null;
  });
  
  // If wasn't open, open this one
  if (!wasOpen) {
    acc.classList.add('open');
    const btn = acc.querySelector('.mo-acc-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const content = acc.querySelector('.mo-acc-content');
    if (content) {
      content.style.maxHeight = (content.scrollHeight + 30) + 'px';
    }
  }
}

// ── Chrome (Header, Mobile Menu Overlay, Footer) ──────────────
function chrome() {
  const NAV = [
    ['Home', 'index.html'],
    ['About Us', 'about.html'],
    ['Products', 'products.html'],
    ['Industries', 'industries.html', [['Farmers', 'industries.html#farmers'], ['Nurseries', 'industries.html#nurseries'], ['Manufacturers', 'industries.html#manufacturers'], ['Textile & Yarn', 'industries.html#textile']]],
    ['Quality', 'quality.html'],
    ['Infrastructure', 'infrastructure.html'],
    ['Gallery', 'gallery.html'],
    ['Contact', 'contact.html'],
  ];

  // Desktop horizontal nav
  const desktopNav = NAV.map(([n, h, d]) =>
    `<div><a class="l ${h === here ? 'on' : ''}" href="${h}">${n}${d ? ' ▾' : ''}</a>${d ? `<div class="dd">${d.map(([a, b]) => `<a href="${b}">${a}</a>`).join('')}</div>` : ''}</div>`
  ).join('');

  // Mobile menu items strictly matching required order:
  // Home, About Us, Products, Industries, Quality, Infrastructure, Gallery, Contact
  const industriesSubLinks = [
    ['Farmers', 'industries.html#farmers'],
    ['Nurseries', 'industries.html#nurseries'],
    ['Manufacturers', 'industries.html#manufacturers'],
    ['Textile & Yarn', 'industries.html#textile']
  ].map(([name, url]) => `<a class="mo-sublink" href="${url}">${name}</a>`).join('');

  const mobileNavMarkup = `
    <div id="mo-overlay" class="mo-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
      <div class="mo-backdrop" onclick="toggleMobileMenu(false)"></div>
      <div class="mo-panel">
        <div class="mo-header">
          <a class="mo-logo" href="index.html" onclick="toggleMobileMenu(false)">
            <img src="img/logo.svg" alt="" width="36" height="36">
            <span><b>SHIVALYA</b><i>AGROTECH</i></span>
          </a>
          <button class="mo-close" onclick="toggleMobileMenu(false)" aria-label="Close menu">&times;</button>
        </div>
        <div class="mo-links">
          <!-- 1. Home -->
          <a class="mo-row ${here === 'index.html' ? 'on' : ''}" href="index.html" onclick="toggleMobileMenu(false)">
            <span>Home</span>
          </a>

          <!-- 2. About Us -->
          <a class="mo-row ${here === 'about.html' ? 'on' : ''}" href="about.html" onclick="toggleMobileMenu(false)">
            <span>About Us</span>
          </a>

          <!-- 3. Products (Plain direct link) -->
          <a class="mo-row ${here === 'products.html' ? 'on' : ''}" href="products.html" onclick="toggleMobileMenu(false)">
            <span>Products</span>
          </a>

          <!-- 4. Industries Accordion -->
          <div class="mo-accordion ${here === 'industries.html' ? 'on' : ''}" id="mo-acc-industries">
            <button class="mo-row mo-acc-trigger" type="button" onclick="toggleAccordion('mo-acc-industries')" aria-expanded="false" aria-controls="mo-ind-content">
              <span>Industries</span>
              <span class="chevron" aria-hidden="true">&#9662;</span>
            </button>
            <div class="mo-acc-content" id="mo-ind-content" onclick="toggleMobileMenu(false)">
              ${industriesSubLinks}
            </div>
          </div>

          <!-- 5. Quality -->
          <a class="mo-row ${here === 'quality.html' ? 'on' : ''}" href="quality.html" onclick="toggleMobileMenu(false)">
            <span>Quality</span>
          </a>

          <!-- 6. Infrastructure -->
          <a class="mo-row ${here === 'infrastructure.html' ? 'on' : ''}" href="infrastructure.html" onclick="toggleMobileMenu(false)">
            <span>Infrastructure</span>
          </a>

          <!-- 7. Gallery -->
          <a class="mo-row ${here === 'gallery.html' ? 'on' : ''}" href="gallery.html" onclick="toggleMobileMenu(false)">
            <span>Gallery</span>
          </a>

          <!-- 8. Contact -->
          <a class="mo-row ${here === 'contact.html' ? 'on' : ''}" href="contact.html" onclick="toggleMobileMenu(false)">
            <span>Contact</span>
          </a>
        </div>

        <!-- Bottom Quick Actions -->
        <div class="mo-footer">
          <a class="btn mo-quote-btn" target="_blank" rel="noopener" href="${wa('Hello Shivalya Agrotech, I want a quote.')}" onclick="toggleMobileMenu(false)">
            ${waIcon(20)}
            <span>Get Quote &rarr;</span>
          </a>
          <div class="mo-quick-actions">
            <a href="tel:${CFG.phone.replace(/\s+/g,'')}" class="mo-quick-action mo-call-btn">
              <span class="mo-icon">&#128222;</span>
              <span>Call</span>
            </a>
            <a href="mailto:${esc(CFG.email)}" class="mo-quick-action mo-mail-btn">
              <span class="mo-icon">&#9993;</span>
              <span>Email</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Header injection with compact mobile top bar & mobile menu overlay
  document.getElementById('hdr').innerHTML =
    `<div class="top">
      <div class="wrap">
        <div class="top-desktop">
          <span>📍 ${esc(CFG.address)}</span>
          <span>📞 <a href="tel:${CFG.phone.replace(/\s+/g,'')}">${esc(CFG.phone)}</a></span>
          <span>✉ <a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a></span>
          <span>GSTIN: ${esc(CFG.gstin)}</span>
          <a class="q" target="_blank" rel="noopener" href="${wa('Hello Shivalya Agrotech, I want a quote.')}">Get Quote &nbsp;→</a>
        </div>
        <div class="top-mobile">
          <a href="tel:${CFG.phone.replace(/\s+/g,'')}" class="top-tel">📞 ${esc(CFG.phone)} &bull; Tap to Call</a>
        </div>
      </div>
    </div>
    <header class="nav">
      <div class="wrap">
        <a class="logo" href="index.html">
          <img src="img/logo.svg" alt="" width="56" height="56">
          <div>
            <b>SHIVALYA</b>
            <i>AGROTECH PRODUCER COMPANY</i>
            <small>Quality Inputs &bull; Stronger Farmers &bull; Greener Tomorrow</small>
          </div>
        </a>
        <nav class="m" id="nv">${desktopNav}</nav>
        <form class="sr" action="products.html">
          <input name="q" placeholder="Search products..." aria-label="Search">
          <button type="submit" aria-label="Submit search">🔍</button>
        </form>
        <button class="burger" onclick="toggleMobileMenu()" aria-label="Open Navigation Menu" aria-expanded="false" aria-controls="mo-overlay">&#9776;</button>
      </div>
    </header>
    ${mobileNavMarkup}`;

  // Footer injection with stacked mobile layout & floating WhatsApp action pill
  document.getElementById('ftr').innerHTML =
    `<footer>
      <div class="wrap">
        <div class="fg">
          <div>
            <h3>${esc(CFG.company_name)}</h3>
            <p style="font-size:13px">Mulching films, jute thread, agricultural plastic rolls, yarn and custom solutions for farmers, manufacturers and businesses across India.</p>
            <p style="margin-top:10px;font-size:13px">GSTIN: ${esc(CFG.gstin)}</p>
          </div>
          <div>
            <h3>Company</h3>
            ${NAV.filter(n => !n[2]).map(([n, h]) => `<a href="${h}">${n}</a>`).join('')}
          </div>
          <div>
            <h3>Products</h3>
            ${PRODUCTS.map(p => `<a href="product.html?id=${p.slug}">${esc(p.name)}</a>`).join('')}
          </div>
          <div>
            <h3>Contact</h3>
            <p style="margin-bottom:8px;font-size:13px">${esc(CFG.address)}</p>
            <a href="tel:${CFG.phone.replace(/\s+/g,'')}">📞 ${esc(CFG.phone)} (${esc(CFG.contact_person)})</a>
            <a href="mailto:${esc(CFG.email)}">✉ ${esc(CFG.email)}</a>
          </div>
        </div>
        <div class="cp">&copy; ${new Date().getFullYear()} ${esc(CFG.company_name)} Limited. All rights reserved.</div>
      </div>
    </footer>
    <!-- Floating Action Pill -->
    <a class="wa wa-pill" href="${wa('Hello, I want a quote.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
      ${waIcon(24)}
      <span class="wa-pill-text">Chat on WhatsApp</span>
    </a>`;

  // Keyboard accessibility: Close mobile menu & lightbox on Escape key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('mo-overlay');
      if (overlay && overlay.classList.contains('active')) {
        toggleMobileMenu(false);
      }
      closeLightbox();
    }
  });
}

// ── Redesigned Product Card ───────────────────────────────────
function productCard(p, idx = 0) {
  const img = p.image_path || 'img/black-rolls.jpg';
  const cat = p.category_name || '';
  const isPop = p.is_featured;
  const isEager = idx < 2;
  const loadAttr = isEager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

  // Spec chips (2-3 compact items)
  const chips = (p.spec_chips && p.spec_chips.length) ? p.spec_chips : ['Custom sizes', 'Bulk supply'];
  const chipsHtml = chips.slice(0, 3).map(c => `<span class="pc-chip">${esc(c)}</span>`).join('');

  // Price line
  let priceHtml = '';
  if (p.min_price != null && !isNaN(p.min_price)) {
    const unitStr = p.price_unit ? ` / ${esc(p.price_unit.replace(/^per\s+/i, ''))}` : '';
    priceHtml = `<div class="pc-price">From ₹${Number(p.min_price).toLocaleString('en-IN')}${unitStr}</div>`;
  } else {
    priceHtml = `<div class="pc-price pc-price-req">Price on request</div>`;
  }

  // Matching variants line (if variant filters are active)
  let matchingVariantsHtml = '';
  if (p.matching_variants && p.matching_variants.length) {
    const lines = p.matching_variants.slice(0, 3).map(mv => `<div class="pc-mv-line">&bull; ${esc(mv.label)}</div>`).join('');
    const extraCount = (p.matching_variants_count || p.matching_variants.length) - p.matching_variants.length;
    const extraStr = extraCount > 0 ? `<div class="pc-mv-more">+${extraCount} more options</div>` : '';
    matchingVariantsHtml = `<div class="pc-matching-variants">${lines}${extraStr}</div>`;
  }

  const desc = p.short_description || p.description || '';
  const waQuoteMsg = `Hello Shivalya Agrotech, I want a quote for ${p.name}.`;
  const waUrl = wa(waQuoteMsg);

  return `
    <article class="prod-card" onclick="location.href='product.html?id=${p.slug}'" role="button" tabindex="0" onkeydown="if(event.key==='Enter')location.href='product.html?id=${p.slug}'">
      <div class="pc-img-wrap">
        <img class="pc-img" src="${img}" alt="${esc(p.name)}" width="360" height="270" ${loadAttr} decoding="async">
        <div class="pc-badges">
          ${cat ? `<span class="pc-cat-badge">${esc(cat)}</span>` : '<span></span>'}
          ${isPop ? `<span class="pc-pop-badge">★ Popular</span>` : ''}
        </div>
      </div>
      <div class="pc-body">
        <h3 class="pc-title">${esc(p.name)}</h3>
        <div class="pc-chips-row">${chipsHtml}</div>
        ${matchingVariantsHtml}
        ${priceHtml}
        ${desc ? `<p class="pc-desc">${esc(desc)}</p>` : ''}
        <div class="pc-actions">
          <a class="btn pc-btn-details" href="product.html?id=${p.slug}" onclick="event.stopPropagation()">
            View Details
          </a>
          <a class="pc-wa-btn" href="${waUrl}" target="_blank" rel="noopener" aria-label="Get Quote on WhatsApp for ${esc(p.name)}" onclick="event.stopPropagation()">
            ${waIcon(22)}
          </a>
        </div>
      </div>
    </article>
  `;
}

// ── Variant table rendering ───────────────────────────────────
function variantTable(product) {
  if (!product.variants || !product.variants.length) {
    return '<p>Sizes, GSM and micron available as per requirement. Send an enquiry for the latest price.</p>';
  }

  const v = product.variants;
  const slug = product.slug;

  // Mulching Film format
  if (slug === 'mulching-film') {
    let html = '<div class="tw"><table><tr><th>Thickness</th><th>Length</th><th>Width</th><th>Weight</th><th>Price / roll</th></tr>';
    v.forEach(r => {
      html += `<tr><td>${r.thickness_micron ? parseFloat(r.thickness_micron) + ' micron' : '-'}</td><td>${r.length_m ? parseFloat(r.length_m) + ' m' : '-'}</td><td>${r.width_ft ? parseFloat(r.width_ft) + ' ft' : '-'}</td><td>${r.weight_kg ? parseFloat(r.weight_kg) + ' kg' : '-'}</td><td>${r.price ? '₹' + Number(r.price).toLocaleString('en-IN') : 'Contact'}</td></tr>`;
    });
    html += '</table></div>';
    return html;
  }

  // Jute Thread format
  if (slug === 'jute-thread') {
    let html = '<div class="tw"><table><tr><th>Type</th><th>Price per kg</th></tr>';
    v.forEach(r => {
      html += `<tr><td>${esc(r.label)}</td><td>${r.price ? '₹' + Number(r.price).toLocaleString('en-IN') + ' / kg' : 'Contact'}</td></tr>`;
    });
    html += '</table></div>';
    return html;
  }

  // Generic variant table
  let html = '<div class="tw"><table><tr><th>Variant</th><th>Price</th></tr>';
  v.forEach(r => {
    html += `<tr><td>${esc(r.label)}</td><td>${r.price ? '₹' + Number(r.price).toLocaleString('en-IN') + (r.price_unit ? ' ' + r.price_unit : '') : 'Contact for price'}</td></tr>`;
  });
  html += '</table></div>';
  return html;
}

// ── Quick Quote form ──────────────────────────────────────────
function quoteForm(el, prefillProduct, prefillVariant) {
  const options = PRODUCTS.map(p =>
    `<option value="${esc(p.name)}" ${prefillProduct === p.name ? 'selected' : ''}>${esc(p.name)}</option>`
  ).join('');

  el.innerHTML =
    `<h3>Get a Quick Quote</h3><small>Share your requirement and we will get back to you promptly.</small>
    <div class="f">
      <select id="qp" aria-label="Product Name"><option value="">Select Product</option>${options}</select>
      <input id="qs" placeholder="Size / Specification" value="${esc(prefillVariant || '')}" aria-label="Specification">
      <input id="qq" placeholder="Quantity (Kg / Rolls)" aria-label="Quantity">
      <input id="qn" placeholder="Your Name" autocomplete="name" aria-label="Your Name">
    </div>
    <input id="qh" type="tel" inputmode="tel" autocomplete="tel" placeholder="Your 10-Digit Phone Number" style="margin-bottom:8px" aria-label="Phone Number">
    <input id="qw" type="text" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div id="qerr" style="color:#c00;font-size:12px;margin-bottom:8px"></div>
    <div id="qsuc" style="display:none"></div>
    <button class="btn" type="button" id="qbtn" onclick="sendEnq()">
      ${waIcon(18)}
      <span>Send Enquiry &rarr;</span>
    </button>`;
}

// ── Lightbox Viewer for Gallery ──────────────────────────────
function openLightbox(src, caption) {
  let modal = document.getElementById('lb-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lb-modal';
    modal.className = 'lb-modal';
    modal.innerHTML = `
      <div class="lb-backdrop" onclick="closeLightbox()"></div>
      <div class="lb-box" onclick="closeLightbox()">
        <button class="lb-close" onclick="closeLightbox()" aria-label="Close image viewer">&times;</button>
        <img id="lb-img" src="" alt="Gallery Preview">
        <div id="lb-cap" class="lb-cap"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('lb-img').src = src;
  document.getElementById('lb-cap').textContent = caption || '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lb-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
}

// ── Send enquiry (Immediate WhatsApp launch + background API sync) ──
function sendEnq() {
  const v = i => (document.getElementById(i) || {}).value || '';
  const errEl = document.getElementById('qerr');
  const sucEl = document.getElementById('qsuc');
  const btn = document.getElementById('qbtn');

  errEl.textContent = '';
  sucEl.style.display = 'none';

  // Basic validation check
  const phoneVal = v('qh').trim().replace(/[\s\-\+]/g, '');
  if (!phoneVal || phoneVal.length < 10) {
    errEl.textContent = 'Please enter a valid 10-digit phone number.';
    return;
  }

  // Construct prefilled WhatsApp text
  const waMsg = `Hello Shivalya Agrotech,\nI want a quote.\nProduct: ${v('qp') || 'Agricultural Products'}\nSpecification: ${v('qs') || 'Standard'}\nQuantity: ${v('qq') || 'Bulk requirement'}\nName: ${v('qn') || 'Customer'}\nPhone: ${v('qh')}`;
  const directWaUrl = `https://wa.me/${CFG.whatsapp_number}?text=${encodeURIComponent(waMsg)}`;

  // Save to backend API non-blockingly in background (never blocks user or shows raw error)
  api.submitQuote({
    product_name: v('qp'),
    specification: v('qs'),
    quantity: v('qq'),
    name: v('qn'),
    phone: v('qh'),
    source_page: here,
    website: v('qw'), // Honeypot
  }).catch(() => {
    // API down or error: silently handled so user is never blocked
  });

  // Open WhatsApp directly
  window.open(directWaUrl, '_blank', 'noopener,noreferrer');

  // Confirmation message with direct WhatsApp link fallback
  sucEl.innerHTML =
    `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:14px;margin-bottom:10px">
      <b style="color:#2e7d32">&#10004; Connecting to WhatsApp...</b><br>
      <span style="font-size:13px">Your enquiry details have been prepared. If WhatsApp did not open automatically, tap below:</span><br>
      <a class="btn" href="${directWaUrl}" target="_blank" rel="noopener" style="margin-top:10px;font-size:13px;padding:10px 20px">
        ${waIcon(18)}
        <span>Continue on WhatsApp &rarr;</span>
      </a>
    </div>`;
  sucEl.style.display = 'block';
  btn.style.display = 'none';
}

// ── Contact form ──────────────────────────────────────────────
function contactForm(el) {
  el.innerHTML =
    `<h3>Send us a Message</h3><small>We will get back to you shortly.</small>
    <div class="f">
      <input id="cn" placeholder="Your Name" autocomplete="name" aria-label="Your Name">
      <input id="cp" type="tel" inputmode="tel" autocomplete="tel" placeholder="Your Phone Number" aria-label="Phone Number">
    </div>
    <input id="ce" type="email" inputmode="email" autocomplete="email" placeholder="Your Email (optional)" style="margin-bottom:8px" aria-label="Email Address">
    <input id="cs" placeholder="Subject" style="margin-bottom:8px" aria-label="Subject">
    <textarea id="cm" placeholder="Your Message" aria-label="Message"></textarea>
    <input id="cw" type="text" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div id="cerr" style="color:#c00;font-size:12px;margin-bottom:8px"></div>
    <div id="csuc" style="display:none"></div>
    <button class="btn" type="button" id="cbtn" onclick="sendContact()" style="margin-top:8px;width:100%;justify-content:center;border-radius:6px">
      ${waIcon(18)}
      <span>Send Message &rarr;</span>
    </button>`;
}

function sendContact() {
  const v = i => (document.getElementById(i) || {}).value || '';
  const errEl = document.getElementById('cerr');
  const sucEl = document.getElementById('csuc');
  const btn = document.getElementById('cbtn');

  errEl.textContent = '';
  sucEl.style.display = 'none';

  const nameVal = v('cn').trim();
  const phoneVal = v('cp').trim().replace(/[\s\-\+]/g, '');
  if (!nameVal) {
    errEl.textContent = 'Please enter your name.';
    return;
  }
  if (!phoneVal || phoneVal.length < 10) {
    errEl.textContent = 'Please enter a valid 10-digit phone number.';
    return;
  }

  // Construct prefilled WhatsApp message
  const waMsg = `Hello Shivalya Agrotech,\nMessage from: ${v('cn')}\nPhone: ${v('cp')}\nEmail: ${v('ce')}\nSubject: ${v('cs') || 'General Enquiry'}\nMessage: ${v('cm') || 'Hello, I want information about your products.'}`;
  const directWaUrl = `https://wa.me/${CFG.whatsapp_number}?text=${encodeURIComponent(waMsg)}`;

  // Save in background non-blockingly
  api.submitContact({
    name: v('cn'),
    phone: v('cp'),
    email: v('ce'),
    subject: v('cs'),
    message: v('cm'),
    website: v('cw'),
  }).catch(() => {});

  // Open WhatsApp directly
  window.open(directWaUrl, '_blank', 'noopener,noreferrer');

  // Confirmation message
  sucEl.innerHTML =
    `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:14px;margin-bottom:10px">
      <b style="color:#2e7d32">&#10004; Connecting to WhatsApp...</b><br>
      <span style="font-size:13px">Your message has been prepared. If WhatsApp did not open automatically, tap below:</span><br>
      <a class="btn" href="${directWaUrl}" target="_blank" rel="noopener" style="margin-top:10px;font-size:13px;padding:10px 20px">
        ${waIcon(18)}
        <span>Continue on WhatsApp &rarr;</span>
      </a>
    </div>`;
  sucEl.style.display = 'block';
  btn.style.display = 'none';
}

// ── Error state with retry ────────────────────────────────────
function showError(el, msg) {
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--mu)">
    <p>${msg}</p>
    <p style="margin-top:10px">
      📞 <a href="tel:+919950337442">${FALLBACK_CFG.phone}</a> &nbsp;
      ${waIcon(16)} <a href="${wa('Hello')}" target="_blank" rel="noopener">WhatsApp</a>
    </p>
    <button class="btn" onclick="location.reload()" style="margin-top:14px">&#8635; Retry</button>
  </div>`;
}

// ── Scroll Reveal via IntersectionObserver ───────────────────
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const targets = document.querySelectorAll('section.s, .badges, .strip, .about3, .card');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

  targets.forEach((el, index) => {
    el.classList.add('reveal-init');
    if (el.classList.contains('card')) {
      const delay = (index % 6) * 50;
      el.style.transitionDelay = `${delay}ms`;
    }
    observer.observe(el);
  });
}

// ══════════════════════════════════════════════════════════════
//  DYNAMIC PRODUCTS PAGE & FACETED FILTER ENGINE
// ══════════════════════════════════════════════════════════════

// Skeleton loading cards generator
function renderSkeletonCards(count = 6) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card" aria-hidden="true">
        <div class="sk-img"></div>
        <div class="sk-body">
          <div class="sk-line w-80"></div>
          <div class="sk-line w-50"></div>
          <div class="sk-line w-30"></div>
        </div>
      </div>
    `;
  }
  return html;
}

// Fallback attribute definitions & variants for offline mode
const FALLBACK_ATTR_DEFS = [
  { attr_key: 'thickness_micron', label: 'Thickness', unit: 'micron', type: 'discrete' },
  { attr_key: 'width_ft', label: 'Width', unit: 'ft', type: 'discrete' },
  { attr_key: 'length_m', label: 'Length', unit: 'm', type: 'discrete' },
  { attr_key: 'weight_kg', label: 'Weight', unit: 'kg', type: 'range' },
  { attr_key: 'ply', label: 'Ply', unit: 'ply', type: 'discrete' },
  { attr_key: 'price', label: 'Price', unit: '₹', type: 'range' },
];

const FALLBACK_VARIANTS = [
  { product_id: 1, label: '20 micron, 3.25 ft wide, 7 kg', thickness_micron: '20', length_m: '400', width_ft: '3.25', weight_kg: '7.00', ply: null, price: 750, price_unit: 'per roll' },
  { product_id: 1, label: '20 micron, 4 ft wide, 7.5 kg', thickness_micron: '20', length_m: '400', width_ft: '4.00', weight_kg: '7.50', ply: null, price: 900, price_unit: 'per roll' },
  { product_id: 1, label: '25 micron, 3.25 ft wide, 8.5 kg', thickness_micron: '25', length_m: '400', width_ft: '3.25', weight_kg: '8.50', ply: null, price: 1050, price_unit: 'per roll' },
  { product_id: 1, label: '25 micron, 4 ft wide, 9.5 kg', thickness_micron: '25', length_m: '400', width_ft: '4.00', weight_kg: '9.50', ply: null, price: 1250, price_unit: 'per roll' },
  { product_id: 1, label: '30 micron, 4 ft wide, 10.5 kg', thickness_micron: '30', length_m: '400', width_ft: '4.00', weight_kg: '10.50', ply: null, price: 1550, price_unit: 'per roll' },
  { product_id: 2, label: '6 Ply', thickness_micron: null, length_m: null, width_ft: null, weight_kg: null, ply: 6, price: 130, price_unit: 'per kg' },
  { product_id: 2, label: '7 Ply', thickness_micron: null, length_m: null, width_ft: null, weight_kg: null, ply: 7, price: 140, price_unit: 'per kg' },
  { product_id: 2, label: '8 Ply', thickness_micron: null, length_m: null, width_ft: null, weight_kg: null, ply: 8, price: 150, price_unit: 'per kg' },
];

function clientFilterProducts(state) {
  const prods = PRODUCTS.map((p, idx) => {
    const id = p.id || (idx + 1);
    const variants = FALLBACK_VARIANTS.filter(v => v.product_id === id);
    const validPrices = variants.map(v => v.price).filter(pr => pr !== null && !isNaN(pr));
    const min_price = validPrices.length ? Math.min(...validPrices) : null;
    const max_price = validPrices.length ? Math.max(...validPrices) : null;
    let spec_chips = ['Custom sizes'];
    if (id === 1 || p.slug === 'mulching-film') spec_chips = ['20-30 micron', '3.25-4 ft', '400 m'];
    else if (id === 2 || p.slug === 'jute-thread') spec_chips = ['6, 7, 8 ply'];
    const catSlug = (id === 2 || p.slug === 'jute-thread') ? 'jute-products' : ((id === 5 || p.slug === 'yarn-cones') ? 'yarn-textile' : 'agricultural-films');
    const catName = (id === 2 || p.slug === 'jute-thread') ? 'Jute Products' : ((id === 5 || p.slug === 'yarn-cones') ? 'Yarn & Textile' : 'Agricultural Films');
    return {
      ...p,
      id,
      category_slug: catSlug,
      category_name: catName,
      min_price,
      max_price,
      price_unit: (id === 2 || p.slug === 'jute-thread') ? 'per kg' : 'per roll',
      spec_chips,
      variants,
    };
  });

  return prods.filter(p => {
    if (state.category && state.category.length) {
      if (!state.category.includes(p.category_slug)) return false;
    }
    if (state.q) {
      const q = state.q.toLowerCase();
      const match = (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.short_description && p.short_description.toLowerCase().includes(q)) ||
                    (p.category_name && p.category_name.toLowerCase().includes(q)) ||
                    p.variants.some(v => v.label && v.label.toLowerCase().includes(q));
      if (!match) return false;
    }
    const hasAttr = Object.keys(state.attr || {}).length > 0;
    const hasPrice = state.min_price !== null || state.max_price !== null;
    if (hasAttr || hasPrice) {
      if (!p.variants.length) return false;
      const matched = p.variants.filter(v => {
        if (state.min_price !== null && v.price < state.min_price) return false;
        if (state.max_price !== null && v.price > state.max_price) return false;
        for (const [ak, avals] of Object.entries(state.attr)) {
          const vVal = v[ak];
          if (vVal === null || vVal === undefined) return false;
          const ok = avals.some(av => String(av) === String(vVal));
          if (!ok) return false;
        }
        return true;
      });
      if (!matched.length) return false;
      p.matching_variants = matched.slice(0, 3).map(v => ({ id: v.id, label: v.label, price: v.price }));
      p.matching_variants_count = matched.length;
    } else {
      p.matching_variants = null;
    }
    return true;
  });
}

function clientGenerateFacets(state, filteredProds) {
  const currentProductIds = new Set(filteredProds.map(p => p.id));
  const activeVariants = FALLBACK_VARIANTS.filter(v => currentProductIds.has(v.product_id));

  // Categories facet
  const catCounts = {
    'agricultural-films': 0,
    'jute-products': 0,
    'yarn-textile': 0,
  };
  PRODUCTS.forEach((p, idx) => {
    const id = p.id || (idx + 1);
    const catSlug = (id === 2 || p.slug === 'jute-thread') ? 'jute-products' : ((id === 5 || p.slug === 'yarn-cones') ? 'yarn-textile' : 'agricultural-films');
    if (catCounts[catSlug] !== undefined) catCounts[catSlug]++;
  });

  const categories = [
    { slug: 'agricultural-films', name: 'Agricultural Films', count: catCounts['agricultural-films'], active: state.category.includes('agricultural-films') },
    { slug: 'jute-products', name: 'Jute Products', count: catCounts['jute-products'], active: state.category.includes('jute-products') },
    { slug: 'yarn-textile', name: 'Yarn & Textile', count: catCounts['yarn-textile'], active: state.category.includes('yarn-textile') },
  ].filter(c => c.count > 0 || c.active);

  // Attributes
  const attributes = [];
  FALLBACK_ATTR_DEFS.forEach(def => {
    const valsInResults = activeVariants.map(v => v[def.attr_key]).filter(v => v !== null && v !== undefined && v !== '');
    const isSelected = !!(state.attr && state.attr[def.attr_key]) || (def.attr_key === 'price' && (state.min_price !== null || state.max_price !== null));
    if (!valsInResults.length && !isSelected) return;

    if (def.type === 'range') {
      const nums = valsInResults.map(Number).filter(n => !isNaN(n));
      if (nums.length) {
        attributes.push({
          key: def.attr_key,
          label: def.label,
          unit: def.unit,
          type: 'range',
          min: Math.floor(Math.min(...nums)),
          max: Math.ceil(Math.max(...nums)),
        });
      }
    } else {
      const counts = {};
      const activeVals = (state.attr && state.attr[def.attr_key]) || [];
      activeVariants.forEach(v => {
        const val = v[def.attr_key];
        if (val !== null && val !== undefined && val !== '') {
          const sVal = String(val);
          counts[sVal] = (counts[sVal] || 0) + 1;
        }
      });
      const options = Object.keys(counts).sort((a, b) => Number(a) - Number(b)).map(val => ({
        value: val,
        count: counts[val],
        active: activeVals.some(av => String(av) === String(val)),
        disabled: counts[val] === 0,
      }));
      if (options.length) {
        attributes.push({
          key: def.attr_key,
          label: def.label,
          unit: def.unit,
          type: 'discrete',
          options,
        });
      }
    }
  });

  return { categories, attributes, total: filteredProds.length };
}

// ── Products Page Controller ──────────────────────────────────
function initProductsPage() {
  const state = {
    q: '',
    category: [],
    attr: {},
    min_price: null,
    max_price: null,
    sort: 'relevance',
  };

  // Parse state from URL
  function readStateFromUrl() {
    const sp = new URLSearchParams(location.search);
    state.q = sp.get('q') || '';
    state.category = [];
    state.attr = {};
    state.min_price = sp.get('min_price') ? parseFloat(sp.get('min_price')) : null;
    state.max_price = sp.get('max_price') ? parseFloat(sp.get('max_price')) : null;
    state.sort = sp.get('sort') || 'relevance';

    sp.getAll('category').forEach(c => {
      c.split(',').map(s => s.trim()).filter(Boolean).forEach(cat => {
        if (!state.category.includes(cat)) state.category.push(cat);
      });
    });

    for (const [k, v] of sp.entries()) {
      let attrKey = null;
      if (k.startsWith('attr[') && k.endsWith(']')) {
        attrKey = k.slice(5, -1);
      } else if (k.startsWith('attr_')) {
        attrKey = k.slice(5);
      }
      if (attrKey) {
        if (!state.attr[attrKey]) state.attr[attrKey] = [];
        v.split(',').map(s => s.trim()).filter(Boolean).forEach(val => {
          if (!state.attr[attrKey].includes(val)) state.attr[attrKey].push(val);
        });
      }
    }
  }

  // Sync state to URL
  function writeStateToUrl(replace = false) {
    const sp = new URLSearchParams();
    if (state.q) sp.set('q', state.q);
    if (state.category.length) state.category.forEach(c => sp.append('category', c));
    if (state.attr) {
      for (const [k, arr] of Object.entries(state.attr)) {
        if (arr && arr.length) arr.forEach(val => sp.append(`attr[${k}]`, val));
      }
    }
    if (state.min_price !== null && !isNaN(state.min_price)) sp.set('min_price', state.min_price);
    if (state.max_price !== null && !isNaN(state.max_price)) sp.set('max_price', state.max_price);
    if (state.sort && state.sort !== 'relevance') sp.set('sort', state.sort);

    const qs = sp.toString();
    const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
    if (replace) {
      history.replaceState(null, '', newUrl);
    } else {
      history.pushState(null, '', newUrl);
    }
  }

  // DOM Elements
  const searchInput = document.getElementById('prod-search-input');
  const searchClear = document.getElementById('prod-search-clear');
  const sortSelect = document.getElementById('prod-sort-select');
  const filterTrigger = document.getElementById('prod-filter-trigger');
  const filterBadge = document.getElementById('prod-filter-badge');
  const sheetOverlay = document.getElementById('prod-sheet-overlay');
  const sheetBackdrop = document.getElementById('prod-sheet-backdrop');
  const sheetClose = document.getElementById('prod-sheet-close');
  const sheetClear = document.getElementById('prod-sheet-clear');
  const sheetApply = document.getElementById('prod-sheet-apply');
  const sidebarReset = document.getElementById('prod-sidebar-reset');
  const clearAllBtn = document.getElementById('pac-clear-all');
  const emptyClearBtn = document.getElementById('pes-clear-btn');

  // Count active filters for badge
  function updateFilterBadge() {
    let count = 0;
    if (state.category.length) count += state.category.length;
    if (state.attr) {
      for (const arr of Object.values(state.attr)) {
        if (arr && arr.length) count += arr.length;
      }
    }
    if (state.min_price !== null || state.max_price !== null) count += 1;

    if (filterBadge) {
      if (count > 0) {
        filterBadge.textContent = count;
        filterBadge.style.display = 'inline-grid';
      } else {
        filterBadge.style.display = 'none';
      }
    }
  }

  // Render active chips row
  function renderActiveChips() {
    const wrap = document.getElementById('prod-active-chips');
    const list = document.getElementById('pac-chips-list');
    if (!wrap || !list) return;

    const chips = [];

    if (state.q) {
      chips.push({
        label: `"${state.q}"`,
        onRemove: () => {
          state.q = '';
          if (searchInput) searchInput.value = '';
          if (searchClear) searchClear.style.display = 'none';
        }
      });
    }

    if (state.category && state.category.length) {
      state.category.forEach(cat => {
        chips.push({
          label: `Category: ${cat.replace(/-/g, ' ')}`,
          onRemove: () => {
            state.category = state.category.filter(c => c !== cat);
          }
        });
      });
    }

    if (state.attr) {
      for (const [ak, avals] of Object.entries(state.attr)) {
        if (avals && avals.length) {
          avals.forEach(val => {
            chips.push({
              label: `${ak.replace(/_/g, ' ')}: ${val}`,
              onRemove: () => {
                state.attr[ak] = state.attr[ak].filter(v => v !== val);
                if (!state.attr[ak].length) delete state.attr[ak];
              }
            });
          });
        }
      }
    }

    if (state.min_price !== null || state.max_price !== null) {
      const pLabel = `Price: ₹${state.min_price || 0} - ₹${state.max_price || 'max'}`;
      chips.push({
        label: pLabel,
        onRemove: () => {
          state.min_price = null;
          state.max_price = null;
        }
      });
    }

    if (!chips.length) {
      wrap.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    wrap.style.display = 'flex';
    list.innerHTML = chips.map((c, idx) => `
      <span class="pac-chip">
        <span>${esc(c.label)}</span>
        <button type="button" class="pac-chip-remove" data-chip-idx="${idx}" aria-label="Remove filter">&times;</button>
      </span>
    `).join('');

    list.querySelectorAll('.pac-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-chip-idx'), 10);
        if (chips[idx] && chips[idx].onRemove) {
          chips[idx].onRemove();
          writeStateToUrl();
          loadAndRender();
        }
      });
    });
  }

  // Render Facets HTML into containers
  function renderFacets(facets) {
    const sidebarContainer = document.getElementById('prod-sidebar-filters');
    const sheetContainer = document.getElementById('prod-sheet-filters');
    if (!facets) return;

    let html = '';

    // 1. Category Facet
    if (facets.categories && facets.categories.length) {
      html += `
        <div class="pfg-group">
          <div class="pfg-title">Category</div>
          <div class="pfg-options-list">
            ${facets.categories.map(c => `
              <label class="pfg-option ${c.count === 0 && !c.active ? 'disabled' : ''}">
                <span class="pfg-option-left">
                  <input type="checkbox" data-facet="category" value="${esc(c.slug)}" ${c.active ? 'checked' : ''} ${c.count === 0 && !c.active ? 'disabled' : ''}>
                  <span>${esc(c.name)}</span>
                </span>
                <span class="pfg-count">${c.count}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. Dynamic Attribute Facets
    if (facets.attributes && facets.attributes.length) {
      facets.attributes.forEach(attr => {
        if (attr.type === 'range') {
          const curMin = (attr.key === 'price' ? state.min_price : null) || '';
          const curMax = (attr.key === 'price' ? state.max_price : null) || '';
          html += `
            <div class="pfg-group" data-attr-key="${esc(attr.key)}">
              <div class="pfg-title">
                <span>${esc(attr.label)}</span>
                ${attr.unit ? `<small>(${esc(attr.unit)})</small>` : ''}
              </div>
              <div class="pfg-range-box">
                <div class="pfg-range-inputs">
                  <input type="number" class="pfg-min-input" data-facet="range-min" data-key="${esc(attr.key)}" placeholder="Min ${attr.min != null ? attr.min : ''}" value="${curMin}">
                  <span>to</span>
                  <input type="number" class="pfg-max-input" data-facet="range-max" data-key="${esc(attr.key)}" placeholder="Max ${attr.max != null ? attr.max : ''}" value="${curMax}">
                </div>
              </div>
            </div>
          `;
        } else if (attr.type === 'discrete' && attr.options && attr.options.length) {
          html += `
            <div class="pfg-group" data-attr-key="${esc(attr.key)}">
              <div class="pfg-title">
                <span>${esc(attr.label)}</span>
                ${attr.unit ? `<small>(${esc(attr.unit)})</small>` : ''}
              </div>
              <div class="pfg-options-list">
                ${attr.options.map(opt => `
                  <label class="pfg-option ${opt.disabled && !opt.active ? 'disabled' : ''}">
                    <span class="pfg-option-left">
                      <input type="checkbox" data-facet="attr" data-key="${esc(attr.key)}" value="${esc(opt.value)}" ${opt.active ? 'checked' : ''} ${opt.disabled && !opt.active ? 'disabled' : ''}>
                      <span>${esc(opt.value)} ${attr.unit ? esc(attr.unit) : ''}</span>
                    </span>
                    <span class="pfg-count">${opt.count}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }
      });
    }

    if (sidebarContainer) sidebarContainer.innerHTML = html;
    if (sheetContainer) sheetContainer.innerHTML = html;

    // Attach facet change listeners to both containers
    [sidebarContainer, sheetContainer].forEach(container => {
      if (!container) return;
      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const facetType = cb.getAttribute('data-facet');
          const val = cb.value;
          if (facetType === 'category') {
            if (cb.checked) {
              if (!state.category.includes(val)) state.category.push(val);
            } else {
              state.category = state.category.filter(c => c !== val);
            }
          } else if (facetType === 'attr') {
            const attrKey = cb.getAttribute('data-key');
            if (!state.attr[attrKey]) state.attr[attrKey] = [];
            if (cb.checked) {
              if (!state.attr[attrKey].includes(val)) state.attr[attrKey].push(val);
            } else {
              state.attr[attrKey] = state.attr[attrKey].filter(v => v !== val);
              if (!state.attr[attrKey].length) delete state.attr[attrKey];
            }
          }
          writeStateToUrl();
          loadAndRender();
        });
      });

      // Price range input listeners
      container.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('change', () => {
          const facetType = inp.getAttribute('data-facet');
          const val = inp.value ? parseFloat(inp.value) : null;
          if (facetType === 'range-min') {
            state.min_price = val;
          } else if (facetType === 'range-max') {
            state.max_price = val;
          }
          writeStateToUrl();
          loadAndRender();
        });
      });
    });
  }

  // Clear all filters action
  function clearAll() {
    state.q = '';
    state.category = [];
    state.attr = {};
    state.min_price = null;
    state.max_price = null;
    state.sort = 'relevance';

    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';
    if (sortSelect) sortSelect.value = 'relevance';

    writeStateToUrl();
    loadAndRender();
  }

  // Bottom sheet toggle
  function toggleSheet(open) {
    if (!sheetOverlay) return;
    const shouldOpen = typeof open === 'boolean' ? open : !sheetOverlay.classList.contains('active');
    if (shouldOpen) {
      sheetOverlay.classList.add('active');
      sheetOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('filter-sheet-open');
      if (filterTrigger) filterTrigger.setAttribute('aria-expanded', 'true');
      const firstInput = sheetOverlay.querySelector('input, button');
      if (firstInput) firstInput.focus();
    } else {
      sheetOverlay.classList.remove('active');
      sheetOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('filter-sheet-open');
      if (filterTrigger) {
        filterTrigger.setAttribute('aria-expanded', 'false');
        filterTrigger.focus();
      }
    }
  }

  // Main fetch and render coordinator
  async function loadAndRender() {
    const plist = document.getElementById('plist');
    const emptyEl = document.getElementById('prod-empty-state');
    const countBadge = document.getElementById('prod-count-badge');
    const sheetCount = document.getElementById('prod-sheet-count');

    if (plist) plist.innerHTML = renderSkeletonCards(6);
    if (emptyEl) emptyEl.style.display = 'none';

    let products = [];
    let facets = null;
    let total = 0;

    try {
      const [pData, fData] = await Promise.all([
        api.getProducts(state),
        api.getFacets(state),
      ]);
      products = pData;
      facets = fData;
      total = (facets && typeof facets.total === 'number') ? facets.total : products.length;
    } catch {
      products = clientFilterProducts(state);
      total = products.length;
      facets = clientGenerateFacets(state, products);
    }

    if (countBadge) {
      countBadge.textContent = `${total} ${total === 1 ? 'product' : 'products'}`;
    }
    if (sheetCount) {
      sheetCount.textContent = total;
    }

    if (!products.length) {
      if (plist) plist.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (plist) {
        plist.innerHTML = products.map((p, idx) => productCard(p, idx)).join('');
        if (typeof initScrollReveal === 'function') initScrollReveal();
      }
    }

    renderFacets(facets);
    renderActiveChips();
    updateFilterBadge();
  }

  // Setup UI listeners
  if (searchInput) {
    searchInput.value = state.q;
    if (searchClear) searchClear.style.display = state.q ? 'block' : 'none';

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const val = searchInput.value.trim();
      if (searchClear) searchClear.style.display = val ? 'block' : 'none';
      debounceTimer = setTimeout(() => {
        state.q = val;
        writeStateToUrl();
        loadAndRender();
      }, 250);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClear.style.display = 'none';
      state.q = '';
      writeStateToUrl();
      loadAndRender();
    });
  }

  if (sortSelect) {
    sortSelect.value = state.sort;
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      writeStateToUrl();
      loadAndRender();
    });
  }

  if (filterTrigger) {
    filterTrigger.addEventListener('click', () => toggleSheet(true));
  }
  if (sheetBackdrop) {
    sheetBackdrop.addEventListener('click', () => toggleSheet(false));
  }
  if (sheetClose) {
    sheetClose.addEventListener('click', () => toggleSheet(false));
  }
  if (sheetApply) {
    sheetApply.addEventListener('click', () => toggleSheet(false));
  }
  if (sheetClear) {
    sheetClear.addEventListener('click', () => clearAll());
  }
  if (sidebarReset) {
    sidebarReset.addEventListener('click', () => clearAll());
  }
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => clearAll());
  }
  if (emptyClearBtn) {
    emptyClearBtn.addEventListener('click', () => clearAll());
  }

  // Escape key closes sheet
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheetOverlay && sheetOverlay.classList.contains('active')) {
      toggleSheet(false);
    }
  });

  // Browser back / forward buttons
  window.addEventListener('popstate', () => {
    readStateFromUrl();
    if (searchInput) searchInput.value = state.q;
    if (searchClear) searchClear.style.display = state.q ? 'block' : 'none';
    if (sortSelect) sortSelect.value = state.sort;
    loadAndRender();
  });

  // Initial load
  readStateFromUrl();
  if (searchInput) searchInput.value = state.q;
  if (searchClear) searchClear.style.display = state.q ? 'block' : 'none';
  if (sortSelect) sortSelect.value = state.sort;
  loadAndRender();
}

document.addEventListener('DOMContentLoaded', async () => {
  const isProductsPage = !!document.getElementById('prod-toolbar');
  if (isProductsPage) {
    await loadSettings();
    chrome();
    initProductsPage();
  } else {
    // Load settings and products in parallel
    await Promise.all([loadSettings(), loadProducts()]);
    chrome();
  }

  // Initialize Quick Quote form
  const qf = document.getElementById('qf');
  if (qf) quoteForm(qf);

  // Initialize Contact form
  const cf = document.getElementById('cform');
  if (cf) contactForm(cf);

  // Homepage listing (if not products page)
  if (!isProductsPage) {
    const pl = document.getElementById('plist');
    if (pl) {
      const searchQ = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
      if (searchQ) {
        try {
          const data = await api.getProducts(searchQ);
          pl.innerHTML = data.length ? data.map((p, idx) => productCard(p, idx)).join('') : '<p>No product found matching your search. Try another word.</p>';
        } catch {
          const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQ) || p.short_description.toLowerCase().includes(searchQ));
          pl.innerHTML = filtered.length ? filtered.map((p, idx) => productCard(p, idx)).join('') : '<p>No product found matching your search.</p>';
        }
      } else {
        pl.innerHTML = PRODUCTS.length ? PRODUCTS.slice(0, 6).map((p, idx) => productCard(p, idx)).join('') : '<p>Products loading...</p>';
      }
    }
  }

  // Price table on products.html
  const pt = document.getElementById('pt');
  if (pt) {
    try {
      const full = await api.getProduct('mulching-film');
      pt.innerHTML = variantTable(full);
    } catch {
      // Fallback static variant table if API is down
      const fallbackMulch = {
        slug: 'mulching-film',
        variants: [
          { thickness_micron: 20, length_m: 400, width_ft: 3.25, weight_kg: 7.00, price: 750 },
          { thickness_micron: 20, length_m: 400, width_ft: 4.00, weight_kg: 7.50, price: 900 },
          { thickness_micron: 25, length_m: 400, width_ft: 3.25, weight_kg: 8.50, price: 1050 },
          { thickness_micron: 25, length_m: 400, width_ft: 4.00, weight_kg: 9.50, price: 1250 },
          { thickness_micron: 30, length_m: 400, width_ft: 4.00, weight_kg: 10.50, price: 1550 },
        ]
      };
      pt.innerHTML = variantTable(fallbackMulch);
    }
  }

  // Product detail page
  const pd = document.getElementById('pdetail');
  if (pd) {
    const slug = new URLSearchParams(location.search).get('id');
    if (!slug) {
      showError(pd, 'No product specified.');
      return;
    }
    try {
      const p = await api.getProduct(slug);
      document.title = p.name + ' | Shivalya Agrotech';
      const img = p.image_path || 'img/black-rolls.jpg';
      pd.innerHTML =
        `<div class="pagehead"><div class="wrap"><div class="eb">Products</div><h1>${esc(p.name)}</h1></div></div>
        <section class="s"><div class="wrap"><div class="split" style="align-items:start">
          <img src="${img}" alt="${esc(p.name)}" width="600" height="400" loading="lazy" decoding="async">
          <div class="rich">
            <p>${esc(p.description)}</p>
            ${variantTable(p)}
            <p style="margin-top:16px">
              <a class="btn" target="_blank" rel="noopener" href="${wa('I want a quote for ' + p.name)}">
                ${waIcon(18)}
                <span>Get Quote on WhatsApp</span>
              </a>
            </p>
            <div class="qq" id="pdqf" style="margin-top:20px"></div>
          </div>
        </div></div></section>`;

      const pdqf = document.getElementById('pdqf');
      if (pdqf) {
        const variantLabel = (p.variants && p.variants.length) ? p.variants[0].label : '';
        quoteForm(pdqf, p.name, variantLabel);
      }
    } catch {
      const fallbackP = PRODUCTS.find(p => p.slug === slug) || PRODUCTS[0];
      if (fallbackP) {
        document.title = fallbackP.name + ' | Shivalya Agrotech';
        pd.innerHTML =
          `<div class="pagehead"><div class="wrap"><div class="eb">Products</div><h1>${esc(fallbackP.name)}</h1></div></div>
          <section class="s"><div class="wrap"><div class="split" style="align-items:start">
            <img src="${fallbackP.image_path}" alt="${esc(fallbackP.name)}" width="600" height="400">
            <div class="rich">
              <p>${esc(fallbackP.short_description)}</p>
              <p style="margin-top:16px">
                <a class="btn" target="_blank" rel="noopener" href="${wa('I want a quote for ' + fallbackP.name)}">
                  ${waIcon(18)}
                  <span>Get Quote on WhatsApp</span>
                </a>
              </p>
              <div class="qq" id="pdqf" style="margin-top:20px"></div>
            </div>
          </div></div></section>`;
        const pdqf = document.getElementById('pdqf');
        if (pdqf) quoteForm(pdqf, fallbackP.name, '');
      } else {
        showError(pd, 'Product not found.');
      }
    }
  }

  // Gallery page
  const gl = document.getElementById('gal');
  if (gl) {
    try {
      const items = await api.getGallery();
      gl.innerHTML = items.map(g =>
        `<a href="${g.image_path}" class="gal-item" onclick="event.preventDefault();openLightbox('${g.image_path}', '${esc(g.title)}')">
          <img loading="lazy" decoding="async" src="${g.image_path}" alt="${esc(g.title)}" width="400" height="300">
        </a>`
      ).join('');
    } catch {
      // Fallback gallery images
      const fallbackGallery = [
        { image_path: 'img/black-rolls.jpg', title: 'Black Rolls' },
        { image_path: 'img/field-black.jpg', title: 'Mulch Field' },
        { image_path: 'img/safecrop-field.jpg', title: 'Safecrop' },
        { image_path: 'img/kothari-sheet.jpg', title: 'Kothari Sheet' },
        { image_path: 'img/sudarshan-big.jpg', title: 'Packaging' },
        { image_path: 'img/jute-hanks.jpg', title: 'Jute Hanks' },
        { image_path: 'img/factory.jpg', title: 'Warehouse' },
        { image_path: 'img/yarn-machine.jpg', title: 'Yarn Machine' },
      ];
      gl.innerHTML = fallbackGallery.map(g =>
        `<a href="${g.image_path}" class="gal-item" onclick="event.preventDefault();openLightbox('${g.image_path}', '${esc(g.title)}')">
          <img loading="lazy" decoding="async" src="${g.image_path}" alt="${esc(g.title)}" width="400" height="300">
        </a>`
      ).join('');
    }
  }

  // Industries page (dynamic from DB)
  const indEl = document.getElementById('ind-list');
  if (indEl) {
    try {
      const industries = await api.getIndustries();
      if (industries && industries.length) {
        indEl.innerHTML = industries.map(ind =>
          `<div id="${ind.slug}" class="split" style="margin-bottom:40px">
            <img src="${ind.image_path}" alt="${esc(ind.name)}" width="600" height="400" loading="lazy" decoding="async">
            <div class="rich">
              <h2 style="margin-top:0">${esc(ind.name)}</h2>
              <p>${esc(ind.description)}</p>
              <a class="btn" target="_blank" rel="noopener" href="${wa('Hello Shivalya Agrotech, I want a quote for ' + ind.name)}">
                ${waIcon(18)}
                <span>Get Quote on WhatsApp &rarr;</span>
              </a>
            </div>
          </div>`
        ).join('');
      }
    } catch {
      // Retain static fallback
    }
  }

  // About page (dynamic from DB)
  const abEl = document.getElementById('about-content');
  if (abEl) {
    try {
      const sections = await api.getPage('about');
      if (sections && sections.length) {
        const s = sections[0];
        abEl.innerHTML = `<div class="rich">
          <h2 style="margin-top:0">${esc(s.title)}</h2>
          ${s.body}
          <div class="kv" style="margin-top:18px">
            <b>Legal name</b><span>${esc(CFG.company_name)} Limited</span>
            <b>Constitution</b><span>Private Limited Company</span>
            <b>GSTIN</b><span>${esc(CFG.gstin)}</span>
            <b>Contact person</b><span>${esc(CFG.contact_person)}</span>
          </div>
        </div>
        <img src="${esc(s.image_path || 'img/factory.jpg')}" alt="Our warehouse facility" width="600" height="400" loading="lazy" decoding="async">`;
      }
    } catch {
      // Retain static fallback
    }
  }

  // Quality page (dynamic from DB)
  const qcEl = document.getElementById('quality-cards');
  if (qcEl) {
    try {
      const sections = await api.getPage('quality');
      if (sections && sections.length) {
        qcEl.innerHTML = sections.map(s =>
          `<div class="card"><div class="bd"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div></div>`
        ).join('');
      }
    } catch {
      // Retain static fallback
    }
  }

  // Infrastructure page (dynamic from DB)
  const inEl = document.getElementById('infra-tiles');
  if (inEl) {
    try {
      const sections = await api.getPage('infrastructure');
      if (sections && sections.length) {
        inEl.innerHTML = sections.map(s =>
          `<div class="tile" style="background-image:url(${s.image_path})"><span>${esc(s.title)}</span></div>`
        ).join('');
      }
    } catch {
      // Retain static fallback
    }
  }

  // Initialize scroll reveal animations safely (never hides content if JS failed)
  initScrollReveal();
});

// Backward compatibility export
window.table = variantTable;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleAccordion = toggleAccordion;
