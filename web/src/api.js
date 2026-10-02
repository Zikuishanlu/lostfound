import axios from 'axios'

// 创建 axios 实例，基础路径为 /api，携带 cookie 凭证
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

/* ========== 认证相关 API ========== */

export const fetchMe = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')

/* ========== 物品相关 API ========== */

// 获取物品列表（类型 / 关键词 / 分页）
export const fetchItems = (params) => api.get('/items', { params })

// 获取当前用户发布的物品（所有状态）
export const fetchMyItems = (params) => api.get('/items/my', { params })

// 获取单个物品详情
export const fetchItemById = (id) => api.get(`/items/${id}`)

// 发布新物品（multipart 表单，含图片）
export const createItem = (formData) =>
  api.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// 编辑物品
export const updateItem = (id, data) => api.put(`/items/${id}`, data)

// 删除物品
export const deleteItem = (id) => api.delete(`/items/${id}`)

// 标记物品为已解决
export const resolveItem = (id) => api.post(`/items/${id}/resolve`)

// 归档 / 取消归档（仅管理员）
export const archiveItem = (id) => api.post(`/items/${id}/archive`)
export const unarchiveItem = (id) => api.post(`/items/${id}/unarchive`)

/* ========== 审核相关 API ========== */

export const fetchPendingItems = (params) => api.get('/review/pending', { params })
export const approveItem = (itemId) => api.post(`/review/${itemId}/approve`)
export const rejectItem = (itemId, reason) =>
  api.post(`/review/${itemId}/reject`, { reason })

/* ========== 管理员 API ========== */

export const fetchUsers = (params) => api.get('/admin/users', { params })
export const updateUserRole = (id, role) =>
  api.put(`/admin/users/${id}/role`, { role })
export const updateUserBan = (id, isBanned) =>
  api.put(`/admin/users/${id}/ban`, { isBanned })
export const fetchSettings = () => api.get('/admin/settings')
export const updateSettings = (data) => api.put('/admin/settings', data)
export const uploadHeroBackground = (file) =>
  api.post('/admin/settings/hero-bg', file, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const clearHeroBackground = () => api.delete('/admin/settings/hero-bg')
export const fetchStats = () => api.get('/admin/stats')

// 获取已归档内容列表（分页）
export const fetchArchivedItems = (params) => api.get('/admin/archived', { params })

// ===== Campux 对接（审核通过后由 Campux 发布到 QQ 空间）=====

// 获取 Campux 对接状态
export const fetchCampuxStatus = () => api.get('/admin/campux-status')

// 测试 Campux 连接（登录 + token 校验）
export const testCampuxConnection = () => api.post('/admin/campux/test')

// 获取 SnowLuma（OneBot 11）连接状态
export const fetchSnowlumaStatus = () => api.get('/admin/snowluma-status')

export default api
