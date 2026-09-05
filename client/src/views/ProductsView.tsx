import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "../api"
import ProductCard from "../components/ProductCard"
import { usePageTitle } from "../hooks/usePageTitle"
import type { CategoryPayload, Product } from "../../../shared/types"
import "../styles/ProductsView.css"

const sorts = [
  { label: "默认", value: "default" },
  { label: "销量优先", value: "sales" },
  { label: "价格从低到高", value: "price_asc" },
  { label: "价格从高到低", value: "price_desc" },
  { label: "最新上架", value: "newest" }
]
const pageSize = 12

export default function ProductsView() {
  usePageTitle("全部商品")
  const [searchParams, setSearchParams] = useSearchParams()

  const currentCategory = searchParams.get("category") || "全部"
  const keyword = (searchParams.get("keyword") || "").trim()
  const currentSort = searchParams.get("sort") || "default"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))

  const [categories, setCategories] = useState<CategoryPayload[]>([{ name: "全部", count: 0 }])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total])

  function setFilter(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) next.delete(key)
      else next.set(key, String(value))
    }
    // 切换分类时回到第一页（与 Vue 版行为一致）
    if (patch.page === undefined && patch.category !== undefined) next.set("page", "1")
    setSearchParams(next)
  }

  function clearKeyword() {
    setFilter({ keyword: undefined, page: "1" })
  }

  // 商品列表：URL 参数驱动，AbortController 防止竞态
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .products({ category: currentCategory, keyword, sort: currentSort, page, pageSize }, { signal: controller.signal })
      .then((data) => {
        setProducts(data.list)
        setTotal(data.total)
      })
      .catch((err) => {
        if (err?.name === "AbortError") return // 已被新请求取代
        console.error(err)
        setProducts([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [currentCategory, keyword, currentSort, page])

  useEffect(() => {
    api
      .categories()
      .then((d) => setCategories(d.categories))
      .catch(() => {})
  }, [])

  return (
    <main className="container products-page">
      {/* 分类筛选 */}
      <div className="filter-bar">
        {categories.map((c) => (
          <button
            key={c.name}
            className={`filter-btn${currentCategory === c.name ? " active" : ""}`}
            onClick={() => setFilter({ category: c.name })}
          >
            {c.name}
            {c.name !== "全部" && <small>（{c.count}）</small>}
          </button>
        ))}
      </div>

      {/* 排序 + 搜索状态 */}
      <div className="toolbar">
        <div className="sort-group">
          {sorts.map((s) => (
            <button
              key={s.value}
              className={currentSort === s.value ? "active" : ""}
              onClick={() => setFilter({ sort: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
        {keyword && (
          <span className="search-hint">
            “{keyword}” 的搜索结果
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                clearKeyword()
              }}
            >
              清除
            </a>
          </span>
        )}
      </div>

      {/* 商品网格 */}
      {!loading && (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {loading && <p className="empty-tip">加载中...</p>}
      {!loading && products.length === 0 && <p className="empty-tip">没有找到相关商品 😢</p>}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setFilter({ page: page - 1 })}>
            ‹ 上一页
          </button>
          <span>
            第 {page} / {totalPages} 页 · 共 {total} 件
          </span>
          <button disabled={page >= totalPages} onClick={() => setFilter({ page: page + 1 })}>
            下一页 ›
          </button>
        </div>
      )}
    </main>
  )
}
