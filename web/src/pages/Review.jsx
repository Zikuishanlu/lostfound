import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPendingItems, approveItem, rejectItem } from '../api'
import Pagination from '../components/Pagination'

// 审核页
export default function Review() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const pageSize = 10

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPendingItems({ page, pageSize })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      setError('加载待审核列表失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleApprove = async (id) => {
    setActionLoading(true)
    try {
      await approveItem(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => prev - 1)
    } catch {
      alert('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartReject = (id) => {
    setRejectingId(id)
    setRejectReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('请输入拒绝理由')
      return
    }
    setActionLoading(true)
    try {
      await rejectItem(rejectingId, rejectReason.trim())
      setItems((prev) => prev.filter((item) => item.id !== rejectingId))
      setTotal((prev) => prev - 1)
      setRejectingId(null)
      setRejectReason('')
    } catch {
      alert('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelReject = () => {
    setRejectingId(null)
    setRejectReason('')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
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
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-indigo-500 mb-2">Review</p>
        <h1 className="text-3xl font-bold text-slate-800 leading-tight">审核管理</h1>
        <p className="text-slate-500 mt-1.5 text-sm">审核用户发布的寻物 / 招领信息</p>
      </div>

      {items.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 flex items-center justify-center text-emerald-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl text-slate-600 font-semibold">队列已清空</p>
          <p className="text-sm text-slate-400 mt-1">暂时没有待审核的物品</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isRejecting = rejectingId === item.id

            return (
              <div key={item.id} className="card overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-44 aspect-[4/3] sm:aspect-auto bg-gradient-to-br from-indigo-50/80 to-sky-50/80 flex-shrink-0 overflow-hidden">
                    {item.image_path ? (
                      <img src={item.image_path} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                        {item.type === 'lost' ? '寻物' : '招领'}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                    </div>

                    <h3 className="font-semibold text-slate-800 text-[16px] mb-1.5">{item.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {item.description || '暂无描述'}
                    </p>
                    <p className="text-xs text-slate-400">
                      发布者 <span className="text-slate-600 font-medium">{item.user_name || '未知'}</span>
                      {item.location && <span className="ml-3">地点 {item.location}</span>}
                    </p>

                    {isRejecting ? (
                      <div className="mt-4 pt-4 border-t border-white/70">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="请输入拒绝理由…"
                          className="input-base !py-2 !text-sm mb-2.5"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmReject}
                            disabled={actionLoading}
                            className="btn-primary !bg-gradient-to-r !from-rose-500 !to-rose-500 !py-2 !px-4 !text-sm"
                          >
                            确认拒绝
                          </button>
                          <button onClick={handleCancelReject} className="btn-ghost !py-2 !px-4 !text-sm">
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-white/70 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoading}
                          className="btn-primary !bg-gradient-to-r !from-emerald-500 !to-teal-500 !py-2 !px-4 !text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          通过
                        </button>
                        <button
                          onClick={() => handleStartReject(item.id)}
                          disabled={actionLoading}
                          className="btn-ghost !py-2 !px-4 !text-sm !text-rose-500 hover:!bg-rose-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          拒绝
                        </button>
                        <button
                          onClick={() => navigate(`/items/${item.id}`)}
                          className="ml-auto text-sm font-medium text-slate-500 hover:text-indigo-500 px-2 py-2 transition-colors"
                        >
                          查看详情 →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}
