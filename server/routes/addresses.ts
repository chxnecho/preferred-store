import { Router, type Request, type Response } from "express"
import { db, dbAll, dbGet, withTransaction, type AddressRow } from "../db"
import { authRequired } from "../middleware/auth"
import type { Address, AddressInput } from "../../shared/types"

const router = Router()
router.use(authRequired)

function shape(a: AddressRow): Address {
  return {
    id: a.id,
    receiver: a.receiver,
    phone: a.phone,
    region: a.region,
    detail: a.detail,
    isDefault: Boolean(a.is_default)
  }
}

router.get("/", (req, res) => {
  const rows = dbAll<AddressRow>(
    db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC"),
    req.user.id
  )
  res.json({ list: rows.map(shape) })
})

router.post("/", (req, res) => {
  const { receiver, phone, region, detail, isDefault } = (req.body || {}) as Partial<AddressInput>
  if (!receiver || !phone || !region || !detail) {
    return res.status(400).json({ message: "收货人、电话、所在地区和详细地址均不能为空" })
  }
  if (!/^1[3-9]\d{9}$/.test(String(phone))) {
    return res.status(400).json({ message: "手机号格式不正确" })
  }
  const cnt = dbGet<{ c: number }>(
    db.prepare("SELECT COUNT(*) AS c FROM addresses WHERE user_id = ?"),
    req.user.id
  )!.c
  if (cnt >= 20) return res.status(400).json({ message: "地址数量已达上限（20 条）" })

  const makeDefault = Boolean(isDefault) || cnt === 0
  const id = withTransaction(() => {
    if (makeDefault)
      db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(req.user.id)
    const info = db
      .prepare(
        "INSERT INTO addresses (user_id, receiver, phone, region, detail, is_default) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        req.user.id,
        String(receiver).slice(0, 30),
        String(phone),
        String(region).slice(0, 60),
        String(detail).slice(0, 120),
        makeDefault ? 1 : 0
      )
    return Number(info.lastInsertRowid)
  })
  res
    .status(201)
    .json({ address: shape(dbGet<AddressRow>(db.prepare("SELECT * FROM addresses WHERE id = ?"), id)!) })
})

router.put("/:id", (req, res) => {
  const addr = dbGet<AddressRow>(
    db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?"),
    Number(req.params.id),
    req.user.id
  )
  if (!addr) return res.status(404).json({ message: "地址不存在" })
  const body = (req.body || {}) as Partial<AddressInput>
  const receiver = body.receiver ?? addr.receiver
  const phone = body.phone ?? addr.phone
  const region = body.region ?? addr.region
  const detail = body.detail ?? addr.detail
  const isDefault = body.isDefault ?? Boolean(addr.is_default)
  if (!receiver || !phone || !region || !detail) {
    return res.status(400).json({ message: "字段不能为空" })
  }
  if (!/^1[3-9]\d{9}$/.test(String(phone))) {
    return res.status(400).json({ message: "手机号格式不正确" })
  }
  withTransaction(() => {
    if (isDefault)
      db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(req.user.id)
    db.prepare(
      "UPDATE addresses SET receiver = ?, phone = ?, region = ?, detail = ?, is_default = ? WHERE id = ?"
    ).run(
      String(receiver).slice(0, 30),
      String(phone),
      String(region).slice(0, 60),
      String(detail).slice(0, 120),
      isDefault ? 1 : 0,
      addr.id
    )
    // 兜底：确保用户始终至少有一个默认地址（如取消唯一默认时，将当前地址设为默认）
    const hasDefault = dbGet<{ "1": number }>(
      db.prepare("SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1"),
      req.user.id
    )
    if (!hasDefault) {
      db.prepare("UPDATE addresses SET is_default = 1 WHERE id = ?").run(addr.id)
    }
  })
  res.json({ address: shape(dbGet<AddressRow>(db.prepare("SELECT * FROM addresses WHERE id = ?"), addr.id)!) })
})

router.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?")
    .run(Number(req.params.id), req.user.id)
  if (info.changes === 0) return res.status(404).json({ message: "地址不存在" })
  // 若删除的是默认地址，提升第一条为默认
  const first = dbGet<{ id: number }>(
    db.prepare("SELECT id FROM addresses WHERE user_id = ? LIMIT 1"),
    req.user.id
  )
  if (first) db.prepare("UPDATE addresses SET is_default = 1 WHERE id = ?").run(first.id)
  res.json({ ok: true })
})

export default router
