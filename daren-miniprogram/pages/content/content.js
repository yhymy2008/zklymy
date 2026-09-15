const mock = require('../../utils/mock.js')
const util = require('../../utils/util.js')

const app = getApp()

// 三种转发寄语风格，靠近达人的真实发圈习惯
const DRAFTS = [
  '孩子写作业拖拉？其实问题不在「不认真」，而在任务拆解和时间感知。分享 3 个亲测有效的方法，需要的家长可以看看。',
  '刚整理完这份资料，把最难的一科前置 + 15 分钟小块计时，一周就能看到变化。有需要的自取。',
  '开学季免费领：5 本书单 + 配套方法。名额有限，先到先得，直接长按识别领取即可。'
]

Page({
  data: {
    categories: mock.categories,
    category: '全部',
    featured: mock.featured,
    assets: mock.assets,
    shareOpen: false,
    currentId: '',
    currentTitle: '',
    drafts: DRAFTS,
    draftIndex: 0,
    draft: DRAFTS[0]
  },

  /* ---------- 筛选 ---------- */
  onCategory(e) {
    const c = e.currentTarget.dataset.c
    this.setData({
      category: c,
      assets: c === '全部' ? mock.assets : mock.assets
    })
  },

  onSearch() {
    util.toast('素材搜索建设中，即将上线')
  },

  /* ---------- 跳转 ---------- */
  goAsset(e) {
    wx.navigateTo({ url: '/pages/asset/asset?id=' + e.currentTarget.dataset.id })
  },

  toPoster(e) {
    wx.navigateTo({ url: '/pages/poster/poster?id=' + e.currentTarget.dataset.id })
  },

  /* ---------- 转发抽屉 ---------- */
  openShare(e) {
    const id = e.currentTarget.dataset.id
    const hit = [mock.featured].concat(mock.assets).filter(function (a) {
      return a.id === id
    })[0]
    this.setData({
      shareOpen: true,
      currentId: id,
      currentTitle: hit ? hit.title : '',
      draftIndex: 0,
      draft: DRAFTS[0]
    })
  },

  closeShare() {
    this.setData({ shareOpen: false })
  },

  pickDraft(e) {
    const i = Number(e.currentTarget.dataset.i)
    this.setData({ draftIndex: i, draft: DRAFTS[i] })
  },

  rollDraft() {
    const next = (this.data.draftIndex + 1) % DRAFTS.length
    this.setData({ draftIndex: next, draft: DRAFTS[next] })
  },

  /**
   * 微信群：小程序无法直接拉起群选择器，
   * 正确做法是复制文案后引导用户到群聊里粘贴，而不是假装成功。
   */
  shareGroup() {
    util.copy(this.data.draft + '\n' + this.buildLink(), '文案已复制，去群里粘贴即可')
  },

  /**
   * 朋友圈：小程序 API 不能直接发朋友圈。
   * 走海报保存 + 复制文案的组合路径，是行业内的标准解法。
   */
  shareTimeline() {
    wx.showModal({
      title: '分享到朋友圈',
      content: '小程序无法直接发朋友圈。建议生成海报后保存到相册，发朋友圈时选图即可，客户长按识别就会绑定到你名下。',
      confirmText: '去生成海报',
      cancelText: '先复制文案',
      success: (res) => {
        if (res.confirm) {
          this.toPosterFromSheet()
        } else {
          util.copy(this.data.draft, '文案已复制')
        }
      }
    })
  },

  toPosterFromSheet() {
    this.setData({ shareOpen: false })
    wx.navigateTo({ url: '/pages/poster/poster?id=' + this.data.currentId })
  },

  copyTextFromSheet() {
    util.copy(this.data.draft, '文案已复制')
  },

  copyText(e) {
    util.copy(DRAFTS[0], '文案已复制')
  },

  copyLink() {
    util.copy(this.buildLink(), '推广短链已复制')
  },

  /* 素材页短链：带上 sid，好友打开即完成归因 */
  buildLink() {
    return 'https://edu.cn/s/' + (this.data.currentId || 'index') + '?sid=' + app.globalData.sid
  },

  onShareAppMessage() {
    return {
      title: this.data.currentTitle || '这份资料家长都在问，分享给你',
      path: app.buildSharePath('/pages/content/content', { aid: this.data.currentId })
    }
  },

  onShareTimeline() {
    return {
      title: this.data.currentTitle || '这份资料家长都在问',
      query: 'sid=' + app.globalData.sid
    }
  }
})
