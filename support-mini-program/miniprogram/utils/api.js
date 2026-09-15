// API请求封装
const app = getApp();

const BASE_URL = 'http://localhost:3000';

// 请求封装
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || '';
    
    wx.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.showToast({ title: '登录已过期', icon: 'none' });
          app.logout();
          reject(res.data);
          return;
        }
        resolve(res.data);
      },
      fail(err) {
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

// 用户相关
const userApi = {
  login(username, password) {
    return request('/api/users/login', {
      method: 'POST',
      data: { username, password }
    });
  },
  
  register(data) {
    return request('/api/users/register', {
      method: 'POST',
      data
    });
  },
  
  getStaffList() {
    return request('/api/users/staff-list');
  }
};

// 工单相关
const ticketApi = {
  create(data) {
    return request('/api/tickets/create', {
      method: 'POST',
      data
    });
  },
  
  getList(params = {}) {
    const query = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    return request(`/api/tickets/list?${query}`);
  },
  
  getDetail(id) {
    return request(`/api/tickets/detail/${id}`);
  },
  
  claim(id) {
    return request(`/api/tickets/claim/${id}`, { method: 'POST' });
  },
  
  reply(id, content) {
    return request(`/api/tickets/reply/${id}`, {
      method: 'POST',
      data: { content }
    });
  },
  
  resolve(id, solution) {
    return request(`/api/tickets/resolve/${id}`, {
      method: 'POST',
      data: { solution }
    });
  },
  
  rate(id, rating, feedback) {
    return request(`/api/tickets/rate/${id}`, {
      method: 'POST',
      data: { rating, feedback }
    });
  },
  
  close(id) {
    return request(`/api/tickets/close/${id}`, { method: 'POST' });
  },
  
  getStats() {
    return request('/api/tickets/stats');
  },
  
  getNotifications(params = {}) {
    const query = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    return request(`/api/tickets/notifications?${query}`);
  },
  
  readNotification(id) {
    return request(`/api/tickets/notifications/read/${id}`, { method: 'POST' });
  },
  
  readAllNotifications() {
    return request('/api/tickets/notifications/read-all', { method: 'POST' });
  }
};

module.exports = { userApi, ticketApi };
