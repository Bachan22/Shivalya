/**
 * js/main.js
 * Renders header, footer, product cards, product detail, gallery, and forms.
 * All data is fetched from the backend API via api.js.
 * The HTML structure and CSS classes are UNCHANGED from the original static version.
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

let CFG = { ...FALLBACK_CFG };
let PRODUCTS = [];
let PRODUCTS_LOADED = false;

const here = location.pathname.split('/').pop() || 'index.html';
const wa = t => `https://wa.me/${CFG.whatsapp_number}?text=${encodeURIComponent(t)}`;

// ── Escape HTML for safe rendering of user/db content ─────────
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
    // Use fallback — site still works
  }
}

// ── Load products from API ────────────────────────────────────
async function loadProducts() {
  try {
    const data = await api.getProducts();
    PRODUCTS = data; // Array of product objects
    PRODUCTS_LOADED = true;
  } catch {
    PRODUCTS = [];
    PRODUCTS_LOADED = false;
  }
}

// ── Chrome (header + footer) ──────────────────────────────────
function chrome() {
  const NAV = [
    ['Home', 'index.html'],
    ['About Us', 'about.html'],
    ['Products', 'products.html', PRODUCTS.map(p => [esc(p.name), 'product.html?id=' + p.slug])],
    ['Industries', 'industries.html', [['Farmers', 'industries.html#farmers'], ['Nurseries', 'industries.html#nurseries'], ['Manufacturers', 'industries.html#manufacturers'], ['Textile & Yarn', 'industries.html#textile']]],
    ['Quality', 'quality.html'],
    ['Infrastructure', 'infrastructure.html'],
    ['Gallery', 'gallery.html'],
    ['Contact', 'contact.html'],
  ];

  const nav = NAV.map(([n, h, d]) =>
    `<div><a class="l ${h === here ? 'on' : ''}" href="${h}">${n}${d ? ' ▾' : ''}</a>${d ? `<div class="dd">${d.map(([a, b]) => `<a href="${b}">${a}</a>`).join('')}</div>` : ''}</div>`
  ).join('');

  document.getElementById('hdr').innerHTML =
    `<div class="top"><div class="wrap"><span>📍 ${esc(CFG.address)}</span><span>📞 ${esc(CFG.phone)}</span><span>✉ ${esc(CFG.email)}</span><span>GSTIN: ${esc(CFG.gstin)}</span><a class="q" href="contact.html">Get Quote &nbsp;→</a></div></div>
    <header class="nav"><div class="wrap"><a class="logo" href="index.html"><img src="img/logo.svg" alt=""><div><b>SHIVALYA</b><i>AGROTECH PRODUCER COMPANY</i><small>Quality Inputs • Stronger Farmers • Greener Tomorrow</small></div></a>
    <nav class="m" id="nv">${nav}</nav><form class="sr" action="products.html"><input name="q" placeholder="Search products..." aria-label="Search"><button>🔍</button></form><button class="burger" onclick="nv.classList.toggle('open')" aria-label="Menu">☰</button></div></header>`;

  document.getElementById('ftr').innerHTML =
    `<footer><div class="wrap"><div class="fg"><div><h4>${esc(CFG.company_name)}</h4><p style="font-size:13px">Mulching films, jute thread, agricultural plastic rolls, yarn and custom solutions for farmers, manufacturers and businesses across India.</p><p style="margin-top:10px;font-size:13px">GSTIN: ${esc(CFG.gstin)}</p></div>
    <div><h4>Company</h4>${NAV.filter(n => !n[2]).map(([n, h]) => `<a href="${h}">${n}</a>`).join('')}</div><div><h4>Products</h4>${PRODUCTS.map(p => `<a href="product.html?id=${p.slug}">${esc(p.name)}</a>`).join('')}</div>
    <div><h4>Contact</h4><a>${esc(CFG.address)}</a><a href="tel:+919950337442">${esc(CFG.phone)} (${esc(CFG.contact_person)})</a><a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a></div></div><div class="cp">© ${new Date().getFullYear()} ${esc(CFG.company_name)} Limited. All rights reserved.</div></div></footer><a class="wa" href="${wa('Hello, I want a quote.')}" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>`;
}

// ── Product card (same markup as original) ────────────────────
function productCard(p) {
  const img = p.image_path || 'img/black-rolls.jpg';
  return `<a class="card" href="product.html?id=${p.slug}"><div class="im" style="background-image:url(${img})"></div><div class="bd"><h3>${esc(p.name)}</h3><p>${esc(p.short_description)}</p><div class="vd">View Details →<i>→</i></div></div></a>`;
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
    `<h3>Get a Quick Quote</h3><small>Share your requirement and we will get back to you.</small>
    <div class="f">
      <select id="qp"><option value="">Select Product</option>${options}</select>
      <input id="qs" placeholder="Size / Specification" value="${esc(prefillVariant || '')}">
      <input id="qq" placeholder="Quantity (Kg / Rolls)">
      <input id="qn" placeholder="Your Name">
    </div>
    <input id="qh" placeholder="Your Phone Number" style="margin-bottom:8px">
    <input id="qw" type="text" style="display:none" tabindex="-1" autocomplete="off">
    <div id="qerr" style="color:#c00;font-size:12px;margin-bottom:8px"></div>
    <div id="qsuc" style="display:none"></div>
    <button class="btn" type="button" id="qbtn" onclick="sendEnq()">💬 Send Enquiry →</button>`;
}

// ── Send enquiry (real API call) ──────────────────────────────
async function sendEnq() {
  const v = i => (document.getElementById(i) || {}).value || '';
  const errEl = document.getElementById('qerr');
  const sucEl = document.getElementById('qsuc');
  const btn = document.getElementById('qbtn');

  errEl.textContent = '';
  sucEl.style.display = 'none';

  // Disable button to prevent double submit
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const data = await api.submitQuote({
      product_name: v('qp'),
      specification: v('qs'),
      quantity: v('qq'),
      name: v('qn'),
      phone: v('qh'),
      source_page: here,
      website: v('qw'), // Honeypot
    });

    sucEl.innerHTML =
      `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:14px;margin-bottom:10px">
        <b style="color:#2e7d32">✓ Enquiry Sent!</b><br>
        <span style="font-size:13px">Reference: <b>${esc(data.reference_no)}</b></span><br>
        <a class="btn" href="${data.whatsapp_link}" target="_blank" rel="noopener" style="margin-top:10px;font-size:13px;padding:10px 20px">💬 Continue on WhatsApp</a>
      </div>`;
    sucEl.style.display = 'block';
    btn.style.display = 'none';
  } catch (err) {
    if (err.errors && err.errors.length) {
      errEl.innerHTML = err.errors.map(e => `<div>• ${esc(e.field)}: ${esc(e.message)}</div>`).join('');
    } else {
      errEl.textContent = err.message || 'Something went wrong. Please try again.';
    }
    btn.disabled = false;
    btn.textContent = '💬 Send Enquiry →';
  }
}

// ── Contact form ──────────────────────────────────────────────
function contactForm(el) {
  el.innerHTML =
    `<h3>Send us a Message</h3><small>We will get back to you shortly.</small>
    <div class="f">
      <input id="cn" placeholder="Your Name">
      <input id="cp" placeholder="Your Phone Number">
    </div>
    <input id="ce" placeholder="Your Email (optional)" style="margin-bottom:8px">
    <input id="cs" placeholder="Subject" style="margin-bottom:8px">
    <textarea id="cm" placeholder="Your Message"></textarea>
    <input id="cw" type="text" style="display:none" tabindex="-1" autocomplete="off">
    <div id="cerr" style="color:#c00;font-size:12px;margin-bottom:8px"></div>
    <div id="csuc" style="display:none"></div>
    <button class="btn" type="button" id="cbtn" onclick="sendContact()" style="margin-top:8px;width:100%;justify-content:center;border-radius:6px">✉ Send Message →</button>`;
}

async function sendContact() {
  const v = i => (document.getElementById(i) || {}).value || '';
  const errEl = document.getElementById('cerr');
  const sucEl = document.getElementById('csuc');
  const btn = document.getElementById('cbtn');

  errEl.textContent = '';
  sucEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const data = await api.submitContact({
      name: v('cn'),
      phone: v('cp'),
      email: v('ce'),
      subject: v('cs'),
      message: v('cm'),
      website: v('cw'),
    });

    sucEl.innerHTML =
      `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:14px;margin-bottom:10px">
        <b style="color:#2e7d32">✓ Message Sent!</b><br>
        <span style="font-size:13px">We will get back to you soon.</span><br>
        <a class="btn" href="${data.whatsapp_link}" target="_blank" rel="noopener" style="margin-top:10px;font-size:13px;padding:10px 20px">💬 Continue on WhatsApp</a>
      </div>`;
    sucEl.style.display = 'block';
    btn.style.display = 'none';
  } catch (err) {
    if (err.errors && err.errors.length) {
      errEl.innerHTML = err.errors.map(e => `<div>• ${esc(e.field)}: ${esc(e.message)}</div>`).join('');
    } else {
      errEl.textContent = err.message || 'Something went wrong. Please try again.';
    }
    btn.disabled = false;
    btn.textContent = '✉ Send Message →';
  }
}

// ── Error state with retry ────────────────────────────────────
function showError(el, msg) {
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--mu)"><p>${msg}</p><p style="margin-top:10px">📞 <a href="tel:+919950337442">${FALLBACK_CFG.phone}</a> &nbsp; 💬 <a href="${wa('Hello')}" target="_blank">WhatsApp</a></p><button class="btn" onclick="location.reload()" style="margin-top:14px">↻ Retry</button></div>`;
}

// ══════════════════════════════════════════════════════════════
//  PAGE INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings and products in parallel
  await Promise.all([loadSettings(), loadProducts()]);

  // Render header and footer
  chrome();

  // ── Quick quote form (home page + contact page) ─────────
  const qf = document.getElementById('qf');
  if (qf) quoteForm(qf);

  // ── Contact form ────────────────────────────────────────
  const cf = document.getElementById('cform');
  if (cf) contactForm(cf);

  // ── Product listing (home page #plist + products page) ──
  const pl = document.getElementById('plist');
  if (pl) {
    const searchQ = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
    if (searchQ) {
      // Use API search
      try {
        const data = await api.getProducts(searchQ);
        pl.innerHTML = data.length ? data.map(productCard).join('') : '<p>No product found. Try another word.</p>';
      } catch {
        showError(pl, 'Could not load products.');
      }
    } else {
      pl.innerHTML = PRODUCTS.length ? PRODUCTS.map(productCard).join('') : '<p>Products loading...</p>';
    }
  }

  // ── Price table on products.html ────────────────────────
  const pt = document.getElementById('pt');
  if (pt && PRODUCTS.length) {
    // Find mulching film for the price table
    const mulching = PRODUCTS.find(p => p.slug === 'mulching-film');
    if (mulching) {
      try {
        const full = await api.getProduct('mulching-film');
        pt.innerHTML = variantTable(full);
      } catch {
        pt.innerHTML = '<p>Price table loading...</p>';
      }
    }
  }

  // ── Product detail page ─────────────────────────────────
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
        <section class="s"><div class="wrap"><div class="split" style="align-items:start"><img src="${img}" alt="${esc(p.name)}">
        <div class="rich"><p>${esc(p.description)}</p>${variantTable(p)}<p style="margin-top:16px"><a class="btn" target="_blank" rel="noopener" href="${wa('I want a quote for ' + p.name)}">Get Quote on WhatsApp</a></p>
        <div class="qq" id="pdqf" style="margin-top:20px"></div></div></div></div></section>`;

      // Add quote form prefilled with product name
      const pdqf = document.getElementById('pdqf');
      if (pdqf) {
        const variantLabel = (p.variants && p.variants.length) ? p.variants[0].label : '';
        quoteForm(pdqf, p.name, variantLabel);
      }
    } catch (err) {
      showError(pd, 'Product not found or could not be loaded.');
    }
  }

  // ── Gallery page ────────────────────────────────────────
  const gl = document.getElementById('gal');
  if (gl) {
    try {
      const items = await api.getGallery();
      gl.innerHTML = items.map(g =>
        `<a href="${g.image_path}" target="_blank"><img loading="lazy" src="${g.image_path}" alt="${esc(g.title)}"></a>`
      ).join('');
    } catch {
      showError(gl, 'Gallery could not be loaded.');
    }
  }

  // ── Industries page (dynamic from DB) ───────────────────
  const indEl = document.getElementById('ind-list');
  if (indEl) {
    try {
      const industries = await api.getIndustries();
      if (industries && industries.length) {
        indEl.innerHTML = industries.map(ind =>
          `<div id="${ind.slug}" class="split" style="margin-bottom:40px"><img src="${ind.image_path}" alt="${esc(ind.name)}"><div class="rich"><h2 style="margin-top:0">${esc(ind.name)}</h2><p>${esc(ind.description)}</p><a class="btn" href="contact.html">Get Quote</a></div></div>`
        ).join('');
      }
    } catch {
      // Industries are already in the HTML as static fallback
    }
  }

  // ── About page (dynamic from DB) ────────────────────────
  const abEl = document.getElementById('about-content');
  if (abEl) {
    try {
      const sections = await api.getPage('about');
      if (sections && sections.length) {
        const s = sections[0];
        abEl.innerHTML = `<div class="rich"><h2 style="margin-top:0">${esc(s.title)}</h2>${s.body}<div class="kv" style="margin-top:18px"><b>Legal name</b><span>${esc(CFG.company_name)} Limited</span><b>Constitution</b><span>Private Limited Company</span><b>GSTIN</b><span>${esc(CFG.gstin)}</span><b>Contact person</b><span>${esc(CFG.contact_person)}</span></div></div><img src="${esc(s.image_path || 'img/factory.jpg')}" alt="Our stock">`;
      }
    } catch {
      // Keep static fallback
    }
  }

  // ── Quality page (dynamic from DB) ──────────────────────
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
      // Keep static fallback
    }
  }

  // ── Infrastructure page (dynamic from DB) ───────────────
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
      // Keep static fallback
    }
  }
});

// Legacy export for backward compatibility
window.table = variantTable;

