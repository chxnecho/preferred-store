import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, authRequired } from "../middleware/auth.js";

const router = Router();

function publicUser(u) {
  return { id: u.id, username: u.username, nickname: u.nickname, createdAt: u.created_at };
}

router.post("/register", (req, res) => {
  const { username, password, nickname } = req.body || {};
  if (!username || typeof username !== "string" || !/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/.test(username)) {
    return res.status(400).json({ message: "用户名需为 3-20 位字母、数字、下划线或中文" });
  }
  if (!password || typeof password !== "string" || password.length < 6 || password.length > 32) {
    return res.status(400).json({ message: "密码长度需为 6-32 位" });
  }
  if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    return res.status(409).json({ message: "用户名已被注册" });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)")
    .run(username, hash, (nickname && String(nickname).slice(0, 20)) || username);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: "请输入用户名和密码" });
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(String(username));
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ message: "用户名或密码错误" });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", authRequired, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ message: "用户不存在" });
  res.json({ user: publicUser(user) });
});

export default router;
