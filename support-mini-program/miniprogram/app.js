App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'http://localhost:3000',
    isLoggedIn: false
  },

  onLaunch() {
    // 读取本地存储的登录信息
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
  },

  // 检查登录状态
  checkLogin() {
    if (!this.globalData.isLoggedIn || !this.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/index/index' });
        }
      });
      return false;
    }
    return true;
  },

  setLoginData(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  },

  logout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.switchTab({ url: '/pages/index/index' });
  }
});
