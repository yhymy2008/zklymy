/**
 * 工单路由聚合入口
 * 挂载所有子路由模块
 */
const express = require('express');
const router = express.Router();

// 挂载子路由模块
router.use(require('./crud'));          // 工单 CRUD
router.use(require('./workflow'));      // 工单流程
router.use(require('./list'));          // 列表与搜索
router.use(require('./reply'));         // 回复与附件
router.use(require('./batch'));         // 批量操作
router.use(require('./stats'));         // 统计与导出
router.use(require('./sla'));           // SLA 监控
router.use(require('./kb'));            // 知识库
router.use(require('./notifications')); // 通知与分类

module.exports = router;
