import { getToken, setToken, setStoredUser } from "./auth"

async function request(path, { method = "GET", body } = {}) {
  const headers = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new Error("网络异常，请确认后端服务已启动")
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // token 失效：清除本地登录态，由路由守卫引导重新登录
    if (res.status === 401 && token) {
      setToken("")
      setStoredUser(null)
    }
    throw new Error(data.message || `请求失败（${res.status}）`)
  }
  return data
}

export const api = {
  // 认证
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  // 商品
  products: (query = {}) => request(`/products?${new URLSearchParams(query)}`),
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
