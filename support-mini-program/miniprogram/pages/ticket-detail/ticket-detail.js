const app = getApp();
const { ticketApi } = require('../../utils/api');

Page({
  data: {
    ticketId: '',
    ticket: null,
    userId: '',
    userRole: '',
    replyContent: '',
    solution: '',
    currentRating: 0,
    feedbackComment: '',
    statusMap: {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭'
    }
  },

  onLoad(options) {
    this.setData({
      ticketId: options.id,
      userId: app.globalData.userInfo?.id || '',
      userRole: app.globalData.userInfo?.role || 'user'
    });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const res = await ticketApi.getDetail(this.data.ticketId);
      if (res.code === 0) {
        this.setData({ ticket: res.data });
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onReplyInput(e) { this.setData({ replyContent: e.detail.value }); },
  onSolutionInput(e) { this.setData({ solution: e.detail.value }); },
  onFeedbackInput(e) { this.setData({ feedbackComment: e.detail.value }); },

  // 发送回复
  async handleReply() {
    const content = this.data.replyContent.trim();
    if (!content) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' });
      return;
    }

    try {
      const res = await ticketApi.reply(this.data.ticketId, content);
      if (res.code === 0) {
        wx.showToast({ title: '回复成功', icon: 'success' });
        this.setData({ replyContent: '' });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 处理员接单
  async handleClaim() {
    wx.showModal({
      title: '确认接单',
      content: '确定接单处理此工单吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await ticketApi.claim(this.data.ticketId);
          if (res.code === 0) {
            wx.showToast({ title: '接单成功', icon: 'success' });
            this.loadDetail();
          } else {
            wx.showToast({ title: res.message, icon: 'none' });
          }
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    });
  },

  // 标记已解决
  async handleResolve() {
    const solution = this.data.solution.trim();
    if (!solution) {
      wx.showToast({ title: '请填写处理方案', icon: 'none' });
      return;
    }

    try {
      const res = await ticketApi.resolve(this.data.ticketId, solution);
      if (res.code === 0) {
        wx.showToast({ title: '处理完成', icon: 'success' });
        this.setData({ solution: '' });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 评价
  setRating(e) {
    this.setData({ currentRating: parseInt(e.currentTarget.dataset.rating) });
  },

  async handleRate() {
    if (this.data.currentRating === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    try {
      const res = await ticketApi.rate(this.data.ticketId, this.data.currentRating, this.data.feedbackComment);
      if (res.code === 0) {
        wx.showToast({ title: '评价成功', icon: 'success' });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '评价失败', icon: 'none' });
    }
  },

  // 关闭工单
  async handleClose() {
    wx.showModal({
      title: '确认关闭',
      content: '关闭后此工单将归档，确定吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await ticketApi.close(this.data.ticketId);
          if (res.code === 0) {
            wx.showToast({ title: '已关闭', icon: 'success' });
            this.loadDetail();
          } else {
            wx.showToast({ title: res.message, icon: 'none' });
          }
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    });
  }
});
