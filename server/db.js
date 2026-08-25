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

/** 生成订单号：时间戳 + 随机数 */
export function genOrderNo() {
  return Date.now().toString() + Math.floor(1000 + Math.random() * 9000).toString();
}

/** 金额安全求和（分单位累加再转回元，避免浮点误差） */
export function sumMoney(list, pick) {
  return list.reduce((s, x) => s + Math.round(pick(x) * 100), 0) / 100;
}
