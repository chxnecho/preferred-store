<template>
  <header class="header">
    <div class="container header-inner">
      <router-link class="logo" to="/">🛍️ 优选商城</router-link>
      <div class="search-box">
        <input v-model="keyword" type="text" placeholder="搜索商品..." @keydown.enter="doSearch" />
        <button @click="doSearch">🔍</button>
      </div>
      <nav class="nav">
        <router-link to="/">首页</router-link>
        <router-link to="/products">全部商品</router-link>
        <router-link v-if="auth.isLoggedIn()" to="/orders">我的订单</router-link>
        <button class="cart-btn" @click="$router.push('/cart')">
          🛒 购物车
          <span v-if="cart.totalQty > 0" class="cart-count">{{ cart.totalQty }}</span>
        </button>
        <template v-if="auth.isLoggedIn()">
          <div class="user-menu" @click.stop>
            <span class="user-name" @click="menuOpen = !menuOpen">
              👤 {{ auth.user?.nickname || auth.user?.username }} ▾
            </span>
            <div v-if="menuOpen" class="dropdown" @click="menuOpen = false">
              <router-link to="/profile">个人中心</router-link>
              <router-link to="/orders">我的订单</router-link>
              <button @click="logout">退出登录</button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login">登录</router-link>
          <router-link to="/register">注册</router-link>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"

const auth = useAuthStore()
const cart = useCartStore()
const route = useRoute()
const router = useRouter()

const keyword = ref("")
const menuOpen = ref(false)

watch(
  () => route.query.keyword,
  (kw) => {
    if (route.name === "products") keyword.value = kw || ""
  },
  { immediate: true }
)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  }
)

function doSearch() {
  const kw = keyword.value.trim()
  router.push({ name: "products", query: { ...route.query, keyword: kw || undefined, page: 1 } })
}

function logout() {
  menuOpen.value = false
  auth.logout()
  cart.fetchCart()
  router.push("/")
}
</script>

<style scoped>
@media (max-width: 600px) {
  .nav a:not(.keep) {
    display: none;
  }
}
</style>
