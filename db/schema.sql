-- MarketHub database schema (MySQL 8 / MariaDB 10.4+).  Run once:  mysql -u root < db/schema.sql
CREATE DATABASE IF NOT EXISTS markethub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE markethub;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(190) NOT NULL,
  ip           VARCHAR(45)  NOT NULL DEFAULT '',
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_time (email, attempted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  name       VARCHAR(80)  NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  street     VARCHAR(200) NOT NULL,
  city       VARCHAR(80)  NOT NULL,
  state      VARCHAR(80)  NOT NULL DEFAULT '',
  zip        VARCHAR(20)  NOT NULL DEFAULT '',
  is_default TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED PRIMARY KEY,
  slug       VARCHAR(40) NOT NULL UNIQUE,
  name       VARCHAR(80) NOT NULL,
  emoji      VARCHAR(16) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sellers (
  id          INT UNSIGNED PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  is_official TINYINT(1)   NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED PRIMARY KEY,
  category_id   INT UNSIGNED NOT NULL,
  seller_id     INT UNSIGNED NOT NULL,
  name          VARCHAR(200) NOT NULL,
  brand         VARCHAR(60)  NOT NULL,
  price         INT UNSIGNED NOT NULL,            -- Naira
  old_price     INT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL DEFAULT 4,
  rv            VARCHAR(12)  NOT NULL DEFAULT '0', -- review count label, e.g. 1.2k
  stock         INT UNSIGNED NOT NULL DEFAULT 0,
  free_delivery TINYINT(1)   NOT NULL DEFAULT 1,
  emoji         VARCHAR(16)  NOT NULL DEFAULT '',
  image         VARCHAR(255) NULL,
  section       VARCHAR(10)  NULL,                -- home page block: flash | top | rec
  fbt           TINYINT(1)   NOT NULL DEFAULT 0,  -- shown under "Frequently Bought Together"
  details       JSON NULL,                        -- description, features, specs, colours, styles
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cat (category_id), KEY idx_brand (brand), KEY idx_section (section),
  CONSTRAINT fk_prod_cat    FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_prod_seller FOREIGN KEY (seller_id)   REFERENCES sellers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promo_codes (
  code   VARCHAR(30) PRIMARY KEY,
  type   ENUM('flat','pct') NOT NULL,
  value  INT UNSIGNED NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wl_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  qty        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  selected   TINYINT(1) NOT NULL DEFAULT 1,
  variant    VARCHAR(120) NULL,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_cart_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(10) NOT NULL UNIQUE,           -- e.g. MH12345678, shown to the customer
  user_id      INT UNSIGNED NOT NULL,
  ship_name    VARCHAR(80)  NOT NULL,
  ship_phone   VARCHAR(20)  NOT NULL,
  ship_street  VARCHAR(200) NOT NULL,
  ship_city    VARCHAR(80)  NOT NULL,
  ship_state   VARCHAR(80)  NOT NULL DEFAULT '',
  ship_zip     VARCHAR(20)  NOT NULL DEFAULT '',
  ship_method  ENUM('standard','express','pickup') NOT NULL,
  pay_method   ENUM('card','transfer','cod') NOT NULL,
  note         VARCHAR(500) NOT NULL DEFAULT '',
  promo_code   VARCHAR(30)  NULL,
  subtotal     INT UNSIGNED NOT NULL,
  delivery_fee INT UNSIGNED NOT NULL,
  discount     INT UNSIGNED NOT NULL DEFAULT 0,
  total        INT UNSIGNED NOT NULL,
  status       ENUM('placed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'placed',
  payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  name       VARCHAR(200) NOT NULL,                -- copied at purchase time
  price      INT UNSIGNED NOT NULL,
  qty        SMALLINT UNSIGNED NOT NULL,
  variant    VARCHAR(120) NULL,
  KEY idx_order (order_id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_item_prod  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80)  NOT NULL,
  email      VARCHAR(190) NOT NULL,
  topic      VARCHAR(60)  NOT NULL,
  message    VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seller_applications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business   VARCHAR(120) NOT NULL,
  owner      VARCHAR(80)  NOT NULL,
  email      VARCHAR(190) NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  category   VARCHAR(80)  NOT NULL,
  city       VARCHAR(80)  NOT NULL DEFAULT '',
  about      VARCHAR(600) NOT NULL DEFAULT '',
  status     ENUM('new','approved','rejected') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;