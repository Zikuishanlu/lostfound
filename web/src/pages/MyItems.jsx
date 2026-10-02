import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyItems, deleteItem, resolveItem } from '../api'
import { useAuth } from '../contexts/AuthContext'
import Pagination from '../components/Pagination'

// 我的发布
export default function MyItems() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pageSize = 12

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchMyItems({ page, pageSize })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条信息吗？')) return
    try {
      await deleteItem(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => prev - 1)
    } catch {
      alert('删除失败')
    }
  }

  const handleResolve = async (id) => {
    if (!confirm('确定标记为已解决吗？')) return
    try {
      const res = await resolveItem(id)
      setItems((prev) => prev.map((item) => (item.id === id ? res.data.item : item)))
    } catch {
      alert('操作失败')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  const statusMap = {
    pending: { label: '待审核', cls: 'badge-pending' },
    approved: { label: '已通过', cls: 'badge-approved' },
    rejected: { label: '已拒绝', cls: 'badge-rejected' },
    resolved: { label: '已解决', cls: 'badge-resolved' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/60" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 backdrop-blur px-4 py-3.5 text-rose-500">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-up">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] uppercase text-indigo-500 mb-2">My Posts</p>
          <h1 className="text-3xl font-bold text-slate-800 leading-tight">我的发布</h1>
          <p className="text-slate-500 mt-1.5 text-sm">管理你发布过的寻物与招领信息</p>
        </div>
        <button onClick={() => navigate('/post')} className="btn-primary !py-2.5 hidden sm:inline-flex">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          发布新信息
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0h-2M4 13h2m10-4h.01M14 9h.01M10 9h.01M6 9h.01" />
            </svg>
          </div>
          <p className="text-xl text-slate-600 font-semibold mb-1">还没有发布过</p>
          <p className="text-sm text-slate-400 mb-6">试试发布第一条寻物或招领信息</p>
          <button onClick={() => navigate('/post')} className="btn-primary mx-auto">
            去发布
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const status = statusMap[item.status] || statusMap.pending

            return (
              <div
                key={item.id}
                className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-4 transition-shadow hover:shadow-glass-lg"
              >
                <div className="w-full sm:w-32 aspect-[4/3] bg-gradient-to-br from-indigo-50/80 to-sky-50/80 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image_path ? (
                    <img src={item.image_path} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {item.type === 'lost' ? '寻物' : '招领'}
                    </span>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </div>

                  <h3
                    className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-1"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                    {item.description || '暂无描述'}
                  </p>

                  <p className="text-xs text-slate-400 mt-2">
                    {item.location && <span>{item.location} · </span>}
                    {formatDate(item.created_at)}
                  </p>
                </div>

                <div className="flex sm:flex-col gap-2 sm:items-end justify-end flex-shrink-0">
                  <button
                    onClick={() => navigate(`/post/${item.id}`)}
                    className="btn-ghost !py-1.5 !px-3 !text-sm"
                  >
                    编辑
                  </button>
                  {item.status === 'approved' && (
                    <button
                      onClick={() => handleResolve(item.id)}
                      className="btn-ghost !py-1.5 !px-3 !text-sm !text-emerald-600 hover:!bg-emerald-50"
                    >
                      已解决
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn-ghost !py-1.5 !px-3 !text-sm !text-rose-500 hover:!bg-rose-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      {/* 移动端发布按钮 */}
      <div className="sm:hidden mt-8">
        <button onClick={() => navigate('/post')} className="btn-primary w-full !py-3">
          发布新信息
        </button>
      </div>
    </div>
  )
}
