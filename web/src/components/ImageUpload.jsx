import { useState, useRef } from 'react'

// 图片上传组件（毛玻璃拖拽区 + 预览）
export default function ImageUpload({ onChange, value }) {
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  const handleFile = (file) => {
    setError('')
    if (!file) return
    if (!allowedTypes.includes(file.type)) {
      setError('仅支持 jpg、png、gif、webp 格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB')
      return
    }
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  const handleRemove = () => {
    setPreview(null)
    setError('')
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        物品图片 <span className="text-slate-400 font-normal">（选填，让信息更容易被认出）</span>
      </label>

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/80 shadow-glass">
          <img src={preview} alt="预览" className="w-full max-h-72 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-3 right-3 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-rose-500 hover:text-rose-600 transition-colors"
            title="移除图片"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={`w-full rounded-2xl border-2 border-dashed backdrop-blur px-6 py-10 flex flex-col items-center justify-center gap-2.5 transition-all duration-200 ${
            dragging
              ? 'border-indigo-400 bg-indigo-50/60'
              : 'border-slate-300/70 bg-white/40 hover:bg-white/60 hover:border-indigo-300'
          }`}
        >
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-slate-600">点击上传或拖拽图片到这里</span>
          <span className="text-xs text-slate-400">jpg / png / gif / webp，最大 10MB</span>
        </button>
      )}

      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
