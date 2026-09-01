import { Router } from "express"
import { db } from "../db.js"

const router = Router()

/** 转义 LIKE 通配符（% _ \），防止用户输入干扰搜索 */
function likeEscape(s) {
  return String(s).replace(/[\\%_]/g, "\\$&")
}

// GET /api/products?category=&keyword=&page=1&pageSize=12&sort=default|sales|price_asc|price_desc|newest
router.get("/", (req, res) => {
  const { category = "全部", keyword = "", sort = "default" } = req.query
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(req.query.pageSize) || 12))

  let where = "WHERE is_active = 1"
  const params = []
  if (category && category !== "全部") {
    where += " AND category = ?"
    params.push(String(category))
  }
  if (keyword) {
    where += " AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')"
    const kw = `%${likeEscape(String(keyword).trim())}%`
    params.push(kw, kw)
  }

  const orderMap = {
    default: "id ASC",
    sales: "sales DESC",
    price_asc: "price ASC",
    price_desc: "price DESC",
    newest: "created_at DESC, id DESC"
  }
  const orderBy = orderMap[sort] || orderMap.default

  const total = db.prepare(`SELECT COUNT(*) AS c FROM products ${where}`).get(...params).c
  const list = db
    .prepare(
      `SELECT id, name, description, price_cents / 100.0 AS price, sales, category, emoji, bg, stock
       FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize)

  res.json({ list, total, page, pageSize })
})

// 分类列表（含商品数量），供前端筛选栏动态渲染
router.get("/categories", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT category AS name, COUNT(*) AS count FROM products WHERE is_active = 1 GROUP BY category ORDER BY COUNT(*) DESC"
    )
    .all()
  const total = db.prepare("SELECT COUNT(*) AS c FROM products WHERE is_active = 1").get().c
  res.json({ categories: [{ name: "全部", count: total }, ...rows] })
})

router.get("/:id", (req, res) => {
  const p = db
    .prepare(
      `SELECT id, name, description, price_cents / 100.0 AS price, sales, category, emoji, bg, stock
       FROM products WHERE id = ? AND is_active = 1`
    )
    .get(req.params.id)
  if (!p) return res.status(404).json({ message: "商品不存在或已下架" })
  res.json({ product: p })
})

export default router
