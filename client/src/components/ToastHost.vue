<template>
  <transition-group name="toast" tag="div" class="toast-host">
    <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
      {{ t.type === "error" ? "⚠️ " : "✅ " }}{{ t.message }}
    </div>
  </transition-group>
</template>

<script setup>
import { toasts } from "../toast";
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast-item {
  background: rgba(20, 20, 20, 0.88);
  color: #fff;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 14px;
  white-space: nowrap;
}
.toast-item.error {
  background: rgba(200, 40, 30, 0.92);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
