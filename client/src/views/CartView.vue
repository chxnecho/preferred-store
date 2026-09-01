<template>
  <main class="container cart-page">
    <h2 class="section-title">🛒 我的购物车</h2>

    <p v-if="cart.totalQty === 0" class="empty-tip">
      购物车还是空的，快去<a href="#" @click.prevent="$router.push('/products')">逛逛</a>吧～
    </p>

    <template v-else>
      <div class="cart-list">
        <div v-for="item in cart.items" :key="item.productId" class="cart-row">
          <input
            type="checkbox"
            :checked="selected.has(item.productId)"
            @change="toggle(item.productId)"
          />
          <div
            class="row-img"
            :style="{ background: item.bg }"
            @click="$router.push(`/product/${item.productId}`)"
          >
            {{ item.emoji }}
          </div>
          <div class="row-info">
            <div class="row-name">
              {{ item.name }}
              <em v-if="item.soldOut" class="stock-badge soldout">已售罄</em>
              <em v-else-if="item.stockShortage" class="stock-badge shortage">库存不足，仅剩 {{ item.stock }} 件</em>
            </div>
            <div class="row-desc">{{ item.description }}</div>
          </div>
          <span class="price row-price">{{ formatPrice(item.price) }}</span>
          <div class="qty-control">
            <button :disabled="busy" @click="changeQty(item.productId, item.qty - 1)">−</button>
            <span class="qty">{{ item.qty }}</span>
            <button
              :disabled="busy || item.qty >= item.stock"
              :title="item.qty >= item.stock ? '已达库存上限' : ''"
              @click="changeQty(item.productId, item.qty + 1)"
            >
              ＋
            </button>
          </div>
          <span class="price row-subtotal">{{ formatPrice(item.price * item.qty) }}</span>
          <button class="remove-btn" @click="removeItem(item.productId)">🗑️ 删除</button>
        </div>
      </div>

      <div class="cart-summary">
        <label class="select-all">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" /> 全选
        </label>
        <div class="summary-right">
          <span>已选 <b>{{ selectedQty }}</b> 件，合计：</span>
          <strong class="price big">{{ formatPrice(selectedTotal) }}</strong>
          <button class="btn-primary" :disabled="selectedQty === 0 || busy" @click="goCheckout">
            去结算（{{ selectedQty }}）
          </button>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { useCartStore } from "../stores/cart"
import { toast } from "../toast"
import { formatPrice } from "../utils"

const router = useRouter()
const cart = useCartStore()
const selected = reactive(new Set())
const busy = ref(false)

const selectedItems = computed(() => cart.items.filter((i) => selected.has(i.productId)))
const selectedQty = computed(() => selectedItems.value.reduce((s, i) => s + i.qty, 0))
const selectedTotal = computed(
  () => Math.round(selectedItems.value.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100
)
const allSelected = computed(
  () => cart.items.length > 0 && cart.items.every((i) => selected.has(i.productId))
)

function syncSelection() {
  const ids = new Set(cart.items.map((i) => i.productId))
  for (const id of [...selected]) if (!ids.has(id)) selected.delete(id)
  if (selected.size === 0) for (const id of ids) selected.add(id)
}

function toggle(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id)
}
function toggleAll() {
  if (allSelected.value) for (const i of cart.items) selected.delete(i.productId)
  else for (const i of cart.items) selected.add(i.productId)
}

async function changeQty(productId, qty) {
  if (qty <= 0) return removeItem(productId)
  busy.value = true
  try {
    await cart.updateQty(productId, qty)
    syncSelection()
  } catch (err) {
    toast(err.message, "error")
    await cart.fetchCart()
    syncSelection()
  } finally {
    busy.value = false
  }
}

async function removeItem(productId) {
  busy.value = true
  try {
    await cart.remove(productId)
    toast("已删除")
  } catch (err) {
    toast(err.message, "error")
  } finally {
    busy.value = false
  }
}

function goCheckout() {
  // 售罄（qty 已被置 0）的商品不进入结算
  const ids = selectedItems.value.filter((i) => i.qty > 0).map((i) => i.productId)
  router.push({ name: "checkout", query: { ids: ids.join(",") } })
}

onMounted(async () => {
  await cart.fetchCart()
  syncSelection()
})
</script>

<style scoped src="../styles/cart.css"></style>
