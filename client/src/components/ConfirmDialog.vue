<template>
  <transition name="dialog">
    <div v-if="confirmState.visible" class="dialog-overlay" @click.self="settle(false)" @keydown.esc="settle(false)">
      <div class="dialog-card" role="alertdialog" :aria-label="confirmState.title">
        <h3>{{ confirmState.title }}</h3>
        <p>{{ confirmState.message }}</p>
        <div class="dialog-actions">
          <button class="btn-outline" @click="settle(false)">取消</button>
          <button class="btn-primary" :class="{ danger: confirmState.danger }" @click="settle(true)">确认</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { confirmState, settleConfirm } from "../confirm";

function settle(result) {
  settleConfirm(result);
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.dialog-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 26px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.dialog-card h3 {
  font-size: 17px;
  margin-bottom: 10px;
}
.dialog-card p {
  font-size: 14px;
  color: var(--text-light);
  line-height: 1.7;
  margin-bottom: 20px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.dialog-actions button {
  min-width: 84px;
}
.btn-primary.danger {
  background: #d33;
}
.btn-primary.danger:hover {
  background: #b22;
}
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s;
}
.dialog-enter-active .dialog-card,
.dialog-leave-active .dialog-card {
  transition: transform 0.2s;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
.dialog-enter-from .dialog-card,
.dialog-leave-to .dialog-card {
  transform: translateY(12px) scale(0.97);
}
</style>
