import { getToken, setToken, setStoredUser } from "./auth"

/** 认证失效时广播事件（App.vue 监听后清理状态并引导重新登录） */
export const AUTH_EXPIRED_EVENT = "auth:expired"

async function request(path, { method = "GET", body, signal } = {}) {
  const headers = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err?.name === "AbortError") throw err // 请求被取消，交由调用方静默处理
    throw new Error("网络异常，请确认后端服务已启动", { cause: err })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // token 失效：清除本地登录态并广播，由监听器清理 Pinia 状态并引导重新登录
    if (res.status === 401 && token) {
      setToken("")
      setStoredUser(null)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    throw new Error(data.message || `请求失败（${res.status}）`)
  }
  return data
}

export const api = {
  // 认证
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: (opts) => request("/auth/me", opts),
  // 商品
  products: (query = {}, opts = {}) => request(`/products?${new URLSearchParams(query)}`, opts),
  categories: () => request("/products/categories"),
  product: (id) => request(`/products/${id}`),
  // 购物车
  cart: () => request("/cart"),
  addToCart: (productId, qty = 1) => request("/cart", { method: "POST", body: { productId, qty } }),
  updateCartItem: (productId, qty) =>
    request(`/cart/${productId}`, { method: "PUT", body: { qty } }),
  removeCartItem: (productId) => request(`/cart/${productId}`, { method: "DELETE" }),
  clearCart: () => request("/cart", { method: "DELETE" }),
  // 地址
  addresses: () => request("/addresses"),
  addAddress: (body) => request("/addresses", { method: "POST", body }),
  updateAddress: (id, body) => request(`/addresses/${id}`, { method: "PUT", body }),
  deleteAddress: (id) => request(`/addresses/${id}`, { method: "DELETE" }),
  // 订单
  orders: (query = {}) => request(`/orders?${new URLSearchParams(query)}`),
  order: (id) => request(`/orders/${id}`),
  createOrder: (body) => request("/orders", { method: "POST", body }),
  payOrder: (id) => request(`/orders/${id}/pay`, { method: "POST" }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
  confirmOrder: (id) => request(`/orders/${id}/confirm`, { method: "POST" })
}
