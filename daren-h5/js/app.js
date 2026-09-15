/**
 * 达人中心 H5 · 公共交互层
 * ---------------------------------------------------------------
 * 这一层解决「H5 相比小程序少了什么、怎么补」的问题：
 *  1. 导航栏 / tabBar 需要自绘（小程序是原生的）
 *  2. 剪贴板在微信内置浏览器里 navigator.clipboard 常不可用，必须降级
 *  3. H5 不能直接调起微信分享，只能做「右上角引导」
 *  4. 分享出去的每一条链路都要带上 sid，否则归因断掉
 */
(function (global) {
  'use strict'

  var UA = navigator.userAgent || ''
  var IS_WX = /MicroMessenger/i.test(UA)
  var IS_IOS = /iPhone|iPad|iPod|Macintosh/i.test(UA)
  var SID_KEY = 'daren_sid'
  var DEFAULT_SID = '8823'
  var SID = DEFAULT_SID

  /* ================= DOM ================= */
  function $(sel, root) { return (root || document).querySelector(sel) }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }

  /* ================= 归因：落地即记住 sid ================= */
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search)
    return m ? decodeURIComponent(m[1]) : ''
  }

  function bootSid() {
    var sid = param('sid')
    if (sid) {
      SID = sid
      try { localStorage.setItem(SID_KEY, sid) } catch (e) {}
    } else {
      try { SID = localStorage.getItem(SID_KEY) || DEFAULT_SID } catch (e) {}
    }
    return SID
  }

  /** 当前页面的 URL（去掉 query / hash），用于拼推广链接 */
  function baseUrl() {
    return location.href.split('?')[0].split('#')[0]
  }

  /** 带归因的推广链接：所有对外的链接都必须经过这里 */
  function link(path, extra) {
    var base = baseUrl().replace(/[^/]*$/, '') + (path || '')
    var qs = ['sid=' + SID]
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) qs.push(k + '=' + encodeURIComponent(extra[k]))
      }
    }
    return base + '?' + qs.join('&')
  }

  /** 站内跳转：自动带上当前 query，保证 tab 间切换不丢归因 */
  function go(path) {
    location.href = path + (location.search || '')
  }

  /* ================= Toast ================= */
  var toastTimer = null
  function toast(msg, type, duration) {
    var el = $('#toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'toast'
      el.className = 'toast'
      el.innerHTML = '<i class="ic icw-check toast-ic"></i><span class="toast-t"></span>'
      document.body.appendChild(el)
    }
    $('.toast-t', el).textContent = msg
    el.className = 'toast show' + (type === 'ok' ? ' ok' : '')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { el.className = type === 'ok' ? 'toast ok' : 'toast' }, duration || 1700)
  }
  function ok(msg) { toast(msg, 'ok', 1400) }

  /* ================= 剪贴板（含微信兜底） ================= */
  function copy(text, tip) {
    function done() { ok(tip || '已复制') }
    function fallback() {
      var ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { ta.setSelectionRange(0, ta.value.length) } catch (e) {}
      var success = false
      try { success = document.execCommand('copy') } catch (e) {}
      document.body.removeChild(ta)
      success ? done() : toast('复制失败，请长按文字手动复制')
    }
    if (navigator.clipboard && location.protocol === 'https:') {
      navigator.clipboard.writeText(text).then(done).catch(fallback)
    } else {
      fallback()
    }
  }

  /* ================= 顶部导航栏（替代小程序原生导航） ================= */
  function nav(opt) {
    opt = opt || {}
    var host = $('#nav')
    if (!host) return
    var brand = opt.theme === 'brand'
    host.className = 'h5-nav' + (brand ? ' brand' : '')

    var left = opt.back
      ? '<a class="nav-l" href="javascript:;" data-act="back"><i class="ic ic' + (brand ? 'w' : 'g') + '-cl" style="width:11px;height:11px"></i></a>'
      : '<span class="nav-l"></span>'

    var right = ''
    if (opt.right === 'bell') {
      right = '<span data-act="bell" style="display:flex;position:relative">' +
        '<i class="ic ic' + (brand ? 'w' : 'g') + '-bell" style="width:20px;height:20px"></i><u class="dot"></u></span>'
    } else if (opt.right === 'share') {
      right = '<i class="ic ic' + (brand ? 'w' : 'g') + '-share" data-act="share" style="width:20px;height:20px"></i>'
    } else if (opt.right === 'link') {
      right = '<i class="ic ic' + (brand ? 'w' : 'g') + '-link" data-act="link" style="width:20px;height:20px"></i>'
    } else if (opt.right) {
      right = '<span class="nav-sub">' + opt.right + '</span>'
    }

    host.innerHTML = left + '<div class="nav-t">' + (opt.title || '达人中心') + '</div>' + '<div class="nav-r">' + right + '</div>'
    document.title = opt.title || '达人中心'

    host.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null
      if (!t) return
      var act = t.getAttribute('data-act')
      if (act === 'back') back()
      if (act === 'bell') openSheet('notice')
      if (act === 'share') shareGuide()
      if (act === 'link') copy(link('index.html'), '推广链接已复制')
    })

    // 沉浸式页面：滚动后给导航栏补上实底，避免内容穿透
    if (brand && opt.immersive !== false) {
      var onScroll = function () { host.classList.toggle('solid', window.scrollY > 6) }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
    }
  }

  function back() {
    if (history.length > 1) history.back()
    else location.replace('index.html' + (location.search || ''))
  }

  /* ================= 底部 tabBar（替代小程序原生 tabBar） ================= */
  var TABS = [
    { key: 'index', label: '工作台', icon: 'home', url: 'index.html' },
    { key: 'content', label: '内容中心', icon: 'grid', url: 'content.html' },
    { key: 'qr', label: '推广', icon: 'qr', url: 'qr.html' },
    { key: 'wallet', label: '收益', icon: 'wallet', url: 'wallet.html' },
    { key: 'mine', label: '我的', icon: 'user', url: 'mine.html' }
  ]

  function tab(active) {
    var host = $('#tab')
    if (!host) return
    host.className = 'h5-tab'
    host.innerHTML = TABS.map(function (t) {
      var on = t.key === active
      return '<a class="tab-i' + (on ? ' on' : '') + '" href="' + t.url + (location.search || '') + '">' +
        '<i class="ic ic' + (on ? '' : 'g') + '-' + t.icon + '" style="width:22px;height:22px"></i>' +
        '<b>' + t.label + '</b></a>'
    }).join('')
  }

  /* ================= 抽屉 / 遮罩 ================= */
  function setSheet(key, on) {
    var s = $('#sheet-' + key)
    var m = $('#mask-' + key)
    if (s) s.classList.toggle('show', on)
    if (m) m.classList.toggle('show', on)
    document.body.classList.toggle('lock', on)
    if (on && s) {
      var hide = $('#mask-' + key)
      if (hide && !hide.dataset.bound) {
        hide.dataset.bound = '1'
        hide.addEventListener('click', function () { setSheet(key, false) })
      }
    }
  }
  function openSheet(key) { setSheet(key, true) }
  function closeSheet(key) { setSheet(key, false) }

  /* ================= 微信分享引导 ================= */
  /**
   * H5 页面无法用 JS 直接调起「发送给朋友 / 分享到朋友圈」，
   * 微信只给了右上角菜单这一条通路，所以这里做的是引导，而不是假装能分享。
   * 若接入了 JS-SDK，可在 wx.ready 后把 guide 换成自定义分享卡片。
   */
  function shareGuide(mode, onFallback) {
    var el = $('#guide')
    var txt = mode === 'timeline' ? '点击右上角「···」<br>选择 <b>分享到朋友圈</b>' : '点击右上角「···」<br>选择 <b>发送给朋友</b>'
    if (!IS_WX) {
      txt = '当前不在微信内<br>可 <b>复制链接</b> 后粘贴给好友'
    }
    if (!el) {
      el = document.createElement('div')
      el.id = 'guide'
      el.className = 'guide'
      el.innerHTML =
        '<div class="guide-arrow"></div>' +
        '<div class="guide-txt"></div>' +
        '<div class="guide-body"><p></p></div>' +
        '<div class="guide-close">点击任意处关闭</div>'
      document.body.appendChild(el)
      el.addEventListener('click', function () { el.classList.remove('show') })
    }
    $('.guide-txt', el).innerHTML = txt
    $('.guide-body p', el).innerHTML = IS_WX
      ? '想带上你的专属播链接？可先点「复制推广文案」，粘贴时链接会自动带上你的号。'
      : '已为你准备好带归因参数的推广链接，复制后分享即可正常计佣。'
    el.classList.add('show')
    if (onFallback) onFallback()
  }

  /* ================= 模板 ================= */
  function tpl(str, data) {
    return str.replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return data[k] === undefined || data[k] === null ? '' : data[k]
    })
  }

  /* ================= 格式化 ================= */
  function money(n) {
    var v = Number(n) || 0
    return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  function initial(name) { return name ? String(name).charAt(0) : '达' }

  /* ================= 通用渲染片段 ================= */
  /** 图标底色块 + 文案 + 右箭头 的通用列表项 */
  function cell(item) {
    var badge = item.badge
      ? '<span class="badge badge-' + (item.badgeType || 'gray') + '">' + item.badge + '</span>'
      : ''
    var arrow = item.arrow === false ? '' : '<i class="ic icg-cr" style="width:9px;height:9px"></i>'
    return '<div class="cell line" data-key="' + item.key + '">' +
      '<div class="ci ' + (item.tone ? 'tone-' + item.tone : 'tone-violet') + '">' +
      '<i class="ic icw-' + item.icon + '" style="width:19px;height:19px"></i></div>' +
      '<div class="ct"><div class="ct-t">' + item.title + '</div>' +
      (item.sub ? '<div class="ct-s el">' + item.sub + '</div>' : '') + '</div>' +
      '<div class="cr gap6">' + badge + arrow + '</div></div>'
  }

  /** 给列表容器绑定点击：有 url 就跳，有 copy 就复制，其余走 toast */
  function bindList(root, items, extra) {
    if (!root) return
    root.querySelectorAll('[data-key]').forEach(function (el) {
      el.addEventListener('click', function () {
        var item = items.filter(function (i) { return i.key === el.getAttribute('data-key') })[0]
        if (!item) return
        if (extra && extra.onItem && extra.onItem(item) === true) return
        if (item.url) return go(item.url)
        if (item.copy === 'link') return copy(link('index.html'), '推广链接已复制')
        if (item.guide) return shareGuide(item.guide === 'invite' ? 'timeline' : 'friend')
        toast(item.toast || '功能建设中')
      })
    })
  }

  /* ================= 商品图 / 二维码占位 ================= */
  /** CSS 绘制的二维码图案（演示用，接真实接口后换 <img src="小程序码">） */
  function qrArt() {
    return '<div class="qr-art">' +
      '<i class="qr-mark qr-tl"></i><i class="qr-mark qr-tr"></i><i class="qr-mark qr-bl"></i>' +
      '<div class="qr-logo"><i class="ic icw-qr" style="width:24px;height:24px"></i></div>' +
      '</div>'
  }

  global.APP = {
    IS_WX: IS_WX,
    IS_IOS: IS_IOS,
    $: $, $$: $$,
    sid: bootSid,
    currentSid: function () { return SID },
    param: param,
    link: link,
    go: go,
    toast: toast,
    ok: ok,
    copy: copy,
    nav: nav,
    back: back,
    tab: tab,
    openSheet: openSheet,
    closeSheet: closeSheet,
    shareGuide: shareGuide,
    tpl: tpl,
    money: money,
    initial: initial,
    cell: cell,
    bindList: bindList,
    qrArt: qrArt,
    data: global.DATA
  }

  bootSid()
  document.addEventListener('DOMContentLoaded', function () { bootSid() })
})(window)
