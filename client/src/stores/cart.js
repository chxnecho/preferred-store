import { create } from "zustand"
import { api } from "../api"
import { useAuthStore } from "./auth"

function apply(data) {
  return { items: data.items, totalQty: data.totalQty, totalPrice: data.totalPrice }
}

export const useCartStore = create((set) => ({
  items: [],
  totalQty: 0,
  totalPrice: 0,
  loaded: false,

  fetchCart: async () => {
    if (!useAuthStore.getState().isLoggedIn()) {
      set({ items: [], totalQty: 0, totalPrice: 0, loaded: true })
      return
    }
    const data = await api.cart()
    set({ ...apply(data), loaded: true })
  },

  add: async (productId, qty = 1) => {
    set(apply(await api.addToCart(productId, qty)))
  },

  updateQty: async (productId, qty) => {
    set(apply(await api.updateCartItem(productId, qty)))
  },

  remove: async (productId) => {
    set(apply(await api.removeCartItem(productId)))
  },

  clear: async () => {
    set(apply(await api.clearCart()))
  }
}))
