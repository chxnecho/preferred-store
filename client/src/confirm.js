import { reactive } from "vue";

/** 全局确认弹窗状态（由 App.vue 挂载的 ConfirmDialog 组件渲染） */
export const confirmState = reactive({
  visible: false,
  title: "确认操作",
  message: "",
  danger: false,
  resolve: null,
});

/**
 * Promise 化确认弹窗，替代原生 window.confirm
 * @returns {Promise<boolean>} 用户点击"确认"返回 true，"取消"/关闭返回 false
 */
export function confirm(message, { title = "确认操作", danger = false } = {}) {
  return new Promise((resolve) => {
    confirmState.visible = true;
    confirmState.title = title;
    confirmState.message = message;
    confirmState.danger = danger;
    confirmState.resolve = resolve;
  });
}

/** 由 ConfirmDialog 组件内部调用 */
export function settleConfirm(result) {
  confirmState.visible = false;
  confirmState.resolve?.(result);
  confirmState.resolve = null;
}