// 分页组件（毛玻璃）
export default function Pagination({ page, total, pageSize, onPageChange }) {
  if (!total || total <= pageSize) return null

  const totalPages = Math.ceil(total / pageSize)

  // 计算要展示的页码：首尾 + 当前页附近
  const pages = []
  const push = (p) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p)
  }
  push(1)
  push(totalPages)
  for (let p = page - 1; p <= page + 1; p++) push(p)
  pages.sort((a, b) => a - b)

  // 相邻页码之外插入省略号
  const rendered = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) rendered.push('ellipsis')
    rendered.push(p)
  })

  const btnBase =
    'min-w-[2.25rem] h-9 px-2 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center justify-center'

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={`${btnBase} glass text-slate-600 hover:bg-white/75 disabled:opacity-40 disabled:pointer-events-none`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {rendered.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="w-6 text-center text-slate-400 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btnBase} ${
              p === page
                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-glow'
                : 'glass text-slate-600 hover:bg-white/75'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={`${btnBase} glass text-slate-600 hover:bg-white/75 disabled:opacity-40 disabled:pointer-events-none`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
