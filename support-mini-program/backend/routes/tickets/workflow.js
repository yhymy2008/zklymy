/**
 * 工单流程操作模块
 * - take, reject, resolve, reopen, close, suspend, resume, rating, reassign
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun, saveDatabase, logAction } = require('../../db');
const { authMiddleware, staffMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

// 接单
function handleTake(req, res) {
  try {
    const { id } = req.params;
    const { id: userId, role, realName } = req.user;
    if (role !== 'admin' && role !== 'staff') return res.json({ code: 403, message: '没有权限接单' });

    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });
    if (!['pending', 'rejected', 'reopened'].includes(ticket.status)) {
      return res.json({ code: 400, message: '工单当前状态不可接单（状态：' + ticket.status + '）' });
    }

    const time = now();
    Q.tickets.updateHandler(id, userId, realName, 'processing', time);
    Q.notifications.create({ userId: ticket.user_id, ticketId: id, title: '工单已被接单', content: `您的工单[${ticket.ticket_no}]已被${realName}接单，正在处理中。`, time });
    Q.replies.create({ id: uuidv4(), ticketId: id, userId, userName: realName, userRole: role, content: `[系统] 工单已被${realName}接单，开始处理。`, replyType: 'system', time });

    saveDatabase();
    logAction(userId, realName, '接单', 'ticket', id, `接单工单[${ticket.ticket_no}]`);
    res.json({ code: 0, message: '接单成功' });
  } catch (err) {
    console.error('接单失败:', err);
    res.json({ code: 500, message: '接单失败' });
  }
}
router.post('/take/:id', authMiddleware, handleTake);
router.post('/claim/:id', authMiddleware, handleTake);

// 解决工单
router.post('/resolve/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { solution } = req.body;
    const { id: userId, role, realName } = req.user;
    if (role !== 'admin' && role !== 'staff') return res.json({ code: 403, message: '没有权限' });
    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });

    const time = now();
    Q.tickets.resolve(id, solution, time);
    Q.notifications.create({ userId: ticket.user_id, ticketId: id, title: '工单已处理完成', content: `您的工单[${ticket.ticket_no}]已被处理完成，请查看处理结果并评价。`, time });
    Q.replies.create({ id: uuidv4(), ticketId: id, userId, userName: realName, userRole: role, content: `[系统] 工单已处理完成。处理方案: ${solution || '已完成处理'}`, replyType: 'system', time });

    saveDatabase();
    logAction(userId, realName, '解决工单', 'ticket', id, `解决工单[${ticket.ticket_no}]`);
    res.json({ code: 0, message: '工单已处理完成' });
  } catch (err) {
    console.error('处理失败:', err);
    res.json({ code: 500, message: '处理失败' });
  }
});

// 关闭工单
router.post('/close/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const ticket = Q.tickets.getById(id);
    if (!ticket || ticket.user_id !== req.user.id) return res.json({ code: 404, message: '工单不存在' });
    Q.tickets.updateStatus(id, 'closed', now());
    saveDatabase();
    res.json({ code: 0, message: '工单已关闭' });
  } catch (err) {
    console.error('关闭失败:', err);
    res.json({ code: 500, message: '关闭失败' });
  }
});

// 评价
router.post('/rate/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const ticket = Q.tickets.getById(id);
    if (!ticket || ticket.user_id !== req.user.id) return res.json({ code: 404, message: '工单不存在' });
    if (ticket.status !== 'resolved') return res.json({ code: 400, message: '只能评价已解决的工单' });
    Q.tickets.setRating(id, rating, feedback, now());
    saveDatabase();
    res.json({ code: 0, message: '评价成功' });
  } catch (err) {
    console.error('评价失败:', err);
    res.json({ code: 500, message: '评价失败' });
  }
});

// 退回工单
router.post('/reject/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.json({ code: 400, message: '请填写退回原因' });
    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });
    if (ticket.status !== 'processing') return res.json({ code: 400, message: '只能退回处理中的工单' });

    const time = now();
    Q.tickets.updateStatus(id, 'rejected', time);
    Q.notifications.create({ userId: ticket.user_id, ticketId: id, title: '工单已退回', content: `您的工单[${ticket.ticket_no}]已被${req.user.realName}退回，原因: ${reason}。请修改后重新提交。`, time });
    Q.replies.create({ id: uuidv4(), ticketId: id, userId: req.user.id, userName: req.user.realName, userRole: req.user.role, content: `[系统] 工单已被${req.user.realName}退回。退回原因: ${reason}`, replyType: 'system', time });

    saveDatabase();
    logAction(req.user.id, req.user.realName, '退回工单', 'ticket', id, `退回工单[${ticket.ticket_no}]: ${reason}`);
    res.json({ code: 0, message: '工单已退回' });
  } catch (err) {
    console.error('退回工单失败:', err);
    res.json({ code: 500, message: '退回工单失败' });
  }
});

// 重新打开工单
router.post('/reopen/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ticket = Q.tickets.getById(id);
    if (!ticket || ticket.user_id !== req.user.id) return res.json({ code: 404, message: '工单不存在' });
    if (ticket.status !== 'resolved') return res.json({ code: 400, message: '只能重新打开已解决的工单' });

    const time = now();
    Q.tickets.reopen(id, time);
    if (ticket.handler_id) {
      Q.notifications.create({ userId: ticket.handler_id, ticketId: id, title: '工单已被重新打开', content: `工单[${ticket.ticket_no}]已被用户重新打开，请继续处理。用户说明: ${reason || '无'}`, time });
    }
    Q.replies.create({ id: uuidv4(), ticketId: id, userId: req.user.id, userName: req.user.realName, userRole: req.user.role, content: `[系统] 用户重新打开了工单。原因: ${reason || '对处理结果不满意'}`, replyType: 'system', time });

    saveDatabase();
    logAction(req.user.id, req.user.realName, '重新打开工单', 'ticket', id, `重新打开工单[${ticket.ticket_no}]: ${reason || ''}`);
    res.json({ code: 0, message: '工单已重新打开' });
  } catch (err) {
    console.error('重新打开工单失败:', err);
    res.json({ code: 500, message: '重新打开工单失败' });
  }
});

// 挂起工单
router.post('/suspend/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });
    if (!['pending', 'processing'].includes(ticket.status)) return res.json({ code: 400, message: '只能挂起待处理或处理中的工单' });

    const time = now();
    Q.tickets.updateStatus(id, 'suspended', time);
    Q.replies.create({ id: uuidv4(), ticketId: id, userId: req.user.id, userName: req.user.realName, userRole: req.user.role, content: `[系统] 工单已挂起。原因: ${reason || '等待第三方响应'}`, replyType: 'system', time });

    saveDatabase();
    logAction(req.user.id, req.user.realName, '挂起工单', 'ticket', id, `挂起工单[${ticket.ticket_no}]: ${reason || ''}`);
    res.json({ code: 0, message: '工单已挂起' });
  } catch (err) {
    console.error('挂起工单失败:', err);
    res.json({ code: 500, message: '挂起工单失败' });
  }
});

// 恢复工单
router.post('/resume/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });
    if (ticket.status !== 'suspended') return res.json({ code: 400, message: '只能恢复已挂起的工单' });

    const time = now();
    const resumeStatus = ticket.handler_id ? 'processing' : 'pending';
    Q.tickets.updateStatus(id, resumeStatus, time);
    Q.replies.create({ id: uuidv4(), ticketId: id, userId: req.user.id, userName: req.user.realName, userRole: req.user.role, content: '[系统] 工单已恢复处理。', replyType: 'system', time });

    saveDatabase();
    logAction(req.user.id, req.user.realName, '恢复工单', 'ticket', id, `恢复工单[${ticket.ticket_no}]`);
    res.json({ code: 0, message: '工单已恢复' });
  } catch (err) {
    console.error('恢复工单失败:', err);
    res.json({ code: 500, message: '恢复工单失败' });
  }
});

// 转派工单
router.post('/reassign/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { handler_id } = req.body;
    if (!handler_id) return res.json({ code: 400, message: '请选择处理人' });

    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });
    if (ticket.status === 'closed') return res.json({ code: 400, message: '已关闭的工单不能转派' });

    const handler = dbGet("SELECT id, real_name FROM users WHERE id = ? AND role IN ('staff','admin') AND status = 'active'", [handler_id]);
    if (!handler) return res.json({ code: 400, message: '处理人不存在或已禁用' });

    const time = now();
    const oldHandler = ticket.handler_name || '未分配';
    Q.tickets.updateHandler(id, handler_id, handler.real_name, 'processing', time);
    Q.notifications.create({ userId: handler_id, ticketId: id, title: '工单已转派给您', content: `工单[${ticket.ticket_no}]已由${req.user.realName}转派给您处理。`, time });
    Q.notifications.create({ userId: ticket.user_id, ticketId: id, title: '工单处理人变更', content: `您的工单[${ticket.ticket_no}]处理人已变更为${handler.real_name}`, time });
    Q.replies.create({ id: uuidv4(), ticketId: id, userId: req.user.id, userName: req.user.realName, userRole: req.user.role, content: `[系统] 工单已由${req.user.realName}转派，处理人: ${oldHandler} → ${handler.real_name}`, replyType: 'system', time });

    saveDatabase();
    logAction(req.user.id, req.user.realName, '转派', 'ticket', id, `工单[${ticket.ticket_no}]: ${oldHandler} → ${handler.real_name}`);
    res.json({ code: 0, message: '转派成功' });
  } catch (err) {
    console.error('转派失败:', err);
    res.json({ code: 500, message: '转派失败' });
  }
});

module.exports = router;
