// 物品路由模块（寻物 / 招领 CRUD）
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import {
  getApprovedItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  setItemStatus,
  setItemArchived,
  getSetting,
  getItemsByUserId,
} from '../db.js';
import { notifyNewSubmission } from '../snowluma.js';
import { notifyCampuxPublish } from '../campux.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== Multer 文件上传配置 ====================

// 确保上传目录存在
const uploadDir = path.resolve(__dirname, '..', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // 文件名：时间戳-随机数.扩展名
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, filename);
  },
});

// 仅允许图片，最大 10MB
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅允许上传 jpg、png、gif、webp 格式的图片文件'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ==================== 路由定义 ====================

// GET /api/items/my - 当前用户发布的物品（所有状态）
router.get('/my', requireAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;
  const { items, total } = getItemsByUserId(req.user.id, page, pageSize);
  res.json({ items, total, page, pageSize });
});

// GET /api/items - 已审核通过的物品列表（分页 + 筛选）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;
  const type = req.query.type || null;
  const keyword = req.query.keyword || null;

  const { items, total } = getApprovedItems({ type, keyword, page, pageSize });

  res.json({ items, total, page, pageSize });
});

// GET /api/items/:id - 物品详情
// 未审核通过或已归档的物品仅所有者 / 审核员 / 管理员可见
router.get('/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const isOwner = req.user && req.user.id === item.user_id;
  const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'reviewer');

  if (item.status !== 'approved' || item.is_archived) {
    if (!req.user) {
      return res.status(403).json({ error: item.is_archived ? '该信息已归档' : '该物品正在审核中，暂不可见' });
    }
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: item.is_archived ? '该信息已归档' : '该物品正在审核中，暂不可见' });
    }
  }

  res.json({ item });
});

// POST /api/items - 创建新物品（需登录），表单字段名 "image"
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const { type, title, description, location, contact } = req.body;

  if (!type || !['lost', 'found'].includes(type)) {
    return res.status(400).json({ error: '物品类型必须是 lost 或 found' });
  }
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }

  // 根据设置决定初始状态
  const requireReview = getSetting('require_review') === 'true';
  const status = requireReview ? 'pending' : 'approved';

  const item = createItem({
    user_id: req.user.id,
    type,
    title,
    description: description || null,
    image_path: imagePath,
    location: location || null,
    contact: contact || null,
    status,
  });

  // 需要审核时，通过 SnowLuma 推送 QQ 群通知（异步，不阻塞响应）
  if (status === 'pending') {
    notifyNewSubmission(item, req.user);
  }
  // 免审核直接发布时同样触发 QQ 空间发布（异步，不阻塞响应）
  if (status === 'approved') {
    notifyCampuxPublish(item);
  }

  res.status(201).json({ item });
});

// PUT /api/items/:id - 更新物品（仅所有者或管理员）
router.put('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const isOwner = req.user.id === item.user_id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '无权修改他人物品' });
  }

  const { title, description, location, contact } = req.body;

  const updatedItem = updateItem(id, {
    title: title || item.title,
    description: description !== undefined ? description : item.description,
    location: location !== undefined ? location : item.location,
    contact: contact !== undefined ? contact : item.contact,
  });

  res.json({ item: updatedItem });
});

// DELETE /api/items/:id - 删除物品（仅所有者或管理员）
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const isOwner = req.user.id === item.user_id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '无权删除他人物品' });
  }

  // 删除关联的图片文件
  if (item.image_path) {
    const filename = path.basename(item.image_path);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  deleteItem(id);
  res.json({ success: true });
});

// POST /api/items/:id/resolve - 标记为已解决（仅所有者）
router.post('/:id/resolve', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const isOwner = req.user.id === item.user_id;
  if (!isOwner) {
    return res.status(403).json({ error: '仅物品发布者可标记为已解决' });
  }

  const updatedItem = setItemStatus(id, 'resolved');
  res.json({ item: updatedItem });
});

// POST /api/items/:id/archive - 归档（仅管理员；已归档内容不再公开展示）
router.post('/:id/archive', requireAuth, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  if (!['approved', 'resolved'].includes(item.status)) {
    return res.status(400).json({ error: '仅已发布或已解决的内容可归档' });
  }
  if (item.is_archived) {
    return res.status(400).json({ error: '该内容已归档' });
  }

  const updatedItem = setItemArchived(id, true);
  res.json({ item: updatedItem });
});

// POST /api/items/:id/unarchive - 取消归档（仅管理员，恢复公开展示）
router.post('/:id/unarchive', requireAuth, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  if (!item.is_archived) {
    return res.status(400).json({ error: '该内容未归档' });
  }

  const updatedItem = setItemArchived(id, false);
  res.json({ item: updatedItem });
});

export default router;
