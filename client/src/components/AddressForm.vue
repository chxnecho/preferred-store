<template>
  <form class="addr-form" @submit.prevent="submit">
    <div class="form-grid">
      <div class="form-item">
        <label>收货人</label>
        <input v-model.trim="form.receiver" placeholder="姓名" />
      </div>
      <div class="form-item">
        <label>手机号</label>
        <input v-model.trim="form.phone" placeholder="11 位手机号" maxlength="11" />
      </div>
      <div class="form-item">
        <label>所在地区</label>
        <input v-model.trim="form.region" placeholder="省 市 区（如：上海市 上海市 浦东新区）" />
      </div>
      <div class="form-item">
        <label>详细地址</label>
        <input v-model.trim="form.detail" placeholder="街道、楼栋、门牌号" />
      </div>
    </div>
    <label class="default-check">
      <input v-model="form.isDefault" type="checkbox" /> 设为默认地址
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
    <div class="addr-form-actions">
      <button type="submit" class="btn-primary small" :disabled="submitting">
        {{ submitting ? "保存中..." : "保存" }}
      </button>
      <button type="button" class="btn-outline" @click="$emit('cancel')">取消</button>
    </div>
  </form>
</template>

<script setup>
import { reactive, watch } from "vue"

const props = defineProps({
  /** 编辑时传入原地址对象，新增时传 null */
  initial: { type: Object, default: null },
  /** 由父组件填充的提交错误信息 */
  error: { type: String, default: "" },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(["save", "cancel"])

const form = reactive({ receiver: "", phone: "", region: "", detail: "", isDefault: false })

watch(
  () => props.initial,
  (a) => {
    Object.assign(form, {
      receiver: a?.receiver || "",
      phone: a?.phone || "",
      region: a?.region || "",
      detail: a?.detail || "",
      isDefault: a ? Boolean(a.isDefault) : false,
    })
  },
  { immediate: true }
)

function submit() {
  emit("save", { ...form })
}
</script>

<style scoped>
.addr-form {
  margin-top: 16px;
  border-top: 1px dashed var(--border);
  padding-top: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.default-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 12px;
  cursor: pointer;
}
.default-check input {
  accent-color: var(--primary);
}
.addr-form-actions {
  display: flex;
  gap: 10px;
}
.btn-primary.small {
  padding: 9px 26px;
  font-size: 14px;
}
@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
