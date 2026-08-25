import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import { useAuthStore } from "./auth";

export const useCartStore = defineStore("cart", () => {
  const items = ref([]);
  const totalQty = ref(0);
  const totalPrice = ref(0);
  const loaded = ref(false);

  async function fetchCart() {
    const auth = useAuthStore();
    if (!auth.isLoggedIn()) {
      items.value = [];
      totalQty.value = 0;
      totalPrice.value = 0;
      loaded.value = true;
      return;
    }
    const data = await api.cart();
    items.value = data.items;
    totalQty.value = data.totalQty;
    totalPrice.value = data.totalPrice;
    loaded.value = true;
  }

  async function add(productId, qty = 1) {
    const data = await api.addToCart(productId, qty);
    apply(data);
  }

  async function updateQty(productId, qty) {
    const data = await api.updateCartItem(productId, qty);
    apply(data);
  }

  async function remove(productId) {
    const data = await api.removeCartItem(productId);
    apply(data);
  }

  async function clear() {
    const data = await api.clearCart();
    apply(data);
  }

  function apply(data) {
    items.value = data.items;
    totalQty.value = data.totalQty;
    totalPrice.value = data.totalPrice;
  }

  return { items, totalQty, totalPrice, loaded, fetchCart, add, updateQty, remove, clear };
});
