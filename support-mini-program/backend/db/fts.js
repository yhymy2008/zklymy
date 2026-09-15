/**
 * SQLite FTS5 全文搜索模块
 * 为知识库创建全文索引，支持 BM25 相关度排序
 */
const { dbGet, dbAll, dbRun } = require('../db');

/**
 * 初始化 FTS5 全文搜索索引
 * 创建知识库文章的全文搜索虚拟表
 */
function initFTS() {
  try {
    // 检查 FTS5 是否已存在
    const exists = dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_base_fts'");

    if (!exists) {
      console.log('[FTS] 正在创建全文搜索索引...');
      dbRun(`
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_base_fts USING fts5(
          title, content, tags,
          content='knowledge_base',
          content_rowid='rowid'
        )
      `);

      // 创建触发器保持 FTS 索引同步
      dbRun(`
        CREATE TRIGGER IF NOT EXISTS kb_fts_insert AFTER INSERT ON knowledge_base
        BEGIN
          INSERT INTO knowledge_base_fts(rowid, title, content, tags)
          VALUES (new.rowid, new.title, new.content, new.tags);
        END
      `);

      dbRun(`
        CREATE TRIGGER IF NOT EXISTS kb_fts_delete AFTER DELETE ON knowledge_base
        BEGIN
          INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, title, content, tags)
          VALUES ('delete', old.rowid, old.title, old.content, old.tags);
        END
      `);

      dbRun(`
        CREATE TRIGGER IF NOT EXISTS kb_fts_update AFTER UPDATE ON knowledge_base
        BEGIN
          INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, title, content, tags)
          VALUES ('delete', old.rowid, old.title, old.content, old.tags);
          INSERT INTO knowledge_base_fts(rowid, title, content, tags)
          VALUES (new.rowid, new.title, new.content, new.tags);
        END
      `);

      // 重建现有数据索引
      dbRun(`
        INSERT INTO knowledge_base_fts(rowid, title, content, tags)
        SELECT rowid, title, content, tags FROM knowledge_base WHERE status = 'published'
      `);

      console.log('[FTS] 全文搜索索引创建完成');
    } else {
      console.log('[FTS] 全文搜索索引已存在');
    }
  } catch (err) {
    console.error('[FTS] 初始化全文搜索失败:', err.message);
  }
}

/**
 * 全文搜索知识库
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @param {string} [category] - 可选分类筛选
 * @returns {Array} 搜索结果，按相关度排序
 */
function searchKnowledgeBase(query, limit = 20, category = null) {
  try {
    // 清理搜索词，FTS5 需要特殊字符转义
    const sanitized = query.replace(/['"*()~&|^!]/g, ' ').trim();
    if (!sanitized) return [];

    let sql, params;
    const exists = dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_base_fts'");

    if (exists) {
      // 使用 FTS5 BM25 搜索
      let whereClause = '';
      if (category) {
        whereClause = ' AND kb.category = ?';
        params = [`"${sanitized}"*`, category, limit];
        sql = `
          SELECT kb.id, kb.title, kb.category, kb.tags, kb.author_name,
                 kb.view_count, kb.helpful_count, kb.created_at,
                 snippet(knowledge_base_fts, 2, '<mark>', '</mark>', '...', 30) as snippet
          FROM knowledge_base_fts
          JOIN knowledge_base kb ON knowledge_base_fts.rowid = kb.rowid
          WHERE knowledge_base_fts MATCH ? AND kb.status = 'published'${whereClause}
          ORDER BY rank LIMIT ?
        `;
      } else {
        params = [`"${sanitized}"*`, limit];
        sql = `
          SELECT kb.id, kb.title, kb.category, kb.tags, kb.author_name,
                 kb.view_count, kb.helpful_count, kb.created_at,
                 snippet(knowledge_base_fts, 2, '<mark>', '</mark>', '...', 30) as snippet
          FROM knowledge_base_fts
          JOIN knowledge_base kb ON knowledge_base_fts.rowid = kb.rowid
          WHERE knowledge_base_fts MATCH ? AND kb.status = 'published'
          ORDER BY rank LIMIT ?
        `;
      }
    } else {
      // 降级为 LIKE 模糊匹配
      const kw = '%' + sanitized + '%';
      let whereClause = '';
      if (category) {
        whereClause = ' AND category = ?';
        params = [kw, kw, kw, category, limit];
      } else {
        params = [kw, kw, kw, limit];
      }
      sql = `
        SELECT id, title, category, tags, author_name, view_count, helpful_count, created_at,
               '' as snippet
        FROM knowledge_base
        WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)${whereClause}
        ORDER BY helpful_count DESC, view_count DESC LIMIT ?
      `;
    }

    return dbAll(sql, params);
  } catch (err) {
    console.error('[FTS] 搜索失败:', err.message);
    // 降级搜索
    const kw = '%' + query.trim() + '%';
    const params = category ? [kw, kw, kw, category, limit] : [kw, kw, kw, limit];
    const catFilter = category ? ' AND category = ?' : '';
    return dbAll(
      `SELECT id, title, category, tags, author_name, view_count, helpful_count, created_at,
              '' as snippet
       FROM knowledge_base
       WHERE status='published' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)${catFilter}
       ORDER BY view_count DESC LIMIT ?`, params
    );
  }
}

/**
 * 搜索相似工单（用于智能推荐）
 * @param {string} title - 工单标题
 * @param {string} description - 工单描述
 * @param {number} limit - 返回数量
 * @returns {Array}
 */
function findSimilarTickets(title, description, limit = 5) {
  const { dbAll } = require('../db');
  // 使用 LIKE 进行关键词匹配（FTS5 是虚拟表，工单表不适用）
  const keywords = (title + ' ' + (description || '')).split(/[\s,，、。；;]+/).filter(k => k.length > 1).slice(0, 5);
  if (keywords.length === 0) return [];

  const conditions = keywords.map(() => '(t.title LIKE ? OR t.description LIKE ?)').join(' OR ');
  const params = [];
  keywords.forEach(k => {
    const kw = '%' + k + '%';
    params.push(kw, kw);
  });

  return dbAll(
    `SELECT t.id, t.ticket_no, t.title, t.status, t.handler_name,
            t.solution, t.created_at
     FROM tickets t
     WHERE t.status IN ('resolved', 'closed') AND (${conditions})
     ORDER BY t.created_at DESC LIMIT ?`,
    [...params, limit]
  );
}

module.exports = { initFTS, searchKnowledgeBase, findSimilarTickets };
