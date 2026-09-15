const app = getApp();
const { userApi, ticketApi } = require('../../utils/api');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    showRegister: false,
    username: '',
    password: '',
    regUsername: '',
    regRealName: '',
    regPhone: '',
    regPassword: '',
    loading: false,
    statCards: [
      { key: 'pending', label: '待处理', count: 0, color: '#f59e0b' },
      { key: 'processing', label: '处理中', count: 0, color: '#00d4ff' },
      { key: 'resolved', label: '已解决', count: 0, color: '#10b981' },
      { key: 'closed', label: '已关闭', count: 0, color: '#5a6a7a' }
    ],
    trendData: [],
    trendTotal: 0,
    unreadCount: 0
  },

  onShow() {
    const userInfo = app.globalData.userInfo;
    const isLoggedIn = app.globalData.isLoggedIn;
    this.setData({ isLoggedIn, userInfo });
    
    if (isLoggedIn) {
      this.loadDashboardData();
    }
  },

  // 加载首页数据
  async loadDashboardData() {
    try {
      const [statsRes, notiRes] = await Promise.allSettled([
        ticketApi.getStats(),
        ticketApi.getNotifications({ pageSize: 1 })
      ]);
      
      if (statsRes.status === 'fulfilled' && statsRes.value.code === 0) {
        const data = statsRes.value.data;
        const statCards = this.data.statCards.map(card => ({
          ...card,
          count: data[card.key] || 0
        }));
        
        // 处理趋势数据
        const trendData = this.buildTrendData(data.trend || []);
        const trendTotal = trendData.reduce((sum, item) => sum + item.count, 0);
        
        this.setData({ statCards, trendData, trendTotal });
      }
      
      if (notiRes.status === 'fulfilled' && notiRes.value.code === 0) {
        this.setData({ unreadCount: notiRes.value.data.unreadCount });
      }
    } catch (err) {
      console.error('加载首页数据失败:', err);
    }
  },

  buildTrendData(trend) {
    // 补全最近7天数据
    const result = [];
    const trendMap = {};
    trend.forEach(item => { trendMap[item.date] = item.cnt; });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const fullDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const cnt = trendMap[fullDate] || 0;
      const maxCnt = Math.max(...Object.values(trendMap), 1);
      result.push({
        date: fullDate,
        label: dateStr,
        count: cnt,
        height: Math.max(cnt / maxCnt * 150, 6)
      });
    }
    return result;
  },

  // 输入框事件
  onUsernameInput(e) { this.setData({ username: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  onRegUsernameInput(e) { this.setData({ regUsername: e.detail.value }); },
  onRegRealNameInput(e) { this.setData({ regRealName: e.detail.value }); },
  onRegPhoneInput(e) { this.setData({ regPhone: e.detail.value }); },
  onRegPasswordInput(e) { this.setData({ regPassword: e.detail.value }); },

  // 登录
  async handleLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await userApi.login(username, password);
      if (res.code === 0) {
        app.setLoginData(res.data.token, res.data.userInfo);
        this.setData({
          isLoggedIn: true,
          userInfo: res.data.userInfo,
          username: '',
          password: ''
        });
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.loadDashboardData();
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },

  // 注册
  async handleRegister() {
    const { regUsername, regPassword, regRealName, regPhone } = this.data;
    if (!regUsername || !regPassword) {
      wx.showToast({ title: '用户名和密码不能为空', icon: 'none' });
      return;
    }
    if (regPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await userApi.register({
        username: regUsername,
        password: regPassword,
        realName: regRealName,
        phone: regPhone
      });
      if (res.code === 0) {
        wx.showToast({ title: '注册成功，请登录', icon: 'success' });
        this.setData({ showRegister: false, regUsername: '', regPassword: '', regRealName: '', regPhone: '' });
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '注册失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },

  switchToRegister() { this.setData({ showRegister: true }); },
  switchToLogin() { this.setData({ showRegister: false }); },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({ isLoggedIn: false, userInfo: null });
        }
      }
    });
  },

  // 导航
  goSubmit() {
    if (!app.checkLogin()) return;
    wx.switchTab({ url: '/pages/submit/submit' });
  },
  goMyTickets() {
    if (!app.checkLogin()) return;
    wx.switchTab({ url: '/pages/my-tickets/my-tickets' });
  },
  goAdminDashboard() {
    if (!app.checkLogin()) return;
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' });
  },
  goFilteredList(e) {
    if (!app.checkLogin()) return;
    const status = e.currentTarget.dataset.status;
    wx.navigateTo({ url: `/pages/my-tickets/my-tickets?status=${status}` });
  },
  goNotifications() {
    if (!app.checkLogin()) return;
    wx.showToast({ title: '通知功能', icon: 'none' });
  }
});
