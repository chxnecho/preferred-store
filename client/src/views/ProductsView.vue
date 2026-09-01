<template>
  <main class="container products-page">
    <!-- 分类筛选 -->
    <div class="filter-bar">
      <button
        v-for="c in categories"
        :key="c.name"
        class="filter-btn"
        :class="{ active: currentCategory === c.name }"
        @click="setFilter({ category: c.name })"
      >
        {{ c.name }}<small v-if="c.name !== '全部'">（{{ c.count }}）</small>
      </button>
    </div>

    <!-- 排序 + 搜索状态 -->
    <div class="toolbar">
      <div class="sort-group">
        <button
          v-for="s in sorts"
          :key="s.value"
          :class="{ active: currentSort === s.value }"
          @click="setFilter({ sort: s.value })"
        >
          {{ s.label }}
        </button>
      </div>
      <span v-if="keyword" class="search-hint">
        “{{ keyword }}” 的搜索结果
        <a href="#" @click.prevent="clearKeyword">清除</a>
      </span>
    </div>

    <!-- 商品网格 -->
    <div v-if="!loading" class="product-grid">
      <ProductCard v-for="p in products" :key="p.id" :product="p" />
    </div>
    <p v-else class="empty-tip">加载中...</p>
    <p v-if="!loading && products.length === 0" class="empty-tip">没有找到相关商品 😢</p>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="setFilter({ page: page - 1 })">‹ 上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 件</span>
      <button :disabled="page >= totalPages" @click="setFilter({ page: page + 1 })">
        下一页 ›
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { api } from "../api"
import ProductCard from "../components/ProductCard.vue"

const route = useRoute()
const router = useRouter()

const categories = ref([{ name: "全部", count: 0 }])
const products = ref([])
const total = ref(0)
const loading = ref(true)

const sorts = [
  { label: "默认", value: "default" },
  { label: "销量优先", value: "sales" },
  { label: "价格从低到高", value: "price_asc" },
  { label: "价格从高到低", value: "price_desc" },
  { label: "最新上架", value: "newest" }
]

const currentCategory = computed(() => route.query.category || "全部")
const currentSort = computed(() => route.query.sort || "default")
const keyword = computed(() => (route.query.keyword || "").trim())
const page = computed(() => Math.max(1, parseInt(route.query.page) || 1))
const pageSize = 12
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function setFilter(patch) {
  router.push({
    query: {
      ...route.query,
      ...patch,
      page: patch.page ?? (patch.category !== undefined ? 1 : route.query.page)
    }
  })
}

function clearKeyword() {
  setFilter({ keyword: undefined, page: 1 })
}

watch(
  () => [route.query.category, route.query.keyword, route.query.sort, route.query.page],
  async () => {
    loading.value = true
    try {
      const data = await api.products({
        category: currentCategory.value,
        keyword: keyword.value,
        sort: currentSort.value,
        page: page.value,
        pageSize
      })
      products.value = data.list
      total.value = data.total
    } catch (err) {
      console.error(err)
      products.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

api
  .categories()
  .then((d) => (categories.value = d.categories))
  .catch(() => {})
</script>

<style scoped>
.products-page {
  padding-bottom: 40px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}
.filter-btn {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
  transition: all 0.2s;
}
.filter-btn small {
  color: var(--text-light);
  font-size: 12px;
}
.filter-btn.active,
.filter-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.filter-btn.active small,
.filter-btn:hover small {
  color: rgba(255, 255, 255, 0.85);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 16px 0 20px;
  flex-wrap: wrap;
}
.sort-group {
  display: flex;
  gap: 4px;
  background: #fff;
  border-radius: 999px;
  padding: 4px;
}
.sort-group button {
  background: none;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-light);
}
.sort-group button.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}
.search-hint {
  font-size: 13px;
  color: var(--text-light);
}
.search-hint a {
  color: var(--primary);
  margin-left: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 32px;
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
</style>
