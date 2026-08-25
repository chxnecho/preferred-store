<template>
  <main class="container profile-page">
    <h2 class="section-title">👤 个人中心</h2>

    <!-- 基本信息 -->
    <section class="panel user-panel">
      <div class="avatar">{{ (auth.user?.nickname || auth.user?.username || "?").slice(0, 1) }}</div>
      <div class="user-info">
        <b>{{ auth.user?.nickname || auth.user?.username }}</b>
        <small>用户名：{{ auth.user?.username }}</small>
      </div>
      <div class="user-stats">
        <router-link to="/orders">
          <b>{{ orderCount }}</b><span>全部订单</span>
        </router-link>
        <router-link to="/cart">
          <b>{{ cart.totalQty }}</b><span>购物车</span>
        </router-link>
      </div>
    </section>

    <!-- 收货地址管理 -->
    <section class="panel">
      <div class="panel-head">
        <h3>收货地址</h3>
        <button class="add-addr-btn" @click="openForm()">＋ 新增地址</button>
      </div>

      <p v-if="addresses.length === 0 && !showForm" class="empty-tip small">还没有收货地址</p>

      <div v-for="a in addresses" :key="a.id" class="addr-row" :class="{ default: a.isDefault }">
        <div class="addr-main">
          <div><b>{{ a.receiver }}</b> {{ a.phone }} <em v-if="a.isDefault">默认</em></div>
          <div class="sub">{{ a.region }} {{ a.detail }}</div>
        </div>
        <div class="addr-ops">
          <button @click="openForm(a)">编辑</button>
          <button @click="removeAddr(a)">删除</button>
          <button v-if="!a.isDefault" @click="setDefault(a)">设为默认</button>
        </div>
      </div>

      <!-- 新增/编辑表单 -->
      <form v-if="showForm" class="addr-form" @submit.prevent="save">
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
            <input v-model.trim="form.region" placeholder="省 市 区" />
          </div>
          <div class="form-item">
            <label>详细地址</label>
            <input v-model.trim="form.detail" placeholder="街道、楼栋、门牌号" />
          </div>
        </div>
        <label class="default-check"><input type="checkbox" v-model="form.isDefault" /> 设为默认地址</label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="form-actions">
          <button type="submit" class="btn-primary small">保存</button>
          <button type="button" class="btn-outline small" @click="showForm = false">取消</button>
        </div>
      </form>
    </section>

    <!-- 其他 -->
    <section class="panel">
      <h3>账号</h3>
      <button class="logout-btn" @click="logout">退出登录</button>
    </section>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
import { toast } from "../toast";

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

const addresses = ref([]);
const orderCount = ref(0);
const showForm = ref(false);
const editingId = ref(null);
const error = ref("");
const form = reactive({ receiver: "", phone: "", region: "", detail: "", isDefault: false });

function openForm(a = null) {
  editingId.value = a ? a.id : null;
  Object.assign(form, {
    receiver: a?.receiver || "",
    phone: a?.phone || "",
    region: a?.region || "",
    detail: a?.detail || "",
    isDefault: a ? a.isDefault : false,
  });
  error.value = "";
  showForm.value = true;
}

async function loadAll() {
  try {
    const [addrData, orderData] = await Promise.all([api.addresses(), api.orders({ page: 1 })]);
    addresses.value = addrData.list;
    orderCount.value = orderData.total;
  } catch (err) {
    toast(err.message, "error");
  }
}

async function save() {
  error.value = "";
  const body = { ...form };
  try {
    if (editingId.value) await api.updateAddress(editingId.value, body);
    else await api.addAddress(body);
    showForm.value = false;
    await loadAll();
    toast("已保存");
  } catch (err) {
    error.value = err.message;
  }
}

async function removeAddr(a) {
  if (!window.confirm(`确认删除「${a.receiver}」的地址吗？`)) return;
  try {
    await api.deleteAddress(a.id);
    await loadAll();
    toast("已删除");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function setDefault(a) {
  try {
    await api.updateAddress(a.id, { isDefault: true });
    await loadAll();
    toast("已设为默认地址");
  } catch (err) {
    toast(err.message, "error");
  }
}

function logout() {
  auth.logout();
  cart.fetchCart();
  toast("已退出登录");
  router.push("/");
}

onMounted(loadAll);
</script>

<style scoped src="../styles/profile.css"></style>
