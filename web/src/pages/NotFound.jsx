import { Link } from 'react-router-dom'

// 404 页面
export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center animate-fade-up">
      <div className="card py-16 px-8">
        <p className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-sky-500 mb-4">
          404
        </p>
        <h1 className="text-xl font-bold text-slate-700 mb-2">页面走丢了</h1>
        <p className="text-slate-400 mb-8">就像那件你正在寻找的物品一样，我们也在帮它找路。</p>
        <Link to="/" className="btn-primary">
          返回首页
        </Link>
      </div>
    </div>
  )
}
