<template>
  <main class="container checkout-page">
    <h2 class="section-title">📝 确认订单</h2>

    <!-- 收货地址 -->
    <section class="panel">
      <div class="panel-head">
        <h3>收货地址</h3>
        <button class="add-addr-btn" @click="openAddrForm()">＋ 新增地址</button>
      </div>

      <p v-if="addresses.length === 0 && !showAddrForm" class="addr-empty">
        还没有收货地址，请先新增一个～
      </p>

      <div class="addr-list">
        <label
          v-for="a in addresses"
          :key="a.id"
          class="addr-card"
          :class="{ active: selectedAddressId === a.id }"
        >
          <input type="radio" name="address" :value="a.id" v-model="selectedAddressId" />
          <div class="addr-body">
            <div><b>{{ a.receiver }}</b> {{ a.phone }} <em v-if="a.isDefault">默认</em></div>
            <div class="addr-detail">{{ a.region }} {{ a.detail }}</div>
          </div>
        </label>
      </div>

      <!-- 新增/编辑地址表单 -->
      <form v-if="showAddrForm" class="addr-form" @submit.prevent="saveAddress">
        <div class="form-grid">
          <div class="form-item">
            <label>收货人</label>
            <input v-model.trim="addrForm.receiver" placeholder="姓名" />
          </div>
          <div class="form-item">
            <label>手机号</label>
            <input v-model.trim="addrForm.phone" placeholder="11 位手机号" maxlength="11" />
          </div>
          <div class="form-item">
            <label>所在地区</label>
            <input v-model.trim="addrForm.region" placeholder="省 市 区（如：上海市 上海市 浦东新区）" />
          </div>
          <div class="form-item">
            <label>详细地址</label>
            <input v-model.trim="addrForm.detail" placeholder="街道、楼栋、门牌号" />
          </div>
        </div>
        <label class="default-check">
          <input type="checkbox" v-model="addrForm.isDefault" /> 设为默认地址
        </label>
        <p v-if="addrError" class="form-error">{{ addrError }}</p>
        <div class="addr-form-actions">
          <button type="submit" class="btn-primary small">保存</button>
          <button type="button" class="btn-outline" @click="showAddrForm = false">取消</button>
        </div>
      </form>
    </section>

    <!-- 商品清单 -->
    <section class="panel">
      <h3>商品清单</h3>
      <div v-for="i in checkoutItems" :key="i.productId" class="item-row">
        <div class="item-img" :style="{ background: i.bg }">{{ i.emoji }}</div>
        <span class="item-name">{{ i.name }}</span>
        <span class="price">{{ formatPrice(i.price) }}</span>
        <span class="item-qty">× {{ i.qty }}</span>
        <span class="price item-sub">{{ formatPrice(i.price * i.qty) }}</span>
      </div>
    </section>

    <!-- 提交栏 -->
    <div class="checkout-bar">
      <span>
        共 <b>{{ totalQty }}</b> 件商品，应付总额：
      </span>
      <strong class="price big">{{ formatPrice(total) }}</strong>
      <button class="btn-primary submit-btn" :disabled="!canSubmit || submitting" @click="submitOrder">
        {{ submitting ? "提交中..." : "提交订单" }}
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import { useCartStore } from "../stores/cart";
import { toast } from "../toast";
import { formatPrice } from "../utils";

const route = useRoute();
const router = useRouter();
const cart = useCartStore();

const addresses = ref([]);
const selectedAddressId = ref(null);
const showAddrForm = ref(false);
const addrError = ref("");
const addrForm = reactive({ receiver: "", phone: "", region: "", detail: "", isDefault: false });
const submitting = ref(false);

const idsParam = String(route.query.ids || "");
const idSet = new Set(idsParam ? idsParam.split(",").map(Number) : []);
const checkoutItems = computed(() =>
  idSet.size ? cart.items.filter((i) => idSet.has(i.productId)) : cart.items
);
const totalQty = computed(() => checkoutItems.value.reduce((s, i) => s + i.qty, 0));
const total = computed(
  () => Math.round(checkoutItems.value.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100
);
const canSubmit = computed(() => selectedAddressId.value && totalQty.value > 0);

function openAddrForm() {
  Object.assign(addrForm, { receiver: "", phone: "", region: "", detail: "", isDefault: false });
  addrError.value = "";
  showAddrForm.value = true;
}

async function loadAddresses() {
  const data = await api.addresses();
  addresses.value = data.list;
  if (!selectedAddressId.value) {
    const def = data.list.find((a) => a.isDefault) || data.list[0];
    if (def) selectedAddressId.value = def.id;
  }
}

async function saveAddress() {
  addrError.value = "";
  try {
    await api.addAddress({ ...addrForm });
    showAddrForm.value = false;
    await loadAddresses();
    toast("地址已保存");
  } catch (err) {
    addrError.value = err.message;
  }
}

async function submitOrder() {
  submitting.value = true;
  try {
    const items = checkoutItems.value.map((i) => ({ productId: i.productId, qty: i.qty }));
    const data = await api.createOrder({ addressId: selectedAddressId.value, items });
    await cart.fetchCart();
    toast("下单成功，快去支付吧 🎉");
    router.replace(`/orders/${data.order.id}?pay=1`);
  } catch (err) {
    toast(err.message, "error");
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([cart.fetchCart(), loadAddresses()]);
  } catch (err) {
    toast(err.message, "error");
  }
});
</script>

<style scoped>
.checkout-page { padding-bottom: 40px; }
.panel { background: #fff; border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px; }
.panel h3 { font-size: 16px; margin-bottom: 14px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.panel-head h3 { margin-bottom: 0; }
.add-addr-btn { background: var(--primary-light); color: var(--primary); padding: 7px 14px; border-radius: 999px; font-size: 13px; }
.add-addr-btn:hover { background: var(--primary); color: #fff; }

.addr-empty { font-size: 13px; color: var(--text-light); }
.addr-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.addr-card {
  display: flex; gap: 10px; align-items: flex-start;
  border: 2px solid var(--border); border-radius: 12px; padding: 12px 14px;
  cursor: pointer; transition: border-color 0.2s; font-size: 14px;
}
.addr-card.active { border-color: var(--primary); background: var(--primary-light); }
.addr-card input { accent-color: var(--primary); margin-top: 3px; }
.addr-body b { margin-right: 8px; }
.addr-body em {
  font-style: normal; font-size: 11px; color: var(--primary);
  border: 1px solid currentColor; border-radius: 4px; padding: 0 5px; margin-left: 6px;
}
.addr-detail { color: var(--text-light); font-size: 13px; margin-top: 4px; line-height: 1.6; }

.addr-form { margin-top: 16px; border-top: 1px dashed var(--border); padding-top: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.default-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 12px; cursor: pointer; }
.default-check input { accent-color: var(--primary); }
.addr-form-actions { display: flex; gap: 10px; }
.btn-primary.small { padding: 9px 26px; font-size: 14px; }

.item-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px dashed var(--border); font-size: 14px; }
.item-row:last-child { border-bottom: none; }
.item-img { width: 52px; height: 52px; border-radius: 10px; font-size: 26px; display: flex; align-items: center; justify-content: center; }
.item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-qty { color: var(--text-light); }
.item-sub { width: 100px; text-align: right; }

.checkout-bar {
  position: sticky; bottom: 16px;
  display: flex; align-items: center; justify-content: flex-end; gap: 14px;
  background: #fff; border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 14px 22px; font-size: 14px;
}
.price.big { font-size: 26px; }
.submit-btn { min-width: 160px; }

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
