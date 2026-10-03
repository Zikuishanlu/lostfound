// SnowLuma（OneBot 11）QQ 群消息通知模块
//
// SnowLuma 是 NapCat 团队推出的新一代协议端，同样兼容 OneBot v11 协议。
// 本模块提供两种连接方式，可在管理后台切换（snowluma_mode）：
//
//   1. reverse 反向 WebSocket（默认，推荐）：
//      本站作为 WebSocket 服务端监听 snowluma_ws_port，
//      在 SnowLuma WebUI 中新建「WebSocket 客户端」连入 ws://服务器IP:端口。
//
//   2. forward 正向 WebSocket：
//      在 SnowLuma WebUI 中开启「WebSocket 服务端」，
//      本站作为客户端主动连接 snowluma_ws_url（如 ws://127.0.0.1:3001）。
//
// 鉴权遵循 OneBot 11 标准 access_token：同时兼容
// `Authorization: Bearer <token>` 请求头与 `?access_token=` 查询参数。
import { WebSocketServer, WebSocket as WS } from 'ws';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { uploadDir } from './upload.js';
import {
  getAllSettings,
  getUserByQq,
  getItemById,
  setItemStatus,
  createReviewLog,
  saveReviewNotifyMessage,
  getItemIdByReviewMessageId,
} from './db.js';
import { notifyCampuxPublish } from './campux.js';

// 反向模式：WebSocket 服务器实例（进程内单例）
let wss = null;
let currentPort = null;
// 正向模式：到 SnowLuma 的客户端连接
let outboundSocket = null;
let currentUrl = null;
let currentToken = null;
let connecting = false;
// 当前生效的连接模式与重连定时器
let currentMode = null;
let reconnectTimer = null;
let isShuttingDown = false;

const pendingCalls = new Map(); // echo -> { resolve, reject, timer }

// ==================== 反向模式：本站作为 WebSocket 服务端 ====================

function ensureReverseServer(port) {
  // 端口未变化且服务器正常，直接复用
  if (wss && currentPort === port) return;

  // 关闭旧服务器（并断开已有客户端）
  if (wss) {
    for (const client of wss.clients) {
      try { client.terminate(); } catch { /* ignore */ }
    }
    try { wss.close(); } catch { /* ignore */ }
    wss = null;
  }
  currentPort = null;

  const server = new WebSocketServer({ port, host: '0.0.0.0' });
  wss = server;
  currentPort = port;
  console.log(`[SnowLuma] 反向 WebSocket 服务端启动: ws://0.0.0.0:${port}`);

  server.on('connection', (socket, request) => {
    // 鉴权：校验 Bearer 请求头或 access_token 查询参数（未配置 Token 则不校验）
    // Token 实时读取设置，修改后无需重启即可生效
    const token = getAllSettings().snowluma_token || '';
    if (token) {
      const auth = request.headers.authorization || '';
      const queryToken = new URL(request.url, 'http://localhost').searchParams.get('access_token') || '';
      if (auth !== `Bearer ${token}` && queryToken !== token) {
        console.log('[SnowLuma] 拒绝未授权的 WebSocket 连接');
        socket.close(4001, 'unauthorized');
        return;
      }
    }

    console.log('[SnowLuma] SnowLuma 客户端已连接（反向）');
    bindSocket(socket);
  });

  server.on('listening', () => {
    console.log(`[SnowLuma] 反向 WebSocket 服务端已监听端口 ${port}`);
  });

  server.on('error', (err) => {
    console.error('[SnowLuma] WebSocket 服务端错误:', err.message);
  });
}

// ==================== 正向模式：本站作为客户端连出 ====================

function scheduleReconnect() {
  if (reconnectTimer || isShuttingDown) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureOutboundSocket().catch(() => { /* 下一轮重连 */ });
  }, 5000);
}

async function ensureOutboundSocket() {
  const settings = getAllSettings();
  const url = (settings.snowluma_ws_url || '').trim();
  const token = settings.snowluma_token || '';
  const mode = settings.snowluma_mode || 'reverse';

  // 模式已切走或未配置地址，则不需要连出
  if (mode !== 'forward' || !url) {
    if (outboundSocket || connecting) closeOutbound('模式切换或未配置地址，断开正向连接');
    return;
  }

  // 已连接（或正在连接）同一地址且 Token 未变则复用
  if (outboundSocket && currentUrl === url && currentToken === token &&
      (outboundSocket.readyState === WS.OPEN || connecting)) return;
  // 地址 / Token 变化或旧连接已死，先关闭旧连接
  if (outboundSocket || connecting) closeOutbound('配置变更，重建正向连接');

  currentUrl = url;
  currentToken = token;
  currentMode = 'forward';
  connecting = true;

  // OneBot 11 标准鉴权：请求头 + 查询参数双保险
  const connectUrl = token
    ? `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
    : url;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  console.log(`[SnowLuma] 正向 WebSocket 连接中: ${url}`);

  await new Promise((resolve) => {
    let settled = false;
    const socket = new WS(connectUrl, { headers });

    socket.on('open', () => {
      if (settled) return;
      settled = true;
      connecting = false;
      if (outboundSocket && outboundSocket !== socket) {
        try { outboundSocket.terminate(); } catch { /* ignore */ }
      }
      outboundSocket = socket;
      console.log('[SnowLuma] SnowLuma 服务端已连接（正向）');
      bindSocket(socket);
      resolve();
    });

    socket.on('error', (err) => {
      console.error('[SnowLuma] 正向连接错误:', err.message);
      if (!settled) {
        settled = true;
        connecting = false;
        resolve();
      }
    });

    socket.on('close', () => {
      if (!settled) {
        settled = true;
        connecting = false;
        resolve();
      }
      if (outboundSocket === socket) {
        outboundSocket = null;
        console.log('[SnowLuma] 正向连接已断开，5 秒后重连');
      }
      // 连接失败或断开后自动重连（模式仍为 forward 时）
      if (currentMode === 'forward') scheduleReconnect();
    });
  });
}

function closeOutbound(reason) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (outboundSocket) {
    const socket = outboundSocket;
    outboundSocket = null;
    try { socket.terminate(); } catch { /* ignore */ }
  }
  currentUrl = null;
  currentToken = null;
  connecting = false;
  if (reason) console.log(`[SnowLuma] ${reason}`);
}

// ==================== 连接编排 ====================

// 根据设置确保处于正确的连接模式
function ensureConnection() {
  const settings = getAllSettings();
  const mode = settings.snowluma_mode === 'forward' ? 'forward' : 'reverse';
  const port = parseInt(settings.snowluma_ws_port, 10) || 3002;

  if (currentMode !== mode) {
    console.log(`[SnowLuma] 切换连接模式: ${currentMode || '未启动'} -> ${mode}`);
    currentMode = mode;
    // 清理另一种模式的旧连接
    if (mode === 'reverse') {
      closeOutbound();
    } else if (wss) {
      for (const client of wss.clients) {
        try { client.terminate(); } catch { /* ignore */ }
      }
      try { wss.close(); } catch { /* ignore */ }
      wss = null;
      currentPort = null;
    }
  }

  if (mode === 'reverse') {
    ensureReverseServer(port);
  } else {
    ensureOutboundSocket().catch(() => { /* 由重连机制兜底 */ });
  }
}

// ==================== 消息收发 ====================

// 为连接绑定统一的消息处理
function bindSocket(socket) {
  socket.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // OneBot 事件主动推送（如群消息），交给事件处理器
    if (msg && msg.post_type) {
      handleOneBotEvent(msg);
      return;
    }

    // 匹配 API 调用响应（根据 echo 定位）
    if (msg && msg.echo && pendingCalls.has(msg.echo)) {
      const call = pendingCalls.get(msg.echo);
      pendingCalls.delete(msg.echo);
      clearTimeout(call.timer);
      if (msg.status === 'ok' || msg.retcode === 0) {
        call.resolve(msg.data);
      } else {
        call.reject(new Error(msg.message || msg.wording || `错误码 ${msg.retcode}`));
      }
    }
  });

  socket.on('error', (err) => {
    console.error('[SnowLuma] WebSocket 连接错误:', err.message);
  });
}

// 获取当前所有可用的 OneBot 连接
function getActiveSockets() {
  ensureConnection();
  const sockets = [];
  if (currentMode === 'reverse' && wss) {
    for (const client of wss.clients) {
      if (client.readyState === WS.OPEN) sockets.push(client);
    }
  } else if (currentMode === 'forward' && outboundSocket && outboundSocket.readyState === WS.OPEN) {
    sockets.push(outboundSocket);
  }
  return sockets;
}

// 等待可用连接：正向模式握手/重连期间短暂等待，避免通知被立即放弃；
// 反向模式无客户端连入时立即返回空（不阻塞）
async function waitActiveSocket(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const sockets = getActiveSockets();
    if (sockets.length > 0) return sockets;
    const pending = currentMode === 'forward' && (connecting || reconnectTimer);
    if (!pending || Date.now() >= deadline) return sockets;
    await new Promise((r) => setTimeout(r, 250));
  }
}

// 通过 WebSocket 调用 OneBot 11 API
async function callApi(action, params) {
  const clients = await waitActiveSocket();
  if (clients.length === 0) {
    throw new Error('SnowLuma 未连接');
  }

  const echo = `lostfound_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCalls.delete(echo);
      reject(new Error(`调用 ${action} 超时`));
    }, 15000);

    pendingCalls.set(echo, { resolve, reject, timer });
    clients[0].send(JSON.stringify({ action, params, echo }));
  });
}

// 发送 QQ 群消息
// groupId: 群号; message: 消息内容（字符串或 OneBot 消息段数组）
export async function sendGroupMessage(groupId, message) {
  const settings = getAllSettings();
  const notifyGroup = settings.snowluma_qq_group;

  if (!notifyGroup) {
    console.log('[SnowLuma] 未配置通知群号，跳过消息发送');
    return null;
  }

  const targetGroup = groupId || notifyGroup;
  const data = await callApi('send_group_msg', {
    group_id: Number(targetGroup),
    message,
  });
  console.log('[SnowLuma] 已通过 WebSocket 发送群消息');
  return data;
}

// 查询 SnowLuma 连接状态（供管理后台展示）
export function getSnowlumaStatus() {
  ensureConnection();
  const settings = getAllSettings();
  const sockets = getActiveSockets();
  return {
    connected: sockets.length > 0,
    clients: sockets.length,
    mode: currentMode || settings.snowluma_mode || 'reverse',
    port: currentPort || parseInt(settings.snowluma_ws_port, 10) || 3002,
    url: settings.snowluma_ws_url || '',
    group: settings.snowluma_qq_group || '',
  };
}

// 服务启动时调用
export function startSnowlumaServer() {
  isShuttingDown = false;
  ensureConnection();
}

// 配置变更后立即重新应用连接（管理后台保存设置时调用）
export function reloadSnowlumaConfig() {
  if (isShuttingDown) return;
  ensureConnection();
}

// 进程退出前清理
export function stopSnowlumaServer() {
  isShuttingDown = true;
  closeOutbound();
  if (wss) {
    try { wss.close(); } catch { /* ignore */ }
    wss = null;
  }
}

// ==================== 事件处理（群内引用审核） ====================

// OneBot 事件统一入口
function handleOneBotEvent(msg) {
  // 群消息事件（可能为审核指令）
  if (msg.post_type === 'message' && msg.message_type === 'group') {
    handleGroupReviewCommand(msg).catch((err) => {
      console.error('[SnowLuma] 群消息处理失败:', err.message);
    });
  }
  // 其他事件忽略（好友消息、通知、请求等）
}

// 群消息审核指令处理
// 规则：审核员引用通知消息并 @机器人，发送「过/通过」通过稿件，「拒/拒绝」打回稿件
async function handleGroupReviewCommand(msg) {
  const groupId = msg.group_id != null ? String(msg.group_id) : null;
  const senderId = msg.user_id != null ? String(msg.user_id) : null;
  if (!groupId || !senderId) return;

  // 提取文本内容（排除回复/at 段的附加信息）
  const segments = Array.isArray(msg.message) ? msg.message : [];
  const text = segments
    .filter((s) => s && s.type === 'text')
    .map((s) => (s.data && s.data.text) || '')
    .join('')
    .replace(/[\s\u3000]+/g, '');
  if (!/^(过|通过|拒|拒绝)$/.test(text)) return;

  // 必须引用了一条消息
  const replySeg = segments.find((s) => s && s.type === 'reply');
  if (!replySeg || !replySeg.data || !replySeg.data.id) return;

  // 必须 @ 了机器人（self_id 不可用时宽松为存在 @ 段）
  const ats = segments.filter((s) => s && s.type === 'at');
  const selfId = msg.self_id != null ? String(msg.self_id) : null;
  const atBot = selfId
    ? ats.some((s) => s.data && String(s.data.qq) === selfId)
    : ats.length > 0;
  if (!atBot) return;

  // 通过被引用的消息 id 找到稿件
  const messageId = String(replySeg.data.id);
  const itemId = getItemIdByReviewMessageId(messageId);
  if (!itemId) {
    await sendGroupMessage(groupId, replyText(senderId, '未找到对应的审核通知，请直接引用审核通知消息'));
    return;
  }

  const item = getItemById(itemId);
  if (!item || item.status !== 'pending') {
    await sendGroupMessage(groupId, replyText(senderId, '该稿件不存在或已被处理'));
    return;
  }

  // 校验审核人身份（QQ 需在本站注册且为审核员/管理员）
  const reviewer = getUserByQq(senderId);
  if (!reviewer || !['admin', 'reviewer'].includes(reviewer.role)) {
    await sendGroupMessage(groupId, replyText(senderId, '你不在审核员名单中，无审核权限'));
    return;
  }

  // 执行审核
  const approve = /^(过|通过)$/.test(text);
  const action = approve ? 'approved' : 'rejected';
  const updatedItem = setItemStatus(itemId, action);
  createReviewLog({
    item_id: itemId,
    reviewer_id: reviewer.id,
    action,
    reason: approve ? null : 'QQ 群内打回',
  });

  // 审核通过后发布到 QQ 空间（Campux 模式，异步不阻塞）
  if (approve) {
    notifyCampuxPublish(updatedItem);
  }

  const resultText = approve
    ? `已通过稿件 #${itemId}《${item.title}》`
    : `已打回稿件 #${itemId}《${item.title}》`;
  await sendGroupMessage(groupId, replyText(senderId, resultText));
}

// 构造 @某人 的回复消息段
function replyText(qq, text) {
  return [
    { type: 'at', data: { qq } },
    { type: 'text', data: { text: ` ${text}` } },
  ];
}

// ==================== 通知群内新提交 ====================

// 将本地图片转为 OneBot base64 消息段（容器内 SnowLuma 无法读宿主机路径）
function imageSegment(item) {
  if (!item.image_path) return null;
  const localFile = path.join(uploadDir, path.basename(item.image_path));
  try {
    if (fs.existsSync(localFile)) {
      const buf = fs.readFileSync(localFile);
      return {
        type: 'image',
        data: { file: `base64://${buf.toString('base64')}` },
      };
    }
  } catch { /* 读文件失败则回退 URL */ }
  return {
    type: 'image',
    data: { file: `${config.frontendUrl}${item.image_path}` },
  };
}

// 通知群内有新提交的物品
export async function notifyNewSubmission(item, user) {
  try {
    if (!item) return;

    const typeLabel = item.type === 'lost' ? '【寻物启事】' : '【失物招领】';

    const text =
      `${typeLabel} 有新的待审核提交\n` +
      `━━━━━━━━━━━━━━━\n` +
      `编号：#${item.id}\n` +
      `标题：${item.title}\n` +
      `地点：${item.location || '未填写'}\n` +
      `描述：${item.description || '未填写'}\n` +
      `提交人：${user.username || '未知'}${user.qq ? `（${user.qq}）` : ''}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `审核员请引用本条消息并 @我 回复：\n` +
      `「通过」= 通过稿件　「拒绝」= 打回稿件`;

    const message = [{ type: 'text', data: { text } }];
    const img = imageSegment(item);
    if (img) message.push(img);

    const data = await sendGroupMessage(null, message);

    // 记录群消息 id -> 稿件 id 映射，供群内引用审核
    if (data && data.message_id) {
      const groupId = getAllSettings().snowluma_qq_group;
      saveReviewNotifyMessage({
        message_id: String(data.message_id),
        item_id: item.id,
        group_id: groupId || null,
      });
    }
    console.log('[SnowLuma] 新提交通知已发送');
  } catch (error) {
    // 捕获错误但不中断请求流程
    console.error('[SnowLuma] 发送通知失败:', error.message);
  }
}

export default { sendGroupMessage, notifyNewSubmission };
