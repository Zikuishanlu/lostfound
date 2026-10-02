// 审核路由模块（需要审核员或管理员权限）
import express from 'express';
import {
  getPendingItems,
  getItemById,
  setItemStatus,
  createReviewLog,
} from '../db.js';
import { notifyCampuxPublish } from '../campux.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 所有路由均需要登录 + 审核员或管理员权限
router.use(requireAuth, requireRole('reviewer', 'admin'));

// GET /api/review/pending - 待审核物品列表（分页）
router.get('/pending', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;

  const { items, total } = getPendingItems(page, pageSize);

  res.json({ items, total, page, pageSize });
});

// GET /api/review/:id - 单个待审核物品详情
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ error: '该物品不在待审核状态' });
  }

  res.json({ item });
});

// POST /api/review/:itemId/approve - 审核通过
router.post('/:itemId/approve', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const item = getItemById(itemId);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ error: '该物品不在待审核状态' });
  }

  const updatedItem = setItemStatus(itemId, 'approved');

  createReviewLog({
    item_id: itemId,
    reviewer_id: req.user.id,
    action: 'approved',
    reason: null,
  });

  // 审核通过后发布到 QQ 空间（Campux 模式，异步不阻塞）
  notifyCampuxPublish(updatedItem);

  res.json({ item: updatedItem });
});

// POST /api/review/:itemId/reject - 审核拒绝（含理由）
router.post('/:itemId/reject', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const { reason } = req.body;

  const item = getItemById(itemId);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ error: '该物品不在待审核状态' });
  }

  const updatedItem = setItemStatus(itemId, 'rejected');

  createReviewLog({
    item_id: itemId,
    reviewer_id: req.user.id,
    action: 'rejected',
    reason: reason || null,
  });

  res.json({ item: updatedItem });
});

export default router;
