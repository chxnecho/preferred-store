<template>
  <main class="container order-detail-page">
    <p v-if="loading" class="empty-tip">加载中...</p>
    <p v-else-if="!order" class="empty-tip">订单不存在</p>
    <template v-else>
      <!-- 状态卡片 -->
      <section class="status-card" :class="order.status">
        <div>
          <h2>{{ order.statusText }}</h2>
          <p v-if="order.status === 'pending'">请在下单后尽快完成支付</p>
          <p v-else-if="order.status === 'paid'">商家正在备货，请耐心等待</p>
          <p v-else-if="order.status === 'completed'">交易完成，感谢您的购买！</p>
          <p v-else>该订单已取消</p>
        </div>
        <div class="status-actions">
          <button v-if="order.status === 'pending'" class="btn-primary" @click="pay">立即支付（模拟）</button>
          <button v-if="order.status === 'pending'" class="btn-outline" @click="cancel">取消订单</button>
          <button v-if="order.status === 'paid'" class="btn-primary" @click="confirmReceipt">确认收货</button>
        </div>
      </section>

      <!-- 收货信息 -->
      <section class="panel">
        <h3>收货信息</h3>
        <div class="addr-line">
          <b>{{ order.address.receiver }}</b> {{ order.address.phone }}
        </div>
        <div class="addr-line sub">{{ order.address.region }} {{ order.address.detail }}</div>
      </section>

      <!-- 商品清单 -->
      <section class="panel">
        <h3>商品清单</h3>
        <div v-for="(it, idx) in order.items" :key="idx" class="item-row"
             @click="$router.push(`/product/${it.productId}`)">
          <div class="item-img" :style="{ background: it.bg }">{{ it.emoji }}</div>
          <span class="item-name">{{ it.name }}</span>
          <span class="price">{{ formatPrice(it.price) }}</span>
          <span class="item-qty">× {{ it.qty }}</span>
          <span class="price item-sub">{{ formatPrice(it.price * it.qty) }}</span>
        </div>
        <div class="total-row">
          <span>订单编号：{{ order.orderNo }} · 下单时间：{{ formatTime(order.createdAt) }}</span>
          <span>实付款：<b class="price big">{{ formatPrice(order.total) }}</b></span>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import { toast } from "../toast";
import { formatPrice, formatTime } from "../utils";

const route = useRoute();
const order = ref(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const data = await api.order(route.params.id);
    order.value = data.order;
    document.title = `订单 ${data.order.orderNo} - 优选商城`;
  } catch (err) {
    order.value = null;
    toast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function pay() {
  try {
    const data = await api.payOrder(order.value.id);
    order.value = data.order;
    toast("支付成功 🎉");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function cancel() {
  if (!window.confirm("确认取消该订单吗？")) return;
  try {
    const data = await api.cancelOrder(order.value.id);
    order.value = data.order;
    toast("订单已取消");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function confirmReceipt() {
  try {
    const data = await api.confirmOrder(order.value.id);
    order.value = data.order;
    toast("已确认收货，感谢购买！");
  } catch (err) {
    toast(err.message, "error");
  }
}

watch(() => route.params.id, () => route.name === "order-detail" && load(), { immediate: true });
</script>

<style scoped>
.order-detail-page { padding: 28px 0 40px; }
.status-card {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
  background: #fff; border-radius: var(--radius); padding: 26px 28px;
  margin-bottom: 16px; border-left: 6px solid var(--primary);
}
.status-card.paid { border-left-color: #409eff; }
.status-card.completed { border-left-color: #34c98e; }
.status-card.cancelled { border-left-color: #999; }
.status-card h2 { font-size: 22px; margin-bottom: 6px; }
.status-card p { font-size: 13px; color: var(--text-light); }
.status-actions { display: flex; gap: 12px; }

.panel { background: #fff; border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px; }
.panel h3 { font-size: 15px; margin-bottom: 12px; color: var(--text-light); }
.addr-line { font-size: 15px; }
.addr-line.sub { color: var(--text-light); font-size: 13px; margin-top: 4px; }

.item-row {
  display: grid; grid-template-columns: 52px 1fr auto auto auto;
  gap: 14px; align-items: center; padding: 10px 0;
  border-bottom: 1px dashed var(--border); cursor: pointer; font-size: 14px;
}
.item-img { width: 52px; height: 52px; border-radius: 10px; font-size: 26px; display: flex; align-items: center; justify-content: center; }
.item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-qty { color: var(--text-light); }
.item-sub { width: 100px; text-align: right; }

.total-row {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  padding-top: 14px; font-size: 13px; color: var(--text-light);
}
.price.big { font-size: 24px; }
</style>
