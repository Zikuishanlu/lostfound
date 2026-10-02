import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { archiveItem } from '../api'

// 物品卡片（毛玻璃）
export default function ItemCard({ item, onArchived }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 管理员快捷归档：归档后从首页消失，可在管理后台「归档内容」恢复
  const handleArchive = async (e) => {
    e.stopPropagation()
    if (!confirm(`确定归档《${item.title}》吗？归档后不再在首页展示，可随时在管理后台恢复。`)) return
    try {
      await archiveItem(item.id)
      onArchived?.()
    } catch (err) {
      alert(err.response?.data?.error || '归档失败，请重试')
    }
  }

  return (
    <div
      onClick={() => navigate(`/items/${item.id}`)}
      className="card overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-glass-lg hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-indigo-50/80 to-sky-50/80 overflow-hidden">
        {item.image_path ? (
          <img
            src={item.image_path}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* 类型徽章悬浮在图上 */}
        <span
          className={`absolute top-3 left-3 badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'} shadow-glass`}
        >
          {item.type === 'lost' ? '寻物' : '招领'}
        </span>
        {item.status === 'resolved' && (
          <span className="absolute top-3 right-3 badge badge-resolved shadow-glass">已解决</span>
        )}
        {/* 管理员归档按钮 */}
        {isAdmin && onArchived && (
          <button
            type="button"
            onClick={handleArchive}
            title="归档（不在首页展示）"
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 hover:text-amber-600 hover:scale-110"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-800 line-clamp-1 mb-1.5 group-hover:text-indigo-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-1 mb-3">
          {item.description || '暂无描述'}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 min-w-0">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="truncate">{item.location || '未填写地点'}</span>
          </span>
          <span className="shrink-0 ml-2">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
