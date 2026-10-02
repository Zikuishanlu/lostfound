import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Header from './components/Header'
import Home from './pages/Home'
import ItemDetail from './pages/ItemDetail'
import PostItem from './pages/PostItem'
import Admin from './pages/Admin'
import Review from './pages/Review'
import MyItems from './pages/MyItems'
import NotFound from './pages/NotFound'

// 全站加载指示器
function FullSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/60" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin" />
      </div>
    </div>
  )
}

// 受保护路由：需登录才能访问
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullSpinner />
  if (!isAuthenticated) return <Navigate to="/" replace />

  return children
}

// 角色受保护路由：需特定角色才能访问
function RoleRoute({ children, check }) {
  const { loading } = useAuth()

  if (loading) return <FullSpinner />

  const allowed = check()
  if (!allowed) return <Navigate to="/" replace />

  return children
}

// 全局毛玻璃背景光斑（fixed，不随滚动）
function AuroraBackdrop() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-32 w-[30rem] h-[30rem] rounded-full bg-indigo-300/40 blur-3xl" />
      <div className="absolute top-1/4 -right-40 w-[28rem] h-[28rem] rounded-full bg-sky-300/35 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 w-[26rem] h-[26rem] rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute top-2/3 left-10 w-72 h-72 rounded-full bg-rose-200/35 blur-3xl" />
    </div>
  )
}

// 应用主体
function AppContent() {
  const { isAdmin, isReviewer } = useAuth()

  return (
    <div className="min-h-screen flex flex-col text-slate-800 pb-16 md:pb-0">
      <AuroraBackdrop />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route
            path="/post"
            element={
              <ProtectedRoute>
                <PostItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-items"
            element={
              <ProtectedRoute>
                <MyItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <RoleRoute check={() => isReviewer}>
                <Review />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute check={() => isAdmin}>
                <Admin />
              </RoleRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* 页脚 */}
      <footer className="mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
          <div className="glass rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <p className="font-semibold text-slate-700">拾光寻物 · Campus Lost &amp; Found</p>
            <p>© {new Date().getFullYear()} · 让每一件物品都找到回家的路</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 根组件：站点设置 + 认证上下文
export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  )
}
