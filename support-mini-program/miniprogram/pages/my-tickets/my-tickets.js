const app = getApp();
const { ticketApi } = require('../../utils/api');

Page({
  data: {
    currentStatus: '',
    keyword: '',
    tickets: [],
    page: 1,
    hasMore: true,
    loading: true,
    statusMap: {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭'
    }
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentStatus: options.status });
    }
  },

  onShow() {
    if (!app.checkLogin()) return;
    this.setData({ page: 1, tickets: [], hasMore: true });
    this.loadTickets();
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
        const newTickets = this.data.page === 1 ? res.data.list : [...this.data.tickets, ...res.data.list];
        this.setData({
          tickets: newTickets,
          hasMore: newTickets.length < res.data.total
        });
      }
    } catch (err) {
      console.error('加载工单失败:', err);
    }
    this.setData({ loading: false });
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

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadTickets();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, tickets: [] });
    this.loadTickets().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ticket-detail/ticket-detail?id=${id}` });
  },

  goSubmit() {
    wx.switchTab({ url: '/pages/submit/submit' });
  }
});
