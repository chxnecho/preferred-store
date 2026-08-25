<template>
  <div class="product-card" @click="goDetail">
    <div class="product-img" :style="{ background: product.bg }">
      {{ product.emoji }}
      <div v-if="product.stock <= 0" class="sold-out-badge">已售罄</div>
    </div>
    <div class="product-body">
      <div class="product-name">{{ product.name }}</div>
      <div class="product-desc">{{ product.description }}</div>
      <div class="product-bottom">
        <span class="price">{{ formatPrice(product.price) }}</span>
        <span class="sales">{{ salesText }}</span>
        <button
          class="add-cart-btn"
          :disabled="product.stock <= 0"
          @click.stop="handleAdd"
        >
          {{ product.stock <= 0 ? "补货中" : "加入购物车" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
import { toast } from "../toast";
import { formatPrice } from "../utils";

const props = defineProps({ product: { type: Object, required: true } });
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const cart = useCartStore();

const salesText = computed(() => {
  const s = props.product.sales;
  return s >= 10000 ? `已售 ${(s / 10000).toFixed(1)}万` : `已售 ${s}`;
});

function goDetail() {
  router.push(`/product/${props.product.id}`);
}

async function handleAdd() {
  if (!auth.isLoggedIn()) {
    toast("请先登录再购物哦～");
    router.push({ name: "login", query: { redirect: route.fullPath } });
    return;
  }
  try {
    await cart.add(props.product.id, 1);
    toast("已加入购物车 🛒");
  } catch (err) {
    toast(err.message, "error");
  }
}
</script>
