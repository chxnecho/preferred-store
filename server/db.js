// 数据库连接：使用 Node.js 内置的 node:sqlite（Node >= 22.5，无需原生编译依赖）
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "shop.db"));
db.exec("PRAGMA foreign_keys = ON;");

// ===== 旧版本库迁移：REAL 金额 → 整数分，并为待支付订单补充过期时间 =====
// 通过检查列名识别旧库（price/total → price_cents/total_cents），迁移后重建索引
(function migrateLegacyAmountColumns() {
  const cols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
  if (cols.length === 0 || cols.includes("price_cents")) return; // 新库无需迁移

  // 重建父表会连带影响外键约束，迁移期间临时关闭并在结束后恢复
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(`
    BEGIN;
    CREATE TABLE products_new (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      sales       INTEGER NOT NULL DEFAULT 0,
      category    TEXT    NOT NULL,
      emoji       TEXT    NOT NULL DEFAULT '🛍️',
      bg          TEXT    NOT NULL DEFAULT '#f0f0f0',
      stock       INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO products_new (id, name, description, price_cents, sales, category, emoji, bg, stock, created_at)
      SELECT id, name, description, CAST(ROUND(price * 100) AS INTEGER), sales, category, emoji, bg, stock, created_at
      FROM products;
    DROP TABLE products;
    ALTER TABLE products_new RENAME TO products;

    CREATE TABLE orders_new (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no         TEXT    NOT NULL UNIQUE,
      user_id          INTEGER NOT NULL REFERENCES users(id),
      total_cents      INTEGER NOT NULL CHECK (total_cents >= 0),
      status           TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
      address_snapshot TEXT    NOT NULL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      expire_at        TEXT,
      paid_at          TEXT
    );
    INSERT INTO orders_new (id, order_no, user_id, total_cents, status, address_snapshot, created_at, expire_at, paid_at)
      SELECT id, order_no, user_id, CAST(ROUND(total * 100) AS INTEGER), status, address_snapshot, created_at,
             CASE WHEN status = 'pending' THEN datetime(created_at, '+30 minutes') END,
             paid_at
      FROM orders;
    DROP TABLE orders;
    ALTER TABLE orders_new RENAME TO orders;

    CREATE TABLE order_items_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id    INTEGER NOT NULL REFERENCES products(id),
      name_snapshot TEXT    NOT NULL,
      emoji         TEXT    NOT NULL DEFAULT '🛍️',
      bg            TEXT    NOT NULL DEFAULT '#f0f0f0',
      price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
      qty           INTEGER NOT NULL CHECK (qty > 0)
    );
    INSERT INTO order_items_new (id, order_id, product_id, name_snapshot, emoji, bg, price_cents, qty)
      SELECT id, order_id, product_id, name_snapshot, emoji, bg, CAST(ROUND(price * 100) AS INTEGER), qty
      FROM order_items;
    DROP TABLE order_items;
    ALTER TABLE order_items_new RENAME TO order_items;
    COMMIT;
  `);
  db.exec("PRAGMA foreign_keys = ON;");
  console.log("✅ 数据库迁移完成：金额转换为整数分存储，待支付订单已设置 30 分钟过期时间");
})();

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

/** 在事务中执行 fn，异常时自动回滚 */
export function withTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** 生成订单号：14 位日期时间戳 + 6 位随机数，降低并发碰撞概率 */
export function genOrderNo() {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, "0");
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return ts + Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
}
