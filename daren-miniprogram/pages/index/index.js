const mock = require('../../utils/mock.js')
const util = require('../../utils/util.js')

const app = getApp()

Page({
  data: {
    user: mock.user,
    overview: mock.overview,
    notices: mock.notices,
    quickEntries: mock.quickEntries,
    dailyTasks: mock.dailyTasks,
    hotAssets: mock.assets,
    noticeOpen: false
  },

  /* ---------- 快捷入口 ---------- */
  onEntry(e) {
    const item = e.currentTarget.dataset.item
    if (item.url) {
      if (item.tab) {
        wx.switchTab({ url: item.url })
      } else {
        wx.navigateTo({ url: item.url })
      }
      return
    }
    // 尚未建设的功能：给出明确的下一步，而不是无反馈
    if (item.key === 'shortlink') {
      util.copy('https://edu.cn/d/' + app.globalData.sid, '推广短链已复制')
      return
    }
    util.toast(item.tip || '该功能建设中')
  },

  goWallet() {
    wx.switchTab({ url: '/pages/wallet/wallet' })
  },

  goContent() {
    wx.switchTab({ url: '/pages/content/content' })
  },

  goQr() {
    wx.switchTab({ url: '/pages/qr/qr' })
  },

  goAsset(e) {
    wx.navigateTo({ url: '/pages/asset/asset?id=' + e.currentTarget.dataset.id })
  },

  /* ---------- 消息抽屉 ---------- */
  openNotice() {
    this.setData({ noticeOpen: true })
  },

  closeNotice() {
    this.setData({ noticeOpen: false })
  },

  /* ---------- 下拉刷新（占位，接后端后替换为 wx.request） ---------- */
  onPullDownRefresh() {
    setTimeout(() => {
      wx.stopPullDownRefresh()
      util.toast('已是最新数据')
    }, 600)
  },

  onShareAppMessage() {
    return {
      title: '和我一起做教育分销，佣金最高 28%',
      path: app.buildSharePath('/pages/index/index')
    }
  },

  onShareTimeline() {
    return {
      title: '和我一起做教育分销，佣金最高 28%',
      query: 'sid=' + app.globalData.sid
    }
  }
})
