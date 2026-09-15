/**
 * SLA 监控模块
 * - sla-status
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

router.get('/sla-status', authMiddleware, (req, res) => {
  try {
    const slaRules = Q.sla.getAllRules();
    const activeTickets = Q.sla.getActiveTickets();
    const nowDate = new Date();
    const alerts = [];

    activeTickets.forEach(ticket => {
      const rule = slaRules.find(r => r.priority === ticket.priority) || slaRules.find(r => r.priority === 'normal');
      if (!rule) return;
      const created = new Date(ticket.created_at);
      const elapsedHours = (nowDate - created) / (1000 * 60 * 60);
      let alertLevel = 'normal', alertMsg = '';

      if (ticket.status === 'pending') {
        const limit = rule.response_hours;
        if (elapsedHours > limit) { alertLevel = 'critical'; alertMsg = `已超过响应时限 ${limit}h (已等待 ${elapsedHours.toFixed(1)}h)`; }
        else if (elapsedHours > limit * 0.8) { alertLevel = 'warning'; alertMsg = `即将达到响应时限 ${limit}h (已等待 ${elapsedHours.toFixed(1)}h)`; }
        else if (elapsedHours > limit * 0.5) { alertLevel = 'info'; alertMsg = `接近响应时限 ${limit}h (已等待 ${elapsedHours.toFixed(1)}h)`; }
      } else if (ticket.status === 'processing') {
        const limit = rule.resolve_hours;
        if (elapsedHours > limit) { alertLevel = 'critical'; alertMsg = `已超过解决时限 ${limit}h (已耗时 ${elapsedHours.toFixed(1)}h)`; }
        else if (elapsedHours > limit * 0.8) { alertLevel = 'warning'; alertMsg = `即将达到解决时限 ${limit}h (已耗时 ${elapsedHours.toFixed(1)}h)`; }
        else if (elapsedHours > limit * 0.5) { alertLevel = 'info'; alertMsg = `接近解决时限 ${limit}h (已耗时 ${elapsedHours.toFixed(1)}h)`; }
      }

      if (alertLevel !== 'normal') {
        alerts.push({ ticketId: ticket.id, ticketNo: ticket.ticket_no, title: ticket.title, priority: ticket.priority, status: ticket.status, handlerName: ticket.handler_name || '未分配', creatorName: ticket.creator_name, elapsedHours: Math.round(elapsedHours * 10) / 10, responseLimit: rule.response_hours, resolveLimit: rule.resolve_hours, alertLevel, alertMsg });
      }
    });

    const levelOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => levelOrder[a.alertLevel] - levelOrder[b.alertLevel]);

    res.json({ code: 0, data: { total: activeTickets.length, alerts, criticalCount: alerts.filter(a => a.alertLevel === 'critical').length, warningCount: alerts.filter(a => a.alertLevel === 'warning').length } });
  } catch (err) {
    console.error('SLA 检测失败:', err);
    res.json({ code: 500, message: 'SLA 检测失败' });
  }
});

module.exports = router;
