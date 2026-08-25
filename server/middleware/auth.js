import jwt from "jsonwebtoken";

const SECRET =
  process.env.JWT_SECRET || "youcai-mall-dev-secret-change-me-in-production";

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, {
    expiresIn: "7d",
  });
}

/** 必须登录 */
export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "请先登录" });
  try {
    req.user = jwt.verify(token, SECRET); // { id, username }
    next();
  } catch {
    res.status(401).json({ message: "登录已过期，请重新登录" });
  }
}

export { SECRET };
