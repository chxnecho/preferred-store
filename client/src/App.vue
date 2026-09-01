<script setup>
import NavBar from "./components/NavBar.vue"
import ToastHost from "./components/ToastHost.vue"
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
</template>
