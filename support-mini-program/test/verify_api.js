const http = require('http');
const baseUrl = 'http://localhost:3000';

function req(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    const r = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    r.on('error', (e) => reject(e));
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function authReq(method, path, data, token) {
  const url = new URL(path, baseUrl);
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    };
    const r = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    r.on('error', (e) => reject(e));
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function verify() {
  let passed = 0, failed = 0;
  function check(name, result, expectCode = 0) {
    const code = result.data?.code;
    if (code === expectCode) {
      console.log(`  [PASS] ${name} (code: ${code})`);
      passed++;
    } else {
      console.log(`  [FAIL] ${name} (code: ${code}, expected: ${expectCode}, msg: ${result.data?.message || 'N/A'})`);
      failed++;
    }
    return result;
  }

  // 1. Login
  console.log('\n=== 1. Login ===');
  const loginRes = await req('POST', '/api/users/login', { username: 'admin', password: 'admin123' });
  check('Login', loginRes);
  if (loginRes.data.code !== 0) { console.log('Cannot continue without login'); return; }
  const token = loginRes.data.data.token;

  // 2. KB List (empty)
  console.log('\n=== 2. KB List (empty) ===');
  const kbList = await authReq('GET', '/api/tickets/kb/list?page=1&pageSize=12', null, token);
  check('KB List empty', kbList);
  console.log('    total:', kbList.data.data?.total, 'list_len:', kbList.data.data?.list?.length);

  // 3. KB Categories
  console.log('\n=== 3. KB Categories ===');
  const kbCats = await authReq('GET', '/api/tickets/kb/categories', null, token);
  check('KB Categories', kbCats);
  console.log('    categories:', kbCats.data.data);

  // 4. KB Create
  console.log('\n=== 4. KB Create ===');
  const kbCreate = await authReq('POST', '/api/tickets/kb/create', { 
    title: 'Test Article', 
    content: 'This is test content for KB article', 
    category: 'TestCategory', 
    tags: 'test,verify' 
  }, token);
  check('KB Create', kbCreate);
  const kbId = kbCreate.data.data?.id;
  console.log('    article id:', kbId);

  // 5. KB List (with article)
  console.log('\n=== 5. KB List (with article) ===');
  const kbList2 = await authReq('GET', '/api/tickets/kb/list?page=1&pageSize=12', null, token);
  check('KB List with article', kbList2);
  console.log('    total:', kbList2.data.data?.total);

  // 6. KB List by category
  console.log('\n=== 6. KB List (by category) ===');
  const kbListCat = await authReq('GET', '/api/tickets/kb/list?category=TestCategory', null, token);
  check('KB List by category', kbListCat);
  console.log('    total:', kbListCat.data.data?.total);

  // 7. KB List by keyword
  console.log('\n=== 7. KB List (by keyword) ===');
  const kbListKw = await authReq('GET', '/api/tickets/kb/list?keyword=test', null, token);
  check('KB List by keyword', kbListKw);
  console.log('    total:', kbListKw.data.data?.total);

  // 8. KB Detail
  if (kbId) {
    console.log('\n=== 8. KB Detail ===');
    const kbDetail = await authReq('GET', '/api/tickets/kb/detail/' + kbId, null, token);
    check('KB Detail', kbDetail);
    console.log('    title:', kbDetail.data.data?.title, 'view_count:', kbDetail.data.data?.view_count);
  }

  // 9. KB Update
  if (kbId) {
    console.log('\n=== 9. KB Update ===');
    const kbUpdate = await authReq('PUT', '/api/tickets/kb/update/' + kbId, { 
      title: 'Updated Article', 
      content: 'Updated content for testing' 
    }, token);
    check('KB Update', kbUpdate);
  }

  // 10. KB Helpful
  if (kbId) {
    console.log('\n=== 10. KB Helpful ===');
    const kbHelpful = await authReq('POST', '/api/tickets/kb/helpful/' + kbId, null, token);
    check('KB Helpful', kbHelpful);
  }

  // 11. Global Search
  console.log('\n=== 11. Global Search ===');
  const search = await authReq('GET', '/api/tickets/search?keyword=test&limit=5', null, token);
  check('Global Search', search);
  console.log('    tickets:', search.data.data?.tickets?.length, 'kb:', search.data.data?.kb?.length);

  // 12. Ticket List (for batch ops)
  console.log('\n=== 12. Ticket List ===');
  const tickets = await authReq('GET', '/api/tickets/list?status=pending', null, token);
  check('Ticket List', tickets);

  // 13. KB Categories (after create)
  console.log('\n=== 13. KB Categories (after create) ===');
  const kbCats2 = await authReq('GET', '/api/tickets/kb/categories', null, token);
  check('KB Categories after', kbCats2);
  console.log('    categories:', kbCats2.data.data);

  // 14. KB Delete
  if (kbId) {
    console.log('\n=== 14. KB Delete ===');
    const kbDelete = await authReq('DELETE', '/api/tickets/kb/delete/' + kbId, null, token);
    check('KB Delete', kbDelete);
  }

  // 15. Batch Take (if tickets exist)
  console.log('\n=== 15. Batch Take ===');
  const batchTakeRes = await authReq('POST', '/api/tickets/batch-take', { ticket_ids: ['non-existent-id'] }, token);
  // Batch take with non-existent IDs should still return code 0 (no tickets to take)
  console.log('    Batch Take:', batchTakeRes.data?.code, batchTakeRes.data?.message);

  // 16. Batch Close
  console.log('\n=== 16. Batch Close ===');
  const batchCloseRes = await authReq('POST', '/api/tickets/batch-close', { ticket_ids: ['non-existent-id'] }, token);
  console.log('    Batch Close:', batchCloseRes.data?.code, batchCloseRes.data?.message);

  // 17. Reply with internal note
  console.log('\n=== 17. Reply Internal ===');
  const internalReplyRes = await authReq('POST', '/api/tickets/reply/non-existent-id', { content: 'Internal note', reply_type: 'internal' }, token);
  console.log('    Internal Reply:', internalReplyRes.data?.code, internalReplyRes.data?.message);

  // Summary
  console.log('\n========================================');
  console.log(`  TOTAL: ${passed + failed}, PASS: ${passed}, FAIL: ${failed}`);
  console.log('========================================');
}

verify().catch(e => console.error('FATAL:', e.message));
