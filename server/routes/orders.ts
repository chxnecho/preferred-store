import { Router, type Request, type Response } from "express"
import {
  db,
  dbAll,
  dbGet,
  genOrderNo,
  withTransaction,
  type OrderItemRow,
  type OrderRow,
  type ProductRow,
  type SQLParam
} from "../db"
import { BizError } from "../errors"
import { authRequired } from "../middleware/auth"
import type { AddressSnapshot, Order, OrderItem, OrderStatus } from "../../shared/types"

const router = Router()
router.use(authRequired)

export const STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "待支付",
  paid: "待收货",
  completed: "已完成",
  cancelled: "已取消"
}

/** 批量加载多个订单的明细（单次 IN 查询，避免 N+1） */
function loadOrderItems(orderIds: number[]): Map<number, OrderItem[]> {
  const byOrder = new Map<number, OrderItem[]>()
  if (orderIds.length === 0) return byOrder
  const placeholders = orderIds.map(() => "?").join(", ")
  const rows = dbAll<OrderItemRow>(
    db.prepare(
      `SELECT order_id, product_id AS productId, name_snapshot AS name, emoji, bg,
              price_cents / 100.0 AS price, qty
       FROM order_items WHERE order_id IN (${placeholders})`
    ),
    ...orderIds
  )
  for (const row of rows) {
    const { order_id, ...item } = row
    const oid = order_id as number
    if (!byOrder.has(oid)) byOrder.set(oid, [])
    byOrder.get(oid)!.push(item as unknown as OrderItem)
  }
  return byOrder
}

function orderToJSON(order: OrderRow, items: OrderItem[]): Order {
  return {
    id: order.id,
    orderNo: order.order_no,
    total: order.total_cents / 100,
    status: order.status,
    statusText: STATUS_TEXT[order.status],
    address: JSON.parse(order.address_snapshot) as AddressSnapshot,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items
  }
}

function orderWithItems(order: OrderRow): Order {
  return orderToJSON(order, loadOrderItems([order.id]).get(order.id) || [])
}

/** 订单列表专用：一次批量查询明细 */
function ordersWithItems(orders: OrderRow[]): Order[] {
  const byOrder = loadOrderItems(orders.map((o) => o.id))
  return orders.map((o) => orderToJSON(o, byOrder.get(o.id) || []))
}

interface OrderProductSource {
  product: ProductRow
  qty: number
  pid: number
}

// POST /api/orders  { addressId, items?: [{productId, qty}] }
// 不传 items 时使用购物车全部商品；成功后从购物车移除对应条目
router.post("/", (req, res) => {
  const body = (req.body || {}) as {
    addressId?: unknown
    items?: Array<{ productId?: unknown; qty?: unknown }>
  }
  const addressId = Number(body.addressId)
  const customItems = Array.isArray(body.items) ? body.items : null

  const addr = dbGet<{ id: number; receiver: string; phone: string; region: string; detail: string }>(
    db.prepare("SELECT id, receiver, phone, region, detail FROM addresses WHERE id = ? AND user_id = ?"),
    addressId,
    req.user.id
  )
  if (!addr) return res.status(400).json({ message: "请选择有效的收货地址" })

  try {
    const orderId = withTransaction<number>(() => {
      // 1. 确定订单商品来源
      let rows: OrderProductSource[]
      if (customItems) {
        if (customItems.length === 0) throw new BizError("订单商品不能为空")
        rows = customItems.map((it) => {
          const p = dbGet<ProductRow>(
            db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1"),
            Number(it.productId)
          )
          if (!p) throw new BizError("包含无效或已下架商品")
          return {
            product: p,
            qty: Math.max(1, parseInt(String(it.qty)) || 1),
            pid: Number(it.productId)
          }
        })
      } else {
        rows = dbAll<ProductRow & { pid: number; qty: number }>(
          db.prepare(
            `SELECT c.product_id AS pid, c.qty, p.id, p.name, p.description, p.price_cents, p.sales,
                    p.category, p.emoji, p.bg, p.stock, p.is_active, p.created_at
             FROM cart_items c JOIN products p ON p.id = c.product_id
             WHERE c.user_id = ? AND p.is_active = 1`
          ),
          req.user.id
        ).map((r) => ({ product: r, qty: r.qty, pid: r.pid }))
        if (rows.length === 0) throw new BizError("购物车为空，无法下单")
      }

      // 2. 校验库存并计算总价（分单位累加避免浮点误差）
      let totalCents = 0
      for (const { product, qty } of rows) {
        if (product.stock < qty) {
          throw new BizError(`「${product.name}」库存不足（仅剩 ${product.stock} 件）`)
        }
        totalCents += product.price_cents * qty
      }

      // 3. 创建订单 + 明细，扣减库存、累计销量；30 分钟未支付自动过期
      const addressSnapshot: AddressSnapshot = {
        receiver: addr.receiver,
        phone: addr.phone,
        region: addr.region,
        detail: addr.detail
      }
      const info = db
        .prepare(
          `INSERT INTO orders (order_no, user_id, total_cents, status, address_snapshot, expire_at)
           VALUES (?, ?, ?, 'pending', ?, datetime('now', '+30 minutes'))`
        )
        .run(genOrderNo(), req.user.id, totalCents, JSON.stringify(addressSnapshot))

      const lastId = Number(info.lastInsertRowid)
      const itemStmt = db.prepare(
        "INSERT INTO order_items (order_id, product_id, name_snapshot, emoji, bg, price_cents, qty) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      const stockStmt = db.prepare("UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?")
      for (const { product, qty, pid } of rows) {
        itemStmt.run(lastId, pid, product.name, product.emoji, product.bg, product.price_cents, qty)
        stockStmt.run(qty, qty, pid)
      }

      return lastId
    })

    // 4. 清空购物车中已下单的商品（事务外执行，失败不影响订单）
    try {
      if (customItems) {
        const delStmt = db.prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")
        for (const it of customItems) delStmt.run(req.user.id, Number(it.productId))
      } else {
        db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(req.user.id)
      }
    } catch (e) {
      console.error("[cart cleanup]", e)
    }

    const order = dbGet<OrderRow>(db.prepare("SELECT * FROM orders WHERE id = ?"), orderId)!
    res.status(201).json({ order: orderWithItems(order) })
  } catch (err) {
    if (err instanceof BizError) return res.status(400).json({ message: err.message })
    throw err
  }
})

// GET /api/orders?status=&page=&pageSize
router.get("/status-map", (_req: Request, res: Response) => res.json({ map: STATUS_TEXT }))

router.get("/", (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page)) || 1)
  const pageSize = 10
  let where = "WHERE user_id = ?"
  const params: SQLParam[] = [req.user.id]
  const status = String(req.query.status || "")
  if (status && STATUS_TEXT[status as OrderStatus]) {
    where += " AND status = ?"
    params.push(status)
  }
  const total = dbGet<{ c: number }>(
    db.prepare(`SELECT COUNT(*) AS c FROM orders ${where}`),
    ...params
  )!.c
  const orders = dbAll<OrderRow>(
    db.prepare(`SELECT * FROM orders ${where} ORDER BY id DESC LIMIT ? OFFSET ?`),
    ...params,
    pageSize,
    (page - 1) * pageSize
  )
  res.json({ list: ordersWithItems(orders), total, page, pageSize })
})

router.get("/:id", (req: Request, res: Response) => {
  const order = dbGet<OrderRow>(
    db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?"),
    Number(req.params.id),
    req.user.id
  )
  if (!order) return res.status(404).json({ message: "订单不存在" })
  res.json({ order: orderWithItems(order) })
})

// POST /api/orders/:id/pay —— 模拟支付
router.post("/:id/pay", (req: Request, res: Response) => {
  // 条件更新（仅 pending 可支付）+ 检查影响行数，避免 check-then-act 竞态
  const info = db
    .prepare(
      "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ? AND user_id = ? AND status = 'pending'"
    )
    .run(Number(req.params.id), req.user.id)
  if (info.changes === 0) return res.status(404).json({ message: "订单不存在或当前状态不可支付" })
  const order = dbGet<OrderRow>(db.prepare("SELECT * FROM orders WHERE id = ?"), Number(req.params.id))!
  res.json({ order: orderWithItems(order) })
})

// POST /api/orders/:id/cancel —— 取消订单（待支付状态），回补库存与销量
router.post("/:id/cancel", (req: Request, res: Response) => {
  try {
    withTransaction(() => {
      const order = dbGet<OrderRow>(
        db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?"),
        Number(req.params.id),
        req.user.id
      )
      if (!order) throw new BizError("订单不存在", 404)
      if (order.status !== "pending") throw new BizError("仅待支付订单可取消")
      const items = dbAll<{ product_id: number; qty: number }>(
        db.prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?"),
        order.id
      )
      for (const it of items) {
        db.prepare(
          "UPDATE products SET stock = stock + ?, sales = MAX(sales - ?, 0) WHERE id = ?"
        ).run(it.qty, it.qty, it.product_id)
      }
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id)
    })
    res.json({
      order: orderWithItems(
        dbGet<OrderRow>(db.prepare("SELECT * FROM orders WHERE id = ?"), Number(req.params.id))!
      )
    })
  } catch (err) {
    if (err instanceof BizError) return res.status(err.statusCode || 400).json({ message: err.message })
    throw err
  }
})

// POST /api/orders/:id/confirm —— 确认收货（待收货 → 已完成）
router.post("/:id/confirm", (req: Request, res: Response) => {
  const info = db
    .prepare("UPDATE orders SET status = 'completed' WHERE id = ? AND user_id = ? AND status = 'paid'")
    .run(Number(req.params.id), req.user.id)
  if (info.changes === 0)
    return res.status(404).json({ message: "订单不存在或当前状态不可确认收货" })
  const order = dbGet<OrderRow>(db.prepare("SELECT * FROM orders WHERE id = ?"), Number(req.params.id))!
  res.json({ order: orderWithItems(order) })
})

export default router