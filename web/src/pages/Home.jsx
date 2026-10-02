import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchItems } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import ItemCard from '../components/ItemCard'
import Pagination from '../components/Pagination'

// 首页：Hero + 物品列表（筛选 / 搜索 / 分页）
export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const { settings } = useSettings()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [type, setType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 12
  const keywordRef = useRef(keyword)
  keywordRef.current = keyword

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, pageSize }
      if (type) params.type = type
      if (keywordRef.current.trim()) params.keyword = keywordRef.current.trim()
      const res = await fetchItems(params)
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [page, type])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // 关键词防抖搜索（跳过首次挂载）
  const keywordMountRef = useRef(false)
  useEffect(() => {
    if (!keywordMountRef.current) {
      keywordMountRef.current = true
      return undefined
    }
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else loadItems()
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  const handleTypeChange = (newType) => {
    setType(newType)
    setPage(1)
  }

  const tabs = [
    { label: '全部', value: '' },
    { label: '寻物启事', value: 'lost' },
    { label: '失物招领', value: 'found' },
  ]

  const heroImage = settings.hero_bg_image

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <div
          className={`relative overflow-hidden rounded-3xl ${
            heroImage ? 'shadow-glass-lg' : 'glass'
          }`}
        >
          {heroImage && (
            <>
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-indigo-900/55 to-sky-800/45" />
            </>
          )}

          <div className={`relative px-6 sm:px-12 py-14 sm:py-20 ${heroImage ? 'text-white' : ''}`}>
            <p
              className={`inline-flex items-center gap-2 text-xs font-bold tracking-[0.22em] uppercase mb-5 ${
                heroImage ? 'text-white/80' : 'text-indigo-500'
              }`}
            >
              <span className={`w-8 h-px ${heroImage ? 'bg-white/60' : 'bg-indigo-400'}`} />
              Campus Lost &amp; Found
            </p>
            <h1 className="text-3xl sm:text-5xl leading-[1.18] font-bold mb-5 tracking-tight">
              丢东西、捡到东西，
              <br />
              <span className={heroImage ? 'text-sky-200' : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-sky-500'}>
                在这里说一声
              </span>
            </h1>
            <p className={`text-base sm:text-lg leading-relaxed max-w-lg mb-8 ${heroImage ? 'text-white/85' : 'text-slate-500'}`}>
              发布一条寻物启事或失物招领，让校园里的温暖继续流转。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <button onClick={() => navigate('/post')} className="btn-primary !px-6 !py-3">
                  发布信息
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ) : (
                <button onClick={login} className="btn-primary !px-6 !py-3">
                  登录并发布
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <a
                href="#list"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[15px] transition-colors ${
                  heroImage
                    ? 'border border-white/40 text-white hover:bg-white/15 backdrop-blur'
                    : 'btn-ghost !py-3'
                }`}
              >
                浏览信息
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 列表区 */}
      <div id="list" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-full glass">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTypeChange(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  type === tab.value
                    ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-glow'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="w-full sm:w-auto">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或描述…"
                className="input-base !pl-10 sm:w-72 !rounded-full"
              />
            </div>
          </form>
        </div>

        {/* 内容 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-white/50" />
                <div className="p-4">
                  <div className="h-4 bg-white/60 rounded-md mb-3 w-3/4" />
                  <div className="h-3 bg-white/60 rounded-md mb-2 w-full" />
                  <div className="h-3 bg-white/60 rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-10 text-center">
            <p className="text-rose-500 font-medium mb-4">{error}</p>
            <button onClick={loadItems} className="btn-primary !py-2">
              重新加载
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0h-2M4 13h2m10-4h.01M14 9h.01M10 9h.01M6 9h.01" />
              </svg>
            </div>
            <p className="text-xl text-slate-600 font-semibold mb-1">这里还空着</p>
            <p className="text-sm text-slate-400">暂时没有符合条件的信息，来发布第一条吧</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} onArchived={loadItems} />
              ))}
            </div>
            <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* 浮动发布按钮 */}
      {isAuthenticated && (
        <button
          onClick={() => navigate('/post')}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 h-14 md:px-6 md:w-auto w-14 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-semibold shadow-glow hover:brightness-110 hover:scale-105 z-40 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden md:block">发布</span>
        </button>
      )}
    </div>
  )
}
