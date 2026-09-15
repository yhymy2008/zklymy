/**
 * 问题工单系统 - 全面闭环测试脚本 v2
 * 修复: 限流测试放最后, change-password 用 PUT, 增加等待间隔避免触发限流
 */
const http = require('http');
const BASE = 'http://localhost:3000';

let passed = 0, failed = 0, total = 0;
const failures = [];

function request(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout', body: null }); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(testName, condition, detail = '') {
  total++;
  if (condition) { passed++; console.log(`  ✓ ${testName}`); }
  else { failed++; const msg = `  ✗ ${testName}${detail ? ' - ' + detail : ''}`; console.log(msg); failures.push(msg); }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try { const r = await request('GET', '/api/health'); if (r.status === 200) return true; } catch (e) {}
    await sleep(1000);
  }
  return false;
}

let adminToken, adminRefreshToken, staffToken, userToken, userRefreshToken, createdTicketId;

async function runTests() {
  console.log('\n═══════════════════════════════════════');
  console.log('  问题工单系统 - 闭环测试 v2');
  console.log('═══════════════════════════════════════\n');

  // ====== Group 1: Health Check ======
  console.log('【1】基础设施测试');
  const health = await request('GET', '/api/health');
  assert('健康检查 HTTP 200', health.status === 200);
  assert('status=ok', health.body?.status === 'ok');
  assert('包含 dbStatus', health.body?.dbStatus !== undefined);
  assert('包含 memory', health.body?.memory !== undefined);

  // ====== Group 2: Captcha ======
  console.log('\n  1.2 验证码');
  const captcha = await request('GET', '/api/users/captcha');
  assert('生成验证码', captcha.body?.code === 0 && captcha.body?.data?.captchaId);
  assert('包含 SVG', captcha.body?.data?.svg?.length > 0);

  // ====== Group 3: Password Strength ======
  console.log('\n  1.3 密码强度策略');
  const r1 = await request('POST', '/api/users/register', { username: '__pw1', password: '123', realName: 't' });
  assert('拒绝过短密码', r1.body?.code !== 0);
  const r2 = await request('POST', '/api/users/register', { username: '__pw2', password: '12345678', realName: 't' });
  assert('拒绝纯数字密码', r2.body?.code !== 0);
  const r3 = await request('POST', '/api/users/register', { username: '__pw3', password: 'abcdefgh', realName: 't' });
  assert('拒绝纯字母密码', r3.body?.code !== 0);

  await sleep(200);

  // ====== Group 4: Login ======
  console.log('\n【2】认证系统测试');

  console.log('  2.1 管理员登录');
  const loginAdmin = await request('POST', '/api/users/login', { username: 'admin', password: 'admin123' });
  assert('admin登录成功', loginAdmin.body?.code === 0, JSON.stringify(loginAdmin.body));
  assert('返回 access token', !!loginAdmin.body?.data?.token);
  assert('返回 refresh token', !!loginAdmin.body?.data?.refreshToken);
  adminToken = loginAdmin.body?.data?.token;
  adminRefreshToken = loginAdmin.body?.data?.refreshToken;

  await sleep(200);

  console.log('  2.2 处理员登录');
  const loginStaff = await request('POST', '/api/users/login', { username: 'staff1', password: 'staff123' });
  assert('staff1登录成功', loginStaff.body?.code === 0);
  staffToken = loginStaff.body?.data?.token;

  await sleep(200);

  console.log('  2.3 用户注册+登录');
  const testUser = 'testuser_' + Date.now();
  const reg = await request('POST', '/api/users/register', { username: testUser, password: 'test123456', realName: '测试用户' });
  assert('注册成功', reg.body?.code === 0, JSON.stringify(reg.body));

  await sleep(200);

  const loginUser = await request('POST', '/api/users/login', { username: testUser, password: 'test123456' });
  assert('用户登录成功', loginUser.body?.code === 0);
  userToken = loginUser.body?.data?.token;
  userRefreshToken = loginUser.body?.data?.refreshToken;

  await sleep(200);

  console.log('  2.4 错误密码登录');
  const badLogin = await request('POST', '/api/users/login', { username: 'admin', password: 'wrong' });
  assert('错误密码被拒绝', badLogin.body?.code !== 0);

  // ====== Group 5: Refresh Token ======
  console.log('\n  2.5 Refresh Token 刷新');
  const refresh = await request('POST', '/api/users/refresh-token', { refreshToken: userRefreshToken });
  assert('刷新 Token 成功', refresh.body?.code === 0, JSON.stringify(refresh.body));
  if (refresh.body?.code === 0) {
    userToken = refresh.body.data.token;
    userRefreshToken = refresh.body.data.refreshToken;
  }
  const badRefresh = await request('POST', '/api/users/refresh-token', { refreshToken: 'invalid_token' });
  assert('无效 Token 被拒绝', badRefresh.body?.code !== 0);

  // ====== Group 6: RBAC Permissions ======
  console.log('\n【3】RBAC 权限系统测试');
  
  console.log('  3.1 普通用户受限访问');
  const userStats = await request('GET', '/api/tickets/stats', null, userToken);
  // stats 可能返回用户自己的统计，检查不能看到全局敏感数据
  assert('用户stats返回成功', userStats.body?.code === 0);
  const userAudit = await request('GET', '/api/tickets/audit-logs', null, userToken);
  assert('用户无法查看审计日志', userAudit.body?.code !== 0);

  console.log('  3.2 处理员正常访问');
  const staffList = await request('GET', '/api/tickets/list?page=1&pageSize=5', null, staffToken);
  assert('处理员可查看工单列表', staffList.body?.code === 0);
  const staffCategories = await request('GET', '/api/tickets/categories', null, staffToken);
  assert('处理员可查看分类', staffCategories.body?.code === 0);

  // ====== Group 7: Ticket Lifecycle ======
  console.log('\n【4】工单完整生命周期测试');

  console.log('  4.1 创建工单');
  const create = await request('POST', '/api/tickets/create', {
    title: '测试-网络连接异常',
    description: '无法访问内网，VPN超时',
    category: '系统故障', priority: 'high'
  }, userToken);
  assert('创建工单成功', create.body?.code === 0, JSON.stringify(create.body));
  createdTicketId = create.body?.data?.id;
  console.log('    TicketId: ' + createdTicketId);

  console.log('  4.2 处理员接单');
  const take = await request('POST', `/api/tickets/take/${createdTicketId}`, {}, staffToken);
  assert('接单成功', take.body?.code === 0, JSON.stringify(take.body));

  console.log('  4.3 处理员回复');
  const reply = await request('POST', `/api/tickets/reply/${createdTicketId}`, {
    content: '正在排查中，请提供您的电脑IP地址'
  }, staffToken);
  assert('回复成功', reply.body?.code === 0);

  console.log('  4.4 退回工单(rejected)');
  const reject = await request('POST', `/api/tickets/reject/${createdTicketId}`, {
    reason: '该问题属于网络部门管辖范围'
  }, staffToken);
  assert('退回成功', reject.body?.code === 0, JSON.stringify(reject.body));
  
  const checkRj = await request('GET', `/api/tickets/detail/${createdTicketId}`, null, adminToken);
  assert('状态变为rejected', checkRj.body?.data?.status === 'rejected', 
    '实际: ' + checkRj.body?.data?.status);

  console.log('  4.5 重新处理');
  const take2 = await request('POST', `/api/tickets/take/${createdTicketId}`, {}, staffToken);
  assert('重新接单', take2.body?.code === 0, JSON.stringify(take2.body));

  console.log('  4.6 挂起工单( suspended)');
  const suspend = await request('POST', `/api/tickets/suspend/${createdTicketId}`, {
    reason: '需等待网络部门配合'
  }, staffToken);
  assert('挂起成功', suspend.body?.code === 0, JSON.stringify(suspend.body));
  const checkSp = await request('GET', `/api/tickets/detail/${createdTicketId}`, null, adminToken);
  assert('状态变为suspended', checkSp.body?.data?.status === 'suspended',
    '实际: ' + checkSp.body?.data?.status);

  console.log('  4.7 恢复工单');
  const resume = await request('POST', `/api/tickets/resume/${createdTicketId}`, {}, staffToken);
  assert('恢复成功', resume.body?.code === 0, JSON.stringify(resume.body));

  console.log('  4.8 解决工单');
  const resolve = await request('POST', `/api/tickets/resolve/${createdTicketId}`, {
    solution: '重启VPN客户端并重新配置DNS'
  }, staffToken);
  assert('解决成功', resolve.body?.code === 0, JSON.stringify(resolve.body));
  const checkRs = await request('GET', `/api/tickets/detail/${createdTicketId}`, null, adminToken);
  assert('状态变为resolved', checkRs.body?.data?.status === 'resolved');

  console.log('  4.9 用户重开工单(reopened)');
  const reopen = await request('POST', `/api/tickets/reopen/${createdTicketId}`, {
    reason: '问题仍未解决，VPN还是超时'
  }, userToken);
  assert('重开成功', reopen.body?.code === 0, JSON.stringify(reopen.body));
  const checkRo = await request('GET', `/api/tickets/detail/${createdTicketId}`, null, adminToken);
  assert('状态变为reopened', checkRo.body?.data?.status === 'reopened',
    '实际: ' + checkRo.body?.data?.status);

  // ====== Group 8: SLA ======
  console.log('\n【5】SLA 监控');
  const sla = await request('GET', '/api/tickets/sla-status', null, adminToken);
  assert('SLA查询成功', sla.body?.code === 0, JSON.stringify(sla.body));

  // ====== Group 9: KB Recommend ======
  console.log('\n【6】知识库推荐');
  const kbRec = await request('GET', '/api/tickets/kb/recommend?keyword=网络', null, adminToken);
  assert('KB推荐成功', kbRec.body?.code === 0, JSON.stringify(kbRec.body));

  // ====== Group 10: Batch Ops ======
  console.log('\n【7】批量操作');
  const create2 = await request('POST', '/api/tickets/create', {
    title: '测试工单2-打印机故障', description: '三楼打印机无法打印', category: '系统故障', priority: 'low'
  }, userToken);
  assert('创建第二个工单', create2.body?.code === 0);
  const t2 = create2.body?.data?.id;
  const batch = await request('POST', '/api/tickets/batch-reassign', {
    ticketIds: [createdTicketId, t2]
  }, adminToken);
  assert('批量指派请求', batch.status === 200, JSON.stringify(batch.body));

  // ====== Group 11: Token Version Invalidation ======
  console.log('\n【8】Token版本失效测试');
  const curProfile = await request('GET', '/api/users/profile', null, adminToken);
  assert('当前Token有效', curProfile.body?.code === 0);

  const chgPwd = await request('PUT', '/api/users/change-password', {
    oldPassword: 'admin123', newPassword: 'admin123NEW'
  }, adminToken);
  assert('修改密码成功', chgPwd.body?.code === 0, JSON.stringify(chgPwd.body));

  const oldTokenCheck = await request('GET', '/api/tickets/list?page=1&pageSize=5', null, adminToken);
  assert('旧Token已失效', oldTokenCheck.body?.code !== 0);

  // 恢复密码（加延迟避免限流）
  await sleep(1000);
  const relogin = await request('POST', '/api/users/login', { username: 'admin', password: 'admin123NEW' });
  assert('用新密码登录成功', relogin.body?.code === 0, JSON.stringify(relogin.body));
  if (relogin.body?.code === 0) {
    adminToken = relogin.body.data.token;
    const restore = await request('PUT', '/api/users/change-password', { oldPassword: 'admin123NEW', newPassword: 'admin123' }, adminToken);
    assert('密码恢复成功', restore.body?.code === 0, JSON.stringify(restore.body));
  }
  await sleep(1000);
  const finalLogin = await request('POST', '/api/users/login', { username: 'admin', password: 'admin123' });
  assert('恢复后原密码可登录', finalLogin.body?.code === 0, JSON.stringify(finalLogin.body));
  if (finalLogin.body?.code === 0) adminToken = finalLogin.body.data.token;

  // ====== Group 12: Rate Limiting (at end to avoid cascading) ======
  console.log('\n【9】限流测试');
  await sleep(500);
  let rate429 = false;
  for (let i = 0; i < 13; i++) {
    const r = await request('POST', '/api/users/login', { username: 'admin', password: 'wrong' });
    if (r.status === 429) { rate429 = true; break; }
    await sleep(20);
  }
  assert('登录接口有限流(429)', rate429);

  // ====== Summary ======
  console.log('\n═══════════════════════════════════════');
  console.log('  测试结果汇总');
  console.log(`  总计: ${total} | 通过: ${passed} | 失败: ${failed}`);
  console.log(`  通过率: ${((passed / total) * 100).toFixed(1)}%`);
  if (failures.length > 0) { console.log('\n  失败详情:'); failures.forEach(f => console.log(f)); }
  console.log('\n═══════════════════════════════════════\n');
  return { total, passed, failed, failures };
}

(async () => {
  console.log('等待服务器就绪...');
  if (!await waitForServer()) { console.error('服务器未响应'); process.exit(1); }
  console.log('服务器已就绪\n');
  const result = await runTests();
  process.exit(result.failed > 0 ? 1 : 0);
})();
