// Campux OAuth2 认证模块（带 PKCE S256）
import crypto from 'crypto';
import { config } from './config.js';

// 生成 PKCE 所需的 code_verifier 和 code_challenge
export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// 构建授权 URL，引导用户前往 Campux 授权页面
export function getAuthorizationUrl(state, codeChallenge) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.campuxClientId,
    redirect_uri: config.campuxRedirectUri,
    scope: 'profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${config.campuxBaseUrl}/oauth/authorize?${params.toString()}`;
}

// 用授权码换取访问令牌（Basic 认证头）
export async function exchangeToken(code, codeVerifier, redirectUri) {
  const basicAuth = Buffer.from(`${config.campuxClientId}:${config.campuxClientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.campuxClientId,
    client_secret: config.campuxClientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${config.campuxBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`换取令牌失败: ${response.status} ${errorText}`);
  }

  return response.json();
}

// 使用访问令牌获取用户信息
export async function getUserInfo(accessToken) {
  const response = await fetch(`${config.campuxBaseUrl}/oauth/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取用户信息失败: ${response.status} ${errorText}`);
  }

  return response.json();
}
