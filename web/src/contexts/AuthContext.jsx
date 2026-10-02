import { createContext, useContext, useEffect, useState } from 'react'
import { fetchMe, logout as logoutApi } from '../api'

// 认证上下文
const AuthContext = createContext(null)

// 认证 Provider，管理用户登录状态
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 组件挂载时获取当前用户信息
  useEffect(() => {
    fetchMe()
      .then((res) => {
        setUser(res.data.user)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // 登录：跳转到后端 OAuth 入口
  const login = () => {
    window.location.href = '/api/auth/login'
  }

  // 退出：调用后端登出接口并清除本地状态
  const logout = async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
    }
  }

  // 重新获取用户信息
  const refreshUser = async () => {
    try {
      const res = await fetchMe()
      setUser(res.data.user)
    } catch {
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isReviewer: user?.role === 'reviewer' || user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth Hook
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
