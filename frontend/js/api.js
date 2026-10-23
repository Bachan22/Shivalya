/**
 * js/api.js
 * Frontend API wrapper — all fetch calls to the backend.
 * Loaded before main.js in every page.
 */
const API_BASE = '/api/v1';

const api = {
  async get(path) {
    try {
      const res = await fetch(API_BASE + path);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Request failed');
      return json.data;
    } catch (err) {
      console.error('[API GET]', path, err.message);
      throw err;
    }
  },

  async post(path, body) {
    try {
      const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok && json.errors) {
        // Return validation errors
        const err = new Error(json.error || 'Validation failed');
        err.errors = json.errors;
        err.status = res.status;
        throw err;
      }
      if (!res.ok || !json.success) throw new Error(json.error || 'Request failed');
      return json.data;
    } catch (err) {
      if (!err.errors) console.error('[API POST]', path, err.message);
      throw err;
    }
  },

  /** Fetch all products (with optional search query) */
  async getProducts(query) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('limit', '100');
    return this.get('/products?' + params.toString());
  },

  /** Fetch a single product by slug (with variants and images) */
  async getProduct(slug) {
    return this.get('/products/' + encodeURIComponent(slug));
  },

  /** Fetch public site settings */
  async getSettings() {
    return this.get('/settings/public');
  },

  /** Fetch gallery items */
  async getGallery() {
    return this.get('/gallery');
  },

  /** Fetch industries */
  async getIndustries() {
    return this.get('/industries');
  },

  /** Fetch page content sections */
  async getPage(slug) {
    return this.get('/pages/' + encodeURIComponent(slug));
  },

  /** Submit a quote request */
  async submitQuote(data) {
    return this.post('/quotes', data);
  },

  /** Submit a contact message */
  async submitContact(data) {
    return this.post('/contact', data);
  },
};
