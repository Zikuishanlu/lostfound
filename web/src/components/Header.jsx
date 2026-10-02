import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'

// 顶部导航（毛玻璃，吸顶）
export default function Header() {
  const { user, isAuthenticated, isAdmin, isReviewer, login, logout } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: '首页' },
    { to: '/my-items', label: '我的发布', show: isAuthenticated },
    { to: '/review', label: '审核', show: isReviewer },
    { to: '/admin', label: '管理', show: isAdmin },
  ].filter((l) => l.show !== false)

  const roleLabel = { admin: '管理员', reviewer: '审核员', user: '用户' }

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3 sm:pt-4">
      <div className="glass-strong max-w-6xl mx-auto rounded-2xl pl-4 pr-2 sm:pl-5 sm:pr-3 py-2.5 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.svg" alt="logo" className="w-8 h-8 rounded-lg shadow-glass" />
          <span className="font-bold text-[17px] tracking-tight text-slate-800 hidden sm:block">
            {settings.site_name || '拾光寻物'}
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/80 text-indigo-600 shadow-glass'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* 右侧：登录 / 用户 */}
        {!isAuthenticated ? (
          <button onClick={login} className="btn-primary !py-2 !px-4 !text-sm">
            登录
          </button>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl pl-1.5 pr-2.5 py-1.5 hover:bg-white/60 transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover bg-white/70"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white flex items-center justify-center text-sm font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
              <span className="hidden sm:block text-sm font-semibold text-slate-700 max-w-[7rem] truncate">
                {user?.username}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="glass-strong absolute right-0 mt-2 w-48 rounded-2xl p-2 animate-fade-up">
                <div className="px-3 py-2 border-b border-white/70 mb-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user?.username}</p>
                  <p className="text-xs text-slate-400">{roleLabel[user?.role] || '用户'}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/my-items') }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-white/70 transition-colors"
                >
                  我的发布
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/admin') }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-white/70 transition-colors"
                  >
                    管理后台
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-rose-500 hover:bg-rose-50/80 transition-colors"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 移动端底部导航 */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3">
        <div className="glass-strong rounded-2xl px-2 py-1.5 flex items-center justify-around">
          <MobileLink to="/" label="首页" />
          {isAuthenticated && <MobileLink to="/post" label="发布" />}
          {isAuthenticated && <MobileLink to="/my-items" label="我的" />}
          {isReviewer && <MobileLink to="/review" label="审核" />}
          {isAdmin && <MobileLink to="/admin" label="管理" />}
        </div>
      </nav>
    </header>
  )
}

function MobileLink({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
          isActive ? 'bg-white/85 text-indigo-600 shadow-glass' : 'text-slate-500'
        }`
      }
    >
      <span>{label}</span>
    </NavLink>
  )
}
