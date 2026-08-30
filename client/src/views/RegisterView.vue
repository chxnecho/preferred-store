<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>注册账号</h2>
      <p v-if="error" class="form-error">{{ error }}</p>
      <form @submit.prevent="submit">
        <div class="form-item">
          <label>用户名（3-20 位字母、数字、下划线或中文）</label>
          <input v-model.trim="username" placeholder="请输入用户名" autocomplete="username" />
        </div>
        <div class="form-item">
          <label>昵称（选填）</label>
          <input v-model.trim="nickname" placeholder="给自己起个名字吧" />
        </div>
        <div class="form-item">
          <label>密码（6-32 位）</label>
          <input v-model="password" type="password" placeholder="请输入密码" autocomplete="new-password" />
        </div>
        <div class="form-item">
          <label>确认密码</label>
          <input v-model="confirmPassword" type="password" placeholder="请再次输入密码" autocomplete="new-password" />
        </div>
        <button class="btn-primary btn-block" :disabled="submitting">
          {{ submitting ? "注册中..." : "注 册" }}
        </button>
      </form>
      <p class="form-footer">
        已有账号？<router-link :to="{ name: 'login', query: $route.query }">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { safeRedirectPath } from "../utils";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const username = ref("");
const nickname = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const submitting = ref(false);

async function submit() {
  error.value = "";
  if (!username.value) return (error.value = "请输入用户名");
  if (password.value.length < 6) return (error.value = "密码至少 6 位");
  if (password.value !== confirmPassword.value) return (error.value = "两次输入的密码不一致");

  submitting.value = true;
  try {
    await auth.register({
      username: username.value,
      nickname: nickname.value || undefined,
      password: password.value,
    });
    router.push(safeRedirectPath(route.query.redirect));
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>
