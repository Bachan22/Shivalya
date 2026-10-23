/**
 * admin/js/admin.js
 * Admin Dashboard client logic for Shivalya Agrotech
 */

// Global State
let currentTab = 'dashboard';
let adminUser = null;
let allProducts = [];
let allCategories = [];

// ── CSRF & API Helpers ────────────────────────────────────────
function getCsrfToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

async function apiCall(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };

  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = getCsrfToken();
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch('/api/v1/admin' + path, {
    ...options,
    method,
    headers,
  });

  if (res.status === 401) {
    window.location.href = '/admin/login.html';
    return;
  }

  const json = await res.json().catch(() => ({ success: false, error: 'Invalid response from server' }));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
}

// ── Notifications ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => {
    t.remove();
  }, 4000);
}

function esc(s) {
  if (s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Navigation ────────────────────────────────────────────────
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.toggle('active', el.id === 'view-' + tabId);
  });

  const titles = {
    dashboard: 'Dashboard Overview',
    products: 'Products & Variants',
    categories: 'Product Categories',
    gallery: 'Gallery Items',
    industries: 'Industries We Serve',
    quotes: 'Quote Requests',
    messages: 'Contact Messages',
    settings: 'Site Settings',
    pages: 'Page Content Sections',
    audit: 'System Audit Log',
  };
  document.getElementById('pageTitle').textContent = titles[tabId] || 'Admin Dashboard';

  // Mobile sidebar close on navigation
  document.getElementById('sidebar').classList.remove('open');

  // Trigger data loader
  loadTabData(tabId);
}

function loadTabData(tabId) {
  switch (tabId) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'categories': loadCategories(); break;
    case 'gallery': loadGallery(); break;
    case 'industries': loadIndustries(); break;
    case 'quotes': loadQuotes(); break;
    case 'messages': loadMessages(); break;
    case 'settings': loadSettings(); break;
    case 'pages': loadPages(); break;
    case 'audit': loadAudit(); break;
  }
}

// ══════════════════════════════════════════════════════════════
//  AUTH & INITIALIZATION
// ══════════════════════════════════════════════════════════════
async function checkAuth() {
  try {
    const res = await fetch('/api/v1/admin/auth/me');
    if (!res.ok) {
      window.location.href = '/admin/login.html';
      return;
    }
    const json = await res.json();
    adminUser = json.data;
    document.getElementById('userBadge').textContent = adminUser.email;
    loadDashboard();
  } catch (err) {
    window.location.href = '/admin/login.html';
  }
}

async function handleLogout() {
  try {
    await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/admin/login.html';
  }
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const [products, quotes, messages, gallery] = await Promise.all([
      apiCall('/products'),
      apiCall('/quotes?limit=5'),
      apiCall('/contact-messages?limit=5'),
      apiCall('/gallery'),
    ]);

    document.getElementById('statTotalProducts').textContent = products.length;
    document.getElementById('statTotalQuotes').textContent = quotes.total || quotes.quotes.length;
    document.getElementById('statTotalMessages').textContent = messages.total || messages.messages.length;
    document.getElementById('statTotalGallery').textContent = gallery.length;

    // Render recent quotes
    const qBody = document.getElementById('recentQuotesBody');
    if (qBody) {
      qBody.innerHTML = quotes.quotes.slice(0, 5).map(q => `
        <tr>
          <td><b>${esc(q.reference_no)}</b></td>
          <td>${esc(q.name)}<br><small>${esc(q.phone)}</small></td>
          <td>${esc(q.product_name_snapshot || 'General')}</td>
          <td><span class="badge badge-${q.status}">${q.status}</span></td>
          <td>${new Date(q.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" style="text-align:center">No quote requests yet</td></tr>';
    }
  } catch (err) {
    showToast('Failed to load dashboard stats: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  PRODUCTS & VARIANTS
// ══════════════════════════════════════════════════════════════
async function loadProducts() {
  try {
    const [products, categories] = await Promise.all([
      apiCall('/products'),
      apiCall('/categories'),
    ]);
    allProducts = products;
    allCategories = categories;

    // Populate category dropdown in modal
    const catSelect = document.getElementById('prodCategory');
    if (catSelect) {
      catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    }

    renderProductsTable(products);
  } catch (err) {
    showToast('Failed to load products: ' + err.message, 'error');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image_path || '/frontend/img/black-rolls.jpg'}" style="width:48px;height:36px;object-fit:cover;border-radius:4px" onerror="this.src='/frontend/img/black-rolls.jpg'"></td>
      <td>
        <b>${esc(p.name)}</b><br>
        <small style="color:#64748b">/${esc(p.slug)}</small>
      </td>
      <td>${esc(p.category_name || '-')}</td>
      <td><span class="badge badge-${p.is_active ? 'active' : 'hidden'}">${p.is_active ? 'Active' : 'Hidden'}</span></td>
      <td><b>${p.variant_count || 0}</b> variants</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openVariantsModal(${p.id}, '${esc(p.name)}')">Variants</button>
        <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${p.id})">Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleProductActive(${p.id}, ${p.is_active})">${p.is_active ? 'Hide' : 'Show'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${esc(p.name)}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center">No products found</td></tr>';
}

function filterProducts(q) {
  const term = q.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.slug.toLowerCase().includes(term) ||
    (p.short_description && p.short_description.toLowerCase().includes(term))
  );
  renderProductsTable(filtered);
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productId').value = '';
  document.getElementById('prodName').value = '';
  document.getElementById('prodSlug').value = '';
  document.getElementById('prodShortDesc').value = '';
  document.getElementById('prodDesc').value = '';
  document.getElementById('prodImagePath').value = '';
  document.getElementById('prodActive').checked = true;
  document.getElementById('prodFeatured').checked = false;
  document.getElementById('prodSort').value = '0';
  document.getElementById('productModal').classList.add('open');
}

function openEditProductModal(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodSlug').value = p.slug;
  document.getElementById('prodCategory').value = p.category_id || '';
  document.getElementById('prodShortDesc').value = p.short_description || '';
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodImagePath').value = p.image_path || '';
  document.getElementById('prodActive').checked = !!p.is_active;
  document.getElementById('prodFeatured').checked = !!p.is_featured;
  document.getElementById('prodSort').value = p.sort_order || 0;
  document.getElementById('productModal').classList.add('open');
}

async function handleProductSave(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const body = {
    category_id: parseInt(document.getElementById('prodCategory').value, 10),
    name: document.getElementById('prodName').value.trim(),
    slug: document.getElementById('prodSlug').value.trim(),
    short_description: document.getElementById('prodShortDesc').value.trim(),
    description: document.getElementById('prodDesc').value.trim(),
    image_path: document.getElementById('prodImagePath').value.trim() || null,
    is_active: document.getElementById('prodActive').checked ? 1 : 0,
    is_featured: document.getElementById('prodFeatured').checked ? 1 : 0,
    sort_order: parseInt(document.getElementById('prodSort').value, 10) || 0,
  };

  try {
    if (id) {
      await apiCall(`/products/${id}`, { method: 'PUT', body });
      showToast('Product updated successfully!');
    } else {
      await apiCall('/products', { method: 'POST', body });
      showToast('Product created successfully!');
    }
    closeModal('productModal');
    loadProducts();
  } catch (err) {
    showToast('Failed to save product: ' + err.message, 'error');
  }
}

async function toggleProductActive(id, currActive) {
  try {
    await apiCall(`/products/${id}`, {
      method: 'PUT',
      body: { is_active: currActive ? 0 : 1 },
    });
    showToast(`Product ${currActive ? 'hidden' : 'activated'}!`);
    loadProducts();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? All variants will also be deleted.`)) return;
  try {
    await apiCall(`/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted.');
    loadProducts();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Variants Management ───────────────────────────────────────
let currentVariantProductId = null;

async function openVariantsModal(productId, productName) {
  currentVariantProductId = productId;
  document.getElementById('variantModalProductTitle').textContent = productName;
  document.getElementById('variantProductId').value = productId;
  document.getElementById('variantModal').classList.add('open');
  loadProductVariants(productId);
}

async function loadProductVariants(productId) {
  try {
    const variants = await apiCall(`/variants/${productId}`);
    const tbody = document.getElementById('variantsTableBody');
    tbody.innerHTML = variants.map(v => `
      <tr>
        <td><b>${esc(v.label)}</b></td>
        <td>${v.thickness_micron ? v.thickness_micron + 'µ' : '-'}</td>
        <td>${v.width_ft ? v.width_ft + 'ft' : '-'}</td>
        <td>${v.length_m ? v.length_m + 'm' : '-'}</td>
        <td>${v.weight_kg ? v.weight_kg + 'kg' : '-'}</td>
        <td>${v.ply ? v.ply + ' ply' : '-'}</td>
        <td><b>${v.price ? '₹' + Number(v.price).toLocaleString('en-IN') : 'Contact'}</b></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editVariantInline(${v.id}, '${esc(v.label)}', '${v.price || ''}')">Edit Price</button>
          <button class="btn btn-danger btn-sm" onclick="deleteVariant(${v.id})">×</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center">No variants yet. Add one below.</td></tr>';
  } catch (err) {
    showToast('Failed to load variants: ' + err.message, 'error');
  }
}

async function handleAddVariant(e) {
  e.preventDefault();
  const body = {
    product_id: currentVariantProductId,
    label: document.getElementById('newVarLabel').value.trim(),
    thickness_micron: parseInt(document.getElementById('newVarThickness').value, 10) || null,
    width_ft: parseFloat(document.getElementById('newVarWidth').value) || null,
    length_m: parseFloat(document.getElementById('newVarLength').value) || null,
    weight_kg: parseFloat(document.getElementById('newVarWeight').value) || null,
    ply: parseInt(document.getElementById('newVarPly').value, 10) || null,
    price: parseFloat(document.getElementById('newVarPrice').value) || null,
    price_unit: document.getElementById('newVarPriceUnit').value.trim() || 'roll',
    includes_transport: document.getElementById('newVarTransport').checked ? 1 : 0,
    is_active: 1,
    sort_order: 0,
  };

  try {
    await apiCall('/variants', { method: 'POST', body });
    showToast('Variant added!');
    document.getElementById('addVariantForm').reset();
    loadProductVariants(currentVariantProductId);
  } catch (err) {
    showToast('Failed to add variant: ' + err.message, 'error');
  }
}

async function editVariantInline(id, label, currPrice) {
  const newPrice = prompt(`Enter new price for variant "${label}":`, currPrice);
  if (newPrice === null) return;
  const numPrice = newPrice === '' ? null : parseFloat(newPrice);
  try {
    await apiCall(`/variants/${id}`, {
      method: 'PUT',
      body: { price: numPrice },
    });
    showToast('Price updated!');
    loadProductVariants(currentVariantProductId);
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  }
}

async function deleteVariant(id) {
  if (!confirm('Delete this variant?')) return;
  try {
    await apiCall(`/variants/${id}`, { method: 'DELETE' });
    showToast('Variant deleted.');
    loadProductVariants(currentVariantProductId);
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════════════════════════════════
async function loadCategories() {
  try {
    const cats = await apiCall('/categories');
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = cats.map(c => `
      <tr>
        <td><b>${esc(c.name)}</b></td>
        <td>${esc(c.slug)}</td>
        <td>${esc(c.short_description || '-')}</td>
        <td>${c.sort_order}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editCategory(${c.id}, '${esc(c.name)}', '${esc(c.short_description || '')}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id}, '${esc(c.name)}')">Delete</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">No categories</td></tr>';
  } catch (err) {
    showToast('Failed to load categories: ' + err.message, 'error');
  }
}

async function handleAddCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCatName').value.trim();
  const slug = document.getElementById('newCatSlug').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const short_description = document.getElementById('newCatDesc').value.trim();

  try {
    await apiCall('/categories', {
      method: 'POST',
      body: { name, slug, short_description, is_active: 1, sort_order: 0 },
    });
    showToast('Category created!');
    document.getElementById('addCategoryForm').reset();
    loadCategories();
  } catch (err) {
    showToast('Failed to create category: ' + err.message, 'error');
  }
}

async function editCategory(id, name, desc) {
  const newName = prompt('Category name:', name);
  if (!newName) return;
  const newDesc = prompt('Short description:', desc);
  try {
    await apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: { name: newName, short_description: newDesc },
    });
    showToast('Category updated!');
    loadCategories();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Delete category "${name}"?`)) return;
  try {
    await apiCall(`/categories/${id}`, { method: 'DELETE' });
    showToast('Category deleted.');
    loadCategories();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  QUOTES MANAGEMENT & CSV EXPORT
// ══════════════════════════════════════════════════════════════
let allQuotes = [];

async function loadQuotes() {
  try {
    const status = document.getElementById('quotesStatusFilter').value;
    const url = '/quotes' + (status ? `?status=${status}` : '');
    const res = await apiCall(url);
    allQuotes = res.quotes || [];
    renderQuotesTable(allQuotes);
  } catch (err) {
    showToast('Failed to load quotes: ' + err.message, 'error');
  }
}

function renderQuotesTable(quotes) {
  const tbody = document.getElementById('quotesTableBody');
  tbody.innerHTML = quotes.map(q => `
    <tr>
      <td><b>${esc(q.reference_no)}</b><br><small>${new Date(q.created_at).toLocaleString()}</small></td>
      <td>
        <b>${esc(q.name)}</b><br>
        <a href="tel:${esc(q.phone)}">${esc(q.phone)}</a>
        ${q.email ? `<br><small>${esc(q.email)}</small>` : ''}
      </td>
      <td>
        <b>${esc(q.product_name_snapshot || 'General')}</b><br>
        <small>${esc(q.specification || '-')} | Qty: ${esc(q.quantity || '-')}</small>
      </td>
      <td><span class="badge badge-${q.status}">${q.status}</span></td>
      <td><small>${esc(q.admin_notes || 'No notes')}</small></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openQuoteDetailModal(${q.id})">Update Status</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center">No quote requests found</td></tr>';
}

function filterQuotesSearch(q) {
  const term = q.toLowerCase();
  const filtered = allQuotes.filter(item =>
    item.reference_no.toLowerCase().includes(term) ||
    item.name.toLowerCase().includes(term) ||
    item.phone.toLowerCase().includes(term)
  );
  renderQuotesTable(filtered);
}

function openQuoteDetailModal(id) {
  const q = allQuotes.find(item => item.id === id);
  if (!q) return;
  document.getElementById('quoteModalId').value = q.id;
  document.getElementById('quoteModalRef').textContent = q.reference_no;
  document.getElementById('quoteModalCustomer').textContent = `${q.name} (${q.phone})`;
  document.getElementById('quoteModalProduct').textContent = `${q.product_name_snapshot || 'General'} - Spec: ${q.specification || '-'}, Qty: ${q.quantity || '-'}`;
  document.getElementById('quoteModalStatus').value = q.status;
  document.getElementById('quoteModalNotes').value = q.admin_notes || '';
  document.getElementById('quoteModal').classList.add('open');
}

async function handleQuoteStatusSave(e) {
  e.preventDefault();
  const id = document.getElementById('quoteModalId').value;
  const status = document.getElementById('quoteModalStatus').value;
  const admin_notes = document.getElementById('quoteModalNotes').value.trim();

  try {
    await apiCall(`/quotes/${id}`, {
      method: 'PUT',
      body: { status, admin_notes },
    });
    showToast('Quote updated!');
    closeModal('quoteModal');
    loadQuotes();
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  }
}

function exportQuotesCsv() {
  window.open('/api/v1/admin/quotes/export/csv', '_blank');
}

// ══════════════════════════════════════════════════════════════
//  CONTACT MESSAGES
// ══════════════════════════════════════════════════════════════
async function loadMessages() {
  try {
    const res = await apiCall('/contact-messages');
    const msgs = res.messages || [];
    const tbody = document.getElementById('messagesTableBody');
    tbody.innerHTML = msgs.map(m => `
      <tr>
        <td><b>${esc(m.name)}</b><br><small>${new Date(m.created_at).toLocaleString()}</small></td>
        <td><a href="tel:${esc(m.phone)}">${esc(m.phone)}</a>${m.email ? `<br><small>${esc(m.email)}</small>` : ''}</td>
        <td><b>${esc(m.subject || 'No Subject')}</b><br><small>${esc(m.message)}</small></td>
        <td><span class="badge badge-${m.status}">${m.status}</span></td>
        <td>
          <select onchange="updateMessageStatus(${m.id}, this.value)" style="font-size:12px;padding:4px">
            <option value="new" ${m.status === 'new' ? 'selected' : ''}>New</option>
            <option value="read" ${m.status === 'read' ? 'selected' : ''}>Read</option>
            <option value="replied" ${m.status === 'replied' ? 'selected' : ''}>Replied</option>
            <option value="archived" ${m.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">No contact messages</td></tr>';
  } catch (err) {
    showToast('Failed to load messages: ' + err.message, 'error');
  }
}

async function updateMessageStatus(id, status) {
  try {
    await apiCall(`/contact-messages/${id}`, {
      method: 'PUT',
      body: { status },
    });
    showToast('Message status updated!');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  GALLERY
// ══════════════════════════════════════════════════════════════
async function loadGallery() {
  try {
    const items = await apiCall('/gallery');
    const container = document.getElementById('galleryGrid');
    container.innerHTML = items.map(g => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <img src="${g.image_path}" style="width:100%;height:140px;object-fit:cover" onerror="this.src='/frontend/img/black-rolls.jpg'">
        <div style="padding:10px">
          <b>${esc(g.title)}</b><br>
          <small style="color:#64748b">${esc(g.category || 'General')}</small>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span class="badge badge-${g.is_active ? 'active' : 'hidden'}">${g.is_active ? 'Active' : 'Hidden'}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteGalleryItem(${g.id})">Delete</button>
          </div>
        </div>
      </div>
    `).join('') || '<p style="padding:20px;color:#64748b">No gallery items</p>';
  } catch (err) {
    showToast('Failed to load gallery: ' + err.message, 'error');
  }
}

async function handleAddGallery(e) {
  e.preventDefault();
  const title = document.getElementById('galTitle').value.trim();
  const category = document.getElementById('galCategory').value.trim() || 'General';
  const image_path = document.getElementById('galImagePath').value.trim();

  try {
    await apiCall('/gallery', {
      method: 'POST',
      body: { title, category, image_path, sort_order: 0, is_active: 1 },
    });
    showToast('Gallery item added!');
    document.getElementById('addGalleryForm').reset();
    loadGallery();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteGalleryItem(id) {
  if (!confirm('Delete this gallery item?')) return;
  try {
    await apiCall(`/gallery/${id}`, { method: 'DELETE' });
    showToast('Item deleted.');
    loadGallery();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  INDUSTRIES
// ══════════════════════════════════════════════════════════════
async function loadIndustries() {
  try {
    const items = await apiCall('/industries');
    const tbody = document.getElementById('industriesTableBody');
    tbody.innerHTML = items.map(ind => `
      <tr>
        <td><img src="${ind.image_path}" style="width:48px;height:36px;object-fit:cover;border-radius:4px" onerror="this.src='/frontend/img/factory.jpg'"></td>
        <td><b>${esc(ind.name)}</b></td>
        <td>${esc(ind.slug)}</td>
        <td><small>${esc(ind.description)}</small></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editIndustry(${ind.id}, '${esc(ind.name)}', '${esc(ind.description)}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteIndustry(${ind.id})">Delete</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">No industries</td></tr>';
  } catch (err) {
    showToast('Failed to load industries: ' + err.message, 'error');
  }
}

async function editIndustry(id, name, desc) {
  const newName = prompt('Industry name:', name);
  if (!newName) return;
  const newDesc = prompt('Description:', desc);
  try {
    await apiCall(`/industries/${id}`, {
      method: 'PUT',
      body: { name: newName, description: newDesc },
    });
    showToast('Industry updated!');
    loadIndustries();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteIndustry(id) {
  if (!confirm('Delete this industry?')) return;
  try {
    await apiCall(`/industries/${id}`, { method: 'DELETE' });
    showToast('Industry deleted.');
    loadIndustries();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  SITE SETTINGS
// ══════════════════════════════════════════════════════════════
async function loadSettings() {
  try {
    const settings = await apiCall('/settings');
    settings.forEach(s => {
      const el = document.getElementById('setting_' + s.setting_key);
      if (el) el.value = s.setting_value || '';
    });
  } catch (err) {
    showToast('Failed to load settings: ' + err.message, 'error');
  }
}

async function saveSettingKey(key, value) {
  try {
    await apiCall(`/settings/${key}`, {
      method: 'PUT',
      body: { setting_value: value },
    });
    showToast(`Setting "${key}" saved!`);
  } catch (err) {
    showToast(`Failed to save ${key}: ` + err.message, 'error');
  }
}

async function handleSaveAllSettings(e) {
  e.preventDefault();
  const keys = ['company_name', 'phone', 'email', 'address', 'gstin', 'whatsapp_number', 'business_hours'];
  try {
    for (const k of keys) {
      const el = document.getElementById('setting_' + k);
      if (el) {
        await apiCall(`/settings/${k}`, {
          method: 'PUT',
          body: { setting_value: el.value.trim() },
        });
      }
    }
    showToast('All site settings saved successfully!');
  } catch (err) {
    showToast('Failed to save settings: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  PAGES CONTENT
// ══════════════════════════════════════════════════════════════
async function loadPages() {
  try {
    const sections = await apiCall('/pages');
    const tbody = document.getElementById('pagesTableBody');
    tbody.innerHTML = sections.map(s => `
      <tr>
        <td><b>${esc(s.page_slug)}</b></td>
        <td>${esc(s.section_key)}</td>
        <td><b>${esc(s.title || '')}</b></td>
        <td><small>${esc(s.body || '').substring(0, 80)}...</small></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditPageModal(${s.id}, '${esc(s.page_slug)}', '${esc(s.section_key)}', '${esc(s.title || '')}', '${esc(s.body || '')}')">Edit</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">No page sections found</td></tr>';
  } catch (err) {
    showToast('Failed to load page content: ' + err.message, 'error');
  }
}

function openEditPageModal(id, slug, key, title, body) {
  document.getElementById('pageSectionId').value = id;
  document.getElementById('pageSectionHeader').textContent = `${slug} - ${key}`;
  document.getElementById('pageSectionTitle').value = title;
  document.getElementById('pageSectionBody').value = body;
  document.getElementById('pageModal').classList.add('open');
}

async function handleSavePageSection(e) {
  e.preventDefault();
  const id = document.getElementById('pageSectionId').value;
  const title = document.getElementById('pageSectionTitle').value.trim();
  const body = document.getElementById('pageSectionBody').value.trim();

  try {
    await apiCall(`/pages/${id}`, {
      method: 'PUT',
      body: { title, body },
    });
    showToast('Page content updated!');
    closeModal('pageModal');
    loadPages();
  } catch (err) {
    showToast('Failed to save page content: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  AUDIT TRAIL
// ══════════════════════════════════════════════════════════════
async function loadAudit() {
  try {
    const logs = await apiCall('/audit-log');
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = logs.map(a => `
      <tr>
        <td><small>${new Date(a.created_at).toLocaleString()}</small></td>
        <td><b>${esc(a.admin_name || a.admin_email || 'Admin')}</b></td>
        <td><span class="badge badge-${a.action === 'delete' ? 'lost' : (a.action === 'create' ? 'won' : 'quoted')}">${a.action}</span></td>
        <td><b>${esc(a.table_name)}</b> #${a.row_id || '-'}</td>
        <td><small>${esc(JSON.stringify(a.new_values || a.old_values || ''))}</small></td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">No audit logs</td></tr>';
  } catch (err) {
    showToast('Failed to load audit logs: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  IMAGE UPLOADS
// ══════════════════════════════════════════════════════════════
async function uploadImageFile(fileInput, targetInputId) {
  if (!fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/v1/admin/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': getCsrfToken() },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed');
    document.getElementById(targetInputId).value = json.data.image_path;
    showToast('Image uploaded successfully!');
  } catch (err) {
    showToast('Upload error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════
function openChangePasswordModal() {
  document.getElementById('changePwForm').reset();
  document.getElementById('changePwModal').classList.add('open');
}

async function handleChangePassword(e) {
  e.preventDefault();
  const current_password = document.getElementById('currentPw').value;
  const new_password = document.getElementById('newPw').value;
  const confirm_password = document.getElementById('confirmNewPw').value;

  if (new_password !== confirm_password) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  try {
    await apiCall('/auth/change-password', {
      method: 'POST',
      body: { current_password, new_password },
    });
    showToast('Password changed successfully!');
    closeModal('changePwModal');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Init on page load ──
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
