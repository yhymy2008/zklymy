/**
 * 工单 CRUD 操作模块
 * - create, update, detail, my-list
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, saveDatabase, logAction, cache } = require('../../db');
const { authMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

// 获取当前时间字符串
function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

// 生成工单编号
function generateTicketNo() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const result = dbAll("SELECT COUNT(*) as cnt FROM tickets WHERE created_at >= date('now')");
  const cnt = result.length > 0 ? (result[0].cnt || 0) : 0;
  return `TK${dateStr}${String(cnt + 1).padStart(4, '0')}`;
}

// 创建工单
router.post('/create', authMiddleware, (req, res) => {
  try {
    const { title, description, category, priority, assignee_id } = req.body;
    const userId = req.user.id;
    if (!title || !description) return res.json({ code: 400, message: '标题和描述不能为空' });

    const id = uuidv4();
    const ticketNo = generateTicketNo();
    const time = now();
    let handlerId = null, handlerName = '', ticketStatus = 'pending';

    if (assignee_id) {
      const assignee = dbGet("SELECT id, real_name, role FROM users WHERE id = ? AND role IN ('staff','admin')", [assignee_id]);
      if (assignee) { handlerId = assignee.id; handlerName = assignee.real_name; ticketStatus = 'processing'; }
    }

    Q.tickets.create({ id, ticketNo, userId, title, description, category, priority, status: ticketStatus, handlerId, handlerName, time });

    if (handlerId) {
      Q.notifications.create({ userId: handlerId, ticketId: id, title: '新工单已分配给您', content: `用户提交了新的问题工单[${ticketNo}]: ${title}，已分配给您处理。`, time });
      dbRun('INSERT INTO ticket_replies (id, ticket_id, user_id, user_name, user_role, content, created_at) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), id, userId, req.user.realName, req.user.role, `[系统] 工单已分配给${handlerName}处理。`, time]);
    } else {
      const admins = dbAll("SELECT id FROM users WHERE role IN ('admin','staff')");
      admins.forEach(admin => {
        Q.notifications.create({ userId: admin.id, ticketId: id, title: '新工单待处理', content: `用户提交了新的问题工单[${ticketNo}]: ${title}`, time });
      });
    }

    saveDatabase();
    logAction(userId, req.user.realName, '创建工单', 'ticket', id, `提交工单: ${title}`);
    res.json({ code: 0, message: '工单提交成功', data: { id, ticketNo, status: ticketStatus, handlerName } });
  } catch (err) {
    console.error('创建工单失败:', err);
    res.json({ code: 500, message: '创建工单失败' });
  }
});

// 编辑工单
router.put('/update/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const ticket = Q.tickets.getById(id);
    if (!ticket || ticket.user_id !== req.user.id) return res.json({ code: 404, message: '工单不存在或无权编辑' });
    if (ticket.status !== 'pending') return res.json({ code: 400, message: '只能编辑待处理状态的工单' });
    Q.tickets.update(id, { ...req.body, time: now() });
    saveDatabase();
    res.json({ code: 0, message: '工单更新成功' });
  } catch (err) {
    console.error('编辑工单失败:', err);
    res.json({ code: 500, message: '编辑工单失败' });
  }
});

// 获取我的工单列表
router.get('/my-list', authMiddleware, (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let where = '';
    let params = [];
    if (status) { where += 't.status = ?'; params.push(status); }
    if (keyword) { where += (where ? ' AND ' : '') + '(t.title LIKE ? OR t.ticket_no LIKE ?)'; params.push('%'+keyword+'%', '%'+keyword+'%'); }
    const { list, total } = Q.tickets.myList({ where, params, userId: req.user.id, role: req.user.role, pageSize: parseInt(pageSize), offset });
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('获取我的工单失败:', err);
    res.json({ code: 500, message: '获取工单列表失败' });
  }
});

// 获取工单详情
router.get('/detail/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') return res.json({ code: 400, message: '工单ID无效' });
    const ticket = Q.tickets.getDetail(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });

    const replies = Q.tickets.getReplies(id);
    const attachments = Q.tickets.getAttachments(id);
    res.json({
      code: 0,
      data: {
        id: ticket.id, ticket_no: ticket.ticket_no, user_id: ticket.user_id,
        title: ticket.title, description: ticket.description, category: ticket.category,
        priority: ticket.priority, status: ticket.status, handler_id: ticket.handler_id,
        handler_name: ticket.handler_name, solution: ticket.solution, rating: ticket.rating,
        feedback: ticket.feedback, created_at: ticket.created_at, updated_at: ticket.updated_at,
        resolved_at: ticket.resolved_at, creator_name: ticket.creator_name,
        creator_avatar: ticket.creator_avatar, creator_phone: ticket.creator_phone,
        replies: replies || [], attachments: attachments || []
      }
    });
  } catch (err) {
    console.error('获取工单详情失败:', err);
    res.json({ code: 500, message: '获取工单详情失败' });
  }
});

module.exports = router;
