// 数据库连接：使用 Node.js 内置的 node:sqlite（Node >= 22.5，无需原生编译依赖）
import { DatabaseSync, type StatementSync } from "node:sqlite"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { OrderStatus } from "../shared/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, "data")
fs.mkdirSync(dataDir, { recursive: true })

// 可通过 DB_PATH 环境变量指定数据库位置（如测试时使用 :memory:）
export const db = new DatabaseSync(process.env.DB_PATH || path.join(dataDir, "shop.db"))
db.exec("PRAGMA foreign_keys = ON;")

/** node:sqlite 支持的绑定参数类型 */
export type SQLParam = string | number | bigint | null | Uint8Array

/** 带行类型的查询助手：node:sqlite 原生返回宽类型（Record<string, SQLOutputValue>），统一在此收窄 */
export function dbGet<T>(stmt: StatementSync, ...params: SQLParam[]): T | undefined {
  return stmt.get(...params) as T | undefined
}
export function dbAll<T>(stmt: StatementSync, ...params: SQLParam[]): T[] {
  return stmt.all(...params) as T[]
}

// ===== 数据库行类型（与 schema.sql 一一对应） =====
export interface UserRow {
  id: number
  username: string
  password_hash: string
  nickname: string
  created_at: string
}

export interface ProductRow {
  id: number
  name: string
  description: string
  price_cents: number
  sales: number
  category: string
  emoji: string
  bg: string
  stock: number
  is_active: 0 | 1
  created_at: string
}

export interface AddressRow {
  id: number
  user_id: number
  receiver: string
  phone: string
  region: string
  detail: string
  is_default: 0 | 1
  created_at: string
}

export interface OrderRow {
  id: number
  order_no: string
  user_id: number
  total_cents: number
  status: OrderStatus
  address_snapshot: string // JSON 字符串（AddressSnapshot）
  created_at: string
  expire_at: string | null
  paid_at: string | null
}

export interface OrderItemRow {
  id: number
  order_id: number
  product_id: number
  name_snapshot: string
  emoji: string
  bg: string
  price_cents: number
  qty: number
}

// ===== 旧版本库迁移：REAL 金额 → 整数分，并为待支付订单补充过期时间 =====
// 通过检查列名识别旧库（price/total → price_cents/total_cents），迁移后重建索引
;(function migrateLegacyAmountColumns() {
  const cols = db
    .prepare("PRAGMA table_info(products)")
    .all()
    .map((c: Record<string, unknown>) => String(c.name))
  if (cols.length === 0 || cols.includes("price_cents")) return // 新库无需迁移

  // 重建父表会连带影响外键约束，迁移期间临时关闭并在结束后恢复
  db.exec("PRAGMA foreign_keys = OFF;")
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
  `)
  db.exec("PRAGMA foreign_keys = ON;")
  console.log("✅ 数据库迁移完成：金额转换为整数分存储，待支付订单已设置 30 分钟过期时间")
})()

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8")
db.exec(schema)

/** 在事务中执行 fn，异常时自动回滚 */
export function withTransaction<T>(fn: () => T): T {
  db.exec("BEGIN")
  try {
    const result = fn()
    db.exec("COMMIT")
    return result
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}

/** 生成订单号：14 位日期时间戳 + 6 位随机数，降低并发碰撞概率 */
export function genOrderNo(): string {
  const d = new Date()
  const p = (n: number, l = 2) => String(n).padStart(l, "0")
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return ts + Math.floor(Math.random() * 1e6).toString().padStart(6, "0")
}

