-- 002_indexes.sql
-- Additional indexes for performance. Safe to run multiple times.

USE shivalya_agrotech;

-- Products: FULLTEXT search on name + descriptions
-- DROP and re-create to be idempotent (ALTER TABLE IF NOT EXISTS for indexes not supported)
SET @ft_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'products' AND INDEX_NAME = 'ft_products_search');
SET @sql = IF(@ft_exists = 0,
  'CREATE FULLTEXT INDEX ft_products_search ON products(name, short_description, description)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Products: category_id for JOIN queries
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_category');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_products_category ON products(category_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Products: is_active + sort_order for filtered listing
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_active_sort');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_products_active_sort ON products(is_active, sort_order)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Product Variants: product_id for JOIN
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'product_variants' AND INDEX_NAME = 'idx_variants_product');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_variants_product ON product_variants(product_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Product Images: product_id
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'product_images' AND INDEX_NAME = 'idx_images_product');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_images_product ON product_images(product_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Gallery: is_active + sort_order
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'gallery_items' AND INDEX_NAME = 'idx_gallery_active_sort');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_gallery_active_sort ON gallery_items(is_active, sort_order)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Quote requests: status for admin filtering
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'quote_requests' AND INDEX_NAME = 'idx_quotes_status');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_quotes_status ON quote_requests(status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Contact messages: status
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'contact_messages' AND INDEX_NAME = 'idx_contact_status');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_contact_status ON contact_messages(status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Industries: is_active + sort_order
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'industries' AND INDEX_NAME = 'idx_industries_active_sort');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_industries_active_sort ON industries(is_active, sort_order)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Audit log: table_name + created_at for admin queries
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'audit_log' AND INDEX_NAME = 'idx_audit_table_date');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_audit_table_date ON audit_log(table_name, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Sessions: expires for cleanup
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'shivalya_agrotech' AND TABLE_NAME = 'sessions' AND INDEX_NAME = 'idx_sessions_expires');
SET @sql = IF(@idx = 0,
  'CREATE INDEX idx_sessions_expires ON sessions(expires)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
