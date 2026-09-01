# 优选商城 🛍️

一个完整可交付使用的全栈电商系统：**Vue 3 + Vite 前端 + Node.js (Express) + SQLite 后端**。

## 功能特性

### 用户端

- 🔐 **用户体系**：注册 / 登录（JWT 鉴权，密码 bcrypt 加密存储），登录态 7 天有效
- 🏠 **首页**：轮播 Banner、特色服务、热门商品榜
- 🔍 **商品列表**：分类筛选（动态统计）、关键词搜索、排序（销量/价格/最新）、分页
- 📦 **商品详情**：库存展示、数量选择、加入购物车 / 立即购买，售罄标识
- 🛒 **购物车**：服务端持久化（跨设备同步）、勾选结算、数量增减（库存上限校验）
- 📝 **订单结算**：收货地址管理（增删改查 + 默认地址）、订单金额实时计算
- 💳 **模拟支付**：下单后一键支付，订单状态流转 `待支付 → 待收货 → 已完成`，支持取消（自动回补库存）
- 👤 **个人中心**：资料展示、订单统计、地址管理、退出登录
- 📱 **响应式设计**：适配桌面、平板、手机

### 后端 API

| 模块   | 端点                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 认证   | `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`                                                       |
| 商品   | `GET /api/products`（分页/筛选/搜索/排序）· `GET /api/products/categories` · `GET /api/products/:id`                          |
| 购物车 | `GET/POST /api/cart` · `PUT/DELETE /api/cart/:productId` · `DELETE /api/cart`                                                 |
| 地址   | `GET/POST /api/addresses` · `PUT/DELETE /api/addresses/:id`                                                                   |
| 订单   | `POST /api/orders`（事务扣库存）· `GET /api/orders` · `GET /api/orders/:id` · `POST /api/orders/:id/pay` `/cancel` `/confirm` |

> 完整请求示例见各路由文件 `server/routes/*.js`。

## 快速开始

要求：Node.js >= 22.5（使用内置 `node:sqlite`，无需原生编译依赖）。

```bash
# 1. 安装依赖（根目录 + client）
npm run install:all

# 2. 初始化种子数据（18 款商品 + 演示账号 demo/123456）
npm run seed

# 3. 开发模式（同时启动后端 :3000 与前端 Vite :5173）
npm run dev
# 浏览器访问 http://localhost:5173

# —— 或者 —— 生产部署 ——
npm run build        # 构建前端到 client/dist
npm start            # 单进程托管前后端，访问 http://localhost:3000
```

**工程化命令：**

```bash
npm test             # 后端 API 集成测试（node:test + 内存数据库，无外部依赖）
npm run lint         # ESLint 检查（ESLint 9 + eslint-plugin-vue）
npm run lint:fix     # 自动修复
npm run format       # Prettier 统一格式化
```

> 环境变量通过 `.env` 文件配置（参考 `.env.example`），支持 `PORT`、`JWT_SECRET`、`CORS_ORIGIN`、`DB_PATH`。

**演示账号**：`demo` / `123456`

其他命令：

```bash
node server/seed.js --force   # 清空并重灌商品数据
```

## 项目结构

```
preferred-store/
├── package.json             # 根配置与统一启动脚本
├── server/                  # Express 后端
│   ├── index.js             # 入口：路由挂载、静态托管、错误处理
│   ├── db.js                # SQLite 连接、事务工具、旧库迁移
│   ├── errors.js            # BizError 业务错误类
│   ├── schema.sql           # 建表语句
│   ├── seed.js              # 种子数据（商品 + 演示账号）
│   ├── middleware/auth.js   # JWT 签发与鉴权中间件
│   ├── jobs/order-expiry.js # 待支付订单超时自动取消
│   ├── test/api.test.js     # API 集成测试（node:test）
│   ├── routes/
│   │   ├── auth.js          # 注册 / 登录 / 我的信息
│   │   ├── products.js      # 商品列表 / 分类 / 详情
│   │   ├── cart.js          # 购物车 CRUD
│   │   ├── addresses.js     # 收货地址 CRUD
│   │   └── orders.js        # 下单（事务）/ 支付 / 取消 / 确认收货
│   └── data/shop.db         # 数据库文件（运行时生成，已 gitignore）
└── client/                  # Vue 3 前端
    ├── vite.config.js       # 含 /api 开发代理
    └── src/
        ├── api.js           # 统一请求封装（token 注入、401 处理）
        ├── router/index.js  # 路由与登录守卫
        ├── stores/          # Pinia：auth / cart
        ├── components/      # NavBar / ProductCard / ToastHost
        ├── styles/          # 页面级样式
        └── views/           # 首页/列表/详情/登录注册/购物车/结算/订单/个人中心
```

## 技术栈

- **前端**：Vue 3（Composition API）+ Vite + Vue Router 4 + Pinia
- **后端**：Express 4 + node:sqlite + JWT + bcryptjs
- **数据库**：SQLite（单文件，零外部依赖）

## 生产部署说明

1. 配置环境变量：
   - `JWT_SECRET`：生产环境必须更换（默认值仅供开发调试）
   - `PORT`：默认 3000
2. `npm run build && npm start` 即可以单进程方式提供前端页面与 API。
3. 数据库文件位于 `server/data/shop.db`；首次启动自动建表，执行一次 `npm run seed` 初始化数据。

## 已知边界（后续可扩展）

- [ ] 支付为模拟实现，接入微信/支付宝需对接真实网关与回调
- [ ] 无商家后台（商品上下架、订单发货由仓储系统触发）
- [ ] 可增加图片上传、优惠券、评价体系等能力
