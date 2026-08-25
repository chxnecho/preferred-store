import { Router } from "express";
import { db } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

function getCartItems(userId) {
  return db
    .prepare(
      `SELECT c.product_id AS productId, c.qty, p.name, p.description, p.price,
              p.emoji, p.bg, p.stock
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ? ORDER BY c.rowid DESC`
    )
    .all(userId);
}

router.get("/", (req, res) => {
  const items = getCartItems(req.user.id);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = Math.round(items.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100;
  res.json({ items, totalQty, totalPrice });
});

router.post("/", (req, res) => {
  const productId = Number(req.body?.productId);
  const qty = Math.max(1, parseInt(req.body?.qty) || 1);
  const product = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(productId);
  if (!product) return res.status(404).json({ message: "商品不存在或已下架" });
  if (product.stock <= 0) return res.status(400).json({ message: "该商品已售罄" });

  const row = db
    .prepare("SELECT qty FROM cart_items WHERE user_id = ? AND product_id = ?")
    .get(req.user.id, productId);
  const newQty = Math.min(product.stock, (row?.qty || 0) + qty);
  if (row) {
    db.prepare("UPDATE cart_items SET qty = ? WHERE user_id = ? AND product_id = ?").run(newQty, req.user.id, productId);
  } else {
    db.prepare("INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)").run(req.user.id, productId, newQty);
  }
  res.status(201).json(getCartPayload(req.user.id));
});

router.put("/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  const qty = parseInt(req.body?.qty);
  if (!Number.isInteger(qty)) return res.status(400).json({ message: "数量格式错误" });
  const row = db
    .prepare("SELECT qty FROM cart_items WHERE user_id = ? AND product_id = ?")
    .get(req.user.id, productId);
  if (!row) return res.status(404).json({ message: "购物车中不存在该商品" });

  if (qty <= 0) {
    db.prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?").run(req.user.id, productId);
  } else {
    const stock = db.prepare("SELECT stock FROM products WHERE id = ?").get(productId)?.stock ?? 0;
    db.prepare("UPDATE cart_items SET qty = ? WHERE user_id = ? AND product_id = ?").run(
      Math.min(qty, Math.max(stock, 1)), req.user.id, productId
    );
  }
  res.json(getCartPayload(req.user.id));
});

router.delete("/:productId", (req, res) => {
  db.prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?").run(req.user.id, Number(req.params.productId));
  res.json(getCartPayload(req.user.id));
});

router.delete("/", (req, res) => {
  db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(req.user.id);
  res.json(getCartPayload(req.user.id));
});

function getCartPayload(userId) {
  const items = getCartItems(userId);
  return {
    items,
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    totalPrice: Math.round(items.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100,
  };
}

export default router;
