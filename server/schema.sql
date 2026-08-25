-- ===== 优选商城数据库结构 =====

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname      TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  price       REAL    NOT NULL CHECK (price >= 0),
  sales       INTEGER NOT NULL DEFAULT 0,
  category    TEXT    NOT NULL,
  emoji       TEXT    NOT NULL DEFAULT '🛍️',
  bg          TEXT    NOT NULL DEFAULT '#f0f0f0',
  stock       INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver   TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  region     TEXT    NOT NULL,
  detail     TEXT    NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty        INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  PRIMARY KEY (user_id, product_id)
);

-- 订单状态：pending 待支付 / paid 待收货 / completed 已完成 / cancelled 已取消
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no         TEXT    NOT NULL UNIQUE,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  total            REAL    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  address_snapshot TEXT    NOT NULL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  paid_at          TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  name_snapshot TEXT    NOT NULL,
  emoji         TEXT    NOT NULL DEFAULT '🛍️',
  bg            TEXT    NOT NULL DEFAULT '#f0f0f0',
  price         REAL    NOT NULL,
  qty           INTEGER NOT NULL CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
