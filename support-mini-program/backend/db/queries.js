/**
 * 集中化 SQL 查询模块
 * 所有 SQL 查询语句集中管理，语义化命名，支持参数化查询
 */
const { dbGet, dbAll, dbRun } = require('../db');

// ======== 工单相关查询 ========
const tickets = {
  // 获取工单详情（含创建者信息）
  getDetail(id) {
    return dbGet(
      `SELECT t.*, u.real_name as creator_name, u.avatar as creator_avatar, u.phone as creator_phone
       FROM tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = ?`, [id]
    );
  },

  // 获取工单基础信息（不含 JOIN）
  getById(id) {
    return dbGet('SELECT * FROM tickets WHERE id = ?', [id]);
  },

  // 获取工单回复
  getReplies(ticketId) {
    return dbAll('SELECT * FROM ticket_replies WHERE ticket_id = ? AND is_deleted = 0 ORDER BY created_at ASC', [ticketId]);
  },

  // 获取工单附件
  getAttachments(ticketId) {
    return dbAll('SELECT * FROM attachments WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]);
  },

  // 创建工单
  create({ id, ticketNo, userId, title, description, category, priority, status, handlerId, handlerName, time }) {
    dbRun(
      `INSERT INTO tickets (id, ticket_no, user_id, title, description, category, priority, status, handler_id, handler_name, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, ticketNo, userId, title, description, category || '系统故障', priority || 'normal', status, handlerId, handlerName, time, time]
    );
  },

  // 更新工单状态
  updateStatus(id, status, time) {
    dbRun('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [status, time, id]);
  },

  // 更新工单处理人
  updateHandler(id, handlerId, handlerName, status, time) {
    dbRun('UPDATE tickets SET handler_id = ?, handler_name = ?, status = ?, updated_at = ? WHERE id = ?',
      [handlerId, handlerName, status, time, id]);
  },

  // 更新工单为已解决
  resolve(id, solution, time) {
    dbRun('UPDATE tickets SET status = ?, solution = ?, updated_at = ?, resolved_at = ? WHERE id = ?',
      ['resolved', solution || '', time, time, id]);
  },

  // 更新工单更新时间
  touch(id, time) {
    dbRun('UPDATE tickets SET updated_at = ? WHERE id = ?', [time, id]);
  },

  // 设置评分
  setRating(id, rating, feedback, time) {
    dbRun('UPDATE tickets SET rating = ?, feedback = ?, updated_at = ? WHERE id = ?', [rating, feedback || '', time, id]);
  },

  // 重新打开工单
  reopen(id, time) {
    dbRun('UPDATE tickets SET status = ?, updated_at = ?, resolved_at = NULL WHERE id = ?', ['reopened', time, id]);
  },

  // 工单列表（管理端，支持多条件筛选）
  list({ where, params, pageSize, offset, isAdmin }) {
    const roleFilter = isAdmin ? '1=1' : 't.user_id = ?';
    const fullWhere = where ? `(${roleFilter}) AND (${where})` : `(${roleFilter})`;
    const extraParams = isAdmin ? [] : [params.shift()]; // user_id
    const countParams = [...extraParams, ...params];
    const listParams = [...extraParams, ...params, pageSize, offset];

    const total = dbAll(`SELECT COUNT(*) as total FROM tickets t WHERE ${fullWhere}`, countParams)[0]?.total || 0;
    const list = dbAll(
      `SELECT t.*, u.real_name as creator_name, u.avatar as creator_avatar
       FROM tickets t LEFT JOIN users u ON t.user_id = u.id
       WHERE ${fullWhere} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, listParams
    );
    return { list, total };
  },

  // 我的工单列表
  myList({ where, params, userId, role, pageSize, offset }) {
    let roleWhere = role === 'staff' || role === 'admin'
      ? '(t.user_id = ? OR t.handler_id = ?)' : 't.user_id = ?';
    let roleParams = role === 'staff' || role === 'admin' ? [userId, userId] : [userId];
    let fullWhere = where ? `${roleWhere} AND ${where}` : roleWhere;

    const countParams = [...roleParams, ...(params || [])];
    const total = dbAll(`SELECT COUNT(*) as total FROM tickets t WHERE ${fullWhere}`, countParams)[0]?.total || 0;

    const listParams = [userId, ...roleParams, ...(params || []), pageSize, offset];
    const list = dbAll(
      `SELECT t.*, u.real_name as creator_name, (t.user_id = ?) as is_creator
       FROM tickets t LEFT JOIN users u ON t.user_id = u.id
       WHERE ${fullWhere} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`, listParams
    );
    return { list, total };
  },

  // 编辑工单
  update(id, { title, description, category, priority, time }) {
    const ticket = dbGet('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return null;
    dbRun('UPDATE tickets SET title = ?, description = ?, category = ?, priority = ?, updated_at = ? WHERE id = ?',
      [title || ticket.title, description || ticket.description, category || ticket.category, priority || ticket.priority, time, id]);
    return ticket;
  },

  // 统计查询
  countByStatus(userFilter) {
    const pending = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'pending'${userFilter}`)[0]?.cnt || 0;
    const processing = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'processing'${userFilter}`)[0]?.cnt || 0;
    const resolved = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'resolved'${userFilter}`)[0]?.cnt || 0;
    const closed = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'closed'${userFilter}`)[0]?.cnt || 0;
    return { pending, processing, resolved, closed };
  },

  getTrend(userFilter) {
    return dbAll(
      `SELECT date(created_at) as date, COUNT(*) as cnt FROM tickets
       WHERE created_at >= datetime('now', '-7 days')${userFilter}
       GROUP BY date(created_at) ORDER BY date ASC`
    );
  },

  getRatingStats(userFilter) {
    const avgRating = dbAll(`SELECT AVG(rating) as avgR, COUNT(*) as cnt FROM tickets WHERE rating > 0${userFilter}`)[0];
    const ratingDist = dbAll(`SELECT rating, COUNT(*) as cnt FROM tickets WHERE rating > 0${userFilter} GROUP BY rating ORDER BY rating`);
    return { avgRating, ratingDist };
  },

  getCategoryStats(userFilter) {
    return dbAll(`SELECT category, COUNT(*) as cnt FROM tickets${userFilter ? ' WHERE ' + userFilter.slice(4) : ''} GROUP BY category ORDER BY cnt DESC`);
  },

  getHandlerStats() {
    return dbAll(`SELECT u.real_name as name, COUNT(*) as cnt FROM tickets t JOIN users u ON t.handler_id = u.id WHERE t.handler_id IS NOT NULL GROUP BY t.handler_id ORDER BY cnt DESC`);
  },

  getOverdue(userFilter) {
    return dbAll(
      `SELECT t.id, t.ticket_no, t.title, t.handler_name, t.created_at, t.updated_at FROM tickets t
       WHERE t.status = 'processing' AND datetime(t.updated_at) < datetime('now', '-48 hours')${userFilter}
       ORDER BY t.updated_at ASC`
    );
  },

  getAvgResolveTime(userFilter) {
    return dbAll(`SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avgHours FROM tickets WHERE resolved_at IS NOT NULL${userFilter}`)[0];
  },

  // Dashboard 统计
  dashboardSummary({ periodDays }) {
    const startDate = `datetime('now', '-${periodDays} days')`;
    const newTickets = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE created_at >= ${startDate}`)[0]?.cnt || 0;
    const resolved = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE resolved_at >= ${startDate}`)[0]?.cnt || 0;
    const closed = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'closed' AND updated_at >= ${startDate}`)[0]?.cnt || 0;
    const avgRating = dbAll(`SELECT AVG(rating) as avg FROM tickets WHERE rating > 0 AND resolved_at >= ${startDate}`)[0]?.avg || 0;
    const avgResolve = dbAll(`SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg FROM tickets WHERE resolved_at IS NOT NULL AND resolved_at >= ${startDate}`)[0]?.avg || 0;
    return { newTickets, resolved, closed, avgRating: Math.round(avgRating * 10) / 10, avgResolveHours: Math.round(avgResolve * 10) / 10 };
  },

  dashboardTrend(days) {
    return dbAll(
      `SELECT date(created_at) as date, COUNT(*) as created,
       SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved
       FROM tickets WHERE created_at >= datetime('now', '-${days} days')
       GROUP BY date(created_at) ORDER BY date ASC`
    );
  },

  dashboardCategoryDist() {
    return dbAll(`SELECT category, status, COUNT(*) as cnt FROM tickets WHERE status IN ('pending','processing','resolved') GROUP BY category, status ORDER BY category, cnt DESC`);
  },

  dashboardStaffPerf(periodDays) {
    const startDate = `datetime('now', '-${periodDays} days')`;
    return dbAll(
      `SELECT u.real_name as name, COUNT(*) as resolved_count,
       AVG((julianday(t.resolved_at) - julianday(t.created_at)) * 24) as avg_hours,
       AVG(t.rating) as avg_rating
       FROM tickets t JOIN users u ON t.handler_id = u.id
       WHERE t.resolved_at IS NOT NULL AND t.resolved_at >= ${startDate}
       GROUP BY t.handler_id ORDER BY resolved_count DESC`
    );
  },

  dashboardSlaCompliance(periodDays) {
    const startDate = `datetime('now', '-${periodDays} days')`;
    const total = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE created_at >= ${startDate}`)[0]?.cnt || 0;
    const resolved = dbAll(`SELECT COUNT(*) as cnt FROM tickets WHERE resolved_at IS NOT NULL AND created_at >= ${startDate}`)[0]?.cnt || 0;
    // 按时响应（pending+processing状态下，8小时内被接单）
    const responded = dbAll(
      `SELECT COUNT(*) as cnt FROM tickets t INNER JOIN ticket_replies r ON t.id = r.ticket_id
       WHERE t.created_at >= ${startDate} AND r.content LIKE '[系统] 工单已被%接单%'
       AND (julianday(r.created_at) - julianday(t.created_at)) * 24 <= 8`
    )[0]?.cnt || 0;
    const overdueList = dbAll(
      `SELECT t.id, t.ticket_no, t.title, t.priority, t.status, t.created_at
       FROM tickets t WHERE t.status = 'processing' AND t.created_at >= ${startDate}
       AND datetime(t.created_at) < datetime('now', '-48 hours') ORDER BY t.created_at ASC LIMIT 5`
    );
    return { total, resolvedCount: resolved, respondedOnTime: responded, complianceRate: total > 0 ? Math.round(responded / total * 1000) / 10 : 0, overdueList };
  },

  // 导出
  exportList({ status, dateFrom, dateTo }) {
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (dateFrom) { where += ' AND t.created_at >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND t.created_at <= ?'; params.push(dateTo + ' 23:59:59'); }
    return dbAll(
      `SELECT t.ticket_no, t.title, t.category, t.priority, t.status,
       u.real_name as creator, t.handler_name, t.rating, t.created_at, t.resolved_at
       FROM tickets t LEFT JOIN users u ON t.user_id = u.id WHERE ${where} ORDER BY t.created_at DESC`, params
    );
  },
};

// ======== 通知相关查询 ========
const notifications = {
  create({ userId, ticketId, title, content, time }) {
    dbRun('INSERT INTO notifications (id, user_id, ticket_id, title, content, created_at) VALUES (?,?,?,?,?,?)',
      [require('uuid').v4(), userId, ticketId, title, content, time]);
  },

  list(userId, pageSize, offset) {
    const total = dbAll('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [userId])[0]?.total || 0;
    const list = dbAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]);
    const unread = dbAll('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId])[0]?.cnt || 0;
    return { list, total, unread };
  },

  markRead(id, userId) {
    dbRun('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  },

  markAllRead(userId) {
    dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },

  unreadCount(userId) {
    return dbAll('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId])[0]?.cnt || 0;
  },
};

// ======== 回复相关查询 ========
const replies = {
  create({ id, ticketId, userId, userName, userRole, content, replyType, time }) {
    dbRun('INSERT INTO ticket_replies (id, ticket_id, user_id, user_name, user_role, content, reply_type, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [id, ticketId, userId, userName, userRole, content, replyType || 'public', time]);
  },

  edit(replyId, content, time) {
    dbRun('UPDATE ticket_replies SET content = ?, updated_at = ? WHERE id = ?', [content, time, replyId]);
  },

  softDelete(replyId) {
    dbRun('UPDATE ticket_replies SET is_deleted = 1 WHERE id = ?', [replyId]);
  },

  getById(replyId) {
    return dbGet('SELECT * FROM ticket_replies WHERE id = ? AND is_deleted = 0', [replyId]);
  },
};

// ======== 附件相关查询 ========
const attachments = {
  create({ id, ticketId, userId, userName, filename, originalName, mimeType, size, filePath }) {
    dbRun('INSERT INTO attachments (id, ticket_id, user_id, user_name, filename, original_name, mime_type, size, file_path) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, ticketId, userId, userName, filename, originalName, mimeType, size, filePath]);
  },

  getById(id) {
    return dbGet('SELECT * FROM attachments WHERE id = ?', [id]);
  },

  delete(id) {
    dbRun('DELETE FROM attachments WHERE id = ?', [id]);
  },
};

// ======== 用户相关查询 ========
const users = {
  getByUsername(username) {
    return dbGet('SELECT id, username, password, real_name, role, avatar, phone, status FROM users WHERE username = ?', [username]);
  },

  getById(id) {
    return dbGet('SELECT id, username, real_name as realName, role, avatar, phone, status FROM users WHERE id = ?', [id]);
  },

  listStaff() {
    return dbAll("SELECT id, username, real_name, avatar FROM users WHERE role IN ('staff','admin') AND status = 'active'");
  },

  getByRole(roles) {
    const placeholders = roles.map(() => '?').join(',');
    return dbAll(`SELECT id, username, real_name, role FROM users WHERE role IN (${placeholders}) AND status = 'active'`, roles);
  },
};

// ======== 分类相关查询 ========
const categories = {
  list() {
    return dbAll('SELECT * FROM categories ORDER BY sort_order ASC');
  },
  getByName(name) {
    return dbGet('SELECT id FROM categories WHERE name = ?', [name]);
  },
  getById(id) {
    return dbGet('SELECT * FROM categories WHERE id = ?', [id]);
  },
  create(id, name, icon, sortOrder) {
    dbRun('INSERT INTO categories (id, name, icon, sort_order) VALUES (?,?,?,?)', [id, name, icon, sortOrder]);
  },
  update(id, name, icon, sortOrder) {
    dbRun('UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?', [name, icon, sortOrder, id]);
  },
  delete(id) {
    dbRun('DELETE FROM categories WHERE id = ?', [id]);
  },
};

// ======== 知识库相关查询 ========
const knowledgeBase = {
  list({ pageSize, offset, keyword, category }) {
    let where = "status = 'published'";
    let params = [];
    if (keyword) { where += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)'; params.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%'); }
    if (category) { where += ' AND category = ?'; params.push(category); }
    const total = dbAll('SELECT COUNT(*) as cnt FROM knowledge_base WHERE ' + where, params)[0]?.cnt || 0;
    const list = dbAll('SELECT id, title, category, tags, author_name, view_count, helpful_count, created_at FROM knowledge_base WHERE ' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]);
    return { list, total };
  },

  getById(id) {
    return dbGet('SELECT * FROM knowledge_base WHERE id = ?', [id]);
  },

  incrementViews(id) {
    dbRun('UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  create({ id, title, content, category, tags, authorId, authorName, sourceTicketId, time }) {
    dbRun('INSERT INTO knowledge_base (id, title, content, category, tags, author_id, author_name, source_ticket_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, title, content, category || '', tags || '', authorId, authorName, sourceTicketId || null, time, time]);
  },

  update(id, { title, content, category, tags, time }) {
    dbRun('UPDATE knowledge_base SET title=COALESCE(?,title), content=COALESCE(?,content), category=COALESCE(?,category), tags=COALESCE(?,tags), updated_at=? WHERE id=?',
      [title, content, category, tags, time, id]);
  },

  delete(id) {
    dbRun('DELETE FROM knowledge_base WHERE id = ?', [id]);
  },

  markHelpful(id) {
    dbRun('UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = ?', [id]);
  },

  categories() {
    return dbAll('SELECT DISTINCT category FROM knowledge_base WHERE category != "" ORDER BY category');
  },

  recommend(keywords, limit) {
    const conditions = keywords.map(() => '(title LIKE ? OR content LIKE ? OR tags LIKE ?)').join(' OR ');
    const params = [];
    keywords.forEach(k => { params.push(`%${k}%`, `%${k}%`, `%${k}%`); });
    return dbAll(
      `SELECT id, title, category, tags, author_name, view_count, helpful_count, created_at
       FROM knowledge_base WHERE status = 'published' AND (${conditions})
       ORDER BY helpful_count DESC, view_count DESC LIMIT ?`, [...params, limit]
    );
  },

  search(keyword, limit) {
    const kw = '%' + keyword + '%';
    return dbAll(
      "SELECT id, title, category FROM knowledge_base WHERE status='published' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?) ORDER BY view_count DESC LIMIT ?",
      [kw, kw, kw, limit]
    );
  },
};

// ======== 审计日志查询 ========
const auditLogs = {
  create(id, userId, userName, action, targetType, targetId, detail) {
    dbRun('INSERT INTO audit_logs (id, user_id, user_name, action, target_type, target_id, detail) VALUES (?,?,?,?,?,?,?)',
      [id, userId, userName, action, targetType, targetId, detail]);
  },

  list({ pageSize, offset, action, userId }) {
    let where = '1=1';
    const params = [];
    if (action) { where += ' AND action = ?'; params.push(action); }
    if (userId) { where += ' AND user_id = ?'; params.push(userId); }
    const total = dbAll('SELECT COUNT(*) as cnt FROM audit_logs WHERE ' + where, params)[0]?.cnt || 0;
    const list = dbAll('SELECT * FROM audit_logs WHERE ' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]);
    return { list, total };
  },
};

// ======== SLA 相关查询 ========
const sla = {
  getAllRules() {
    return dbAll('SELECT * FROM sla_rules');
  },
  getActiveTickets() {
    return dbAll("SELECT t.*, u.real_name as creator_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.status IN ('pending','processing') ORDER BY t.priority, t.created_at ASC");
  },
};

// ======== token_versions 相关查询 ========
const tokenVersions = {
  get(userId) {
    return dbGet('SELECT version FROM token_versions WHERE user_id = ?', [userId]);
  },
  upsert(userId, version) {
    const exist = dbGet('SELECT user_id FROM token_versions WHERE user_id = ?', [userId]);
    if (exist) {
      dbRun('UPDATE token_versions SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [version, userId]);
    } else {
      dbRun('INSERT INTO token_versions (user_id, version) VALUES (?,?)', [userId, version]);
    }
  },
};

// ======== Health Check 查询 ========
const health = {
  check() {
    return dbGet('SELECT 1 as ok');
  },
  writeLatency() {
    const start = Date.now();
    try {
      dbRun("CREATE TABLE IF NOT EXISTS _health_check (t TEXT)");
      dbRun("INSERT INTO _health_check VALUES (datetime('now'))");
      dbRun("DELETE FROM _health_check");
      return Date.now() - start;
    } catch (e) {
      return -1;
    }
  },
};

module.exports = { tickets, notifications, replies, attachments, users, categories, knowledgeBase, auditLogs, sla, tokenVersions, health };
