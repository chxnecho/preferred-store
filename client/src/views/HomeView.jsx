import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import ProductCard from "../components/ProductCard"
import { usePageTitle } from "../hooks/usePageTitle"
import "../styles/HomeView.css"

const slides = [
  {
    title: "夏季大促 · 低至 5 折",
    sub: "全场爆款限时特惠，错过再等一年",
    btn: "立即抢购",
    to: "/products"
  },
  {
    title: "新品首发 · 数码专场",
    sub: "最新科技产品，抢先体验未来生活",
    btn: "查看新品",
    to: "/products?category=数码&sort=newest"
  },
  {
    title: "品质生活 · 家居焕新",
    sub: "精选家居好物，打造温馨小家",
    btn: "探索家居",
    to: "/products?category=家居"
  }
]

export default function HomeView() {
  usePageTitle("首页")
  const [current, setCurrent] = useState(0)
  const [hotProducts, setHotProducts] = useState([])
  const currentRef = useRef(0)

  function go(i) {
    const next = (i + slides.length) % slides.length
    currentRef.current = next
    setCurrent(next)
  }

  useEffect(() => {
    const timer = setInterval(() => go(currentRef.current + 1), 4000)
    api
      .products({ sort: "sales", pageSize: 8 })
      .then((data) => setHotProducts(data.list))
      .catch((err) => console.error(err))
    return () => clearInterval(timer)
  }, [])

  return (
    <main>
      {/* 轮播 Banner */}
      <section className="banner">
        {slides.map((s, i) => (
          <div key={i} className={`banner-slide slide-${i + 1}${i === current ? " active" : ""}`}>
            <div className="banner-content">
              <h1>{s.title}</h1>
              <p>{s.sub}</p>
              <Link to={s.to} className="btn-primary">
                {s.btn}
              </Link>
            </div>
          </div>
        ))}
        <button className="banner-arrow prev" aria-label="上一张" onClick={() => go(current - 1)}>
          ‹
        </button>
        <button className="banner-arrow next" aria-label="下一张" onClick={() => go(current + 1)}>
          ›
        </button>
        <div className="banner-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`dot${i === current ? " active" : ""}`}
              aria-label={`切换到第 ${i + 1} 张轮播图`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </section>

      {/* 特色服务 */}
      <section className="features container">
        <div className="feature-item">
          <span>🚚</span>
          <div>
            <b>极速配送</b>
            <small>全国包邮次日达</small>
          </div>
        </div>
        <div className="feature-item">
          <span>✅</span>
          <div>
            <b>正品保障</b>
            <small>官方授权假一赔十</small>
          </div>
        </div>
        <div className="feature-item">
          <span>🔄</span>
          <div>
            <b>七天退换</b>
            <small>无忧售后放心购</small>
          </div>
        </div>
        <div className="feature-item">
          <span>💬</span>
          <div>
            <b>专属客服</b>
            <small>7×24 小时在线</small>
          </div>
        </div>
      </section>

      {/* 热门商品 */}
      <section className="container hot-section">
        <div className="hot-head">
          <h2 className="section-title">🔥 热门商品</h2>
          <Link to="/products?sort=sales" className="more-link">
            查看更多 ›
          </Link>
        </div>
        <div className="product-grid">
          {hotProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  )
}
