import { getToken, setToken, setStoredUser } from "./auth"
import type {
  Address,
  AddressInput,
  AuthPayload,
  CartPayload,
  Order,
  Product,
  ProductListPayload,
  User
} from "../../shared/types"

/** 认证失效时广播事件（App 监听后清理状态并引导重新登录） */
export const AUTH_EXPIRED_EVENT = "auth:expired"

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

async function request<T = unknown>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err // 请求被取消，交由调用方静默处理
    throw new Error("网络异常，请确认后端服务已启动", { cause: err })
  }

  const data = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) {
    // token 失效：清除本地登录态并广播，由监听器清理状态并引导重新登录
    if (res.status === 401 && token) {
      setToken("")
      setStoredUser(null)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    throw new Error(data.message || `请求失败（${res.status}）`)
  }
  return data as T
}

interface ProductsQuery {
  category?: string
  keyword?: string
  sort?: string
  page?: number
  pageSize?: number
}

interface OrdersQuery {
  status?: string
  page?: number
}

interface CreateOrderItem {
  productId: number
  qty: number
}

interface CreateOrderBody {
  addressId: number
  items?: CreateOrderItem[]
}

export const api = {
  // 认证
  register: (body: { username: string; password: string; nickname?: string }) =>
    request<AuthPayload>("/auth/register", { method: "POST", body }),
  login: (body: { username: string; password: string }) =>
    request<AuthPayload>("/auth/login", { method: "POST", body }),
  me: (opts?: RequestOptions) => request<{ user: User }>("/auth/me", opts),
  // 商品
  products: (query: ProductsQuery = {}, opts: RequestOptions = {}) =>
    request<ProductListPayload>(`/products?${new URLSearchParams(query as Record<string, string>)}`, opts),
  categories: () =>
    request<{ categories: Array<{ name: string; count: number }> }>("/products/categories"),
  product: (id: number | string) => request<{ product: Product }>(`/products/${id}`),
  // 购物车
  cart: () => request<CartPayload>("/cart"),
  addToCart: (productId: number, qty = 1) =>
    request<CartPayload>("/cart", { method: "POST", body: { productId, qty } }),
  updateCartItem: (productId: number, qty: number) =>
    request<CartPayload>(`/cart/${productId}`, { method: "PUT", body: { qty } }),
  removeCartItem: (productId: number) => request<CartPayload>(`/cart/${productId}`, { method: "DELETE" }),
  clearCart: () => request<CartPayload>("/cart", { method: "DELETE" }),
  // 地址
  addresses: () => request<{ list: Address[] }>("/addresses"),
  addAddress: (body: AddressInput) => request<{ address: Address }>("/addresses", { method: "POST", body }),
  updateAddress: (id: number, body: Partial<AddressInput>) =>
    request<{ address: Address }>(`/addresses/${id}`, { method: "PUT", body }),
  deleteAddress: (id: number) => request<{ ok: boolean }>(`/addresses/${id}`, { method: "DELETE" }),
  // 订单
  orders: (query: OrdersQuery = {}) =>
    request<{ list: Order[]; total: number; page: number; pageSize: number }>(
      `/orders?${new URLSearchParams(query as Record<string, string>)}`
    ),
  order: (id: number | string) => request<{ order: Order }>(`/orders/${id}`),
  createOrder: (body: CreateOrderBody) =>
    request<{ order: Order }>("/orders", { method: "POST", body }),
  payOrder: (id: number) => request<{ order: Order }>(`/orders/${id}/pay`, { method: "POST" }),
  cancelOrder: (id: number) => request<{ order: Order }>(`/orders/${id}/cancel`, { method: "POST" }),
  confirmOrder: (id: number) => request<{ order: Order }>(`/orders/${id}/confirm`, { method: "POST" })
}