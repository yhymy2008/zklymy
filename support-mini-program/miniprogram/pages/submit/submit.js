const app = getApp();
const { ticketApi } = require('../../utils/api');

Page({
  data: {
    categories: [
      { name: '系统故障', icon: '⚠️' },
      { name: '功能建议', icon: '💡' },
      { name: '使用咨询', icon: '💬' },
      { name: '账号问题', icon: '👤' },
      { name: '性能问题', icon: '📊' },
      { name: '其他', icon: '📌' }
    ],
    selectedCategory: '系统故障',
    selectedPriority: 'normal',
    title: '',
    description: '',
    submitting: false
  },

  onShow() {
    if (!app.checkLogin()) return;
  },

  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.cat });
  },

  selectPriority(e) {
    this.setData({ selectedPriority: e.currentTarget.dataset.pri });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  async handleSubmit() {
    const { title, description, selectedCategory, selectedPriority } = this.data;

    if (!title.trim()) {
      wx.showToast({ title: '请输入问题标题', icon: 'none' });
      return;
    }

    if (!description.trim()) {
      wx.showToast({ title: '请输入问题描述', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const res = await ticketApi.create({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        priority: selectedPriority
      });

      if (res.code === 0) {
        wx.showModal({
          title: '提交成功',
          content: `工单编号: ${res.data.ticketNo}\n请耐心等待处理人员响应。`,
          showCancel: false,
          success: () => {
            this.setData({
              title: '',
              description: '',
              selectedCategory: '系统故障',
              selectedPriority: 'normal'
            });
            wx.switchTab({ url: '/pages/my-tickets/my-tickets' });
          }
        });
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }

    this.setData({ submitting: false });
  }
});
