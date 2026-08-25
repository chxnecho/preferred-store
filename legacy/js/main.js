// ===== 商品数据 =====
const PRODUCTS = [
  { id: 1, name: "无线降噪耳机", desc: "主动降噪 · 40小时续航 · 蓝牙5.3", price: 499, sales: "已售 2.3万", category: "数码", emoji: "🎧", bg: "#e8f1ff" },
  { id: 2, name: "智能手表 Pro", desc: "心率监测 · GPS定位 · 超长待机", price: 1299, sales: "已售 8600", category: "数码", emoji: "⌚", bg: "#eafaf0" },
  { id: 3, name: "便携蓝牙音箱", desc: "重低音 · IPX7防水 · 户外必备", price: 199, sales: "已售 5.1万", category: "数码", emoji: "🔊", bg: "#fff4e5" },
  { id: 4, name: "轻薄笔记本电脑", desc: "16G内存 · 512G固态 · 1.2kg轻巧", price: 4599, sales: "已售 3200", category: "数码", emoji: "💻", bg: "#f0eaff" },
  { id: 5, name: "经典纯棉T恤", desc: "100%纯棉 · 透气舒适 · 多色可选", price: 79, sales: "已售 12万", category: "服饰", emoji: "👕", bg: "#e5f6ff" },
  { id: 6, name: "休闲运动卫衣", desc: "加绒保暖 · 宽松版型 · 潮流百搭", price: 159, sales: "已售 3.6万", category: "服饰", emoji: "🧥", bg: "#ffeef0" },
  { id: 7, name: "轻便跑步鞋", desc: "缓震回弹 · 透气网面 · 轻若无物", price: 269, sales: "已售 7.8万", category: "服饰", emoji: "👟", bg: "#efffef" },
  { id: 8, name: "时尚双肩背包", desc: "大容量 · 防泼水 · 15.6寸电脑仓", price: 139, sales: "已售 2.9万", category: "服饰", emoji: "🎒", bg: "#fdf6e3" },
  { id: 9, name: "简约陶瓷马克杯", desc: "釉下彩工艺 · 微波炉可用 · 420ml", price: 39, sales: "已售 6.4万", category: "家居", emoji: "☕", bg: "#fdeeee" },
  { id: 10, name: "香薰蜡烛礼盒", desc: "天然大豆蜡 · 持久留香 · 助眠放松", price: 89, sales: "已售 1.8万", category: "家居", emoji: "🕯️", bg: "#fff8e8" },
  { id: 11, name: "记忆棉枕头", desc: "慢回弹 · 护颈助眠 · 可拆洗枕套", price: 129, sales: "已售 4.2万", category: "家居", emoji: "🛏️", bg: "#eef4ff" },
  { id: 12, name: "多功能收纳盒", desc: "桌面整理 · 分层设计 · 环保材质", price: 49, sales: "已售 9.7万", category: "家居", emoji: "📦", bg: "#f0faf5" },
  { id: 13, name: "保湿修护面霜", desc: "玻尿酸保湿 · 48h锁水 · 敏感肌适用", price: 219, sales: "已售 3.1万", category: "美妆", emoji: "🧴", bg: "#ffe9f2" },
  { id: 14, name: "丝绒哑光口红", desc: "显白不拔干 · 持久不脱色 · 6色号", price: 149, sales: "已售 8.9万", category: "美妆", emoji: "💄", bg: "#ffeded" },
  { id: 15, name: "氨基酸洁面乳", desc: "温和清洁 · 绵密泡沫 · 不紧绷", price: 69, sales: "已售 5.5万", category: "美妆", emoji: "🫧", bg: "#e9f7ff" },
  { id: 16, name: "进口坚果礼盒", desc: "每日坚果 · 6种搭配 · 新鲜锁鲜", price: 99, sales: "已售 10万+", category: "食品", emoji: "🥜", bg: "#fdf3e0" },
  { id: 17, name: "手冲咖啡豆", desc: "中度烘焙 · 坚果风味 · 250g装", price: 78, sales: "已售 2.7万", category: "食品", emoji: "☕", bg: "#f3ece4" },
  { id: 18, name: "网红零食大礼包", desc: "12种零食组合 · 追剧必备 · 超值装", price: 59, sales: "已售 15万+", category: "食品", emoji: "🍪", bg: "#fff0e6" },
];

// ===== 购物车持久化 =====
const CART_STORAGE_KEY = "shop_cart_v1";

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    /* 存储不可用时静默降级 */
  }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // 校验数据合法性：只保留仍存在的商品
    return data.filter(
      (i) => Number.isInteger(i.id) && PRODUCTS.some((p) => p.id === i.id) && i.qty > 0
    );
  } catch (e) {
    return [];
  }
}

// ===== 状态 =====
let cart = loadCart();    // [{id, qty}]，启动时从 localStorage 恢复
let currentCategory = "全部";
let keyword = "";
let currentModalProduct = null;

// ===== DOM 引用 =====
const $ = (sel) => document.querySelector(sel);
const productGrid = $("#productGrid");
const emptyTip = $("#emptyTip");
const cartCount = $("#cartCount");
const cartItems = $("#cartItems");
const cartEmpty = $("#cartEmpty");
const cartTotal = $("#cartTotal");

// ===== 工具函数 =====
function formatPrice(n) {
  return n.toFixed(2);
}

function showToast(msg) {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

// ===== 商品渲染 =====
function getFilteredProducts() {
  return PRODUCTS.filter((p) => {
    const matchCategory = currentCategory === "全部" || p.category === currentCategory;
    const matchKeyword =
      !keyword ||
      p.name.toLowerCase().includes(keyword) ||
      p.desc.toLowerCase().includes(keyword);
    return matchCategory && matchKeyword;
  });
}

function renderProducts() {
  const list = getFilteredProducts();
  productGrid.innerHTML = list
    .map(
      (p) => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img" style="background:${p.bg}">${p.emoji}</div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-bottom">
          <span class="price">${formatPrice(p.price)}</span>
          <span class="sales">${p.sales}</span>
          <button class="add-cart-btn" data-add="${p.id}">加入购物车</button>
        </div>
      </div>
    </div>`
    )
    .join("");
  emptyTip.hidden = list.length > 0;
}

// ===== 购物车 =====
function addToCart(id, silent = false) {
  const item = cart.find((i) => i.id === id);
  if (item) item.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  if (!silent) showToast("已加入购物车 🛒");
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => {
    const p = PRODUCTS.find((x) => x.id === i.id);
    return s + p.price * i.qty;
  }, 0);

  cartCount.textContent = totalQty;
  cartTotal.textContent = "¥" + formatPrice(totalPrice);

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="cart-empty">购物车还是空的，快去逛逛吧～</p>`;
    return;
  }

  cartItems.innerHTML = cart
    .map((i) => {
      const p = PRODUCTS.find((x) => x.id === i.id);
      return `
      <div class="cart-item">
        <div class="cart-item-img" style="background:${p.bg}">${p.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">¥${formatPrice(p.price)}</div>
        </div>
        <div class="qty-control">
          <button data-minus="${p.id}">−</button>
          <span class="qty">${i.qty}</span>
          <button data-plus="${p.id}">＋</button>
        </div>
        <button class="cart-item-remove" data-remove="${p.id}" title="删除">🗑️</button>
      </div>`;
    })
    .join("");
}

// ===== 购物车抽屉 =====
function openCart() {
  $("#cartDrawer").classList.add("open");
  $("#cartOverlay").classList.add("show");
}

function closeCart() {
  $("#cartDrawer").classList.remove("open");
  $("#cartOverlay").classList.remove("show");
}

// ===== 商品详情弹窗 =====
function openModal(p) {
  currentModalProduct = p;
  $("#modalImg").textContent = p.emoji;
  $("#modalImg").style.background = p.bg;
  $("#modalName").textContent = p.name;
  $("#modalDesc").textContent = p.desc;
  $("#modalPrice").textContent = formatPrice(p.price);
  $("#modalSales").textContent = p.sales;
  $("#modalOverlay").classList.add("show");
}

function closeModal() {
  $("#modalOverlay").classList.remove("show");
  currentModalProduct = null;
}

// ===== 轮播 =====
let slideIndex = 0;
let slideTimer = null;

function initBanner() {
  const slides = document.querySelectorAll(".banner-slide");
  const dotsBox = $("#bannerDots");
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    dotsBox.appendChild(dot);
  });

  function update() {
    slides.forEach((s, i) => s.classList.toggle("active", i === slideIndex));
    dotsBox.querySelectorAll("span").forEach((d, i) =>
      d.classList.toggle("active", i === slideIndex)
    );
  }

  window.goToSlide = function (i) {
    slideIndex = (i + slides.length) % slides.length;
    update();
    restartAuto();
  };

  function restartAuto() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => goToSlide(slideIndex + 1), 4000);
  }

  $("#bannerPrev").addEventListener("click", () => goToSlide(slideIndex - 1));
  $("#bannerNext").addEventListener("click", () => goToSlide(slideIndex + 1));
  restartAuto();
}

// ===== 分类筛选 =====
function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".filter-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.category === cat)
  );
  renderProducts();
}

// ===== 事件绑定 =====
function bindEvents() {
  // 分类按钮
  $("#filterBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (btn) setCategory(btn.dataset.category);
  });

  // Banner 内的分类快捷链接
  document.querySelectorAll("[data-filter-link]").forEach((a) => {
    a.addEventListener("click", () => setCategory(a.dataset.filterLink));
  });

  // 搜索
  function doSearch() {
    keyword = $("#searchInput").value.trim().toLowerCase();
    setCategory("全部");
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  }
  $("#searchBtn").addEventListener("click", doSearch);
  $("#searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // 商品卡片：点击查看详情 / 加购按钮
  productGrid.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      e.stopPropagation();
      addToCart(Number(addBtn.dataset.add));
      return;
    }
    const card = e.target.closest(".product-card");
    if (card) {
      const p = PRODUCTS.find((x) => x.id === Number(card.dataset.id));
      openModal(p);
    }
  });

  // 弹窗
  $("#closeModal").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", (e) => {
    if (e.target === $("#modalOverlay")) closeModal();
  });
  $("#modalAddBtn").addEventListener("click", () => {
    if (currentModalProduct) addToCart(currentModalProduct.id);
  });

  // 购物车抽屉
  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#cartOverlay").addEventListener("click", closeCart);

  // 购物车内操作（事件委托）
  cartItems.addEventListener("click", (e) => {
    const plus = e.target.closest("[data-plus]");
    const minus = e.target.closest("[data-minus]");
    const remove = e.target.closest("[data-remove]");
    if (plus) changeQty(Number(plus.dataset.plus), 1);
    else if (minus) changeQty(Number(minus.dataset.minus), -1);
    else if (remove) removeItem(Number(remove.dataset.remove));
  });

  // 结算
  $("#checkoutBtn").addEventListener("click", () => {
    if (cart.length === 0) {
      showToast("购物车是空的，先去挑选商品吧～");
      return;
    }
    const total = cart.reduce((s, i) => {
      const p = PRODUCTS.find((x) => x.id === i.id);
      return s + p.price * i.qty;
    }, 0);
    showToast(`下单成功！共支付 ¥${formatPrice(total)} 🎉`);
    cart = [];
    saveCart();
    renderCart();
    setTimeout(closeCart, 800);
  });
}

// ===== 初始化 =====
function init() {
  initBanner();
  renderProducts();
  renderCart();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);