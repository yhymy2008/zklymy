const app = getApp();
const { ticketApi } = require('../../../utils/api');

Page({
  data: {
    stats: { pending: 0, processing: 0, resolved: 0, closed: 0 },
    pendingTickets: [],
    processingTickets: []
  },

  onShow() {
    if (!app.checkLogin()) return;
    const role = app.globalData.userInfo?.role;
    if (role !== 'admin' && role !== 'staff') {
      wx.showToast({ title: '没有权限访问', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadData();
  },

  async loadData() {
    try {
      const [statsRes, pendingRes, processingRes] = await Promise.allSettled([
        ticketApi.getStats(),
        ticketApi.getList({ status: 'pending', pageSize: 5 }),
        ticketApi.getList({ status: 'processing', pageSize: 5 })
      ]);

      const updates = {};

      if (statsRes.status === 'fulfilled' && statsRes.value.code === 0) {
        updates.stats = statsRes.value.data.stats;
      }
      if (pendingRes.status === 'fulfilled' && pendingRes.value.code === 0) {
        updates.pendingTickets = pendingRes.value.data.list;
      }
      if (processingRes.status === 'fulfilled' && processingRes.value.code === 0) {
        updates.processingTickets = processingRes.value.data.list;
      }

      this.setData(updates);
    } catch (err) {
      console.error('加载管理数据失败:', err);
    }
  },

  goManage(e) {
    const status = e.currentTarget.dataset.status;
    wx.navigateTo({ url: `/pages/admin/ticket-manage/ticket-manage?status=${status || ''}` });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ticket-detail/ticket-detail?id=${id}` });
  }
});
