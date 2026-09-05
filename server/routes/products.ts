import { Router, type Request, type Response } from "express"
import { db, dbAll, dbGet, type ProductRow, type SQLParam } from "../db"
import type { Product } from "../../shared/types"

const router = Router()

/** 转义 LIKE 通配符（% _ \），防止用户输入干扰搜索 */
function likeEscape(s: string): string {
  return String(s).replace(/[\\%_]/g, "\\$&")
}

type SortKey = "default" | "sales" | "price_asc" | "price_desc" | "newest"

const orderMap: Record<SortKey, string> = {
  default: "id ASC",
  sales: "sales DESC",
  price_asc: "price ASC",
  price_desc: "price DESC",
  newest: "created_at DESC, id DESC"
}

/** 查询行（price 为分转元后的别名）即为前端契约的 Product */
type ProductQueryRow = Product

// GET /api/products?category=&keyword=&page=1&pageSize=12&sort=default|sales|price_asc|price_desc|newest
router.get("/", (req: Request, res: Response) => {
  const category = String(req.query.category ?? "全部")
  const keyword = String(req.query.keyword ?? "")
  const sort = String(req.query.sort ?? "default")
  const page = Math.max(1, parseInt(String(req.query.page)) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(String(req.query.pageSize)) || 12))

  let where = "WHERE is_active = 1"
  const params: SQLParam[] = []
  if (category && category !== "全部") {
    where += " AND category = ?"
    params.push(category)
  }
  if (keyword) {
    where += " AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')"
    const kw = `%${likeEscape(keyword.trim())}%`
    params.push(kw, kw)
  }

  const orderBy = orderMap[sort as SortKey] || orderMap.default

  const total = dbGet<{ c: number }>(
    db.prepare(`SELECT COUNT(*) AS c FROM products ${where}`),
    ...params
  )!.c
  const list = dbAll<ProductQueryRow>(
    db.prepare(
      `SELECT id, name, description, price_cents / 100.0 AS price, sales, category, emoji, bg, stock
       FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ),
    ...params,
    pageSize,
    (page - 1) * pageSize
  )

  res.json({ list, total, page, pageSize })
})

// 分类列表（含商品数量），供前端筛选栏动态渲染
router.get("/categories", (_req: Request, res: Response) => {
  const rows = dbAll<{ name: string; count: number }>(
    db.prepare(
      "SELECT category AS name, COUNT(*) AS count FROM products WHERE is_active = 1 GROUP BY category ORDER BY COUNT(*) DESC"
    )
  )
  const total = dbGet<{ c: number }>(
    db.prepare("SELECT COUNT(*) AS c FROM products WHERE is_active = 1")
  )!.c
  res.json({ categories: [{ name: "全部", count: total }, ...rows] })
})

router.get("/:id", (req: Request, res: Response) => {
  const p = dbGet<ProductQueryRow>(
    db.prepare(
      `SELECT id, name, description, price_cents / 100.0 AS price, sales, category, emoji, bg, stock
       FROM products WHERE id = ? AND is_active = 1`
    ),
    Number(req.params.id)
  )
  if (!p) return res.status(404).json({ message: "商品不存在或已下架" })
  res.json({ product: p })
})

export default router
