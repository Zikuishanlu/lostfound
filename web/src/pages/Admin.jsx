import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchStats,
  fetchUsers,
  updateUserRole,
  updateUserBan,
  fetchSettings,
  updateSettings,
  uploadHeroBackground,
  clearHeroBackground,
  fetchSnowlumaStatus,
  fetchArchivedItems,
  unarchiveItem,
  fetchCampuxStatus,
  testCampuxConnection,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import Pagination from '../components/Pagination'

// 管理后台：概览 / 系统设置（含 SnowLuma）/ 用户管理 / 主页背景 / 归档内容
export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: '概览' },
    { key: 'settings', label: '系统设置' },
    { key: 'users', label: '用户管理' },
    { key: 'archived', label: '归档内容' },
    { key: 'hero', label: '主页背景' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-fade-up">
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-indigo-500 mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-slate-800 leading-tight">管理后台</h1>
        <p className="text-slate-500 mt-1.5 text-sm">站点运营与 SnowLuma 通知配置</p>
      </div>

      {/* Tab 切换 */}
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl glass mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-glow'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'settings' && <Settings adminId={user?.id} />}
      {tab === 'users' && <Users adminId={user?.id} />}
      {tab === 'archived' && <ArchivedContent />}
      {tab === 'hero' && <HeroBg />}
    </div>
  )
}

/* ==================== 归档内容 ==================== */

function ArchivedContent() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchArchivedItems({ page, pageSize })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleUnarchive = async (id, title) => {
    if (!confirm(`确定取消归档《${title}》吗？内容将恢复在首页展示。`)) return
    try {
      await unarchiveItem(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => prev - 1)
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const typeMap = { lost: { label: '寻物', cls: 'badge-lost' }, found: { label: '招领', cls: 'badge-found' } }
  const statusMap = {
    approved: { label: '已通过', cls: 'badge-approved' },
    resolved: { label: '已解决', cls: 'badge-resolved' },
    pending: { label: '待审核', cls: 'badge-pending' },
    rejected: { label: '已拒绝', cls: 'badge-rejected' },
  }

  if (loading) {
    return <div className="card p-10 text-center text-slate-400 text-sm">加载中…</div>
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        已归档的内容不再对访客展示；取消归档后按原状态恢复展示。
      </p>

      {items.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-lg text-slate-600 font-semibold">暂无归档内容</p>
          <p className="text-sm text-slate-400 mt-1">在首页卡片或详情页可将内容归档到这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const type = typeMap[item.type] || typeMap.lost
            const status = statusMap[item.status]
            return (
              <div key={item.id} className="card p-4 sm:p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-50/80 to-sky-50/80">
                  {item.image_path ? (
                    <img src={item.image_path} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${type.cls}`}>{type.label}</span>
                    {status && <span className={`badge ${status.cls}`}>{status.label}</span>}
                    <span className="badge bg-slate-200/80 text-slate-600">已归档</span>
                  </div>
                  <h3
                    className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-1"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    发布者 {item.user_name || '未知'}
                    {item.location && <span className="ml-3">{item.location}</span>}
                  </p>
                </div>

                <button
                  onClick={() => handleUnarchive(item.id, item.title)}
                  className="btn-ghost !py-2 !px-3.5 !text-sm !text-emerald-600 hover:!bg-emerald-50 shrink-0"
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  取消归档
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}

/* ==================== 概览 ==================== */

function Overview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
  }, [])

  const cards = [
    { label: '用户总数', value: stats?.totalUsers, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', grad: 'from-indigo-500 to-sky-500' },
    { label: '稿件总数', value: stats?.totalItems, icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4', grad: 'from-sky-500 to-cyan-500' },
    { label: '待审核', value: stats?.pendingItems, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', grad: 'from-amber-500 to-orange-500' },
    { label: '已展示', value: stats?.approvedItems, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', grad: 'from-emerald-500 to-teal-500' },
    { label: '已解决', value: stats?.resolvedItems, icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', grad: 'from-rose-500 to-pink-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} text-white flex items-center justify-center mb-3 shadow-glow`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={c.icon} />
            </svg>
          </span>
          <p className="text-2xl font-bold text-slate-800">{c.value ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ==================== 系统设置（含 SnowLuma） ==================== */

function Settings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // SnowLuma 连接状态
  const [status, setStatus] = useState(null)

  const loadStatus = useCallback(() => {
    fetchSnowlumaStatus()
      .then((res) => setStatus(res.data))
      .catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    fetchSettings()
      .then((res) => setSettings(res.data.settings))
      .catch(() => setSettings({}))
    loadStatus()
  }, [loadStatus])

  // 有改动的 SnowLuma 配置保存后刷新状态（延迟 1.5s 等重连）
  useEffect(() => {
    if (message?.kind === 'snowluma') {
      const t = setTimeout(loadStatus, 1500)
      return () => clearTimeout(t)
    }
  }, [message, loadStatus])

  const setField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      // 仅提交站点相关字段
      const payload = {
        site_name: settings.site_name || '',
        require_review: settings.require_review === 'true' ? 'true' : 'false',
        snowluma_mode: settings.snowluma_mode === 'forward' ? 'forward' : 'reverse',
        snowluma_ws_port: String(parseInt(settings.snowluma_ws_port, 10) || 3002),
        snowluma_ws_url: settings.snowluma_ws_url || '',
        snowluma_token: settings.snowluma_token || '',
        snowluma_qq_group: settings.snowluma_qq_group || '',
        campux_enabled: settings.campux_enabled === 'true' ? 'true' : 'false',
        campux_api_base: settings.campux_api_base || '',
        campux_uin: settings.campux_uin || '',
        campux_password: settings.campux_password || '',
        campux_text_template: settings.campux_text_template ?? '',
      }
      const res = await updateSettings(payload)
      setSettings(res.data.settings)
      const snowlumaKeys = ['snowluma_mode', 'snowluma_ws_port', 'snowluma_ws_url', 'snowluma_token', 'snowluma_qq_group']
      setMessage({
        kind: snowlumaKeys.some((k) => k in payload) ? 'snowluma' : 'ok',
        text: '保存成功',
      })
    } catch (err) {
      setMessage({ kind: 'err', text: err.response?.data?.error || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <div className="card p-10 text-center text-slate-400 text-sm">加载中…</div>
  }

  const isForward = settings.snowluma_mode === 'forward'

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-2xl border backdrop-blur px-4 py-3 text-sm ${
            message.kind === 'err'
              ? 'border-rose-200/80 bg-rose-50/80 text-rose-500'
              : 'border-emerald-200/80 bg-emerald-50/80 text-emerald-600'
          }`}
        >
          {message.text}
          {message.kind === 'snowluma' && '，连接状态将在重连后刷新（约 5 秒）'}
        </div>
      )}

      {/* 站点设置 */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <h2 className="font-bold text-slate-800 mb-5">站点</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">站点名称</label>
            <input
              type="text"
              value={settings.site_name || ''}
              onChange={(e) => setField('site_name', e.target.value)}
              maxLength={50}
              className="input-base"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">发布需要审核</p>
              <p className="text-xs text-slate-400 mt-0.5">开启后新稿件为待审核状态，并触发 SnowLuma QQ 群通知</p>
            </div>
            {/* 开关 */}
            <button
              type="button"
              onClick={() => setField('require_review', settings.require_review === 'true' ? 'false' : 'true')}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                settings.require_review === 'true' ? 'bg-indigo-500' : 'bg-slate-300/80'
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${
                  settings.require_review === 'true' ? 'left-[1.375rem]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* SnowLuma 通知 */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-800">SnowLuma QQ 通知（OneBot 11）</h2>
          {/* 连接状态 */}
          <button
            onClick={loadStatus}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            title="点击刷新状态"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
              }`}
            />
            {status?.connected ? '已连接' : '未连接'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          SnowLuma 是 NapCat 团队的新一代协议端，兼容 OneBot 11。配置完成后新稿件将推送到 QQ 群，支持群内引用审核。
        </p>

        <div className="space-y-5">
          {/* 连接模式 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">连接模式</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setField('snowluma_mode', 'reverse')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  !isForward
                    ? 'border-indigo-300 bg-indigo-50/80 shadow-glass'
                    : 'border-white/80 bg-white/40 hover:bg-white/65'
                }`}
              >
                <span className="block text-sm font-bold text-slate-800 mb-1">反向 WebSocket（推荐）</span>
                <span className="text-xs text-slate-500 leading-relaxed">
                  本站监听端口，在 SnowLuma WebUI 新建「WebSocket 客户端」连入本站
                </span>
              </button>
              <button
                type="button"
                onClick={() => setField('snowluma_mode', 'forward')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  isForward
                    ? 'border-indigo-300 bg-indigo-50/80 shadow-glass'
                    : 'border-white/80 bg-white/40 hover:bg-white/65'
                }`}
              >
                <span className="block text-sm font-bold text-slate-800 mb-1">正向 WebSocket</span>
                <span className="text-xs text-slate-500 leading-relaxed">
                  在 SnowLuma WebUI 开启「WebSocket 服务端」，本站主动连接过去
                </span>
              </button>
            </div>
          </div>

          {!isForward ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">本站监听端口</label>
              <input
                type="number"
                value={settings.snowluma_ws_port || ''}
                onChange={(e) => setField('snowluma_ws_port', e.target.value)}
                placeholder="3002"
                className="input-base !w-48"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                SnowLuma 侧连接地址：<code className="bg-white/60 rounded px-1.5 py-0.5">ws://服务器IP:{settings.snowluma_ws_port || 3002}</code>，修改后需重启服务生效
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">SnowLuma 服务端地址</label>
              <input
                type="text"
                value={settings.snowluma_ws_url || ''}
                onChange={(e) => setField('snowluma_ws_url', e.target.value)}
                placeholder="ws://127.0.0.1:3001"
                className="input-base"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                在 SnowLuma WebUI 网络配置中开启「WebSocket 服务端」并填入其地址，断线自动重连
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                访问令牌 Token <span className="text-slate-400 font-normal">（可空）</span>
              </label>
              <input
                type="text"
                value={settings.snowluma_token || ''}
                onChange={(e) => setField('snowluma_token', e.target.value)}
                placeholder="与 SnowLuma 侧 access_token 保持一致"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">通知 QQ 群号</label>
              <input
                type="text"
                value={settings.snowluma_qq_group || ''}
                onChange={(e) => setField('snowluma_qq_group', e.target.value)}
                placeholder="机器人所在的接收群"
                className="input-base"
              />
            </div>
          </div>

          {/* 状态明细 */}
          {status && (
            <div className="rounded-2xl bg-white/50 border border-white/70 p-4 text-xs text-slate-500 leading-relaxed">
              <p>当前模式：{status.mode === 'forward' ? '正向（本站连出）' : '反向（SnowLuma 连入）'}</p>
              {status.mode === 'forward'
                ? <p>目标地址：{status.url || '未配置'}</p>
                : <p>监听端口：{status.port}</p>}
              <p>通知群号：{status.group || '未配置'}</p>
              <p>活动连接：{status.clients} 个</p>
            </div>
          )}
        </div>
      </section>

      {/* Campux 对接 */}
      <CampuxSection settings={settings} setField={setField} />

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary !px-8">
          {saving ? '保存中…' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

/* ==================== Campux 对接 ==================== */

function CampuxSection({ settings, setField }) {
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState(null)

  const loadStatus = useCallback(() => {
    fetchCampuxStatus()
      .then((res) => setStatus(res.data))
      .catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    try {
      await testCampuxConnection()
      setMessage({ kind: 'ok', text: '连接成功，账号密码有效' })
      loadStatus()
    } catch (err) {
      setMessage({ kind: 'err', text: err.response?.data?.error || '连接失败，请检查地址与账号' })
    } finally {
      setTesting(false)
    }
  }

  const enabled = settings.campux_enabled === 'true'

  return (
    <section className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-slate-800">Campux 对接（发布到 QQ 空间）</h2>
        <button
          onClick={loadStatus}
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          title="点击刷新状态"
        >
          <span className={`w-2 h-2 rounded-full ${status?.configured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {status?.configured ? '已配置' : '未配置'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        与 Campux 校园墙对接：审核通过后，本站把稿件（含图片）提交到你的 Campux，由 Campux 自己的发布管线
        发表到 QQ 空间——本站不重复实现 QZone 登录与发布。稿件在 Campux 侧是否需要审核，取决于 Campux 的配置。
      </p>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 mb-5 text-sm ${
            message.kind === 'err'
              ? 'border-rose-200/80 bg-rose-50/80 text-rose-500'
              : 'border-emerald-200/80 bg-emerald-50/80 text-emerald-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        {/* 开关 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">审核通过后提交到 Campux</p>
            <p className="text-xs text-slate-400 mt-0.5">
              网页审核、QQ 群内审核通过（含免审核直发）时自动投稿；提交失败不影响审核
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('campux_enabled', enabled ? 'false' : 'true')}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
              enabled ? 'bg-indigo-500' : 'bg-slate-300/80'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${
                enabled ? 'left-[1.375rem]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* 连接配置 */}
        <div className="rounded-2xl bg-white/50 border border-white/70 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">连接配置</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Campux 服务地址</label>
              <input
                type="text"
                value={settings.campux_api_base || ''}
                onChange={(e) => setField('campux_api_base', e.target.value)}
                placeholder="https://campux.example.com（不带末尾斜杠）"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">投稿账号（QQ 号）</label>
              <input
                type="text"
                value={settings.campux_uin || ''}
                onChange={(e) => setField('campux_uin', e.target.value)}
                placeholder="建议使用机器人 QQ 注册的成员账号"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">账号密码</label>
              <input
                type="password"
                value={settings.campux_password || ''}
                onChange={(e) => setField('campux_password', e.target.value)}
                placeholder="Campux 账号密码"
                className="input-base"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleTest} disabled={testing} className="btn-primary !py-2 !text-sm">
              {testing ? '测试中…' : '测试连接'}
            </button>
            <p className="text-xs text-slate-400">
              在 Campux 后台为机器人 QQ 注册一个成员账号（角色：成员/审核员均可），填到这里即可
            </p>
          </div>
        </div>

        {/* 文案模板 */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">投稿文案模板</label>
          <textarea
            value={settings.campux_text_template ?? ''}
            onChange={(e) => setField('campux_text_template', e.target.value)}
            rows={5}
            className="input-base resize-none leading-relaxed text-sm"
            placeholder="留空使用默认模板"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            可用占位符：{'{站点名} {编号} {类型} {标题} {描述} {地点} {联系方式} {链接}'}；留空使用默认模板
          </p>
        </div>
      </div>
    </section>
  )
}

/* ==================== 用户管理 ==================== */

function Users() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchUsers({ page, pageSize })
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleRole = async (id, role) => {
    try {
      await updateUserRole(id, role)
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
    } catch (err) {
      alert(err.response?.data?.error || '修改失败')
    }
  }

  const handleBan = async (id, isBanned) => {
    try {
      await updateUserBan(id, isBanned)
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_banned: isBanned ? 1 : 0 } : u)))
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const roleMap = { admin: '管理员', reviewer: '审核员', user: '用户' }

  if (loading) {
    return <div className="card p-10 text-center text-slate-400 text-sm">加载中…</div>
  }

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/70">
                <th className="px-5 py-3.5 font-semibold">用户</th>
                <th className="px-5 py-3.5 font-semibold">QQ</th>
                <th className="px-5 py-3.5 font-semibold">角色</th>
                <th className="px-5 py-3.5 font-semibold">状态</th>
                <th className="px-5 py-3.5 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/50 last:border-0 hover:bg-white/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {u.qq ? (
                        <img
                          src={`https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(u.qq)}&s=100`}
                          alt={u.username}
                          className="w-8 h-8 rounded-full object-cover bg-white/70"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white flex items-center justify-center text-xs font-bold">
                          {u.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                      <span className="font-medium text-slate-700">{u.username || '未知用户'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{u.qq || '—'}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRole(u.id, e.target.value)}
                      className="rounded-lg border border-white/80 bg-white/60 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400/40"
                    >
                      <option value="user">用户</option>
                      <option value="reviewer">审核员</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.is_banned ? (
                      <span className="badge badge-rejected">已封禁</span>
                    ) : (
                      <span className="badge badge-approved">正常</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleBan(u.id, !u.is_banned)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        u.is_banned
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-rose-500 hover:bg-rose-50'
                      }`}
                    >
                      {u.is_banned ? '解封' : '封禁'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
      <p className="text-xs text-slate-400 mt-4 text-center">
        注：不能修改自己的角色或封禁自己（角色显示 {roleMap.admin}）
      </p>
    </div>
  )
}

/* ==================== 主页背景 ==================== */

function HeroBg() {
  const [settings, setSettings] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchSettings()
      .then((res) => setSettings(res.data.settings))
      .catch(() => setSettings({}))
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await uploadHeroBackground(form)
      setSettings((prev) => ({ ...prev, hero_bg_image: res.data.hero_bg_image }))
      setMessage({ kind: 'ok', text: '背景图已更新' })
    } catch (err) {
      setMessage({ kind: 'err', text: err.response?.data?.error || '上传失败' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleClear = async () => {
    if (!confirm('确定清除主页背景图吗？将回退默认毛玻璃渐变。')) return
    try {
      await clearHeroBackground()
      setSettings((prev) => ({ ...prev, hero_bg_image: '' }))
      setMessage({ kind: 'ok', text: '已清除背景图' })
    } catch {
      setMessage({ kind: 'err', text: '操作失败' })
    }
  }

  if (!settings) {
    return <div className="card p-10 text-center text-slate-400 text-sm">加载中…</div>
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="font-bold text-slate-800 mb-2">主页顶部背景图</h2>
      <p className="text-xs text-slate-400 mb-5">
        设置后 Hero 区域将显示该图片并叠加深色渐变；不设置则使用默认毛玻璃渐变效果。
      </p>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 mb-5 text-sm ${
            message.kind === 'err'
              ? 'border-rose-200/80 bg-rose-50/80 text-rose-500'
              : 'border-emerald-200/80 bg-emerald-50/80 text-emerald-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {settings.hero_bg_image ? (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-white/80 shadow-glass max-h-72">
            <img src={settings.hero_bg_image} alt="主页背景" className="w-full object-cover" />
          </div>
          <div className="flex gap-3">
            <label className="btn-ghost cursor-pointer">
              {uploading ? '上传中…' : '更换图片'}
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <button onClick={handleClear} className="btn-ghost !text-rose-500 hover:!bg-rose-50">
              清除背景
            </button>
          </div>
        </div>
      ) : (
        <label className="block w-full rounded-2xl border-2 border-dashed border-slate-300/70 bg-white/40 backdrop-blur px-6 py-12 flex flex-col items-center justify-center gap-2 cursor-pointer text-center hover:bg-white/60 hover:border-indigo-300 transition-all">
          <span className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-slate-600 mt-2">{uploading ? '上传中…' : '点击上传背景图'}</span>
          <span className="text-xs text-slate-400">建议使用 1600×600 以上的宽幅图片</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  )
}
