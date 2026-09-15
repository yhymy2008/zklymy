/**
 * 批量操作模块
 * - batch-take, batch-close, batch-reassign
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun, saveDatabase, logAction } = require('../../db');
const { authMiddleware, staffMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

// 批量接单
router.post('/batch-take', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { ticket_ids } = req.body;
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) return res.json({ code: 400, message: '请选择工单' });
    const { id: userId, realName, role } = req.user;
    const time = now();
    let success = 0;

    ticket_ids.forEach(id => {
      const ticket = dbGet("SELECT * FROM tickets WHERE id = ? AND status = 'pending'", [id]);
      if (!ticket) return;
      Q.tickets.updateHandler(id, userId, realName, 'processing', time);
      Q.notifications.create({ userId: ticket.user_id, ticketId: id, title: '工单已被接单', content: `您的工单[${ticket.ticket_no}]已被${realName}接单。`, time });
      Q.replies.create({ id: uuidv4(), ticketId: id, userId, userName: realName, userRole: role, content: `[系统] 工单已被${realName}接单。`, replyType: 'system', time });
      success++;
    });

    saveDatabase();
    res.json({ code: 0, message: `成功接单 ${success} 个工单`, data: { count: success } });
  } catch (err) {
    console.error('批量接单失败:', err);
    res.json({ code: 500, message: '批量接单失败' });
  }
});

// 批量关闭
router.post('/batch-close', authMiddleware, (req, res) => {
  try {
    const { ticket_ids } = req.body;
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) return res.json({ code: 400, message: '请选择工单' });
    const time = now();
    let success = 0;

    ticket_ids.forEach(id => {
      const ticket = dbGet('SELECT * FROM tickets WHERE id = ? AND user_id = ? AND status = ?', [id, req.user.id, 'resolved']);
      if (!ticket) return;
      Q.tickets.updateStatus(id, 'closed', time);
      success++;
    });

    saveDatabase();
    res.json({ code: 0, message: `成功关闭 ${success} 个工单`, data: { count: success } });
  } catch (err) {
    console.error('批量关闭失败:', err);
    res.json({ code: 500, message: '批量关闭失败' });
  }
});

// 批量转派
router.post('/batch-reassign', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { ticket_ids, handler_id } = req.body;
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) return res.json({ code: 400, message: '请选择工单' });
    if (!handler_id) return res.json({ code: 400, message: '请选择处理人' });

    const handler = dbGet("SELECT id, real_name FROM users WHERE id = ? AND role IN ('staff','admin') AND status = 'active'", [handler_id]);
    if (!handler) return res.json({ code: 400, message: '处理人不存在或已禁用' });

    const { id: userId, realName, role } = req.user;
    const time = now();
    let success = 0;

    ticket_ids.forEach(id => {
      const ticket = dbGet("SELECT * FROM tickets WHERE id = ? AND status != 'closed'", [id]);
      if (!ticket) return;
      const oldHandler = ticket.handler_name || '未分配';
      Q.tickets.updateHandler(id, handler_id, handler.real_name, 'processing', time);
      Q.notifications.create({ userId: handler_id, ticketId: id, title: '工单已转派给您', content: `工单[${ticket.ticket_no}]已由${realName}批量转派给您处理。`, time });
      Q.replies.create({ id: uuidv4(), ticketId: id, userId, userName: realName, userRole: role, content: `[系统] 工单已批量转派，处理人: ${oldHandler} → ${handler.real_name}`, replyType: 'system', time });
      success++;
    });

    saveDatabase();
    logAction(userId, realName, '批量转派', 'ticket', handler_id, `批量转派 ${success} 个工单给 ${handler.real_name}`);
    res.json({ code: 0, message: `成功转派 ${success} 个工单`, data: { count: success } });
  } catch (err) {
    console.error('批量转派失败:', err);
    res.json({ code: 500, message: '批量转派失败' });
  }
});

module.exports = router;
