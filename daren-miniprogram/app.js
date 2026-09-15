const mock = require('./utils/mock.js')

App({
  globalData: {
    // 当前达人 ID，转发与小程序码的归因依据
    sid: 8823,
    scene: '',
    userInfo: null,
    // 从分享链接进入时暂存的商品/素材来源
    fromAssetId: ''
  },

  onLaunch(options) {
    this.globalData.userInfo = Object.assign({}, mock.user)

    // 小程序码进入：options.query.scene 形如 "sid_8823"
    // 分享进入：options.query.sid 直接就是达人 ID
    const q = (options && options.query) || {}
    if (q.scene) {
      const raw = decodeURIComponent(q.scene)
      const sid = raw.indexOf('_') > -1 ? raw.split('_')[1] : raw
      this.globalData.scene = sid
      this.bindDistributor(sid)
    } else if (q.sid) {
      this.bindDistributor(q.sid)
    }
  },

  /**
   * 绑定分销关系。
   * 前端只做上报，最终归属必须由服务端裁决（先绑定优先 / 30 天锁客）。
   */
  bindDistributor(sid) {
    if (!sid || Number(sid) === this.globalData.sid) return
    wx.request({
      url: 'https://example.com/api/distributor/bind',
      method: 'POST',
      data: { sid: sid, scene: this.globalData.scene },
      fail: () => {
        // 演示工程无真实后端，失败静默即可
      }
    })
  },

  /** 统一的转发参数：所有页面共享，保证不漏带 sid */
  buildSharePath(basePath, extra) {
    const parts = ['sid=' + this.globalData.sid]
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        parts.push(k + '=' + encodeURIComponent(extra[k]))
      })
    }
    return basePath + '?' + parts.join('&')
  }
})
