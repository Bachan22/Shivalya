-- 004_attribute_definitions.sql
-- Creates attribute_definitions table and seeds the core filterable attributes.
-- Fully idempotent with IF NOT EXISTS and ON DUPLICATE KEY UPDATE.

USE shivalya_agrotech;

CREATE TABLE IF NOT EXISTS attribute_definitions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attr_key       VARCHAR(100)    NOT NULL,
  label          VARCHAR(200)    NOT NULL,
  unit           VARCHAR(50)     NULL,
  type           ENUM('discrete', 'range') NOT NULL DEFAULT 'discrete',
  is_filterable  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order     INT             NOT NULL DEFAULT 0,
  is_active      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attr_key (attr_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO attribute_definitions (attr_key, label, unit, type, is_filterable, sort_order, is_active)
VALUES
  ('thickness_micron', 'Thickness', 'micron', 'discrete', 1, 1, 1),
  ('width_ft',         'Width',     'ft',     'discrete', 1, 2, 1),
  ('length_m',         'Length',    'm',      'discrete', 1, 3, 1),
  ('weight_kg',        'Weight',    'kg',     'range',    1, 4, 1),
  ('ply',              'Ply',       'ply',    'discrete', 1, 5, 1),
  ('price',            'Price',     '₹',      'range',    1, 6, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  unit = VALUES(unit),
  type = VALUES(type),
  is_filterable = VALUES(is_filterable),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
