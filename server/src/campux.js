// Campux 对接模块 —— 审核通过后把稿件提交给 Campux，由 Campux 自身的
// 发布管线（审核 → 机器人 → QZone Cookies）发表到 QQ 空间。
//
// 对接的是 Campux 开放 REST API（docs.campux.top，legacy /v1 接口）：
//   1. POST /v1/account/login       {uin, passwd}             → JWT
//   2. POST /v1/post/upload-image   multipart(image, suffix)  → {key}
//   3. POST /v1/post/post-new       {uuid, text, anon, images}→ {id}
//
// 不在本站重写 QZone 协议逻辑：投稿后是否需要审核、如何发说说、
// 使用哪个机器人号，全部由 Campux 侧配置决定。
import fs from 'fs';
import path from 'path';
import { getAllSettings } from './db.js';
import { uploadDir } from './upload.js';
import { config } from './config.js';

// 默认投稿文案模板（占位符与后台可配置模板一致）
export const defaultCampuxTemplate =
  '【{站点名} #{编号}】{类型}\n{标题}\n\n{描述}\n\n📍 地点：{地点}\n💬 联系方式：{联系方式}\n🔗 详情：{链接}';

// JWT 内存缓存（Campux 侧 token 有效期由其配置决定；过期后自动重登）
let cachedToken = null;

function apiBase() {
  const settings = getAllSettings();
  return (settings.campux_api_base || '').trim().replace(/\/+$/, '');
}

function campuxConfigured() {
  const settings = getAllSettings();
  return !!(settings.campux_api_base && settings.campux_uin && settings.campux_password);
}

// 解析 Campux 统一响应 {code, msg, data}
async function parseCampuxResponse(response) {
  let json = null;
  try {
    json = await response.json();
  } catch { /* ignore */ }
  if (!response.ok) {
    throw new Error(`Campux 接口 HTTP ${response.status}${json?.msg ? `：${json.msg}` : ''}`);
  }
  if (!json || typeof json !== 'object') {
    throw new Error('Campux 接口没有返回可解析的 JSON');
  }
  if (json.code !== 0) {
    throw new Error(`Campux 接口错误：${json.msg || `code ${json.code}`}`);
  }
  return json.data ?? {};
}

async function login() {
  const settings = getAllSettings();
  const base = apiBase();
  const response = await fetch(`${base}/v1/account/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      uin: settings.campux_uin || '',
      passwd: settings.campux_password || '',
    }),
  });
  const data = await parseCampuxResponse(response);
  if (!data.token) {
    throw new Error('Campux 登录成功但没有返回 token');
  }
  cachedToken = data.token;
  return cachedToken;
}

// 带 JWT 的请求；401 时自动重登一次
async function authedFetch(path, options = {}, retry = true) {
  const base = apiBase();
  if (!cachedToken) {
    await login();
  }
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${cachedToken}`,
    },
  });
  if (response.status === 401 && retry) {
    cachedToken = null;
    return authedFetch(path, options, false);
  }
  return response;
}

// 测试连接：登录 + token 校验（管理后台按钮）
export async function testCampuxConnection() {
  await login();
  const response = await authedFetch('/v1/account/token-check');
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
    loggedIn: !!cachedToken,
    template: settings.campux_text_template || defaultCampuxTemplate,
  };
}

// 上传物品图片到 Campux，返回附件 key
async function uploadImage(item) {
  if (!item.image_path) return [];
  const localFile = path.join(uploadDir, path.basename(item.image_path));
  if (!fs.existsSync(localFile)) return [];

  const ext = path.extname(item.image_path).toLowerCase().replace('.', '') || 'jpg';
  const bytes = fs.readFileSync(localFile);
  const form = new FormData();
  form.append('image', new Blob([bytes]), `item-${item.id}.${ext}`);
  form.append('suffix', ext);

  const response = await authedFetch('/v1/post/upload-image', {
    method: 'POST',
    body: form,
  });
  const data = await parseCampuxResponse(response);
  if (!data.key) {
    throw new Error('Campux 图片上传成功但没有返回附件 key');
  }
  return [data.key];
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

// 把稿件作为投稿提交给 Campux（uuid 用于 Campux 侧幂等）
async function submitToCampux(item) {
  const text = renderTemplate(getAllSettings().campux_text_template || defaultCampuxTemplate, item);
  const images = await uploadImage(item);

  const response = await authedFetch('/v1/post/post-new', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      uuid: `lostfound-item-${item.id}`,
      text,
      anon: false,
      images,
    }),
  });
  const data = await parseCampuxResponse(response);
  return { postId: data.id ?? null, images: images.length };
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
