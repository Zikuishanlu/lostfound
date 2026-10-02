// 站点公开设置路由（无需登录）
import express from 'express';
import { getSetting } from '../db.js';

const router = express.Router();

// GET /api/site - 可公开访问的站点设置
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({
    site_name: getSetting('site_name') || '拾光寻物',
    hero_bg_image: getSetting('hero_bg_image') || '',
  });
});

export default router;
