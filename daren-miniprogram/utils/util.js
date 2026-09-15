/** 轻提示 */
function toast(title) {
  wx.showToast({ title: title, icon: 'none', duration: 1600 })
}

/** 成功态提示 */
function ok(title) {
  wx.showToast({ title: title, icon: 'success', duration: 1400 })
}

/** 复制到剪贴板 */
function copy(text, tip) {
  wx.setClipboardData({
    data: text,
    success: function () {
      wx.showToast({ title: tip || '已复制', icon: 'success' })
    }
  })
}

/** 千分位金额，保留两位小数 */
function money(n) {
  const v = Number(n) || 0
  return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 昵称首字，用于生成占位头像 */
function initial(name) {
  return name ? String(name).charAt(0) : '达'
}

/** 长按保存图片（海报 / 小程序码） */
function saveImage(filePath, tip) {
  wx.saveImageToPhotosAlbum({
    filePath: filePath,
    success: function () {
      wx.showToast({ title: tip || '已保存到相册', icon: 'success' })
    },
    fail: function (err) {
      if (err && String(err.errMsg).indexOf('auth deny') > -1) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许保存图片到相册',
          confirmText: '去设置',
          success: function (res) {
            if (res.confirm) wx.openSetting()
          }
        })
      }
    }
  })
}

module.exports = { toast: toast, ok: ok, copy: copy, money: money, initial: initial, saveImage: saveImage }
