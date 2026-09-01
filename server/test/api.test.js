// 后端 API 集成测试：node:test + 内置 fetch，内存数据库隔离
import assert from "node:assert/strict"
import bcrypt from "bcryptjs"
import { after, before, describe, it } from "node:test"

// 必须在导入 db.js / index.js 之前设置
process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory:"

const { db } = await import("../db.js")
const { app } = await import("../index.js")
const { cancelExpiredOrders } = await import("../jobs/order-expiry.js")

let server
let base
let token

// ---- 测试数据 ----
let userAlice // 用户 id
let pStock // 正常商品：库存 10，单价 19.9
let pSoldOut // 售罄商品：库存 0
let pTight // 小库存商品：库存 3（用于库存不足回滚）
let addrId

before(() => {
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}`

  const insUser = db.prepare(
    "INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)"
  )
  userAlice = insUser.run("alice", bcrypt.hashSync("pass123456", 10), "Alice").lastInsertRowid

  const insProduct = db.prepare(
    `INSERT INTO products (name, description, price_cents, sales, category, emoji, bg, stock)
     VALUES (?, ?, ?, 0, ?, '📦', '#eee', ?)`
  )
  pStock = insProduct.run("测试商品A", "desc", 1990, "测试", 10).lastInsertRowid
  pSoldOut = insProduct.run("测试商品B", "desc", 500, "测试", 0).lastInsertRowid
  pTight = insProduct.run("测试商品C", "desc", 1000, "测试", 3).lastInsertRowid

  addrId = db
    .prepare(
      "INSERT INTO addresses (user_id, receiver, phone, region, detail, is_default) VALUES (?, ?, ?, ?, ?, 1)"
    )
    .run(userAlice, "张三", "13800000000", "上海市 上海市 浦东新区", "测试路 1 号").lastInsertRowid
})

after(() => server.close())

async function req(pathname, { method = "GET", token: t, body } = {}) {
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

async function login(username, password) {
  const { status, data } = await req("/api/auth/login", {
    method: "POST",
    body: { username, password }
  })
  return { status, token: data.token }
}

function stockOf(productId) {
  return db.prepare("SELECT stock, sales FROM products WHERE id = ?").get(productId)
}

before(async () => {
  token = (await login("alice", "pass123456")).token
  assert.ok(token, "测试用户登录应成功")
})

// ===== 认证 =====
describe("auth", () => {
  it("注册成功返回 token，重复注册 409", async () => {
    const r1 = await req("/api/auth/register", {
      method: "POST",
      body: { username: "bob_01", password: "pass123456" }
    })
    assert.equal(r1.status, 201)
    assert.ok(r1.data.token)

    const r2 = await req("/api/auth/register", {
      method: "POST",
      body: { username: "bob_01", password: "pass123456" }
    })
    assert.equal(r2.status, 409)
  })

  it("正确密码可登录，错误密码 401", async () => {
    const ok = await login("alice", "pass123456")
    assert.equal(ok.status, 200)
    assert.ok(ok.token)

    const bad = await login("alice", "wrong-password")
    assert.equal(bad.status, 401)
  })

  it("无 token 访问受保护接口 401，伪造 token 401", async () => {
    assert.equal((await req("/api/cart")).status, 401)
    const forged = await req("/api/cart", { token: "eyJhbGciOiJIUzI1NiJ9.forged.sig" })
    assert.equal(forged.status, 401)
  })
})

// ===== 商品 =====
describe("products", () => {
  it("列表返回元为单位的价格与分页信息", async () => {
    const { status, data } = await req("/api/products?pageSize=2")
    assert.equal(status, 200)
    assert.ok(data.list.length <= 2)
    for (const p of data.list) assert.ok(Number.isFinite(p.price))
    assert.ok(data.total >= 3)
  })

  it("LIKE 通配符被转义（%% 匹配不到任何商品）", async () => {
    const { data } = await req("/api/products?keyword=%25%25")
    assert.equal(data.total, 0)
  })

  it("已下架商品从列表与详情中隐藏", async () => {
    db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(pSoldOut)
    const list = await req("/api/products")
    assert.ok(!list.data.list.some((p) => p.id === pSoldOut))
    assert.equal((await req(`/api/products/${pSoldOut}`)).status, 404)
    db.prepare("UPDATE products SET is_active = 1 WHERE id = ?").run(pSoldOut)
  })
})

// ===== 购物车 =====
describe("cart", () => {
  it("加入购物车数量被库存截断", async () => {
    const r = await req("/api/cart", {
      method: "POST",
      token,
      body: { productId: pStock, qty: 999 }
    })
    assert.equal(r.status, 201)
    const item = r.data.items.find((i) => i.productId === pStock)
    assert.equal(item.qty, 10) // Math.min(stock, qty)
  })

  it("售罄商品不可加购（400），遗留条目不可改数量（400）", async () => {
    const add = await req("/api/cart", {
      method: "POST",
      token,
      body: { productId: pSoldOut, qty: 1 }
    })
    assert.equal(add.status, 400)

    // 直接插入一条再尝试 PUT（模拟库存售罄前已加购的历史数据）
    db.prepare("INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, 1)").run(
      userAlice,
      pSoldOut
    )
    const put = await req(`/api/cart/${pSoldOut}`, { method: "PUT", token, body: { qty: 2 } })
    assert.equal(put.status, 400)
    db.prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?").run(
      userAlice,
      pSoldOut
    )
  })

  it("修改数量超过库存时被截断，qty<=0 删除条目", async () => {
    const put = await req(`/api/cart/${pStock}`, { method: "PUT", token, body: { qty: 999 } })
    assert.equal(put.status, 200)
    assert.equal(put.data.items.find((i) => i.productId === pStock).qty, 10)

    const del = await req(`/api/cart/${pStock}`, { method: "PUT", token, body: { qty: 0 } })
    assert.equal(del.status, 200)
    assert.ok(!del.data.items.some((i) => i.productId === pStock))
  })
})

// ===== 订单 =====
describe("orders", () => {
  it("库存不足时下单失败且不产生任何副作用（事务回滚）", async () => {
    const before = stockOf(pTight)
    const r = await req("/api/orders", {
      method: "POST",
      token,
      body: { addressId: addrId, items: [{ productId: pTight, qty: 999 }] }
    })
    assert.equal(r.status, 400)
    assert.match(r.data.message, /库存不足/)
    const after = stockOf(pTight)
    assert.equal(after.stock, before.stock)
    assert.equal(after.sales, before.sales)
  })

  it("下单成功：扣库存、加销量、写快照、设过期时间、清购物车", async () => {
    await req("/api/cart", { method: "POST", token, body: { productId: pStock, qty: 2 } })
    const before = stockOf(pStock)

    const r = await req("/api/orders", { method: "POST", token, body: { addressId: addrId } })
    assert.equal(r.status, 201)
    const order = r.data.order
    assert.equal(order.total, 39.8) // 19.9 × 2
    assert.equal(order.status, "pending")
    assert.match(order.orderNo, /^\d{20}$/)
    assert.equal(order.address.receiver, "张三")
    assert.equal(order.items[0].price, 19.9)

    const after = stockOf(pStock)
    assert.equal(after.stock, before.stock - 2)
    assert.equal(after.sales, before.sales + 2)

    assert.ok(db.prepare("SELECT expire_at FROM orders WHERE id = ?").get(order.id).expire_at)

    const cart = await req("/api/cart", { token })
    assert.ok(!cart.data.items.some((i) => i.productId === pStock))
  })

  it("状态机：支付后不可重复支付，确认收货需先支付", async () => {
    const created = await req("/api/orders", {
      method: "POST",
      token,
      body: { addressId: addrId, items: [{ productId: pTight, qty: 1 }] }
    })
    const oid = created.data.order.id

    // 未支付不能确认收货
    assert.equal((await req(`/api/orders/${oid}/confirm`, { method: "POST", token })).status, 404)

    assert.equal((await req(`/api/orders/${oid}/pay`, { method: "POST", token })).status, 200)
    // 重复支付被拒
    assert.equal((await req(`/api/orders/${oid}/pay`, { method: "POST", token })).status, 404)
    // 支付后可确认收货
    const done = await req(`/api/orders/${oid}/confirm`, { method: "POST", token })
    assert.equal(done.status, 200)
    assert.equal(done.data.order.status, "completed")
  })

  it("取消待支付订单回补库存与销量，已完成订单不可取消", async () => {
    const before = stockOf(pTight)
    const created = await req("/api/orders", {
      method: "POST",
      token,
      body: { addressId: addrId, items: [{ productId: pTight, qty: 2 }] }
    })
    const oid = created.data.order.id
    assert.equal(stockOf(pTight).stock, before.stock - 2)

    const cancelled = await req(`/api/orders/${oid}/cancel`, { method: "POST", token })
    assert.equal(cancelled.status, 200)
    const after = stockOf(pTight)
    assert.equal(after.stock, before.stock)
    assert.equal(after.sales, before.sales)

    const list = await req("/api/orders", { token })
    const completed = list.data.list.find((o) => o.status === "completed")
    assert.ok(completed, "应存在已完成订单")
    assert.equal(
      (await req(`/api/orders/${completed.id}/cancel`, { method: "POST", token })).status,
      400
    )
  })

  it("订单列表返回商品明细（批量查询）", async () => {
    const list = await req("/api/orders?status=pending", { token })
    assert.equal(list.status, 200)
    assert.ok(list.data.list.length > 0)
    for (const o of list.data.list) assert.ok(Array.isArray(o.items) && o.items.length > 0)
  })
})

// ===== 超时取消 =====
describe("order expiry", () => {
  it("超时未支付订单被自动取消并回补库存", async () => {
    const before = stockOf(pTight)
    const created = await req("/api/orders", {
      method: "POST",
      token,
      body: { addressId: addrId, items: [{ productId: pTight, qty: 2 }] }
    })
    const oid = created.data.order.id
    db.prepare("UPDATE orders SET expire_at = datetime('now', '-1 minute') WHERE id = ?").run(oid)

    assert.ok((await cancelExpiredOrders()) >= 1)
    assert.equal(db.prepare("SELECT status FROM orders WHERE id = ?").get(oid).status, "cancelled")
    assert.equal(stockOf(pTight).stock, before.stock)
    assert.equal(stockOf(pTight).sales, before.sales)
  })

  it("未过期订单不受清理影响", async () => {
    const created = await req("/api/orders", {
      method: "POST",
      token,
      body: { addressId: addrId, items: [{ productId: pTight, qty: 1 }] }
    })
    cancelExpiredOrders()
    assert.equal(
      db.prepare("SELECT status FROM orders WHERE id = ?").get(created.data.order.id).status,
      "pending"
    )
  })
})

// ===== 地址 =====
describe("addresses", () => {
  it("取消唯一默认地址后仍保证存在默认地址", async () => {
    const list = await req("/api/addresses", { token })
    const def = list.data.list.find((a) => a.isDefault)
    const upd = await req(`/api/addresses/${def.id}`, {
      method: "PUT",
      token,
      body: { isDefault: false }
    })
    assert.equal(upd.status, 200)
    const after = await req("/api/addresses", { token })
    assert.ok(after.data.list.some((a) => a.isDefault))
  })

  it("删除默认地址后自动提升第一条为默认", async () => {
    const added = await req("/api/addresses", {
      method: "POST",
      token,
      body: {
        receiver: "李四",
        phone: "13900000000",
        region: "北京市 北京市 朝阳区",
        detail: "测试路 2 号",
        isDefault: true
      }
    })
    const del = await req(`/api/addresses/${added.data.address.id}`, { method: "DELETE", token })
    assert.equal(del.status, 200)
    const after = await req("/api/addresses", { token })
    assert.ok(after.data.list.some((a) => a.isDefault))
  })
})
