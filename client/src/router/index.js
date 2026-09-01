import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"
import HomeView from "../views/HomeView.vue"

const routes = [
  { path: "/", name: "home", component: HomeView, meta: { title: "首页" } },
  { path: "/products", name: "products", component: () => import("../views/ProductsView.vue"), meta: { title: "全部商品" } },
  {
    path: "/product/:id",
    name: "product-detail",
    component: () => import("../views/ProductDetailView.vue"),
    meta: { title: "商品详情" }
  },
  { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { title: "登录" } },
  { path: "/register", name: "register", component: () => import("../views/RegisterView.vue"), meta: { title: "注册" } },
  {
    path: "/cart",
    name: "cart",
    component: () => import("../views/CartView.vue"),
    meta: { requiresAuth: true, title: "购物车" }
  },
  {
    path: "/checkout",
    name: "checkout",
    component: () => import("../views/CheckoutView.vue"),
    meta: { requiresAuth: true, title: "确认订单" }
  },
  {
    path: "/orders",
    name: "orders",
    component: () => import("../views/OrdersView.vue"),
    meta: { requiresAuth: true, title: "我的订单" }
  },
  {
    path: "/orders/:id",
    name: "order-detail",
    component: () => import("../views/OrderDetailView.vue"),
    meta: { requiresAuth: true, title: "订单详情" }
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true, title: "个人中心" }
  },
  { path: "/:pathMatch(.*)*", redirect: "/" }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    return { name: "login", query: { redirect: to.fullPath } }
  }
})

// 统一管理页面标题（详情页等可自行覆盖 document.title）
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 优选商城` : "优选商城 - 精选好物，品质生活"
})

export default router
