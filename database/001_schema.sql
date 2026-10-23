-- 001_schema.sql
-- Full schema for Shivalya Agrotech. All tables use InnoDB, utf8mb4.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

USE shivalya_agrotech;

-- ─── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100)  NOT NULL,
  name        VARCHAR(200)  NOT NULL,
  short_description TEXT     NULL,
  image_path  VARCHAR(500)  NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id      BIGINT UNSIGNED NULL,
  slug             VARCHAR(200)    NOT NULL,
  name             VARCHAR(300)    NOT NULL,
  short_description TEXT           NULL,
  description      TEXT            NULL,
  image_path       VARCHAR(500)    NULL,
  price_unit       VARCHAR(50)     NULL,
  is_active        TINYINT(1)      NOT NULL DEFAULT 1,
  is_featured      TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order       INT             NOT NULL DEFAULT 0,
  seo_title        VARCHAR(300)    NULL,
  seo_description  VARCHAR(500)    NULL,
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_slug (slug),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Product Variants ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        BIGINT UNSIGNED NOT NULL,
  label             VARCHAR(200)    NOT NULL,
  thickness_micron  DECIMAL(8,2)    NULL,
  length_m          DECIMAL(10,2)   NULL,
  width_ft          DECIMAL(8,2)    NULL,
  weight_kg         DECIMAL(8,2)    NULL,
  ply               INT             NULL,
  price             DECIMAL(12,2)   NULL,
  price_unit        VARCHAR(50)     NULL DEFAULT 'per unit',
  includes_transport TINYINT(1)     NOT NULL DEFAULT 0,
  is_active         TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order        INT             NOT NULL DEFAULT 0,
  extra_attributes  JSON            NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Product Images ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500)    NOT NULL,
  alt_text    VARCHAR(300)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_images_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Gallery Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)    NOT NULL,
  image_path  VARCHAR(500)    NOT NULL,
  category    VARCHAR(100)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Industries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industries (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100)    NOT NULL,
  name        VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  image_path  VARCHAR(500)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_industries_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Site Settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key   VARCHAR(100)    NOT NULL,
  setting_value TEXT            NULL,
  is_public     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Pages Content ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages_content (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_slug   VARCHAR(100)    NOT NULL,
  section_key VARCHAR(100)    NOT NULL,
  title       VARCHAR(300)    NULL,
  body        TEXT            NULL,
  image_path  VARCHAR(500)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pages_section (page_slug, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Quote Requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_requests (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_no           VARCHAR(30)     NOT NULL,
  product_id             BIGINT UNSIGNED NULL,
  product_name_snapshot  VARCHAR(300)    NULL,
  variant_label_snapshot VARCHAR(300)    NULL,
  specification          VARCHAR(500)    NULL,
  quantity               VARCHAR(100)    NULL,
  quantity_unit          VARCHAR(50)     NULL,
  name                   VARCHAR(200)    NOT NULL,
  phone                  VARCHAR(20)     NOT NULL,
  email                  VARCHAR(200)    NULL,
  message                TEXT            NULL,
  source_page            VARCHAR(100)    NULL,
  status                 ENUM('new','contacted','quoted','won','lost') NOT NULL DEFAULT 'new',
  admin_notes            TEXT            NULL,
  ip_hash                VARCHAR(128)    NULL,
  user_agent             VARCHAR(500)    NULL,
  created_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quote_reference (reference_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Contact Messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)    NOT NULL,
  phone       VARCHAR(20)     NOT NULL,
  email       VARCHAR(200)    NULL,
  subject     VARCHAR(300)    NULL,
  message     TEXT            NULL,
  status      ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  ip_hash     VARCHAR(128)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Admin Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name          VARCHAR(200)    NOT NULL,
  email              VARCHAR(200)    NOT NULL,
  password_hash      VARCHAR(255)    NOT NULL,
  role               ENUM('admin','staff') NOT NULL DEFAULT 'admin',
  must_change_password TINYINT(1)    NOT NULL DEFAULT 1,
  is_active          TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at      TIMESTAMP       NULL,
  failed_login_count INT             NOT NULL DEFAULT 0,
  locked_until       TIMESTAMP       NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Audit Log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id  BIGINT UNSIGNED NULL,
  table_name     VARCHAR(100)    NOT NULL,
  row_id         BIGINT UNSIGNED NULL,
  action         VARCHAR(50)     NOT NULL,
  old_values     JSON            NULL,
  new_values     JSON            NULL,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Sessions (for express-session MySQL store) ───────────────
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128)  NOT NULL,
  expires     INT UNSIGNED  NOT NULL,
  data        MEDIUMTEXT    NULL,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
