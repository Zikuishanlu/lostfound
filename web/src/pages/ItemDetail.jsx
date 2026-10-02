import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchItemById, deleteItem, resolveItem, archiveItem, unarchiveItem } from '../api'
import { useAuth } from '../contexts/AuthContext'

// 物品详情页
export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchItemById(id)
      .then((res) => {
        setItem(res.data.item)
      })
      .catch(() => {
        setError('物品不存在或加载失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('确定要删除这条信息吗？此操作不可撤销。')) return
    try {
      await deleteItem(id)
      navigate('/')
    } catch {
      alert('删除失败，请重试')
    }
  }

  const handleResolve = async () => {
    if (!confirm('确定将此物品标记为已解决吗？')) return
    try {
      const res = await resolveItem(id)
      setItem(res.data.item)
    } catch {
      alert('操作失败，请重试')
    }
  }

  // 管理员归档 / 取消归档
  const handleArchive = async () => {
    if (!confirm('确定归档该内容吗？归档后不再在首页公开展示，可在管理后台恢复。')) return
    try {
      const res = await archiveItem(id)
      setItem(res.data.item)
    } catch (err) {
      alert(err.response?.data?.error || '归档失败，请重试')
    }
  }

  const handleUnarchive = async () => {
    if (!confirm('确定取消归档吗？内容将恢复公开展示。')) return
    try {
      const res = await unarchiveItem(id)
      setItem(res.data.item)
    } catch (err) {
      alert(err.response?.data?.error || '操作失败，请重试')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusMap = {
    pending: { label: '待审核', cls: 'badge-pending' },
    approved: { label: '已通过', cls: 'badge-approved' },
    rejected: { label: '已拒绝', cls: 'badge-rejected' },
    resolved: { label: '已解决', cls: 'badge-resolved' },
  }

  const isOwner = user && item && user.id === item.user_id

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

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-2xl font-bold text-slate-700 mb-2">{error || '物品不存在'}</p>
        <p className="text-slate-500 mb-8">可能已被删除，或链接有误</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-500 mb-5 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      <article className="card overflow-hidden">
        {/* 图片 */}
        <div className="w-full aspect-[16/9] bg-gradient-to-br from-indigo-50/80 to-sky-50/80 overflow-hidden">
          {item.image_path ? (
            <img src={item.image_path} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-slate-400">暂无图片</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {/* 标签 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'} !text-sm !px-3 !py-1`}>
              {item.type === 'lost' ? '寻物' : '招领'}
            </span>
            {statusMap[item.status] && (
              <span className={`badge ${statusMap[item.status].cls} !text-sm !px-3 !py-1`}>
                {statusMap[item.status].label}
              </span>
            )}
            {item.is_archived ? (
              <span className="badge bg-slate-200/80 text-slate-600 !text-sm !px-3 !py-1">已归档</span>
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-3xl leading-tight font-bold text-slate-800 mb-6">
            {item.title}
          </h1>

          {/* 地点 / 联系方式 */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-white/50 backdrop-blur border border-white/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                地点
              </div>
              <p className="text-[15px] text-slate-800">{item.location || '未提供'}</p>
            </div>
            <div className="rounded-2xl bg-white/50 backdrop-blur border border-white/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                联系方式
              </div>
              <p className="text-[15px] text-slate-800">{item.contact || '未提供'}</p>
            </div>
          </div>

          {/* 描述 */}
          <div className="mb-8">
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400 mb-3">详细描述</h3>
            <div className="text-[15px] text-slate-600 whitespace-pre-wrap leading-relaxed rounded-2xl bg-white/45 backdrop-blur border border-white/70 p-5">
              {item.description || '暂无描述'}
            </div>
          </div>

          {/* 发布者 */}
          <div className="flex items-center gap-3 py-5 border-t border-white/70">
            {item.user_qq ? (
              <img
                src={`https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(item.user_qq)}&s=100`}
                alt={item.user_name}
                className="w-11 h-11 rounded-full object-cover bg-white/70"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-sky-400 text-white rounded-full flex items-center justify-center text-lg font-bold">
                {item.user_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{item.user_name}</p>
              <p className="text-xs text-slate-400">发布于 {formatDate(item.created_at)}</p>
            </div>
            {item.user_qq && (
              <div className="text-right">
                <p className="text-[11px] text-slate-400">QQ</p>
                <p className="text-sm text-slate-600 font-medium">{item.user_qq}</p>
              </div>
            )}
          </div>

          {/* 管理员操作 */}
          {isAdmin && ['approved', 'resolved'].includes(item.status) && (
            <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-white/70">
              <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 w-full sm:w-auto">
                管理员操作
              </p>
              {item.is_archived ? (
                <button onClick={handleUnarchive} className="btn-ghost !py-2 !text-sm !text-emerald-600 hover:!bg-emerald-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  取消归档（恢复展示）
                </button>
              ) : (
                <button onClick={handleArchive} className="btn-ghost !py-2 !text-sm !text-amber-600 hover:!bg-amber-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  归档（不在首页展示）
                </button>
              )}
            </div>
          )}

          {/* 所有者操作 */}
          {isOwner && (
            <div className="flex flex-wrap gap-3 pt-5 border-t border-white/70">
              <button onClick={() => navigate(`/post/${item.id}`)} className="btn-ghost !py-2 !text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              {item.status !== 'resolved' && (
                <button
                  onClick={handleResolve}
                  className="btn-ghost !py-2 !text-sm !text-emerald-600 hover:!bg-emerald-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  标记已解决
                </button>
              )}
              <button
                onClick={handleDelete}
                className="ml-auto btn-ghost !py-2 !text-sm !text-rose-500 hover:!bg-rose-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
