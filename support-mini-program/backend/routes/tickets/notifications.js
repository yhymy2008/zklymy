/**
 * 通知与分类管理模块
 * - notifications, read, read-all, unread-count
 * - categories CRUD
 * - audit-logs
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbGet, saveDatabase, logAction } = require('../../db');
const { authMiddleware, adminMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

// ======== 通知 ========
router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { list, total, unread } = Q.notifications.list(req.user.id, parseInt(pageSize), offset);
    res.json({ code: 0, data: { list, total, unreadCount: unread } });
  } catch (err) {
    console.error('获取通知失败:', err);
    res.json({ code: 500, message: '获取通知失败' });
  }
});

router.post('/notifications/read/:id', authMiddleware, (req, res) => {
  try {
    Q.notifications.markRead(req.params.id, req.user.id);
    res.json({ code: 0, message: '已标记为已读' });
  } catch (err) { res.json({ code: 500, message: '失败' }); }
});

router.post('/notifications/read-all', authMiddleware, (req, res) => {
  try {
    Q.notifications.markAllRead(req.user.id);
    res.json({ code: 0, message: '全部已读' });
  } catch (err) { res.json({ code: 500, message: '失败' }); }
});

router.get('/notifications/unread-count', authMiddleware, (req, res) => {
  try {
    const count = Q.notifications.unreadCount(req.user.id);
    res.json({ code: 0, data: { count } });
  } catch (err) { res.json({ code: 500, message: '失败' }); }
});

// ======== 分类管理 ========
router.get('/categories', authMiddleware, (req, res) => {
  try {
    const list = Q.categories.list();
    res.json({ code: 0, data: list });
  } catch (err) { res.json({ code: 500, message: '获取分类失败' }); }
});

router.post('/categories', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, icon, sortOrder } = req.body;
    if (!name) return res.json({ code: 400, message: '分类名称不能为空' });
    const exist = Q.categories.getByName(name);
    if (exist) return res.json({ code: 400, message: '分类名称已存在' });
    const id = uuidv4();
    Q.categories.create(id, name, icon || 'gear', sortOrder || 0);
    saveDatabase();
    logAction(req.user.id, req.user.realName, '添加分类', 'category', id, `添加分类: ${name}`);
    res.json({ code: 0, message: '分类添加成功', data: { id } });
  } catch (err) { res.json({ code: 500, message: '添加分类失败' }); }
});

router.put('/categories/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const cat = Q.categories.getById(req.params.id);
    if (!cat) return res.json({ code: 404, message: '分类不存在' });
    const { name, icon, sortOrder } = req.body;
    Q.categories.update(req.params.id, name || cat.name, icon || cat.icon, sortOrder !== undefined ? sortOrder : cat.sort_order);
    saveDatabase();
    res.json({ code: 0, message: '分类更新成功' });
  } catch (err) { res.json({ code: 500, message: '更新分类失败' }); }
});

router.delete('/categories/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const cat = Q.categories.getById(req.params.id);
    if (!cat) return res.json({ code: 404, message: '分类不存在' });
    Q.categories.delete(req.params.id);
    saveDatabase();
    logAction(req.user.id, req.user.realName, '删除分类', 'category', req.params.id, `删除分类: ${cat.name}`);
    res.json({ code: 0, message: '分类已删除' });
  } catch (err) { res.json({ code: 500, message: '删除分类失败' }); }
});

// ======== 操作日志 ========
router.get('/audit-logs', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { page = 1, pageSize = 50, action, userId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { list, total } = Q.auditLogs.list({ pageSize: parseInt(pageSize), offset, action, userId });
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('查询日志失败:', err);
    res.json({ code: 500, message: '查询日志失败' });
  }
});

module.exports = router;
