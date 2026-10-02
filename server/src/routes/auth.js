// 认证路由模块（Campux OAuth2 + PKCE）
import crypto from 'crypto';
import express from 'express';
import { config } from '../config.js';
import { generatePKCE, getAuthorizationUrl, exchangeToken, getUserInfo } from '../oauth.js';
import { upsertUser, getUserById } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/login - 发起 OAuth2 + PKCE 登录流程
router.get('/login', (req, res) => {
  // 生成随机 state 用于防止 CSRF 攻击
  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePKCE();

  // 将 state 和 verifier 存入会话，回调时验证
  req.session.oauthState = state;
  req.session.codeVerifier = verifier;

  const authUrl = getAuthorizationUrl(state, challenge);
  res.redirect(authUrl);
});

// GET /api/auth/callback - OAuth2 回调
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // 验证 state 是否匹配，防止 CSRF 攻击
  if (!state || state !== req.session.oauthState) {
    return res.status(400).json({ error: '无效的 state 参数，可能存在 CSRF 攻击' });
  }

  const codeVerifier = req.session.codeVerifier;
  if (!codeVerifier) {
    return res.status(400).json({ error: '缺少 PKCE 验证信息，请重新登录' });
  }

  try {
    const tokenResponse = await exchangeToken(code, codeVerifier, config.campuxRedirectUri);
    const accessToken = tokenResponse.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: '未获取到访问令牌' });
    }

    const userInfo = await getUserInfo(accessToken);

    // 首个登录的用户自动成为管理员
    // Campux 返回字段：name=QQ号, username=显示名, sub=用户ID
    const user = upsertUser({
      sub: userInfo.sub,
      qq: userInfo.name,
      username: userInfo.username,
      tenant_id: userInfo.tenant_id,
    });

    delete req.session.oauthState;
    delete req.session.codeVerifier;
    req.session.userId = user.id;

    res.redirect(config.frontendUrl);
  } catch (error) {
    console.error('OAuth 回调错误:', error.message);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// POST /api/auth/logout - 退出登录
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出登录失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me - 获取当前登录用户信息
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  const user = getUserById(req.session.userId);
  if (!user) {
    return res.json({ user: null });
  }

  // Campux 无头像字段；有 QQ 号时用腾讯公开头像接口
  const avatar = user.qq
    ? `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(user.qq)}&s=100`
    : null;

  res.json({
    user: {
      id: user.id,
      sub: user.sub,
      qq: user.qq,
      username: user.username,
      role: user.role,
      is_banned: user.is_banned,
      tenant_id: user.tenant_id,
      created_at: user.created_at,
      avatar,
    },
  });
});

export default router;
