/**
 * 知识库管理模块
 * - kb/list, detail, create, update, delete, helpful, categories, recommend
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { saveDatabase, logAction, cache } = require('../../db');
const { authMiddleware, staffMiddleware } = require('../../middleware/auth');
const { searchKnowledgeBase, findSimilarTickets } = require('../../db/fts');
const Q = require('../../db/queries');

function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

router.get('/kb/list', authMiddleware, (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { list, total } = Q.knowledgeBase.list({ pageSize: parseInt(pageSize), offset, keyword, category });
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('获取知识库失败:', err);
    res.json({ code: 500, message: '获取知识库失败' });
  }
});

router.get('/kb/detail/:id', authMiddleware, (req, res) => {
  try {
    const article = Q.knowledgeBase.getById(req.params.id);
    if (!article) return res.json({ code: 404, message: '文章不存在' });
    Q.knowledgeBase.incrementViews(req.params.id);
    article.view_count = (article.view_count || 0) + 1;
    res.json({ code: 0, data: article });
  } catch (err) {
    res.json({ code: 500, message: '获取文章失败' });
  }
});

router.post('/kb/create', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const { title, content, category, tags, source_ticket_id } = req.body;
    if (!title || !content) return res.json({ code: 400, message: '标题和内容不能为空' });
    const id = uuidv4();
    const time = now();
    Q.knowledgeBase.create({ id, title, content, category, tags, authorId: req.user.id, authorName: req.user.realName, sourceTicketId: source_ticket_id, time });
    saveDatabase();
    logAction(req.user.id, req.user.realName, '创建知识库', 'kb', id, `创建文章: ${title}`);
    res.json({ code: 0, message: '文章创建成功', data: { id } });
  } catch (err) {
    res.json({ code: 500, message: '创建文章失败' });
  }
});

router.put('/kb/update/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    const article = Q.knowledgeBase.getById(req.params.id);
    if (!article) return res.json({ code: 404, message: '文章不存在' });
    Q.knowledgeBase.update(req.params.id, { ...req.body, time: now() });
    saveDatabase();
    res.json({ code: 0, message: '文章更新成功' });
  } catch (err) {
    res.json({ code: 500, message: '更新失败' });
  }
});

router.delete('/kb/delete/:id', authMiddleware, staffMiddleware, (req, res) => {
  try {
    Q.knowledgeBase.delete(req.params.id);
    saveDatabase();
    res.json({ code: 0, message: '文章已删除' });
  } catch (err) {
    res.json({ code: 500, message: '删除失败' });
  }
});

router.post('/kb/helpful/:id', authMiddleware, (req, res) => {
  try {
    Q.knowledgeBase.markHelpful(req.params.id);
    res.json({ code: 0, message: '感谢反馈' });
  } catch (err) {
    res.json({ code: 500, message: '操作失败' });
  }
});

router.get('/kb/categories', authMiddleware, (req, res) => {
  try {
    const cats = Q.knowledgeBase.categories();
    res.json({ code: 0, data: cats.map(c => c.category) });
  } catch (err) {
    res.json({ code: 500, message: '获取分类失败' });
  }
});

router.get('/kb/recommend', authMiddleware, (req, res) => {
  try {
    const { keyword, limit = 5 } = req.query;
    if (!keyword) return res.json({ code: 0, data: [] });
    const keywords = keyword.split(/[\s,，、。；;]+/).filter(k => k.length > 1);
    if (keywords.length === 0) return res.json({ code: 0, data: [] });

    const cacheKey = `kb_recommend_${keyword}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ code: 0, data: cached });

    const articles = Q.knowledgeBase.recommend(keywords, parseInt(limit));
    cache.set(cacheKey, articles || [], 60000);
    res.json({ code: 0, data: articles || [] });
  } catch (err) {
    console.error('知识库推荐失败:', err);
    res.json({ code: 500, message: '知识库推荐失败' });
  }
});

// FTS5 全文搜索
router.get('/kb/search', authMiddleware, (req, res) => {
  try {
    const { keyword, limit = 20, category } = req.query;
    if (!keyword || keyword.trim().length === 0) {
      return res.json({ code: 0, data: [] });
    }
    const results = searchKnowledgeBase(keyword.trim(), parseInt(limit), category || null);
    res.json({ code: 0, data: results });
  } catch (err) {
    console.error('全文搜索失败:', err);
    res.json({ code: 500, message: '搜索失败' });
  }
});

// 相似工单推荐
router.get('/kb/similar-tickets', authMiddleware, (req, res) => {
  try {
    const { title, description, limit = 5 } = req.query;
    if (!title) return res.json({ code: 0, data: [] });
    const results = findSimilarTickets(title, description || '', parseInt(limit));
    res.json({ code: 0, data: results });
  } catch (err) {
    console.error('相似工单查找失败:', err);
    res.json({ code: 500, message: '查找失败' });
  }
});

// 智能分类建议（基于关键词映射和历史分布）
router.get('/kb/suggest-category', authMiddleware, (req, res) => {
  try {
    const { title, description } = req.query;
    if (!title) return res.json({ code: 0, data: null });

    const { dbAll } = require('../../db');
    const text = (title + ' ' + (description || '')).toLowerCase();

    // 分类关键词映射表
    const categoryHints = {
      '系统故障': ['错误', '报错', '崩溃', '闪退', '打不开', '无法启动', '异常', 'bug', 'error', 'crash'],
      '账号问题': ['登录', '密码', '账号', '注册', '验证', 'token', '权限', '认证'],
      '网络问题': ['网络', '连接', '超时', '断线', '延迟', 'timeout', '离线'],
      '数据问题': ['数据', '丢失', '同步', '导出', '导入', '备份', '恢复'],
      '功能咨询': ['怎么', '如何', '在哪里', '使用', '设置', '配置', '教程'],
      '性能问题': ['慢', '卡', '卡顿', '性能', '加载', '响应', '内存'],
      '安全漏洞': ['安全', '漏洞', '攻击', '注入', 'xss', 'sql', '加密'],
      '界面问题': ['界面', '显示', '布局', '乱码', '样式', 'ui', '字体'],
    };

    let bestCategory = null, bestScore = 0;
    for (const [category, keywords] of Object.entries(categoryHints)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // 如果关键词没匹配到，使用历史分布
    if (bestScore === 0) {
      const topCategory = dbAll(
        'SELECT category, COUNT(*) as cnt FROM tickets WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC LIMIT 1'
      );
      if (topCategory.length > 0) {
        bestCategory = topCategory[0].category;
        bestScore = 0.1;
      }
    }

    res.json({
      code: 0,
      data: {
        category: bestCategory,
        confidence: bestScore > 2 ? 'high' : bestScore > 0 ? 'medium' : 'low'
      }
    });
  } catch (err) {
    console.error('分类建议失败:', err);
    res.json({ code: 500, message: '失败' });
  }
});

// 自动标签提取
router.get('/kb/suggest-tags', authMiddleware, (req, res) => {
  try {
    const { title, description } = req.query;
    if (!title) return res.json({ code: 0, data: [] });

    const text = (title + ' ' + (description || '')).toLowerCase();

    // 常见标签词库
    const tagPatterns = [
      '登录', '密码', '注册', '权限', '验证码',
      '崩溃', '闪退', '报错', '异常', '卡顿',
      '网络', '超时', '连接', '断线',
      '数据', '同步', '导出', '导入', '备份',
      '界面', '显示', '样式', '布局',
      '性能', '加载', '响应', '内存',
      '支付', '订单', '退款', '交易',
      '通知', '消息', '推送', '邮件',
      '文件', '上传', '下载', '附件',
    ];

    const matched = tagPatterns.filter(tag => text.includes(tag));
    res.json({ code: 0, data: matched.slice(0, 5) });
  } catch (err) {
    console.error('标签建议失败:', err);
    res.json({ code: 500, message: '失败' });
  }
});

module.exports = router;
