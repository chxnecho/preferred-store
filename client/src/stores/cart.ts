import { create } from "zustand"
import { api } from "../api"
import { useAuthStore } from "./auth"
import type { CartItem } from "../../../shared/types"

interface CartState {
  items: CartItem[]
  totalQty: number
  totalPrice: number
  loaded: boolean
  fetchCart: () => Promise<void>
  add: (productId: number, qty?: number) => Promise<void>
  updateQty: (productId: number, qty: number) => Promise<void>
  remove: (productId: number) => Promise<void>
  clear: () => Promise<void>
}

function apply(data: { items: CartItem[]; totalQty: number; totalPrice: number }) {
  return { items: data.items, totalQty: data.totalQty, totalPrice: data.totalPrice }
}

export const useCartStore = create<CartState>((set) => ({
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