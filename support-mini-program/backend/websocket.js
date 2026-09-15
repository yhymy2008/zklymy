/**
 * WebSocket 实时推送模块
 * - 连接管理与心跳检测
 * - 按用户ID/角色分组管理连接
 * - 事件广播（工单状态变更、新回复、SLA告警）
 */
const WebSocket = require('ws');

/** @type {Map<string, Set<WebSocket>>} userId -> connections */
const clients = new Map();

/** @type {Map<string, WebSocket>} connectionId -> ws */
const connectionMeta = new Map();

let wss = null;
const HEARTBEAT_INTERVAL = 30000; // 30秒心跳

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const connId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    ws._connId = connId;
    ws._isAlive = true;
    ws._userId = null;
    ws._userRole = null;
    ws._userName = null;
    connectionMeta.set(connId, ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(ws, msg);
      } catch (e) {
        // 忽略非 JSON 消息（如心跳 pong）
      }
    });

    ws.on('pong', () => { ws._isAlive = true; });

    ws.on('close', () => {
      cleanupConnection(ws);
    });

    ws.on('error', () => {
      cleanupConnection(ws);
    });

    // 发送连接确认
    sendTo(ws, { type: 'connected', message: 'WebSocket 已连接', connId });
  });

  // 心跳检测
  const heartbeat = setInterval(() => {
    if (!wss) { clearInterval(heartbeat); return; }
    wss.clients.forEach(ws => {
      if (ws._isAlive === false) {
        ws.terminate();
        return;
      }
      ws._isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  console.log('[WebSocket] 实时推送服务已启动 (path: /ws)');
  return wss;
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'auth':
      // 客户端认证：绑定用户身份
      if (msg.userId) {
        // 先清理旧连接
        const oldConns = clients.get(msg.userId);
        if (oldConns) {
          oldConns.forEach(old => {
            if (old !== ws && old.readyState === WebSocket.OPEN) {
              cleanupConnection(old);
            }
          });
        }
        ws._userId = msg.userId;
        ws._userRole = msg.userRole || 'user';
        ws._userName = msg.userName || '';

        if (!clients.has(msg.userId)) {
          clients.set(msg.userId, new Set());
        }
        clients.get(msg.userId).add(ws);

        sendTo(ws, { type: 'authenticated', message: '已认证' });
        console.log(`[WebSocket] 用户 ${msg.userName || msg.userId} (${msg.userRole}) 已连接`);
      }
      break;

    case 'subscribe':
      // 订阅特定工单事件
      if (msg.ticketId && ws._userId) {
        ws._subscriptions = ws._subscriptions || new Set();
        ws._subscriptions.add(msg.ticketId);
        sendTo(ws, { type: 'subscribed', ticketId: msg.ticketId });
      }
      break;

    default:
      break;
  }
}

function cleanupConnection(ws) {
  if (ws._userId && clients.has(ws._userId)) {
    clients.get(ws._userId).delete(ws);
    if (clients.get(ws._userId).size === 0) {
      clients.delete(ws._userId);
    }
  }
  if (ws._connId) {
    connectionMeta.delete(ws._connId);
  }
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close();
  }
}

function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ======== 事件广播 API ========

/**
 * 向指定用户推送消息
 * @param {string} userId
 * @param {object} event - { type, title, message, ticketId, ticketNo, data }
 */
function notifyUser(userId, event) {
  const userConns = clients.get(userId);
  if (!userConns || userConns.size === 0) return;
  const payload = { ...event, timestamp: new Date().toISOString() };
  userConns.forEach(ws => sendTo(ws, payload));
}

/**
 * 向所有具有指定角色的在线用户广播
 * @param {string[]} roles - 如 ['admin', 'staff']
 * @param {object} event
 */
function notifyByRole(roles, event) {
  const payload = { ...event, timestamp: new Date().toISOString() };
  for (const [userId, conns] of clients) {
    for (const ws of conns) {
      if (roles.includes(ws._userRole)) {
        sendTo(ws, payload);
        break;
      }
    }
  }
}

/**
 * 广播给所有在线用户
 * @param {object} event
 */
function notifyAll(event) {
  const payload = { ...event, timestamp: new Date().toISOString() };
  for (const [, conns] of clients) {
    for (const ws of conns) {
      sendTo(ws, payload);
    }
  }
}

/**
 * 向订阅了特定工单的用户推送
 * @param {string} ticketId
 * @param {object} event
 */
function notifyTicketSubscribers(ticketId, event) {
  const payload = { ...event, ticketId, timestamp: new Date().toISOString() };
  for (const [, conns] of clients) {
    for (const ws of conns) {
      if (ws._subscriptions && ws._subscriptions.has(ticketId)) {
        sendTo(ws, payload);
      }
    }
  }
}

// ======== 便捷事件方法 ========

const events = {
  /** 工单创建 */
  ticketCreated(ticket) {
    // 通知所有 staff/admin
    notifyByRole(['admin', 'staff'], {
      type: 'ticket:created',
      title: '新工单',
      message: `新工单[${ticket.ticketNo}]: ${ticket.title}`,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo
    });
  },

  /** 工单状态变更 */
  ticketStatusChanged({ ticketId, ticketNo, title, newStatus, oldStatus, changedBy, handlerName }) {
    // 通知工单参与者
    notifyTicketSubscribers(ticketId, {
      type: 'ticket:status',
      title: '工单状态更新',
      message: `工单[${ticketNo}] 状态: ${oldStatus} -> ${newStatus}`,
      ticketId, ticketNo, title, newStatus, oldStatus, changedBy, handlerName
    });
  },

  /** 新回复 */
  newReply({ ticketId, ticketNo, replyContent, replyBy, replyByRole }) {
    notifyTicketSubscribers(ticketId, {
      type: 'ticket:reply',
      title: '新回复',
      message: `工单[${ticketNo}] 有新回复`,
      ticketId, ticketNo, replyContent: replyContent?.substring(0, 100),
      replyBy, replyByRole
    });
  },

  /** SLA 告警 */
  slaAlert({ ticketId, ticketNo, title, alertLevel, alertMsg }) {
    notifyByRole(['admin', 'staff'], {
      type: 'ticket:sla',
      title: 'SLA 告警',
      message: `[${alertLevel.toUpperCase()}] ${ticketNo}: ${alertMsg}`,
      ticketId, ticketNo, title, alertLevel, alertMsg
    });
  },

  /** 系统通知 */
  systemNotice(message) {
    notifyAll({ type: 'system:notice', message });
  }
};

module.exports = { initWebSocket, notifyUser, notifyByRole, notifyAll, notifyTicketSubscribers, events };
