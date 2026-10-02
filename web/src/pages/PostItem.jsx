import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createItem, updateItem, fetchItemById } from '../api'
import { useAuth } from '../contexts/AuthContext'
import ImageUpload from '../components/ImageUpload'

// 发布 / 编辑物品页
export default function PostItem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    type: 'lost',
    title: '',
    description: '',
    location: '',
    contact: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [existingImage, setExistingImage] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetchItemById(id)
      .then((res) => {
        const item = res.data.item
        setFormData({
          type: item.type || 'lost',
          title: item.title || '',
          description: item.description || '',
          location: item.location || '',
          contact: item.contact || '',
        })
        setExistingImage(item.image_path || null)
      })
      .catch(() => {
        setError('加载物品信息失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isEdit) {
        await updateItem(id, formData)
        navigate(`/items/${id}`)
      } else {
        const submitData = new FormData()
        submitData.append('type', formData.type)
        submitData.append('title', formData.title)
        submitData.append('description', formData.description)
        submitData.append('location', formData.location)
        submitData.append('contact', formData.contact)
        if (imageFile) {
          submitData.append('image', imageFile)
        }
        const res = await createItem(submitData)
        const newItemId = res.data.item?.id
        // 用户列表可能已变化（首次发布），静默刷新
        refreshUser()
        if (newItemId) {
          navigate(`/items/${newItemId}`)
        } else {
          navigate('/')
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-up">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-indigo-500 mb-2">
          {isEdit ? 'Edit' : 'New Post'}
        </p>
        <h1 className="text-3xl font-bold text-slate-800 leading-tight">
          {isEdit ? '编辑信息' : '发布寻物 / 招领'}
        </h1>
        <p className="text-slate-500 mt-2">
          {isEdit ? '修改内容后保存，信息将立即更新' : '填写以下信息，审核通过后会展示在首页'}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 backdrop-blur px-4 py-3.5 mb-6 text-rose-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        {/* 类型 */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2.5">类型</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, type: 'lost' }))}
              className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
                formData.type === 'lost'
                  ? 'border-amber-300 bg-amber-50/90 shadow-glass'
                  : 'border-white/80 bg-white/40 hover:bg-white/65'
              }`}
            >
              <span className="block text-sm font-bold text-amber-600 mb-1">寻物</span>
              <span className="text-sm text-slate-500">我丢了东西</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, type: 'found' }))}
              className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
                formData.type === 'found'
                  ? 'border-emerald-300 bg-emerald-50/90 shadow-glass'
                  : 'border-white/80 bg-white/40 hover:bg-white/65'
              }`}
            >
              <span className="block text-sm font-bold text-emerald-600 mb-1">招领</span>
              <span className="text-sm text-slate-500">我捡到东西</span>
            </button>
          </div>
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            标题 <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="例如：丢失黑色钱包"
            className="input-base"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            详细描述 <span className="text-rose-400">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            maxLength={1000}
            placeholder="请描述物品特征、丢失或捡到的经过…"
            className="input-base resize-none leading-relaxed"
          />
        </div>

        {/* 地点 */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">地点</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            maxLength={200}
            placeholder="如：图书馆三楼、二食堂"
            className="input-base"
          />
        </div>

        {/* 联系方式 */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            联系方式 <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="如：QQ: 123456789"
            className="input-base"
          />
        </div>

        {/* 图片 */}
        {!isEdit && <ImageUpload onChange={setImageFile} value={null} />}
        {isEdit && existingImage && (
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">当前图片</label>
            <img
              src={existingImage}
              alt="物品图片"
              className="w-full max-w-sm rounded-2xl border border-white/80 shadow-glass"
            />
          </div>
        )}

        {/* 提交 */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 !py-3">
            {submitting ? '提交中…' : isEdit ? '保存修改' : '发布'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost !py-3 sm:px-8">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
