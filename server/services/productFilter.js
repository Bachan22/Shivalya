/**
 * server/services/productFilter.js
 * Dynamic faceted filtering engine for products and variants.
 * Dynamically queries attribute_definitions and extra_attributes JSON.
 */
const { pool } = require('../db/pool');

// Known physical columns on product_variants
const PHYSICAL_COLUMNS = new Set([
  'thickness_micron',
  'length_m',
  'width_ft',
  'weight_kg',
  'ply',
  'price',
]);

/**
 * Fetch all active, filterable attribute definitions.
 */
async function getFilterableAttributes() {
  const [rows] = await pool.execute(
    'SELECT attr_key, label, unit, type, sort_order FROM attribute_definitions WHERE is_active = 1 AND is_filterable = 1 ORDER BY sort_order ASC'
  );
  return rows;
}

/**
 * Build SQL expression for an attribute key.
 */
function getAttrExpr(key) {
  if (PHYSICAL_COLUMNS.has(key)) {
    return `pv.${key}`;
  }
  // Safe extraction from JSON
  const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
  return `JSON_UNQUOTE(JSON_EXTRACT(pv.extra_attributes, '$.${safeKey}'))`;
}

/**
 * Normalise filter query parameters.
 */
function parseFilterParams(query, attrDefs) {
  const allowedKeys = new Set(attrDefs.map(d => d.attr_key));

  // Search text
  const q = (query.q || '').trim();

  // Categories
  let categories = [];
  if (query.category) {
    if (Array.isArray(query.category)) {
      categories = query.category.flatMap(c => String(c).split(',')).map(c => c.trim()).filter(Boolean);
    } else {
      categories = String(query.category).split(',').map(c => c.trim()).filter(Boolean);
    }
  }

  // Price range
  const minPrice = query.min_price != null && query.min_price !== '' ? parseFloat(query.min_price) : null;
  const maxPrice = query.max_price != null && query.max_price !== '' ? parseFloat(query.max_price) : null;

  // Attributes: query.attr or query.attr_*
  const attributes = {};
  if (query.attr && typeof query.attr === 'object') {
    for (const [k, val] of Object.entries(query.attr)) {
      if (allowedKeys.has(k)) {
        const rawVals = Array.isArray(val) ? val : [val];
        const flatVals = rawVals.flatMap(v => String(v).split(',')).map(v => v.trim()).filter(Boolean);
        if (flatVals.length) attributes[k] = flatVals;
      }
    }
  }
  // Also check top-level query keys like attr_ply or attr_thickness_micron
  for (const [k, val] of Object.entries(query)) {
    if (k.startsWith('attr_')) {
      const actualKey = k.slice(5);
      if (allowedKeys.has(actualKey)) {
        const rawVals = Array.isArray(val) ? val : [val];
        const flatVals = rawVals.flatMap(v => String(v).split(',')).map(v => v.trim()).filter(Boolean);
        if (flatVals.length) attributes[actualKey] = flatVals;
      }
    }
  }

  // Sort
  const allowedSorts = new Set(['relevance', 'name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest']);
  const sort = allowedSorts.has(query.sort) ? query.sort : 'relevance';

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));

  return { q, categories, minPrice, maxPrice, attributes, sort, page, limit };
}

/**
 * Fetch products matching filters, with aggregated price range, spec chips, and matching variants.
 */
async function queryProducts(rawQuery) {
  const attrDefs = await getFilterableAttributes();
  const filters = parseFilterParams(rawQuery, attrDefs);

  // 1. Fetch all active products with category
  const [allProducts] = await pool.execute(`
    SELECT p.id, p.slug, p.name, p.short_description, p.description, p.image_path, p.price_unit,
           p.is_featured, p.sort_order, p.created_at,
           c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    ORDER BY p.sort_order ASC, p.id ASC
  `);

  // 2. Fetch all active variants
  const [allVariants] = await pool.execute(`
    SELECT pv.*
    FROM product_variants pv
    WHERE pv.is_active = 1
    ORDER BY pv.sort_order ASC, pv.id ASC
  `);

  // Group variants by product_id
  const variantsByProduct = new Map();
  for (const v of allVariants) {
    if (!variantsByProduct.has(v.product_id)) {
      variantsByProduct.set(v.product_id, []);
    }
    variantsByProduct.get(v.product_id).push(v);
  }

  // Helper to extract variant attribute value
  const getVariantVal = (v, key) => {
    if (PHYSICAL_COLUMNS.has(key)) {
      return v[key];
    }
    if (v.extra_attributes) {
      try {
        const extra = typeof v.extra_attributes === 'string' ? JSON.parse(v.extra_attributes) : v.extra_attributes;
        return extra ? extra[key] : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Helper to derive spec chips dynamically for a product
  const deriveSpecChips = (p, variants) => {
    if (!variants || !variants.length) {
      return ['Custom sizes', 'Bulk supply'];
    }
    const chips = [];
    for (const def of attrDefs) {
      if (def.attr_key === 'price') continue; // Handled separately
      const vals = variants
        .map(v => getVariantVal(v, def.attr_key))
        .filter(val => val !== null && val !== undefined && val !== '');
      if (!vals.length) continue;

      if (def.type === 'range' || def.attr_key === 'thickness_micron' || def.attr_key === 'width_ft' || def.attr_key === 'length_m') {
        const numVals = vals.map(Number).filter(n => !isNaN(n));
        if (numVals.length) {
          const min = Math.min(...numVals);
          const max = Math.max(...numVals);
          const unit = def.unit ? ` ${def.unit}` : '';
          if (min === max) {
            chips.push(`${min}${unit}`);
          } else {
            chips.push(`${min}-${max}${unit}`);
          }
        }
      } else {
        // Discrete list (e.g. ply: 6, 7, 8)
        const uniqueVals = [...new Set(vals)].sort((a, b) => Number(a) - Number(b));
        const unit = def.unit ? ` ${def.unit}` : '';
        chips.push(`${uniqueVals.join(', ')}${unit}`);
      }
      if (chips.length >= 3) break;
    }
    return chips.length ? chips : ['Custom sizes'];
  };

  // 3. Filter products
  const filteredProducts = [];

  for (const p of allProducts) {
    const variants = variantsByProduct.get(p.id) || [];

    // Filter by Category
    if (filters.categories.length) {
      if (!p.category_slug || !filters.categories.includes(p.category_slug)) {
        continue;
      }
    }

    // Filter by Search Query q
    if (filters.q) {
      const qLower = filters.q.toLowerCase();
      const pMatches =
        (p.name && p.name.toLowerCase().includes(qLower)) ||
        (p.short_description && p.short_description.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.category_name && p.category_name.toLowerCase().includes(qLower));

      const variantMatches = variants.some(v => {
        if (v.label && v.label.toLowerCase().includes(qLower)) return true;
        for (const def of attrDefs) {
          const val = getVariantVal(v, def.attr_key);
          if (val !== null && String(val).toLowerCase().includes(qLower)) return true;
        }
        return false;
      });

      if (!pMatches && !variantMatches) {
        continue;
      }
    }

    // Filter by Variant Attributes & Price Range
    const hasAttrFilter = Object.keys(filters.attributes).length > 0;
    const hasPriceFilter = filters.minPrice !== null || filters.maxPrice !== null;

    let matchingVariants = [];
    if (hasAttrFilter || hasPriceFilter) {
      if (!variants.length) {
        // Product has no variants, so cannot match variant attribute filters
        continue;
      }

      matchingVariants = variants.filter(v => {
        // Check price
        if (filters.minPrice !== null) {
          if (v.price === null || parseFloat(v.price) < filters.minPrice) return false;
        }
        if (filters.maxPrice !== null) {
          if (v.price === null || parseFloat(v.price) > filters.maxPrice) return false;
        }

        // Check attributes (AND across attributes, OR within attribute)
        for (const [attrKey, selectedVals] of Object.entries(filters.attributes)) {
          const vVal = getVariantVal(v, attrKey);
          if (vVal === null || vVal === undefined) return false;
          // Match loosely (e.g. "20" matches 20 or 20.00)
          const matches = selectedVals.some(sv => {
            if (!isNaN(Number(sv)) && !isNaN(Number(vVal))) {
              return Number(sv) === Number(vVal);
            }
            return String(vVal).toLowerCase() === String(sv).toLowerCase();
          });
          if (!matches) return false;
        }
        return true;
      });

      if (!matchingVariants.length) {
        continue; // Product had no variant matching all attribute filters
      }
    } else {
      matchingVariants = variants;
    }

    // Compute prices from active variants
    const validPrices = variants.map(v => v.price !== null ? parseFloat(v.price) : null).filter(p => p !== null && !isNaN(p));
    const minPrice = validPrices.length ? Math.min(...validPrices) : null;
    const maxPrice = validPrices.length ? Math.max(...validPrices) : null;
    const priceUnit = variants.find(v => v.price_unit)?.price_unit || p.price_unit || '';

    // Derive dynamic spec chips
    const specChips = deriveSpecChips(p, variants);

    // Format matching variant summaries for display if filters were active
    let formattedMatchingVariants = null;
    if (hasAttrFilter && matchingVariants.length) {
      formattedMatchingVariants = matchingVariants.slice(0, 3).map(v => {
        const parts = [];
        for (const def of attrDefs) {
          if (def.attr_key === 'price') continue;
          const val = getVariantVal(v, def.attr_key);
          if (val !== null && val !== undefined && val !== '') {
            const unit = def.unit ? ` ${def.unit}` : '';
            parts.push(`${parseFloat(val) || val}${unit}`);
          }
        }
        if (v.price !== null) {
          parts.push(`₹${Number(v.price).toLocaleString('en-IN')}`);
        }
        return {
          id: v.id,
          label: parts.length ? parts.join(' | ') : v.label,
          price: v.price,
        };
      });
    }

    filteredProducts.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      short_description: p.short_description,
      description: p.description,
      image_path: p.image_path,
      price_unit: priceUnit,
      is_featured: p.is_featured,
      category_name: p.category_name,
      category_slug: p.category_slug,
      min_price: minPrice,
      max_price: maxPrice,
      spec_chips: specChips,
      variants_count: variants.length,
      matching_variants: formattedMatchingVariants,
      matching_variants_count: matchingVariants.length,
      created_at: p.created_at,
      sort_order: p.sort_order,
    });
  }

  // 4. Sort products
  switch (filters.sort) {
    case 'name_asc':
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price_asc':
      filteredProducts.sort((a, b) => {
        if (a.min_price === null && b.min_price === null) return 0;
        if (a.min_price === null) return 1;
        if (b.min_price === null) return -1;
        return a.min_price - b.min_price;
      });
      break;
    case 'price_desc':
      filteredProducts.sort((a, b) => {
        if (a.min_price === null && b.min_price === null) return 0;
        if (a.min_price === null) return 1;
        if (b.min_price === null) return -1;
        return b.min_price - a.min_price;
      });
      break;
    case 'newest':
      filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'relevance':
    default:
      filteredProducts.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
      break;
  }

  // 5. Pagination
  const total = filteredProducts.length;
  const offset = (filters.page - 1) * filters.limit;
  const pagedProducts = filteredProducts.slice(offset, offset + filters.limit);

  return {
    products: pagedProducts,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit) || 1,
    },
    appliedFilters: filters,
  };
}

/**
 * Calculate dynamic facets for the current filter state.
 * Uses disjunctive faceting: computing each facet without its own selection.
 */
async function queryFacets(rawQuery) {
  const attrDefs = await getFilterableAttributes();
  const currentFilters = parseFilterParams(rawQuery, attrDefs);

  // 1. Categories facet: query with all filters except category
  const withoutCategoryFilters = { ...rawQuery };
  delete withoutCategoryFilters.category;
  const { products: prodsWithoutCat } = await queryProducts({ ...withoutCategoryFilters, limit: 1000 });

  // Get all active categories
  const [categories] = await pool.execute(
    'SELECT id, slug, name FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
  );

  const catCounts = {};
  for (const p of prodsWithoutCat) {
    if (p.category_slug) {
      catCounts[p.category_slug] = (catCounts[p.category_slug] || 0) + 1;
    }
  }

  const categoryFacets = categories
    .map(c => ({
      slug: c.slug,
      name: c.name,
      count: catCounts[c.slug] || 0,
      active: currentFilters.categories.includes(c.slug),
    }))
    .filter(c => c.count > 0 || c.active);

  // 2. Attribute facets: for each attribute, compute facet ignoring its own selection
  const attributeFacets = [];

  // Also get the products currently matching all filters (to know which facets are present in current results)
  const { products: currentMatches } = await queryProducts({ ...rawQuery, limit: 1000 });
  const currentProductIds = new Set(currentMatches.map(p => p.id));

  // Load all variants to inspect values
  const [allVariants] = await pool.execute(`
    SELECT pv.*
    FROM product_variants pv
    WHERE pv.is_active = 1
    ORDER BY pv.sort_order ASC, pv.id ASC
  `);

  const getVariantVal = (v, key) => {
    if (PHYSICAL_COLUMNS.has(key)) return v[key];
    if (v.extra_attributes) {
      try {
        const extra = typeof v.extra_attributes === 'string' ? JSON.parse(v.extra_attributes) : v.extra_attributes;
        return extra ? extra[key] : null;
      } catch { return null; }
    }
    return null;
  };

  for (const def of attrDefs) {
    // Determine if this attribute exists in the CURRENT filtered result set
    // (Specification filters are faceted and depend on the current results)
    const matchingVariantsInResults = allVariants.filter(v => currentProductIds.has(v.product_id));
    const valsInResults = matchingVariantsInResults
      .map(v => getVariantVal(v, def.attr_key))
      .filter(val => val !== null && val !== undefined && val !== '');

    // If no product in current results has this attribute, check if it's currently selected
    const isCurrentlySelected = !!currentFilters.attributes[def.attr_key] ||
      (def.attr_key === 'price' && (currentFilters.minPrice !== null || currentFilters.maxPrice !== null));

    if (!valsInResults.length && !isCurrentlySelected) {
      // Attribute does not exist in matching products (e.g. ply when mulching film is selected)
      continue;
    }

    // Now compute options/ranges ignoring this attribute's own selection (disjunctive)
    const queryWithoutThisAttr = { ...rawQuery };
    if (queryWithoutThisAttr.attr) {
      queryWithoutThisAttr.attr = { ...queryWithoutThisAttr.attr };
      delete queryWithoutThisAttr.attr[def.attr_key];
    }
    delete queryWithoutThisAttr[`attr_${def.attr_key}`];
    if (def.attr_key === 'price') {
      delete queryWithoutThisAttr.min_price;
      delete queryWithoutThisAttr.max_price;
    }

    const { products: candidateProds } = await queryProducts({ ...queryWithoutThisAttr, limit: 1000 });
    const candidateProductIds = new Set(candidateProds.map(p => p.id));
    const candidateVariants = allVariants.filter(v => candidateProductIds.has(v.product_id));

    if (def.type === 'range' || def.attr_key === 'price' || def.attr_key === 'weight_kg') {
      const numVals = candidateVariants
        .map(v => getVariantVal(v, def.attr_key))
        .filter(val => val !== null && val !== undefined && val !== '')
        .map(Number)
        .filter(n => !isNaN(n));

      if (numVals.length) {
        attributeFacets.push({
          key: def.attr_key,
          label: def.label,
          unit: def.unit,
          type: 'range',
          min: Math.floor(Math.min(...numVals)),
          max: Math.ceil(Math.max(...numVals)),
          currentMin: def.attr_key === 'price' ? currentFilters.minPrice : null,
          currentMax: def.attr_key === 'price' ? currentFilters.maxPrice : null,
        });
      }
    } else {
      // Discrete attribute
      // Collect all candidate values and counts
      const counts = {};
      const activeVals = currentFilters.attributes[def.attr_key] || [];

      for (const v of candidateVariants) {
        const val = getVariantVal(v, def.attr_key);
        if (val !== null && val !== undefined && val !== '') {
          // Format numeric values cleanly (e.g. 20.00 -> 20, 3.25 -> 3.25)
          const num = Number(val);
          const cleanVal = (!isNaN(num) && Number.isInteger(num)) ? String(num) : (!isNaN(num) ? String(num) : String(val).trim());
          // Count distinct products that would match if this value is selected
          if (!counts[cleanVal]) {
            counts[cleanVal] = new Set();
          }
          counts[cleanVal].add(v.product_id);
        }
      }

      const options = Object.keys(counts)
        .sort((a, b) => (!isNaN(Number(a)) && !isNaN(Number(b))) ? (Number(a) - Number(b)) : a.localeCompare(b))
        .map(val => {
          const productCount = counts[val].size;
          return {
            value: val,
            count: productCount,
            active: activeVals.some(av => String(av) === String(val)),
            disabled: productCount === 0,
          };
        });

      if (options.length) {
        attributeFacets.push({
          key: def.attr_key,
          label: def.label,
          unit: def.unit,
          type: 'discrete',
          options,
        });
      }
    }
  }

  return {
    categories: categoryFacets,
    attributes: attributeFacets,
    total: currentMatches.length,
  };
}

module.exports = {
  getFilterableAttributes,
  queryProducts,
  queryFacets,
};
