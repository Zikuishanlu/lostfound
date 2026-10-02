// 加载环境变量配置
import 'dotenv/config';

// 统一导出配置对象
export const config = {
  // 服务器端口
  port: process.env.PORT || 3000,

  // 会话密钥
  sessionSecret: process.env.SESSION_SECRET || 'lostfound-dev-secret',

  // Campux OAuth2 配置
  campuxBaseUrl: process.env.CAMPUX_BASE_URL || 'https://campux.example.com',
  campuxClientId: process.env.CAMPUX_CLIENT_ID || '',
  campuxClientSecret: process.env.CAMPUX_CLIENT_SECRET || '',
  campuxRedirectUri: process.env.CAMPUX_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',

  // 前端地址（登录成功后重定向用）
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // 上传目录
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
