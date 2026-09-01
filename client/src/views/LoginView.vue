<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>登录优选商城</h2>
      <p v-if="error" class="form-error">{{ error }}</p>
      <form @submit.prevent="submit">
        <div class="form-item">
          <label>用户名</label>
          <input v-model.trim="username" placeholder="请输入用户名" autocomplete="username" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <button class="btn-primary btn-block" :disabled="submitting">
          {{ submitting ? "登录中..." : "登 录" }}
        </button>
      </form>
      <p class="form-footer">
        还没有账号？<router-link :to="{ name: 'register', query: $route.query }">
          立即注册
        </router-link>
      </p>
      <p class="demo-hint">演示账号：demo / 123456</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import { safeRedirectPath } from "../utils"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const username = ref("")
const password = ref("")
const error = ref("")
const submitting = ref(false)

async function submit() {
  error.value = ""
  if (!username.value || !password.value) {
    error.value = "请输入用户名和密码"
    return
  }
  submitting.value = true
  try {
    await auth.login(username.value, password.value)
    cart.fetchCart()
    router.push(safeRedirectPath(route.query.redirect))
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.demo-hint {
  text-align: center;
  margin-top: 14px;
  font-size: 12px;
  color: #aaa;
}
</style>
