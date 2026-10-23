-- 003_seed.sql
-- Seeds real data. Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE.
-- All prices and product details match the spec exactly.

USE shivalya_agrotech;

-- ═══════════════════════════════════════════════════════════════
-- Categories
-- ═══════════════════════════════════════════════════════════════
INSERT INTO categories (slug, name, short_description, image_path, sort_order, is_active)
VALUES
  ('agricultural-films', 'Agricultural Films', 'Mulching films, plastic rolls and custom films for farming', 'img/black-rolls.jpg', 1, 1),
  ('jute-products', 'Jute Products', 'High strength jute thread in multiple ply options', 'img/cones-stack.jpg', 2, 1),
  ('yarn-textile', 'Yarn & Textile', 'Cotton, polyester and other yarn cones', 'img/yarn-cone.jpg', 3, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  short_description = VALUES(short_description),
  image_path = VALUES(image_path),
  sort_order = VALUES(sort_order);

-- ═══════════════════════════════════════════════════════════════
-- Products (exactly 6, matching frontend js/main.js)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO products (slug, category_id, name, short_description, description, image_path, price_unit, is_active, is_featured, sort_order, seo_title, seo_description)
VALUES
  ('mulching-film',
   (SELECT id FROM categories WHERE slug = 'agricultural-films'),
   'Mulching Film',
   'UV stabilized mulching films for better weed control, moisture retention and higher yield.',
   'UV stabilized silver/black mulching film in 20 and 25 and 30 micron thickness. Controls weeds, keeps soil moisture and improves yield. Each roll is 400 metres long.',
   'img/black-rolls.jpg', 'per roll', 1, 1, 1,
   'Mulching Film | Shivalya Agrotech', 'Buy UV stabilized mulching film in 20, 25 and 30 micron. 400m rolls at best prices.'),

  ('jute-thread',
   (SELECT id FROM categories WHERE slug = 'jute-products'),
   'Jute Thread',
   '6 Ply, 7 Ply, 8 Ply. High strength & durable. (Transport charges included)',
   'High strength, durable jute thread in 6, 7 and 8 ply. Prices include transport charges.',
   'img/cones-stack.jpg', 'per kg', 1, 1, 2,
   'Jute Thread | Shivalya Agrotech', 'Buy jute thread 6 ply, 7 ply, 8 ply. Transport charges included.'),

  ('agricultural-plastic-rolls',
   (SELECT id FROM categories WHERE slug = 'agricultural-films'),
   'Agricultural Plastic Rolls',
   'Various micron, width and length options for farming and industrial applications.',
   'Agricultural plastic rolls in many micron, width and length options.',
   'img/silver-black-roll.jpg', NULL, 1, 1, 3,
   'Agricultural Plastic Rolls | Shivalya Agrotech', 'Plastic rolls in various sizes for farming and industrial use.'),

  ('agri-mulch-sheets',
   (SELECT id FROM categories WHERE slug = 'agricultural-films'),
   'Agri Mulch Sheets (Pre-Cut)',
   'Custom hole size, spacing and dimensions as per crop requirement.',
   'Pre-cut mulch sheets with hole size, spacing and dimensions made as per your crop.',
   'img/kothari-sheet.jpg', NULL, 1, 1, 4,
   'Pre-Cut Mulch Sheets | Shivalya Agrotech', 'Custom pre-cut mulch sheets with hole size and spacing as per your crop.'),

  ('yarn-cones',
   (SELECT id FROM categories WHERE slug = 'yarn-textile'),
   'Yarn Cones',
   'Cotton, polyester and other yarn solutions for industrial use.',
   'Cotton, polyester and other yarn cones for industrial use.',
   'img/yarn-cone.jpg', NULL, 1, 1, 5,
   'Yarn Cones | Shivalya Agrotech', 'Cotton, polyester and other yarn cones for textile and industrial use.'),

  ('custom-industrial-films',
   (SELECT id FROM categories WHERE slug = 'agricultural-films'),
   'Custom & Industrial Films',
   'Tailored solutions for agricultural and industrial applications.',
   'Films made to your size, GSM and micron requirement for agriculture and industry.',
   'img/sudarshan-big.jpg', NULL, 1, 1, 6,
   'Custom & Industrial Films | Shivalya Agrotech', 'Custom films made to your size, GSM and micron requirements.')
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  short_description = VALUES(short_description),
  description = VALUES(description),
  image_path = VALUES(image_path),
  price_unit = VALUES(price_unit),
  sort_order = VALUES(sort_order),
  seo_title = VALUES(seo_title),
  seo_description = VALUES(seo_description);

-- ═══════════════════════════════════════════════════════════════
-- Product Variants — Mulching Film (5 variants, each roll 400m)
-- ═══════════════════════════════════════════════════════════════
-- Delete existing variants for mulching-film to re-seed cleanly
DELETE FROM product_variants WHERE product_id = (SELECT id FROM products WHERE slug = 'mulching-film');

INSERT INTO product_variants (product_id, label, thickness_micron, length_m, width_ft, weight_kg, ply, price, price_unit, includes_transport, sort_order)
VALUES
  ((SELECT id FROM products WHERE slug = 'mulching-film'),
   '20 micron, 3.25 ft wide, 7 kg', 20, 400, 3.25, 7.00, NULL, 750.00, 'per roll', 0, 1),

  ((SELECT id FROM products WHERE slug = 'mulching-film'),
   '20 micron, 4 ft wide, 7.5 kg', 20, 400, 4.00, 7.50, NULL, 900.00, 'per roll', 0, 2),

  ((SELECT id FROM products WHERE slug = 'mulching-film'),
   '25 micron, 3.25 ft wide, 8.5 kg', 25, 400, 3.25, 8.50, NULL, 1050.00, 'per roll', 0, 3),

  ((SELECT id FROM products WHERE slug = 'mulching-film'),
   '25 micron, 4 ft wide, 9.5 kg', 25, 400, 4.00, 9.50, NULL, 1250.00, 'per roll', 0, 4),

  ((SELECT id FROM products WHERE slug = 'mulching-film'),
   '30 micron, 4 ft wide, 10.5 kg', 30, 400, 4.00, 10.50, NULL, 1550.00, 'per roll', 0, 5);

-- ═══════════════════════════════════════════════════════════════
-- Product Variants — Jute Thread (3 variants, price per kg, transport included)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM product_variants WHERE product_id = (SELECT id FROM products WHERE slug = 'jute-thread');

INSERT INTO product_variants (product_id, label, thickness_micron, length_m, width_ft, weight_kg, ply, price, price_unit, includes_transport, sort_order)
VALUES
  ((SELECT id FROM products WHERE slug = 'jute-thread'),
   '6 Ply', NULL, NULL, NULL, NULL, 6, 130.00, 'per kg', 1, 1),

  ((SELECT id FROM products WHERE slug = 'jute-thread'),
   '7 Ply', NULL, NULL, NULL, NULL, 7, 140.00, 'per kg', 1, 2),

  ((SELECT id FROM products WHERE slug = 'jute-thread'),
   '8 Ply', NULL, NULL, NULL, NULL, 8, 150.00, 'per kg', 1, 3);

-- ═══════════════════════════════════════════════════════════════
-- Gallery Items (all 16 images from main.js gallery)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM gallery_items;

INSERT INTO gallery_items (title, image_path, category, sort_order, is_active) VALUES
  ('Black Rolls',          'img/black-rolls.jpg',      'products', 1, 1),
  ('Field Black Mulch',    'img/field-black.jpg',      'field',    2, 1),
  ('Safecrop Field',       'img/safecrop-field.jpg',   'field',    3, 1),
  ('Kothari Sheet',        'img/kothari-sheet.jpg',    'products', 4, 1),
  ('Agri Kisaan',          'img/agri-kisaan.jpg',      'field',    5, 1),
  ('Sudarshan Big',        'img/sudarshan-big.jpg',    'products', 6, 1),
  ('Black Stack',          'img/black-stack.jpg',      'products', 7, 1),
  ('Orange Stock',         'img/orange-stock.jpg',     'products', 8, 1),
  ('Silver Hand',          'img/silver-hand.jpg',      'products', 9, 1),
  ('Jute Hanks',           'img/jute-hanks.jpg',       'products', 10, 1),
  ('Cones Stack',          'img/cones-stack.jpg',      'products', 11, 1),
  ('Yarn Cone',            'img/yarn-cone.jpg',        'products', 12, 1),
  ('Yarn Packed',          'img/yarn-packed.jpg',      'products', 13, 1),
  ('Factory',              'img/factory.jpg',          'factory',  14, 1),
  ('Yarn Machine',         'img/yarn-machine.jpg',     'factory',  15, 1),
  ('Cone Line',            'img/cone-line.jpg',        'factory',  16, 1);

-- ═══════════════════════════════════════════════════════════════
-- Industries (4 industries matching frontend)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO industries (slug, name, description, image_path, sort_order, is_active)
VALUES
  ('farmers', 'Farmers',
   'Mulching film to control weeds, save water and raise yield in vegetable and fruit crops.',
   'img/safecrop-field.jpg', 1, 1),
  ('nurseries', 'Nurseries',
   'Pre-cut mulch sheets with the hole size and spacing your crop needs.',
   'img/kothari-sheet.jpg', 2, 1),
  ('manufacturers', 'Manufacturers',
   'Custom and industrial films in your size, GSM and micron, supplied in bulk.',
   'img/sudarshan-big.jpg', 3, 1),
  ('textile', 'Textile & Yarn',
   'Cotton, polyester and other yarn cones, plus jute thread in 6, 7 and 8 ply.',
   'img/yarn-machine.jpg', 4, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_path = VALUES(image_path),
  sort_order = VALUES(sort_order);

-- ═══════════════════════════════════════════════════════════════
-- Site Settings (company details)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('company_name',    'Shivalya Agrotech Producer Company', 1),
  ('company_legal',   'Shivalya Agrotech Producer Company Limited', 1),
  ('address',         '674, Sector 8, Ambala City, Ambala, Haryana, 134003', 1),
  ('phone',           '+91 99503 37442', 1),
  ('email',           'shivalyaagrotechproducercompany@gmail.com', 1),
  ('gstin',           '06ABCCS6046A1ZQ', 1),
  ('contact_person',  'Rahul Meena', 1),
  ('whatsapp_number', '919950337442', 1),
  ('hero_title',      'Quality Materials<em>for Better Farming</em>', 1),
  ('hero_subtitle',   'We supply high quality mulching films, jute thread, agricultural plastic rolls, yarn and custom solutions for farmers, manufacturers and businesses across India.', 1),
  ('hero_eyebrow',    'Agricultural Plastic Films, Jute Thread & Textile Solutions', 1),
  ('footer_text',     'Mulching films, jute thread, agricultural plastic rolls, yarn and custom solutions for farmers, manufacturers and businesses across India.', 1),
  ('business_hours',  'Monday – Saturday, 9:00 AM – 7:00 PM', 1),
  ('constitution',    'Private Limited Company', 1),
  ('gst_reg_date',    '17 July 2020', 1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public = VALUES(is_public);

-- ═══════════════════════════════════════════════════════════════
-- Pages Content — About
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pages_content (page_slug, section_key, title, body, image_path, sort_order, is_active) VALUES
  ('about', 'who_we_are', 'Who we are',
   '<p>Shivalya Agrotech Producer Company Limited is a private limited company based in Ambala City, Haryana, registered under GST since 17 July 2020.</p><p>We supply UV stabilized mulching films, jute thread, agricultural plastic rolls, pre-cut mulch sheets, yarn cones and custom films to farmers, manufacturers and businesses across India.</p><p>Our aim is simple: dependable material, fair price and on-time delivery, so farmers can grow more with less effort.</p>',
   'img/factory.jpg', 1, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), image_path = VALUES(image_path);

-- Pages Content — Quality
INSERT INTO pages_content (page_slug, section_key, title, body, image_path, sort_order, is_active) VALUES
  ('quality', 'uv_film', 'UV stabilized film',
   'Mulching films made to last through the crop season.', NULL, 1, 1),
  ('quality', 'clear_specs', 'Clear specifications',
   'Micron, width, length and weight are stated for every roll.', NULL, 2, 1),
  ('quality', 'gst_registered', 'GST registered',
   'Regular GST registration, GSTIN 06ABCCS6046A1ZQ.', NULL, 3, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body);

-- Pages Content — Infrastructure
INSERT INTO pages_content (page_slug, section_key, title, body, image_path, sort_order, is_active) VALUES
  ('infrastructure', 'film_extrusion', 'Film Extrusion', NULL, 'img/silver-machine.jpg', 1, 1),
  ('infrastructure', 'yarn_production', 'Yarn Production', NULL, 'img/yarn-machine.jpg', 2, 1),
  ('infrastructure', 'packaging', 'Finished Products & Packaging', NULL, 'img/sudarshan-big.jpg', 3, 1),
  ('infrastructure', 'bulk_supply', 'Bulk Supply Ready', NULL, 'img/factory.jpg', 4, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title), image_path = VALUES(image_path);
