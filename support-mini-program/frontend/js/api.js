/**
 * API 通信模块
 */
const API = {
  BASE: 'http://localhost:3000',

  // 会话过期回调，由 App 设置
  onSessionExpired: null,

  setToken(token) {
    localStorage.setItem('token', token);
  },

  getToken() {
    return localStorage.getItem('token');
  },

  setRefreshToken(token) {
    localStorage.setItem('refreshToken', token);
  },

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },

  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  async request(method, path, data = null, isFormData = false) {
    const config = {
      method,
      headers: {}
    };
    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = token;
    }
    if (data && (method === 'POST' || method === 'PUT')) {
      if (isFormData) {
        config.body = data; // FormData — don't set Content-Type
      } else {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
      }
    }
    const res = await fetch(this.BASE + path, config);
    // 401 全局拦截：token 过期或无效时触发会话过期
    if (res.status === 401) {
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
      return { code: 401, message: '会话已过期，请重新登录' };
    }
    return res.json();
  },

  async requestBlob(method, path) {
    const config = { method };
    const token = this.getToken();
    if (token) config.headers = { 'Authorization': token };
    const res = await fetch(this.BASE + path, config);
    if (res.status === 401) {
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
      throw new Error('会话已过期');
    }
    return res;
  },

  get(path) { return this.request('GET', path); },
  post(path, data) { return this.request('POST', path, data); },
  put(path, data) { return this.request('PUT', path, data); },
  delete(path) { return this.request('DELETE', path); },

  /* ---------- 用户 ---------- */
  login(username, password, captchaId, captchaCode) {
    return this.post('/api/users/login', { username, password, captchaId, captchaCode });
  },

  register(username, password, realName, phone) {
    return this.post('/api/users/register', { username, password, realName, phone });
  },

  getCaptcha() {
    return this.get('/api/users/captcha');
  },

  refreshToken(refreshToken) {
    return this.post('/api/users/refresh-token', { refreshToken });
  },

  getStaffList() {
    return this.get('/api/users/staff-list');
  },

  getProfile() {
    return this.get('/api/users/profile');
  },

  updateProfile(data) {
    return this.put('/api/users/profile', data);
  },

  changePassword(oldPassword, newPassword) {
    return this.put('/api/users/change-password', { oldPassword, newPassword });
  },

  /* ---------- 管理员：用户管理 ---------- */
  getUserList(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/users/list?' + qs);
  },

  resetUserPassword(id, newPassword) {
    return this.put('/api/users/reset-password/' + id, { newPassword });
  },

  updateUserStatus(id, status) {
    return this.put('/api/users/status/' + id, { status });
  },

  updateUserRole(id, role) {
    return this.put('/api/users/role/' + id, { role });
  },

  /* ---------- 工单 ---------- */
  createTicket(data) {
    return this.post('/api/tickets/create', data);
  },

  updateTicket(id, data) {
    return this.put('/api/tickets/update/' + id, data);
  },

  getTickets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/tickets/list?' + qs);
  },

  getMyTickets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/tickets/my-list?' + qs);
  },

  getTicketDetail(id) {
    return this.get('/api/tickets/detail/' + id);
  },

  takeTicket(id) {
    return this.post('/api/tickets/take/' + id);
  },

  replyTicket(id, content) {
    return this.post('/api/tickets/reply/' + id, { content });
  },

  editReply(replyId, content) {
    return this.put('/api/tickets/reply/' + replyId, { content });
  },

  deleteReply(replyId) {
    return this.delete('/api/tickets/reply/' + replyId);
  },

  resolveTicket(id, solution) {
    return this.post('/api/tickets/resolve/' + id, { solution });
  },

  closeTicket(id) {
    return this.post('/api/tickets/close/' + id);
  },

  rateTicket(id, rating, feedback) {
    return this.post('/api/tickets/rate/' + id, { rating, feedback });
  },

  reassignTicket(id, handlerId) {
    return this.post('/api/tickets/reassign/' + id, { handler_id: handlerId });
  },

  getStats() {
    return this.get('/api/tickets/stats');
  },

  /* ---------- 分类管理 ---------- */
  getCategories() {
    return this.get('/api/tickets/categories');
  },

  createCategory(name, icon, sortOrder) {
    return this.post('/api/tickets/categories', { name, icon, sortOrder });
  },

  updateCategory(id, name, icon, sortOrder) {
    return this.put('/api/tickets/categories/' + id, { name, icon, sortOrder });
  },

  deleteCategory(id) {
    return this.delete('/api/tickets/categories/' + id);
  },

  /* ---------- 操作日志 ---------- */
  getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/tickets/audit-logs?' + qs);
  },

  /* ---------- 附件 ---------- */
  uploadAttachment(ticketId, file) {
    const fd = new FormData();
    fd.append('file', file);
    return this.request('POST', '/api/tickets/upload/' + ticketId, fd, true);
  },

  deleteAttachment(attId) {
    return this.delete('/api/tickets/attachment/' + attId);
  },

  /* ---------- 通知 ---------- */
  getNotifications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/tickets/notifications?' + qs);
  },

  readNotification(id) {
    return this.post('/api/tickets/notifications/read/' + id);
  },

  readAllNotifications() {
    return this.post('/api/tickets/notifications/read-all');
  },

  /* ---------- 导出 ---------- */
  getExportUrl(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.BASE + '/api/tickets/export?' + qs;
  },

  /* ---------- 批量操作 ---------- */
  batchTake(ticketIds) {
    return this.post('/api/tickets/batch-take', { ticket_ids: ticketIds });
  },
  batchClose(ticketIds) {
    return this.post('/api/tickets/batch-close', { ticket_ids: ticketIds });
  },
  batchReassign(ticketIds, handlerId) {
    return this.post('/api/tickets/batch-reassign', { ticket_ids: ticketIds, handler_id: handlerId });
  },

  /* ---------- 工单状态扩展 ---------- */
  rejectTicket(id, reason) {
    return this.post('/api/tickets/reject/' + id, { reason });
  },
  reopenTicket(id, reason) {
    return this.post('/api/tickets/reopen/' + id, { reason });
  },
  suspendTicket(id, reason) {
    return this.post('/api/tickets/suspend/' + id, { reason });
  },
  resumeTicket(id) {
    return this.post('/api/tickets/resume/' + id);
  },

  /* ---------- SLA 监控 ---------- */
  getSlaStatus() {
    return this.get('/api/tickets/sla-status');
  },

  /* ---------- 知识库 ---------- */
  getKBList(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/tickets/kb/list?' + qs);
  },
  getKBDetail(id) {
    return this.get('/api/tickets/kb/detail/' + id);
  },
  createKB(data) {
    return this.post('/api/tickets/kb/create', data);
  },
  updateKB(id, data) {
    return this.put('/api/tickets/kb/update/' + id, data);
  },
  deleteKB(id) {
    return this.delete('/api/tickets/kb/delete/' + id);
  },
  markKBHelpful(id) {
    return this.post('/api/tickets/kb/helpful/' + id);
  },
  getKBCategories() {
    return this.get('/api/tickets/kb/categories');
  },
  recommendKB(keyword, limit) {
    return this.get('/api/tickets/kb/recommend?keyword=' + encodeURIComponent(keyword) + '&limit=' + (limit || 5));
  },

  /* ---------- 全局搜索 ---------- */
  globalSearch(keyword, limit) {
    return this.get('/api/tickets/search?keyword=' + encodeURIComponent(keyword) + '&limit=' + (limit || 10));
  },

  /* ---------- 内部备注 ---------- */
  replyInternal(ticketId, content) {
    return this.post('/api/tickets/reply/' + ticketId, { content, reply_type: 'internal' });
  },
};
