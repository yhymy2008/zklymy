/**
 * 统计分析与仪表盘数据模块
 * - stats, export, dashboard/*
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

// 基础统计
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const userFilter = (role === 'admin' || role === 'staff') ? '' : ` AND user_id = '${userId}'`;

    const { pending, processing, resolved, closed } = Q.tickets.countByStatus(userFilter);
    const total = pending + processing + resolved + closed;
    const trend = Q.tickets.getTrend(userFilter);
    const { avgRating, ratingDist } = Q.tickets.getRatingStats(userFilter);
    const categoryStats = Q.tickets.getCategoryStats(userFilter);
    let handlerStats = [];
    if (role === 'admin' || role === 'staff') handlerStats = Q.tickets.getHandlerStats();
    const overdue = Q.tickets.getOverdue(userFilter);
    const avgResolveTime = Q.tickets.getAvgResolveTime(userFilter);

    res.json({
      code: 0, data: {
        total, pending, processing, resolved, closed, trend,
        avgRating: avgRating?.avgR ? Math.round(avgRating.avgR * 10) / 10 : 0,
        ratingCount: avgRating?.cnt || 0, ratingDist, categoryStats,
        handlerStats, overdue, overdueCount: overdue.length,
        avgResolveTime: avgResolveTime?.avgHours ? Math.round(avgResolveTime.avgHours * 10) / 10 : null
      }
    });
  } catch (err) {
    console.error('获取统计失败:', err);
    res.json({ code: 500, message: '获取统计失败' });
  }
});

// CSV 导出
router.get('/export', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') return res.json({ code: 403, message: '无权限导出' });
    const { status, dateFrom, dateTo } = req.query;
    const tickets = Q.tickets.exportList({ status, dateFrom, dateTo });

    const BOM = '\uFEFF';
    const csvEscape = (val) => '"' + String(val == null ? '' : val).replace(/"/g, '""') + '"';
    const headers = ['工单编号', '标题', '分类', '优先级', '状态', '创建人', '处理人', '评分', '创建时间', '解决时间'];
    const statusMap = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
    const priorityMap = { urgent: '紧急', high: '高', normal: '普通', low: '低' };

    const csvLines = [headers.map(csvEscape).join(',')];
    tickets.forEach(t => {
      csvLines.push([
        csvEscape(t.ticket_no), csvEscape(t.title), csvEscape(t.category),
        csvEscape(priorityMap[t.priority] || t.priority || ''),
        csvEscape(statusMap[t.status] || t.status || ''), csvEscape(t.creator),
        csvEscape(t.handler_name), csvEscape(t.rating),
        csvEscape(t.created_at), csvEscape(t.resolved_at)
      ].join(','));
    });

    const csvContent = BOM + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''tickets_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('导出失败:', err);
    res.json({ code: 500, message: '导出失败' });
  }
});

// ========== Dashboard API ==========

// 摘要统计
router.get('/dashboard/summary', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const periodDays = { week: 7, month: 30, quarter: 90 }[period] || 30;
    const data = Q.tickets.dashboardSummary({ periodDays });
    res.json({ code: 0, data });
  } catch (err) {
    console.error('Dashboard摘要失败:', err);
    res.json({ code: 500, message: '获取数据失败' });
  }
});

// 趋势数据
router.get('/dashboard/trend', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period) || 30;
    const data = Q.tickets.dashboardTrend(days);
    res.json({ code: 0, data });
  } catch (err) {
    console.error('Dashboard趋势失败:', err);
    res.json({ code: 500, message: '获取数据失败' });
  }
});

// 分类分布
router.get('/dashboard/category-distribution', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const data = Q.tickets.dashboardCategoryDist();
    res.json({ code: 0, data });
  } catch (err) {
    console.error('分类分布失败:', err);
    res.json({ code: 500, message: '获取数据失败' });
  }
});

// 处理员绩效
router.get('/dashboard/staff-performance', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const periodDays = { week: 7, month: 30, quarter: 90 }[period] || 30;
    const data = Q.tickets.dashboardStaffPerf(periodDays);
    res.json({ code: 0, data });
  } catch (err) {
    console.error('绩效数据失败:', err);
    res.json({ code: 500, message: '获取数据失败' });
  }
});

// SLA 达标率
router.get('/dashboard/sla-compliance', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const periodDays = { week: 7, month: 30, quarter: 90 }[period] || 30;
    const data = Q.tickets.dashboardSlaCompliance(periodDays);
    res.json({ code: 0, data });
  } catch (err) {
    console.error('SLA数据失败:', err);
    res.json({ code: 500, message: '获取数据失败' });
  }
});

module.exports = router;
