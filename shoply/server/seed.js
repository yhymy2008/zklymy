import { load, reset, persist } from './db.js';

reset();
const d = load();
persist();

console.log('[shoply] 已重置为演示数据：');
console.log(`  商品 ${d.products.length} 件`);
console.log(`  分类 ${d.categories.length} 个`);
console.log(`  用户 ${d.users.length} 位`);
console.log(`  支付渠道 ${d.providers.length} 个`);
console.log(`  订单 ${d.orders.length} 单`);
