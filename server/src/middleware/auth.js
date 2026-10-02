// 认证中间件模块
import { getUserById } from '../db.js';

// 要求用户已登录，否则返回 401；被封禁返回 403
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const user = getUserById(req.session.userId);
  if (!user) {
    // 会话中的用户在数据库中不存在，清除会话
    req.session.destroy(() => {});
    return res.status(401).json({ error: '用户不存在，请重新登录' });
  }

  if (user.is_banned) {
    return res.status(403).json({ error: '您的账号已被封禁' });
  }

  req.user = user;
  next();
}

// 要求用户具有指定角色之一（必须在 requireAuth 之后使用）
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 可选认证：已登录则加载用户，未登录不报错
export function optionalAuth(req, res, next) {
  if (req.session.userId) {
    const user = getUserById(req.session.userId);
    if (user && !user.is_banned) {
      req.user = user;
    }
  }
  next();
}
