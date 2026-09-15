const app = getApp();
const { ticketApi } = require('../../../utils/api');

Page({
  data: {
    userId: '',
    currentStatus: '',
    keyword: '',
    tickets: [],
    page: 1,
    hasMore: true,
    loading: true,
    statusCount: { total: 0, pending: 0, processing: 0, resolved: 0, closed: 0 },
    statusMap: {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭'
    }
  },

  onLoad(options) {
    this.setData({
      userId: app.globalData.userInfo?.id || '',
      currentStatus: options.status || ''
    });
  },

  onShow() {
    if (!app.checkLogin()) return;
    const role = app.globalData.userInfo?.role;
    if (role !== 'admin' && role !== 'staff') {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ page: 1, tickets: [] });
    this.loadTickets();
    this.loadCounts();
  },

  async loadTickets() {
    this.setData({ loading: true });
    try {
      const res = await ticketApi.getList({
        page: this.data.page,
        pageSize: 20,
        status: this.data.currentStatus || undefined,
        keyword: this.data.keyword || undefined
      });

      if (res.code === 0) {
        const tickets = this.data.page === 1 ? res.data.list : [...this.data.tickets, ...res.data.list];
        this.setData({
          tickets,
          hasMore: tickets.length < res.data.total
        });
      }
    } catch (err) {
      console.error('加载失败:', err);
    }
    this.setData({ loading: false });
  },

  async loadCounts() {
    try {
      const [all, pending, processing, resolved, closed] = await Promise.allSettled([
        ticketApi.getList({ pageSize: 1 }),
        ticketApi.getList({ status: 'pending', pageSize: 1 }),
        ticketApi.getList({ status: 'processing', pageSize: 1 }),
        ticketApi.getList({ status: 'resolved', pageSize: 1 }),
        ticketApi.getList({ status: 'closed', pageSize: 1 })
      ]);

      const getTotal = (r) => r.status === 'fulfilled' && r.value.code === 0 ? r.value.data.total : 0;
      this.setData({
        statusCount: {
          total: getTotal(all),
          pending: getTotal(pending),
          processing: getTotal(processing),
          resolved: getTotal(resolved),
          closed: getTotal(closed)
        }
      });
    } catch (err) { /* ignore */ }
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status, page: 1, tickets: [] });
    this.loadTickets();
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.setData({ page: 1, tickets: [] });
      this.loadTickets();
    }, 500);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ticket-detail/ticket-detail?id=${id}` });
  },

  // 快速接单
  async quickClaim(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await ticketApi.claim(id);
      if (res.code === 0) {
        wx.showToast({ title: '接单成功', icon: 'success' });
        this.loadTickets();
        this.loadCounts();
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadTickets();
    }
  }
});
