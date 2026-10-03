// Campux 对接模块 —— 审核通过后把稿件提交给 Campux，由 Campux 自身的
// 发布管线（审核 → 机器人 → QZone Cookies）发表到 QQ 空间。
//
// 对接的是 Campux 新版 Web API（github.com/idoknow/Campux，Fastify 版）：
//   1. POST /api/auth/login  {account, password}          → Set-Cookie 会话
//   2. GET  /api/me                                       → 会话校验（测试连接）
//   3. POST /api/posts       multipart(text, anonymous, images[]) → {post:{id}}
//
// 新版没有独立图片上传接口：图片随投稿 multipart 一并上传（≤9 张）；
// 也没有客户端幂等字段，网络重试可能产生重复投稿。
// campux_api_base 必须填 Campux 主域名（单墙自托管）或目标校园墙自己的域名
// （多租户按访问域名绑墙）；多墙账号登录会拿到 needsTenantSelection，直接报错。
import fs from 'fs';
import path from 'path';
import { getAllSettings } from './db.js';
import { uploadDir } from './upload.js';
import { config } from './config.js';

// 默认投稿文案模板（占位符与后台可配置模板一致）
export const defaultCampuxTemplate =
  '【{站点名} #{编号}】{类型}\n{标题}\n\n{描述}\n\n📍 地点：{地点}\n💬 联系方式：{联系方式}\n🔗 详情：{链接}';

const SESSION_COOKIE = 'campux_session';

// 文件扩展名 → multipart mimetype（新版服务端按 mimetype 校验图片类型）
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

// 会话 Cookie 内存缓存（有效期 7 天；401 后自动重登）
let cachedCookie = null;

function apiBase() {
  const settings = getAllSettings();
  return (settings.campux_api_base || '').trim().replace(/\/+$/, '');
}

function campuxConfigured() {
  const settings = getAllSettings();
  return !!(settings.campux_api_base && settings.campux_uin && settings.campux_password);
}

// 新版响应是裸 JSON，错误为 HTTP 状态码 + {message}（无 {code,msg,data} 信封）
async function parseCampuxResponse(response) {
  let json = null;
  try {
    json = await response.json();
  } catch { /* ignore */ }
  if (!response.ok) {
    throw new Error(`Campux 接口 HTTP ${response.status}${json?.message ? `：${json.message}` : ''}`);
  }
  return json ?? {};
}

// 从 Set-Cookie 头提取 "campux_session=<token>"，后续请求原样放进 Cookie 头
function extractSessionCookie(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')].filter(Boolean);
  for (const setCookie of setCookies) {
    const pair = setCookie.split(';')[0].trim();
    if (pair.startsWith(`${SESSION_COOKIE}=`) && pair.length > SESSION_COOKIE.length + 1) {
      return pair;
    }
  }
  throw new Error('Campux 登录成功但没有返回会话 Cookie');
}

async function login() {
  const settings = getAllSettings();
  const base = apiBase();
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      account: settings.campux_uin || '',
      password: settings.campux_password || '',
    }),
  });
  const data = await parseCampuxResponse(response);
  if (data.needsTenantSelection) {
    throw new Error('Campux 账号属于多个校园墙，请把 Campux 服务地址填为具体校园墙的域名');
  }
  cachedCookie = extractSessionCookie(response);
  return cachedCookie;
}

// 带 Cookie 的请求；401 时自动重登一次
async function authedFetch(path, options = {}, retry = true) {
  const base = apiBase();
  if (!cachedCookie) {
    await login();
  }
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cachedCookie,
    },
  });
  if (response.status === 401 && retry) {
    cachedCookie = null;
    return authedFetch(path, options, false);
  }
  return response;
}

// 测试连接：登录 + 会话校验（管理后台按钮）
export async function testCampuxConnection() {
  await login();
  const response = await authedFetch('/api/me');
  await parseCampuxResponse(response);
  return { ok: true };
}

// 连接状态（管理后台展示）
export function getCampuxStatus() {
  const settings = getAllSettings();
  return {
    enabled: settings.campux_enabled === 'true',
    configured: campuxConfigured(),
    apiBase: settings.campux_api_base || '',
    uin: settings.campux_uin || '',
    loggedIn: !!cachedCookie,
    template: settings.campux_text_template || defaultCampuxTemplate,
  };
}

// 收集物品图片为 multipart 文件项（新版无独立上传接口，随投稿一起传）
function collectItemImages(item) {
  if (!item.image_path) return [];
  const localFile = path.join(uploadDir, path.basename(item.image_path));
  if (!fs.existsSync(localFile)) return [];

  const ext = path.extname(item.image_path).toLowerCase().replace('.', '') || 'jpg';
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  const bytes = fs.readFileSync(localFile);
  return [{
    blob: new Blob([bytes], { type: mime }),
    filename: `item-${item.id}.${ext}`,
  }];
}

// 用文案模板渲染投稿正文
function renderTemplate(template, item) {
  const typeLabel = item.type === 'lost' ? '寻物启事' : '失物招领';
  const replacements = {
    '{站点名}': getAllSettings().site_name || '拾光寻物',
    '{编号}': String(item.id),
    '{类型}': typeLabel,
    '{标题}': item.title || '',
    '{描述}': item.description || '',
    '{地点}': item.location || '未填写',
    '{联系方式}': item.contact || '未填写',
    '{链接}': `${config.frontendUrl}/items/${item.id}`,
  };
  let output = template || defaultCampuxTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }
  return output;
}

// 把稿件作为投稿提交给 Campux（新版无幂等字段，重试可能重复提交）
async function submitToCampux(item) {
  const text = renderTemplate(getAllSettings().campux_text_template || defaultCampuxTemplate, item);
  const form = new FormData();
  form.append('text', text);
  form.append('anonymous', 'false');

  const images = collectItemImages(item).slice(0, 9);
  for (const image of images) {
    form.append('images', image.blob, image.filename);
  }

  const response = await authedFetch('/api/posts', {
    method: 'POST',
    body: form,
  });
  const data = await parseCampuxResponse(response);
  return { postId: data.post?.id ?? null, images: images.length };
}

// 审核通过后触发：检查开关与配置，把稿件提交给 Campux。
// 永不抛错、不阻塞审核流程；结果只记录日志。
export async function notifyCampuxPublish(item) {
  try {
    if (!item || !['approved', 'resolved'].includes(item.status)) return;

    const settings = getAllSettings();
    if (settings.campux_enabled !== 'true') {
      console.log('[Campux] 未开启 Campux 发布，跳过');
      return;
    }
    if (item.is_archived) {
      console.log('[Campux] 稿件已归档，跳过 Campux 发布');
      return;
    }
    if (!campuxConfigured()) {
      console.log('[Campux] 未配置 Campux 地址或账号，跳过发布');
      return;
    }

    const result = await submitToCampux(item);
    console.log(`[Campux] 已提交稿件 #${item.id}《${item.title}》（Campux 稿件 id=${result.postId ?? '未知'}，图片 ${result.images} 张），后续发布由 Campux 完成`);
  } catch (error) {
    console.error(`[Campux] 提交失败（稿件 #${item?.id ?? '未知'}）: ${error.message}`);
  }
}
