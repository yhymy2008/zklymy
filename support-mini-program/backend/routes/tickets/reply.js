/**
 * 工单回复与附件模块
 * - reply, edit-reply, delete-reply, upload, delete-attachment
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { saveDatabase, logAction } = require('../../db');
const { authMiddleware } = require('../../middleware/auth');
const Q = require('../../db/queries');

function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

// 添加回复
router.post('/reply/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { content, reply_type } = req.body;
    const { id: userId, role, realName } = req.user;
    if (!content) return res.json({ code: 400, message: '回复内容不能为空' });
    const replyType = reply_type || 'public';

    if (replyType === 'internal' && role !== 'admin' && role !== 'staff') {
      return res.json({ code: 403, message: '仅处理员可使用内部备注' });
    }

    const ticket = Q.tickets.getById(id);
    if (!ticket) return res.json({ code: 404, message: '工单不存在' });

    const time = now();
    const replyId = uuidv4();
    Q.replies.create({ id: replyId, ticketId: id, userId, userName: realName, userRole: role, content, replyType, time });
    Q.tickets.touch(id, time);

    // 内部备注不通知工单创建者
    if (replyType !== 'internal') {
      let notifyUserId = (role === 'admin' || role === 'staff') ? ticket.user_id : ticket.handler_id;
      if (notifyUserId) {
        Q.notifications.create({ userId: notifyUserId, ticketId: id, title: '工单有新回复', content: `工单[${ticket.ticket_no}]有新的回复: ${content.substring(0, 50)}`, time });
      }
    }

    saveDatabase();
    logAction(userId, realName, '回复', 'ticket', id, `回复工单[${ticket.ticket_no}]`);
    res.json({ code: 0, message: '回复成功', data: { replyId } });
  } catch (err) {
    console.error('回复失败:', err);
    res.json({ code: 500, message: '回复失败' });
  }
});

// 编辑回复
router.put('/reply/:replyId', authMiddleware, (req, res) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;
    if (!content) return res.json({ code: 400, message: '回复内容不能为空' });
    const reply = Q.replies.getById(replyId);
    if (!reply || reply.user_id !== req.user.id) return res.json({ code: 404, message: '回复不存在或无权编辑' });
    Q.replies.edit(replyId, content, now());
    saveDatabase();
    res.json({ code: 0, message: '回复已更新' });
  } catch (err) {
    console.error('编辑回复失败:', err);
    res.json({ code: 500, message: '编辑回复失败' });
  }
});

// 删除回复
router.delete('/reply/:replyId', authMiddleware, (req, res) => {
  try {
    const { replyId } = req.params;
    const reply = Q.replies.getById(replyId);
    if (!reply) return res.json({ code: 404, message: '回复不存在' });
    if (reply.user_id !== req.user.id && req.user.role !== 'admin') return res.json({ code: 403, message: '无权删除此回复' });
    if (reply.content && reply.content.startsWith('[系统]')) return res.json({ code: 400, message: '不能删除系统回复' });
    Q.replies.softDelete(replyId);
    saveDatabase();
    res.json({ code: 0, message: '回复已删除' });
  } catch (err) {
    console.error('删除回复失败:', err);
    res.json({ code: 500, message: '删除回复失败' });
  }
});

// 文件上传
router.post('/upload/:ticketId', authMiddleware, (req, res) => {
  try {
    const upload = req.app.get('upload');
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.json({ code: 400, message: '文件大小不能超过10MB' });
        return res.json({ code: 500, message: '上传失败: ' + err.message });
      }
      if (!req.file) return res.json({ code: 400, message: '请选择文件' });

      const { ticketId } = req.params;
      const ticket = Q.tickets.getById(ticketId);
      if (!ticket) {
        fs.unlinkSync(req.file.path);
        return res.json({ code: 404, message: '工单不存在' });
      }

      const attId = uuidv4();
      Q.attachments.create({
        id: attId, ticketId, userId: req.user.id, userName: req.user.realName,
        filename: req.file.filename, originalName: req.file.originalname,
        mimeType: req.file.mimetype, size: req.file.size, filePath: req.file.filename
      });

      saveDatabase();
      res.json({ code: 0, message: '上传成功', data: { id: attId, filename: req.file.filename, original_name: req.file.originalname, size: req.file.size, url: '/uploads/' + req.file.filename } });
    });
  } catch (err) {
    console.error('上传失败:', err);
    res.json({ code: 500, message: '上传失败' });
  }
});

// 删除附件
router.delete('/attachment/:attId', authMiddleware, (req, res) => {
  try {
    const att = Q.attachments.getById(req.params.attId);
    if (!att) return res.json({ code: 404, message: '附件不存在' });
    if (att.user_id !== req.user.id && req.user.role !== 'admin') return res.json({ code: 403, message: '无权删除此附件' });

    const filePath = path.join(__dirname, '..', '..', 'uploads', att.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    Q.attachments.delete(req.params.attId);
    saveDatabase();
    res.json({ code: 0, message: '附件已删除' });
  } catch (err) {
    console.error('删除附件失败:', err);
    res.json({ code: 500, message: '删除附件失败' });
  }
});

module.exports = router;
