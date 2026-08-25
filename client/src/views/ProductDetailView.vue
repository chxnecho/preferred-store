<template>
  <main class="container detail-page">
    <p v-if="loading" class="empty-tip">加载中...</p>
    <p v-else-if="!product" class="empty-tip">商品不存在或已下架 😢</p>
    <div v-else class="detail-card">
      <div class="detail-img" :style="{ background: product.bg }">{{ product.emoji }}</div>
      <div class="detail-info">
        <h2>{{ product.name }}</h2>
        <p class="detail-desc">{{ product.description }}</p>
        <div class="detail-meta">
          <span>分类：{{ product.category }}</span>
          <span>{{ salesText }}</span>
          <span :class="{ danger: product.stock <= 10 }">库存：{{ product.stock }} 件</span>
        </div>
        <div class="detail-price-row">
          <span class="price big">{{ formatPrice(product.price) }}</span>
        </div>

        <!-- 数量选择 -->
        <div class="qty-row" v-if="product.stock > 0">
          <label>数量</label>
          <div class="qty-control">
            <button @click="qty = Math.max(1, qty - 1)" :disabled="qty <= 1">−</button>
            <span class="qty">{{ qty }}</span>
            <button @click="qty = Math.min(product.stock, qty + 1)" :disabled="qty >= product.stock">＋</button>
          </div>
        </div>

        <div class="detail-actions">
          <template v-if="product.stock > 0">
            <button class="btn-outline" @click="addToCart(false)" :disabled="submitting">加入购物车</button>
            <button class="btn-primary buy-btn" @click="addToCart(true)" :disabled="submitting">
              {{ submitting ? "处理中..." : "立即购买" }}
            </button>
          </template>
          <button v-else class="btn-primary" disabled>已售罄</button>
        </div>

        <div class="service-line">
          🚚 极速配送 · ✅ 正品保障 · 🔄 七天无理由退换
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
import { toast } from "../toast";
import { formatPrice } from "../utils";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

const product = ref(null);
const loading = ref(true);
const qty = ref(1);
const submitting = ref(false);

const salesText = computed(() => {
  const s = product.value?.sales || 0;
  return s >= 10000 ? `已售 ${(s / 10000).toFixed(1)}万` : `已售 ${s}`;
});

async function load() {
  loading.value = true;
  qty.value = 1;
  try {
    const data = await api.product(route.params.id);
    product.value = data.product;
    document.title = `${data.product.name} - 优选商城`;
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
}

function requireLogin() {
  if (auth.isLoggedIn()) return true;
  toast("请先登录再购物哦～");
  router.push({ name: "login", query: { redirect: route.fullPath } });
  return false;
}

async function addToCart(buyNow) {
  if (!requireLogin()) return;
  submitting.value = true;
  try {
    await cart.add(product.value.id, qty.value);
    toast("已加入购物车 🛒");
    if (buyNow) router.push("/checkout");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
watch(() => route.params.id, () => route.name === "product-detail" && load());
</script>

<style scoped>
.detail-page { padding: 32px 0; }
.detail-card {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  background: #fff; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow);
}
.detail-img { min-height: 420px; display: flex; align-items: center; justify-content: center; font-size: 150px; }
.detail-info { padding: 36px 30px; display: flex; flex-direction: column; }
.detail-info h2 { font-size: 24px; margin-bottom: 10px; }
.detail-desc { color: var(--text-light); line-height: 1.8; margin-bottom: 16px; }
.detail-meta { display: flex; gap: 18px; font-size: 13px; color: var(--text-light); margin-bottom: 18px; flex-wrap: wrap; }
.detail-meta .danger { color: var(--primary-dark); font-weight: 600; }
.detail-price-row { padding: 16px 20px; background: var(--primary-light); border-radius: 12px; margin-bottom: 20px; }
.price.big { font-size: 32px; }

.qty-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.qty-row label { font-size: 14px; color: var(--text-light); }
.qty-control { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 999px; overflow: hidden; }
.qty-control button { width: 34px; height: 34px; background: #fafafa; font-size: 16px; }
.qty-control button:disabled { opacity: 0.4; cursor: not-allowed; }
.qty { min-width: 44px; text-align: center; font-size: 15px; font-weight: 600; }

.detail-actions { display: flex; gap: 14px; margin-bottom: 22px; }
.buy-btn { flex: 0 0 auto; min-width: 140px; }
.service-line { margin-top: auto; font-size: 13px; color: #9a9aa3; border-top: 1px dashed var(--border); padding-top: 16px; }

@media (max-width: 900px) {
  .detail-card { grid-template-columns: 1fr; }
  .detail-img { min-height: 240px; font-size: 100px; }
}
</style>
