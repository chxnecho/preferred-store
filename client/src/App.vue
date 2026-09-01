<script setup>
import { onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import NavBar from "./components/NavBar.vue"
import ConfirmDialog from "./components/ConfirmDialog.vue"
import ToastHost from "./components/ToastHost.vue"
import { AUTH_EXPIRED_EVENT } from "./api"
import { useAuthStore } from "./stores/auth"
import { toast } from "./toast"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/** token 失效（api 层广播）：清理 Pinia 状态，按当前页面引导重新登录 */
function onAuthExpired() {
  auth.logout()
  if (route.meta.requiresAuth) {
    router.push({ name: "login", query: { redirect: route.fullPath } })
    toast("登录已过期，请重新登录", "error")
  }
}

onMounted(() => {
  window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  auth.fetchMe() // 启动时刷新用户信息，避免 localStorage 缓存陈旧
})
onUnmounted(() => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired))
</script>

<template>
  <NavBar />
  <router-view />
  <footer class="footer">
    <div class="container">
      <p>© 2026 优选商城 · 精选好物，品质生活</p>
    </div>
  </footer>
  <ToastHost />
  <ConfirmDialog />
</template>
