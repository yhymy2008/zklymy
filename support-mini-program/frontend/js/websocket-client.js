/**
 * WebSocket 客户端
 * 连接到服务端实时推送，支持桌面通知
 */
(function() {
  'use strict';

  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;
  const MAX_RECONNECT_DELAY = 30000;
  let authenticated = false;

  function getToken() {
    try {
      const data = localStorage.getItem('authData');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.token || parsed.accessToken || null;
      }
    } catch (e) {}
    return null;
  }

  function getUser() {
    try {
      const data = localStorage.getItem('authData');
      if (data) {
        const parsed = JSON.parse(data);
        return {
          id: parsed.userId || parsed.id || '',
          role: parsed.role || 'user',
          name: parsed.realName || parsed.username || ''
        };
      }
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return { id: parsed.id || '', role: parsed.role || 'user', name: parsed.real_name || '' };
      }
    } catch (e) {}
    return null;
  }

  function connect() {
    const user = getUser();
    if (!user || !user.id) {
      // 未登录，延迟重试
      scheduleReconnect();
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = (window.API_BASE || '').replace(/^https?:\/\//, '') || window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] 已连接');
        reconnectDelay = 1000;
        // 发送认证信息
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          userRole: user.role,
          userName: user.name
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('[WS] 消息解析失败:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] 已断开, code:', event.code);
        authenticated = false;
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error('[WS] 连接错误');
        ws.close();
      };
    } catch (e) {
      console.error('[WS] 连接失败:', e);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      console.log(`[WS] 尝试重连 (${reconnectDelay}ms)...`);
      connect();
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }, reconnectDelay);
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        console.log('[WS] 连接确认:', msg.message);
        break;

      case 'authenticated':
        authenticated = true;
        console.log('[WS] 已认证');
        break;

      case 'ticket:created':
        showDesktopNotification(msg.title, msg.message);
        refreshIfNeeded('ticket-list');
        break;

      case 'ticket:status':
        showDesktopNotification(msg.title, msg.message);
        refreshIfNeeded('ticket-detail', msg.ticketId);
        refreshIfNeeded('ticket-list');
        break;

      case 'ticket:reply':
        showDesktopNotification(msg.title, msg.message);
        refreshIfNeeded('ticket-detail', msg.ticketId);
        break;

      case 'ticket:sla':
        showDesktopNotification(msg.title, msg.message);
        break;

      case 'system:notice':
        console.log('[WS] 系统通知:', msg.message);
        break;
    }
  }

  function refreshIfNeeded(pageHint, ticketId) {
    // 触发自定义事件，由页面控制器决定是否刷新
    const detail = { pageHint, ticketId, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent('ws:update', { detail }));

    // 如果页面不可见，标记需要刷新
    if (document.hidden && pageHint === 'ticket-list') {
      window._needsRefresh = true;
    }
  }

  // 页面可见性恢复时检查是否需要刷新
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window._needsRefresh) {
      window._needsRefresh = false;
      window.dispatchEvent(new CustomEvent('ws:refresh-needed', { detail: { timestamp: Date.now() } }));
    }
  });

  // ======== 桌面通知 ========
  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        console.log('[通知] 权限:', perm);
      });
    }
  }

  function showDesktopNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!document.hidden) return; // 页面可见时不弹通知

    try {
      const n = new Notification(title, {
        body: body || '',
        icon: '/favicon.ico',
        tag: 'ticket-system',
        requireInteraction: false,
        silent: false
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      // 5秒后自动关闭
      setTimeout(() => n.close(), 5000);
    } catch (e) {
      console.error('[通知] 创建失败:', e);
    }
  }

  // 订阅工单事件
  function subscribeTicket(ticketId) {
    if (ws && ws.readyState === WebSocket.OPEN && authenticated) {
      ws.send(JSON.stringify({ type: 'subscribe', ticketId }));
    }
  }

  // 初始化
  function init() {
    // 延迟连接，确保 localStorage 已就绪
    setTimeout(connect, 500);

    // 用户登录后尝试请求通知权限
    setTimeout(requestNotificationPermission, 3000);

    // 用户操作后请求通知权限
    document.addEventListener('click', function requestOnce() {
      requestNotificationPermission();
      document.removeEventListener('click', requestOnce);
    }, { once: true });
  }

  // 对外暴露 API
  window.WSClient = {
    connect,
    subscribeTicket,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN && authenticated,
    reconnect: () => {
      if (ws) { ws.close(); ws = null; }
      reconnectDelay = 1000;
      connect();
    }
  };

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
