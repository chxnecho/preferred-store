/**
 * 前后端共享的 API 契约类型。
 * server 返回的数据形状、client 期望的数据形状都以此为准，改字段名时编译器全链路报错。
 */

/** 订单状态：pending 待支付 / paid 待收货 / completed 已完成 / cancelled 已取消 */
export type OrderStatus = "pending" | "paid" | "completed" | "cancelled"

export interface User {
  id: number
  username: string
  nickname: string
  createdAt: string // UTC "YYYY-MM-DD HH:MM:SS"
}

export interface Product {
  id: number
  name: string
  description: string
  price: number // 元（存储为整数分，API 层转换）
  sales: number
  category: string
  emoji: string
  bg: string
  stock: number
}

export interface Address {
  id: number
  receiver: string
  phone: string
  region: string
  detail: string
  isDefault: boolean
}

export interface AddressInput {
  receiver: string
  phone: string
  region: string
  detail: string
  isDefault: boolean
}

/** 订单中的收货地址快照（下单时冻结） */
export type AddressSnapshot = Omit<Address, "id" | "isDefault">

export interface OrderItem {
  productId: number
  name: string
  emoji: string
  bg: string
  price: number
  qty: number
}

export interface Order {
  id: number
  orderNo: string // 20 位：14 位时间戳 + 6 位随机数
  total: number
  status: OrderStatus
  statusText: string
  address: AddressSnapshot
  createdAt: string
  paidAt: string | null
  items: OrderItem[]
}

/** 购物车行：商品信息 + 数量 + 库存状态标记 */
export interface CartItem {
  productId: number
  qty: number
  name: string
  description: string
  price: number
  emoji: string
  bg: string
  stock: number
  soldOut: 0 | 1 // 已售罄（或已下架）
  stockShortage: 0 | 1 // 持有数量超出库存
}

export interface CartPayload {
  items: CartItem[]
  totalQty: number
  totalPrice: number
}

export interface ProductListPayload {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

export interface CategoryPayload {
  name: string
  count: number
}

/** 认证成功响应 */
export interface AuthPayload {
  token: string
  user: User
}
