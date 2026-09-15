const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'support.db');
let db = null;

// ======== 增量持久化机制 ========
let _isDirty = false;
let _pendingWrites = 0;
const FLUSH_INTERVAL_MS = 60000;       // 每60秒全量快照
const FLUSH_WRITE_THRESHOLD = 100;     // 或100次写入后全量快照
let _flushTimer = null;
let _shutdownHandler = null;

function markDirty() {
  _isDirty = true;
  _pendingWrites++;
  if (_pendingWrites >= FLUSH_WRITE_THRESHOLD) {
    flushToDisk();
  }
}

function flushToDisk() {
  if (!_isDirty || !db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    _isDirty = false;
    _pendingWrites = 0;
  } catch (err) {
    console.error('[DB] 持久化失败:', err.message);
  }
}

// 保存数据库到文件（全量，兼容旧代码）
function saveDatabase() {
  flushToDisk();
}

// 定时全量快照
let saveInterval = null;

// 进程退出前最后一次持久化
function _registerShutdownHandlers() {
  if (_shutdownHandler) return;
  const handler = () => {
    console.log('[DB] 进程退出，执行最终持久化...');
    if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
    flushToDisk();
  };
  _shutdownHandler = handler;
  process.on('beforeExit', handler);
  process.on('SIGINT', () => { handler(); process.exit(0); });
  process.on('SIGTERM', () => { handler(); process.exit(0); });
}

// 执行SQL并返回结果（select用exec，其他用run）
function dbExec(sql, params = []) {
  if (isSelectSQL(sql)) {
    const results = [];
    db.each(sql, params, (row) => results.push(row), () => {});
    return results;
  } else {
    db.run(sql, params);
    markDirty();
    return { changes: db.getRowsModified() };
  }
}

// 获取单条记录
function dbGet(sql, params = []) {
  const rows = dbExec(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// 获取多条记录
function dbAll(sql, params = []) {
  return dbExec(sql, params);
}

// 执行写入SQL
function dbRun(sql, params = []) {
  db.run(sql, params);
  markDirty();
  return { changes: db.getRowsModified() };
}

function isSelectSQL(sql) {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA');
}

// ======== 内存缓存（高频读取数据） ========
const NodeCache = (() => {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiry < Date.now()) { store.delete(key); return null; }
      return entry.value;
    },
    set(key, value, ttlMs = 300000) {
      store.set(key, { value, expiry: Date.now() + ttlMs });
    },
    del(pattern) {
      if (pattern === '*') { store.clear(); return; }
      for (const key of store.keys()) {
        if (key.includes(pattern)) store.delete(key);
      }
    },
    has(key) { return this.get(key) !== null; }
  };
})();

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // 尝试从文件加载数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] 从文件加载数据库');
  } else {
    db = new SQL.Database();
    console.log('[DB] 创建新数据库');
  }

  // ======== 启用 WAL 模式 ========
  try {
    db.run('PRAGMA journal_mode=WAL');
    console.log('[DB] WAL 模式已启用');
  } catch (e) { console.log('[DB] WAL 启用失败（可能已启用）:', e.message); }
  try { db.run('PRAGMA synchronous=NORMAL'); } catch (e) {}
  try { db.run('PRAGMA cache_size=-8000'); } catch (e) {}
  try { db.run('PRAGMA temp_store=MEMORY'); } catch (e) {}
  try { db.run('PRAGMA mmap_size=268435456'); } catch (e) {}
  console.log('[DB] 性能参数已优化 (synchronous=NORMAL, cache=8MB, temp_store=MEMORY, mmap=256MB)');

  // 创建表
  dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      real_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_no TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '系统故障',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      handler_id TEXT DEFAULT NULL,
      handler_name TEXT DEFAULT '',
      solution TEXT DEFAULT '',
      rating INTEGER DEFAULT 0,
      feedback TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME DEFAULT NULL
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      reply_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT 'gear',
      sort_order INTEGER DEFAULT 0
    )
  `);

  dbExec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ======== 数据库迁移：为旧表添加缺失的列 ========
  const migrations = [
    { table: 'ticket_replies', col: 'is_deleted', def: 'INTEGER DEFAULT 0' },
    { table: 'ticket_replies', col: 'updated_at', def: 'DATETIME DEFAULT NULL' },
    { table: 'tickets', col: 'handler_name', def: "TEXT DEFAULT ''" },
    { table: 'tickets', col: 'solution', def: "TEXT DEFAULT ''" },
    { table: 'tickets', col: 'rating', def: 'INTEGER DEFAULT 0' },
    { table: 'tickets', col: 'feedback', def: "TEXT DEFAULT ''" },
    { table: 'tickets', col: 'resolved_at', def: 'DATETIME DEFAULT NULL' },
    { table: 'users', col: 'avatar', def: "TEXT DEFAULT ''" },
    { table: 'users', col: 'phone', def: "TEXT DEFAULT ''" },
    { table: 'users', col: 'status', def: "TEXT DEFAULT 'active'" },
    { table: 'ticket_replies', col: 'reply_type', def: "TEXT DEFAULT 'public'" },
  ];

  migrations.forEach(({ table, col, def }) => {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      console.log(`[DB] 迁移: ${table}.${col} 列已添加`);
    } catch (e) {
      // 列已存在时会报错，忽略即可
    }
  });
  // =====================================================

  // ======== 知识库表 ========
  dbExec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      source_ticket_id TEXT DEFAULT NULL,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ======== SLA 规则表 ========
  dbExec(`
    CREATE TABLE IF NOT EXISTS sla_rules (
      id TEXT PRIMARY KEY,
      priority TEXT NOT NULL,
      response_hours REAL NOT NULL,
      resolve_hours REAL NOT NULL,
      description TEXT DEFAULT ''
    )
  `);

  // ======== Token 版本表（用于全局使旧 Token 失效） ========
  dbExec(`
    CREATE TABLE IF NOT EXISTS token_versions (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ======== 性能索引 ========
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_handler_id ON tickets(handler_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_composite ON tickets(status, priority, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read)',
    'CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id)',
    'CREATE INDEX IF NOT EXISTS idx_ticket_replies_deleted ON ticket_replies(ticket_id, is_deleted)',
    'CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
  ];
  indexes.forEach(sql => {
    try { db.run(sql); } catch (e) { /* 索引可能已存在 */ }
  });
  // =============================

  // 初始全量持久化
  saveDatabase();

  // 插入默认 SLA 规则
  const slaRules = [
    { priority: 'urgent', response: 2, resolve: 8, desc: '紧急工单：2小时内响应，8小时内解决' },
    { priority: 'high', response: 4, resolve: 24, desc: '高优先级：4小时内响应，24小时内解决' },
    { priority: 'normal', response: 8, resolve: 48, desc: '普通工单：8小时内响应，48小时内解决' },
    { priority: 'low', response: 24, resolve: 72, desc: '低优先级：24小时内响应，72小时内解决' },
  ];
  slaRules.forEach(rule => {
    const exist = dbGet('SELECT id FROM sla_rules WHERE priority = ?', [rule.priority]);
    if (!exist) {
      dbRun('INSERT INTO sla_rules (id, priority, response_hours, resolve_hours, description) VALUES (?,?,?,?,?)',
        [uuidv4(), rule.priority, rule.response, rule.resolve, rule.desc]);
    }
  });

  // 插入默认分类
  const categories = ['系统故障', '功能建议', '使用咨询', '账号问题', '性能问题', '其他'];
  const icons = ['warning-circle', 'lightbulb', 'chat', 'user', 'dashboard', 'more'];
  
  categories.forEach((name, idx) => {
    const exist = dbGet('SELECT id FROM categories WHERE name = ?', [name]);
    if (!exist) {
      dbRun('INSERT INTO categories (id, name, icon, sort_order) VALUES (?,?,?,?)', [uuidv4(), name, icons[idx], idx]);
    }
  });

  // 插入默认账号（密码使用 bcrypt 加密）
  const insertUser = (username, password, realName, role) => {
    const exist = dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (!exist) {
      const hashedPwd = bcrypt.hashSync(password, 10);
      dbRun('INSERT INTO users (id, username, password, real_name, role, status) VALUES (?,?,?,?,?,?)', 
        [uuidv4(), username, hashedPwd, realName, role, 'active']);
    }
  };

  insertUser('admin', 'admin123', '系统管理员', 'admin');
  insertUser('staff1', 'staff123', '技术处理员', 'staff');
  insertUser('staff2', 'staff123', '运维处理员', 'staff');

  saveDatabase();

  // 定时全量快照（60秒间隔，配合增量持久化）
  saveInterval = setInterval(() => {
    if (_isDirty) flushToDisk();
  }, FLUSH_INTERVAL_MS);

  // 注册进程退出处理器
  _registerShutdownHandlers();

  console.log('[DB] 数据库初始化完成（增量持久化 + 60s全量快照）');
}

// 记录操作日志
function logAction(userId, userName, action, targetType, targetId, detail = '') {
  try {
    dbRun(
      'INSERT INTO audit_logs (id, user_id, user_name, action, target_type, target_id, detail) VALUES (?,?,?,?,?,?,?)',
      [uuidv4(), userId, userName, action, targetType, targetId, detail]
    );
  } catch (e) {
    console.error('[AUDIT] 记录日志失败:', e.message);
  }
}

module.exports = { initDatabase, dbExec, dbGet, dbAll, dbRun, saveDatabase, markDirty, flushToDisk, logAction, cache: NodeCache };
