import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import axios from 'axios'

// 站点公开设置上下文（站点名、主页背景图等）
const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    site_name: '拾光寻物',
    hero_bg_image: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/site')
      setSettings((prev) => ({ ...prev, ...res.data }))
    } catch {
      // 拉取失败时保留默认值，不影响页面
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用')
  return ctx
}
