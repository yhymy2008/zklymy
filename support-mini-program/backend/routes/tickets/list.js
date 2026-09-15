/**
 * 工单列表与筛选模块
 * - list, search
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

// 获取工单列表（增强筛选）
router.get('/list', authMiddleware, (req, res) => {
  try {
    const { status, page = 1, pageSize = 20, keyword, handler_id, priority, category, dateFrom, dateTo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userId = req.user.id;
    const role = req.user.role;

    let where = '';
    const params = [];

    if (status) { where += 't.status = ?'; params.push(status); }
    if (keyword) { where += (where ? ' AND ' : '') + '(t.title LIKE ? OR t.ticket_no LIKE ?)'; params.push('%'+keyword+'%', '%'+keyword+'%'); }
    if (handler_id) { where += (where ? ' AND ' : '') + 't.handler_id = ?'; params.push(handler_id); }
    if (priority) { where += (where ? ' AND ' : '') + 't.priority = ?'; params.push(priority); }
    if (category) { where += (where ? ' AND ' : '') + 't.category = ?'; params.push(category); }
    if (dateFrom) { where += (where ? ' AND ' : '') + 't.created_at >= ?'; params.push(dateFrom); }
    if (dateTo) { where += (where ? ' AND ' : '') + 't.created_at <= ?'; params.push(dateTo + ' 23:59:59'); }

    const { list, total } = Q.tickets.list({
      where,
      params: [userId, ...params],
      pageSize: parseInt(pageSize),
      offset,
      isAdmin: role === 'admin' || role === 'staff'
    });

    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.json({ code: 500, message: '获取工单列表失败' });
  }
});

// 全局搜索
router.get('/search', authMiddleware, (req, res) => {
  try {
    const { keyword, limit = 10 } = req.query;
    if (!keyword) return res.json({ code: 0, data: { tickets: [], kb: [] } });

    const userId = req.user.id;
    const role = req.user.role;
    const kw = '%' + keyword + '%';
    const { dbAll } = require('../../db');

    let ticketWhere = '(t.title LIKE ? OR t.ticket_no LIKE ?)';
    let ticketParams = [kw, kw];
    if (role !== 'admin' && role !== 'staff') {
      ticketWhere += ' AND t.user_id = ?';
      ticketParams.push(userId);
    }
    const tickets = dbAll(
      `SELECT t.id, t.ticket_no, t.title, t.status, t.priority FROM tickets t WHERE ${ticketWhere} ORDER BY t.updated_at DESC LIMIT ?`,
      [...ticketParams, parseInt(limit)]
    );

    const kb = Q.knowledgeBase.search(keyword, parseInt(limit));

    res.json({ code: 0, data: { tickets: tickets || [], kb: kb || [], ticketTotal: tickets ? tickets.length : 0, kbTotal: kb ? kb.length : 0 } });
  } catch (err) {
    console.error('搜索失败:', err);
    res.json({ code: 500, message: '搜索失败' });
  }
});

module.exports = router;
