<template>
  <main>
    <!-- 轮播 Banner -->
    <section class="banner">
      <div
        v-for="(s, i) in slides"
        :key="i"
        class="banner-slide"
        :class="[`slide-${i + 1}`, { active: i === current }]"
      >
        <div class="banner-content">
          <h1>{{ s.title }}</h1>
          <p>{{ s.sub }}</p>
          <router-link :to="s.to" class="btn-primary">{{ s.btn }}</router-link>
        </div>
      </div>
      <button class="banner-arrow prev" @click="go(current - 1)">‹</button>
      <button class="banner-arrow next" @click="go(current + 1)">›</button>
      <div class="banner-dots">
        <span
          v-for="(s, i) in slides"
          :key="i"
          :class="{ active: i === current }"
          @click="go(i)"
        ></span>
      </div>
    </section>

    <!-- 特色服务 -->
    <section class="features container">
      <div class="feature-item"><span>🚚</span><div><b>极速配送</b><small>全国包邮次日达</small></div></div>
      <div class="feature-item"><span>✅</span><div><b>正品保障</b><small>官方授权假一赔十</small></div></div>
      <div class="feature-item"><span>🔄</span><div><b>七天退换</b><small>无忧售后放心购</small></div></div>
      <div class="feature-item"><span>💬</span><div><b>专属客服</b><small>7×24 小时在线</small></div></div>
    </section>

    <!-- 热门商品 -->
    <section class="container hot-section">
      <div class="hot-head">
        <h2 class="section-title">🔥 热门商品</h2>
        <router-link to="/products?sort=sales" class="more-link">查看更多 ›</router-link>
      </div>
      <div class="product-grid">
        <ProductCard v-for="p in hotProducts" :key="p.id" :product="p" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { api } from "../api";
import ProductCard from "../components/ProductCard.vue";

const slides = [
  { title: "夏季大促 · 低至 5 折", sub: "全场爆款限时特惠，错过再等一年", btn: "立即抢购", to: "/products" },
  { title: "新品首发 · 数码专场", sub: "最新科技产品，抢先体验未来生活", btn: "查看新品", to: "/products?category=数码&sort=newest" },
  { title: "品质生活 · 家居焕新", sub: "精选家居好物，打造温馨小家", btn: "探索家居", to: "/products?category=家居" },
];

const current = ref(0);
const hotProducts = ref([]);
let timer = null;

function go(i) {
  current.value = (i + slides.length) % slides.length;
}

onMounted(async () => {
  timer = setInterval(() => go(current.value + 1), 4000);
  try {
    const data = await api.products({ sort: "sales", pageSize: 8 });
    hotProducts.value = data.list;
  } catch (err) {
    console.error(err);
  }
});
onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.banner { position: relative; height: 380px; overflow: hidden; }
.banner-slide {
  position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s ease;
  display: flex; align-items: center; justify-content: center;
}
.banner-slide.active { opacity: 1; }
.slide-1 { background: linear-gradient(120deg, #ff7a59, #ffb347); }
.slide-2 { background: linear-gradient(120deg, #4f8cff, #38d0ff); }
.slide-3 { background: linear-gradient(120deg, #34c98e, #a8e063); }
.banner-content { text-align: center; color: #fff; animation: fadeUp 0.8s ease; }
@keyframes fadeUp {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.banner-content h1 { font-size: 40px; margin-bottom: 12px; text-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.banner-content p { font-size: 17px; margin-bottom: 24px; opacity: 0.95; }
.banner-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,0.35); color: #fff; font-size: 22px; z-index: 5;
}
.banner-arrow:hover { background: rgba(255,255,255,0.55); }
.prev { left: 24px; }
.next { right: 24px; }
.banner-dots { position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; gap: 10px; z-index: 5; }
.banner-dots span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.3s; }
.banner-dots span.active { background: #fff; width: 26px; border-radius: 999px; }

.features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 24px; }
.feature-item {
  background: #fff; border-radius: var(--radius); padding: 18px;
  display: flex; align-items: center; gap: 12px; font-size: 22px;
}
.feature-item b { display: block; font-size: 15px; }
.feature-item small { color: var(--text-light); font-size: 12px; }

.hot-head { display: flex; align-items: baseline; justify-content: space-between; }
.more-link { color: var(--text-light); font-size: 14px; }
.more-link:hover { color: var(--primary); }

@media (max-width: 900px) {
  .features { grid-template-columns: repeat(2, 1fr); }
  .banner { height: 280px; }
  .banner-content h1 { font-size: 28px; }
}
@media (max-width: 600px) {
  .features { grid-template-columns: 1fr; }
}
</style>
