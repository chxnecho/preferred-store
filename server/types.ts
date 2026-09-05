/** 服务端内部的补充类型（与 shared/types.ts 配合使用） */

import type { Request } from "express"

/** JWT 会话中的用户信息（token payload + 数据库校验后的结果） */
export interface SessionUser {
  id: number
  username: string
  nickname: string
}

// 类型增强：受保护路由中通过 authRequired 中间件保证 req.user 存在
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: SessionUser
    }
  }
}

export type { Request }
