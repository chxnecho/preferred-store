<template>
  <main class="container orders-page">
    <h2 class="section-title">📦 我的订单</h2>

    <div class="status-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="{ active: currentStatus === t.value }"
        @click="switchTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="loading" class="empty-tip">加载中...</p>
    <p v-else-if="orders.length === 0" class="empty-tip">暂无相关订单</p>

    <div v-else class="order-list">
      <div v-for="o in orders" :key="o.id" class="order-card">
        <div class="order-head">
          <span>订单号：{{ o.orderNo }}</span>
          <span :class="['order-status', o.status]">{{ o.statusText }}</span>
        </div>
        <div class="order-items">
          <div
            v-for="(it, idx) in o.items.slice(0, 4)"
            :key="idx"
            class="o-item"
            @click="$router.push(`/orders/${o.id}`)"
          >
            <div class="o-img" :style="{ background: it.bg }">{{ it.emoji }}</div>
            <span class="o-name">{{ it.name }}</span>
            <span class="price">{{ formatPrice(it.price) }}</span>
            <span class="o-qty">× {{ it.qty }}</span>
          </div>
          <p v-if="o.items.length > 4" class="more-items">等 {{ o.items.length }} 件商品...</p>
        </div>
        <div class="order-foot">
          <span>{{ formatTime(o.createdAt) }}</span>
          <div class="foot-right">
            <span>合计：<b class="price">{{ formatPrice(o.total) }}</b></span>
            <button v-if="o.status === 'pending'" class="btn-primary small" @click="pay(o)">
              去支付
            </button>
            <button v-if="o.status === 'pending'" class="btn-outline small" @click="cancel(o)">
              取消订单
            </button>
            <button v-if="o.status === 'paid'" class="btn-outline small" @click="confirmReceipt(o)">
              确认收货
            </button>
            <button class="btn-outline small" @click="$router.push(`/orders/${o.id}`)">
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="load(page - 1)">‹ 上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <button :disabled="page >= totalPages" @click="load(page + 1)">下一页 ›</button>
      <label class="page-jump">
        跳至
        <input type="number" min="1" :max="totalPages" aria-label="跳转到指定页" @keydown.enter="jumpPage" />
        页
      </label>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { api } from "../api"
import { useOrderActions } from "../composables/useOrderActions"
import { toast } from "../toast"
import { formatPrice, formatTime } from "../utils"

const route = useRoute()
const router = useRouter()

const tabs = [
  { label: "全部", value: "" },
  { label: "待支付", value: "pending" },
  { label: "待收货", value: "paid" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" }
]

const orders = ref([])
const total = ref(0)
const loading = ref(true)
const currentStatus = computed(() => String(route.query.status || ""))
const page = computed(() => Math.max(1, parseInt(route.query.page) || 1))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 10)))

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await api.orders({ status: currentStatus.value || undefined, page: p })
    orders.value = data.list
    total.value = data.total
  } catch (err) {
    toast(err.message, "error")
  } finally {
    loading.value = false
  }
}

function switchTab(v) {
  router.push({ query: { status: v || undefined, page: 1 } })
}

// 订单操作复用：成功后刷新列表（pay/cancel/confirmReceipt 由 composable 提供）
const { pay, cancel, confirmReceipt } = useOrderActions(() => load())

function jumpPage(e) {
  const p = parseInt(e.target.value)
  if (Number.isInteger(p) && p >= 1 && p <= totalPages.value && p !== page.value) {
    router.push({ query: { ...route.query, page: p } })
  }
  e.target.value = ""
}

watch(
  () => route.fullPath,
  () => load(),
  { immediate: true }
)
</script>

<style scoped>
.orders-page {
  padding-bottom: 40px;
}
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.status-tabs button {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 8px 20px;
  font-size: 14px;
  color: var(--text-light);
}
.status-tabs button.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 600;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.order-card {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  font-size: 13px;
  color: var(--text-light);
}
.order-status.pending {
  color: #e6a23c;
  font-weight: 600;
}
.order-status.paid {
  color: #409eff;
  font-weight: 600;
}
.order-status.completed {
  color: #34c98e;
  font-weight: 600;
}
.order-status.cancelled {
  color: #999;
}

.order-items {
  padding: 6px 20px;
}
.o-item {
  display: grid;
  grid-template-columns: 52px 1fr auto auto;
  gap: 14px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
  cursor: pointer;
  font-size: 14px;
}
.o-img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.o-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.o-qty {
  color: var(--text-light);
}
.more-items {
  font-size: 12px;
  color: var(--text-light);
  padding: 8px 0;
}

.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-light);
}
.foot-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.foot-right b.price {
  font-size: 18px;
}
.btn-primary.small,
.btn-outline.small {
  padding: 7px 16px;
  font-size: 13px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 28px;
}
.pagination button {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pagination span {
  font-size: 13px;
  color: var(--text-light);
}
.page-jump {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-light);
}
.page-jump input {
  width: 56px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}
</style>
