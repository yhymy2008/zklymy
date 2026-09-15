/**
 * 问题工单系统 - 后端服务
 * 第二轮优化：安全加固、路由重构、请求追踪ID、优雅关机增强
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDatabase } = require('./db');
const { initFTS } = require('./db/fts');
const { initWebSocket } = require('./websocket');
const ticketsRouter = require('./routes/tickets/index');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ======== 环境变量校验 ========
if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'support-ticket-system-secret-2026') {
    console.error('[FATAL] 生产环境必须设置 JWT_SECRET 环境变量！');
    process.exit(1);
  }
}

// ======== CORS 白名单 ========
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 curl、Postman、小程序）
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] 拒绝来源:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}));

// ======== Helmet 安全头（兼容性实现） ========
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ======== 请求追踪 ID ========
app.use((req, res, next) => {
  const requestId = uuidv4().slice(0, 8);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// ======== 结构化日志 ========
const logger = {
  info(msg, extra = {}) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg, ...extra }));
  },
  warn(msg, extra = {}) {
    console.warn(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', msg, ...extra }));
  },
  error(msg, extra = {}) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg, ...extra }));
  }
};

// ======== 上传目录 ========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ======== 文件上传安全校验 ========
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-rar-compressed'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    } else {
      cb(null, true);
    }
  }
});
app.set('upload', upload);

// ======== 中间件 ========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const compression = require('compression');
app.use(compression());

app.use('/api', (req, res, next) => {
  if (req.query.pageSize) {
    const ps = parseInt(req.query.pageSize);
    if (ps > 200) req.query.pageSize = '200';
  }
  next();
});

// ======== 接口限流 ========
const rateLimitMap = new Map();
const authRateLimitMap = new Map();
function rateLimit(maxRequests, windowMs, useMap = null) {
  const map = useMap || rateLimitMap;
  return (req, res, next) => {
    const key = req.ip + ':' + req.originalUrl;
    const now = Date.now();
    let entry = map.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      map.set(key, entry);
    }
    entry.count++;
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    if (entry.count > maxRequests) {
      return res.status(429).json({ code: 429, message: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) { if (now > entry.resetTime) rateLimitMap.delete(key); }
  for (const [key, entry] of authRateLimitMap) { if (now > entry.resetTime) authRateLimitMap.delete(key); }
}, 300000);

app.use('/api/users/login', rateLimit(10, 60000, authRateLimitMap));
app.use('/api/users/captcha', rateLimit(20, 60000, authRateLimitMap));
app.use('/api', (req, res, next) => {
  let role = 'guest';
  try {
    const token = req.headers.authorization || req.headers.token || '';
    const tokenStr = token.replace('Bearer ', '');
    if (tokenStr) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(tokenStr);
      if (decoded && decoded.role) role = decoded.role;
    }
  } catch (e) { /* ignore */ }
  const limits = { admin: 200, staff: 120, user: 60, guest: 30 };
  rateLimit(limits[role] || 60, 60000)(req, res, next);
});

// 全局超时
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) res.status(504).json({ code: 504, message: '请求超时' });
  });
  next();
});

// ======== 静态文件 ========
app.use('/uploads', express.static(uploadDir));

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (NODE_ENV === 'production') {
      if (ext === '.html') { res.setHeader('Cache-Control', 'no-cache'); }
      else if (/\.(js|css)$/i.test(filePath) && /[.-][a-f0-9]{6,}\.(js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else { res.setHeader('Cache-Control', 'public, max-age=3600'); }
    } else {
      if (/\.(js|css|html)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }
}));

// ======== API 路由 ========
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', usersRouter);

// ======== 健康检查增强 ========
let requestCount = 0;
let lastRequestTime = Date.now();
app.use((req, res, next) => { requestCount++; lastRequestTime = Date.now(); next(); });

app.get('/api/health', (req, res) => {
  const { dbGet } = require('./db');
  let dbStatus = 'ok';
  let dbWriteLatency = -1;
  try {
    const r = dbGet('SELECT 1 as ok');
    if (!r) dbStatus = 'error';
    dbWriteLatency = require('./db/queries').health.writeLatency();
  } catch (e) { dbStatus = 'error'; }
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok', time: new Date().toISOString(), uptime: Math.floor(process.uptime()),
    memory: { rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB', heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB' },
    dbStatus, dbWriteLatency: dbWriteLatency >= 0 ? dbWriteLatency + 'ms' : 'N/A', requestCount
  });
});

app.use('/api', (req, res) => res.status(404).json({ code: 404, message: '接口不存在' }));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

// ======== 错误处理 ========
app.use((err, req, res, next) => {
  logger.error('未捕获错误', { msg: err.message, requestId: req.requestId, stack: err.stack });
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// ======== 优雅关机增强 ========
let isShuttingDown = false;
let server = null;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`收到 ${signal} 信号，开始优雅关机...`);

  // 停止接收新请求
  if (server) {
    server.close(() => logger.info('HTTP 服务已停止'));
  }

  // 30秒超时强制退出
  setTimeout(() => {
    logger.warn('关机超时，强制退出');
    process.exit(1);
  }, 30000);

  // 执行最终数据库持久化
  try {
    const { flushToDisk } = require('./db');
    flushToDisk();
    logger.info('数据库最终持久化完成');
  } catch (e) {
    logger.error('持久化失败', { msg: e.message });
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error('未捕获异常', { msg: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise 拒绝', { reason: String(reason) });
});

// ======== 数据库备份策略 ========
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

function backupDatabase() {
  try {
    const dbPath = path.join(__dirname, 'support.db');
    if (!fs.existsSync(dbPath)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(backupsDir, `support_${timestamp}.db`);
    fs.copyFileSync(dbPath, backupPath);
    logger.info('数据库备份完成', { file: backupPath });

    // 清理超过7天的备份（保留28份）
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db')).sort();
    while (files.length > 28) {
      const oldFile = path.join(backupsDir, files.shift());
      fs.unlinkSync(oldFile);
      logger.info('清理旧备份', { file: oldFile });
    }
  } catch (e) {
    logger.error('数据库备份失败', { msg: e.message });
  }
}

// 每6小时备份
setInterval(backupDatabase, 6 * 60 * 60 * 1000);

// ======== 启动 ========
async function start() {
  await initDatabase();
  initFTS(); // 初始化全文搜索索引

  server = app.listen(PORT, () => {
    // 初始化 WebSocket
    initWebSocket(server);

    console.log(`\n========================================`);
    console.log(`  问题工单系统 v2.0 (已优化)`);
    console.log(`  环境: ${NODE_ENV}`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`  备份策略: 每6小时 / 保留7天`);
    console.log(`========================================\n`);

    // 启动后立即备份一次
    setTimeout(backupDatabase, 10000);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
