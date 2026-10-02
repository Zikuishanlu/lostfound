import { fileURLToPath } from 'url';
import path from 'path';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传目录绝对路径（items 路由与 admin 路由共用）
export const uploadDir = path.resolve(__dirname, '..', config.uploadDir);

// 图片扩展名白名单
export const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Multer 文件过滤器：仅允许图片
export function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedImageExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('仅允许上传 jpg、png、gif、webp 格式的图片文件'));
  }
}
