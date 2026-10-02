// 拾光寻物 后端服务主入口
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import './db.js'; // 初始化数据库

// 路由模块
import authRoutes from './routes/auth.js';
import itemsRoutes from './routes/items.js';
import reviewRoutes from './routes/review.js';
import adminRoutes from './routes/admin.js';
import siteRoutes from './routes/site.js';
import { startSnowlumaServer, stopSnowlumaServer } from './snowluma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 信任反向代理（1Panel OpenResty / Nginx），使 HTTPS 下会话 Cookie 正常工作
app.set('trust proxy', 1);

// ==================== 中间件 ====================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS（允许前端携带凭证）
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// 会话
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // 仅显式配置 COOKIE_SECURE=true 时启用（需 HTTPS）；HTTP/IP 直连部署不要开启
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  },
}));

// ==================== 静态文件 ====================

// 上传文件的静态服务
const uploadDir = path.resolve(__dirname, '..', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ==================== API 路由 ====================

app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site', siteRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== 前端静态托管（生产） ====================

// 若 web/dist 存在，则以 SPA 模式托管前端
const frontendDistPath = path.resolve(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA 回退：非 API/上传 的 GET 请求返回 index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: '接口不存在' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ==================== 全局错误处理 ====================

app.use((err, req, res, next) => {
  // Multer 文件大小超限
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件大小超过 10MB 限制' });
  }
  // Multer 文件类型错误
  if (err.message && err.message.includes('仅允许上传')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('未处理的错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ==================== 启动 ====================

const server = app.listen(config.port, () => {
  console.log(`拾光寻物后端已启动: http://localhost:${config.port}`);
  console.log(`前端地址: ${config.frontendUrl}`);
  // 启动 SnowLuma（OneBot 11）连接模块
  startSnowlumaServer();
});

// 优雅退出：断开 SnowLuma 连接
process.on('SIGINT', () => {
  stopSnowlumaServer();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  stopSnowlumaServer();
  server.close(() => process.exit(0));
});
