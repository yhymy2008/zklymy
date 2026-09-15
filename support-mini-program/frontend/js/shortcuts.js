/**
 * 键盘快捷键模块
 * 第二轮优化：管理端高频操作快捷键
 */
(function() {
  'use strict';

  const SHORTCUTS = {
    ctrlEnter:  { key: 'Enter', ctrl: true,  desc: '快速发送回复 (回复框聚焦时)',    action: 'submitReply' },
    slash:      { key: '/',    ctrl: false, desc: '聚焦搜索框',                     action: 'focusSearch' },
    escape:     { key: 'Escape',              desc: '关闭弹窗/返回列表',             action: 'closeModal' },
    keyJ:       { key: 'j',    ctrl: false, desc: '下一个工单 (列表中)',             action: 'nextItem' },
    keyK:       { key: 'k',    ctrl: false, desc: '上一个工单 (列表中)',             action: 'prevItem' },
    keyEnter:   { key: 'Enter',               desc: '打开高亮工单详情',             action: 'openHighlighted' },
    keyT:       { key: 't',    ctrl: false, desc: '快速接单',                       action: 'quickTake' },
    keyR:       { key: 'r',    ctrl: false, desc: '快速解决',                       action: 'quickResolve' },
    keyH:       { key: '?',    ctrl: false, desc: '显示/隐藏快捷键帮助',             action: 'toggleHelp' },
    keyN:       { key: 'n',    ctrl: false, desc: '查看通知',                        action: 'goNotifications' },
  };

  let highlightedIndex = -1;
  let ticketItems = [];

  function isInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return el.isContentEditable;
  }

  function findTicketItems() {
    return document.querySelectorAll('.ticket-item, [data-ticket-id]');
  }

  function highlightItem(index) {
    ticketItems = findTicketItems();
    if (ticketItems.length === 0) return;

    ticketItems.forEach(item => item.classList.remove('highlighted'));
    if (index >= 0 && index < ticketItems.length) {
      ticketItems[index].classList.add('highlighted');
      ticketItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // 事件处理器映射
  const handlers = {
    submitReply() {
      const btn = document.querySelector('#reply-form button[type="submit"], .reply-submit-btn');
      if (btn) btn.click();
    },

    focusSearch() {
      const searchInput = document.querySelector('#search-input, .search-input, input[type="search"]');
      if (searchInput) searchInput.focus();
    },

    closeModal() {
      const overlay = document.querySelector('.modal-overlay.active, .modal-overlay.show');
      if (overlay) {
        overlay.classList.remove('active', 'show');
        return;
      }
      // Back to list
      if (window.history && window.history.length > 1) {
        window.history.back();
      }
    },

    nextItem() {
      highlightedIndex = Math.min(highlightedIndex + 1, findTicketItems().length - 1);
      highlightItem(highlightedIndex);
    },

    prevItem() {
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      highlightItem(highlightedIndex);
    },

    openHighlighted() {
      ticketItems = findTicketItems();
      if (highlightedIndex >= 0 && highlightedIndex < ticketItems.length) {
        ticketItems[highlightedIndex].click();
      }
    },

    quickTake() {
      if (highlightedIndex >= 0) {
        ticketItems = findTicketItems();
        if (highlightedIndex < ticketItems.length) {
          const takeBtn = ticketItems[highlightedIndex].querySelector('.btn-take, [data-action="take"]');
          if (takeBtn) takeBtn.click();
        }
      }
    },

    quickResolve() {
      const resolveBtn = document.querySelector('.btn-resolve, [data-action="resolve"]');
      if (resolveBtn) resolveBtn.click();
    },

    toggleHelp() {
      let modal = document.getElementById('shortcuts-modal');
      if (!modal) {
        modal = createHelpModal();
        document.body.appendChild(modal);
      }
      modal.classList.toggle('active');
      if (modal.classList.contains('active')) {
        const closeBtn = modal.querySelector('.shortcuts-close');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
      }
    },

    goNotifications() {
      const notifLink = document.querySelector('[data-page="notifications"], .nav-notifications');
      if (notifLink) notifLink.click();
    },
  };

  function createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';

    let listHtml = '';
    for (const [key, config] of Object.entries(SHORTCUTS)) {
      const keys = config.ctrl ? `<kbd>Ctrl</kbd>+<kbd>${config.key}</kbd>` : `<kbd>${config.key === 'Escape' ? 'Esc' : config.key}</kbd>`;
      listHtml += `<div class="shortcuts-list-item"><span>${keys}</span><span>${config.desc}</span></div>`;
    }

    modal.innerHTML = `
      <h3>键盘快捷键</h3>
      <div class="shortcuts-list">${listHtml}</div>
      <button class="btn btn-primary shortcuts-close">关闭</button>
    `;
    return modal;
  }

  // 全局键盘事件监听
  document.addEventListener('keydown', function(e) {
    // Ctrl+Enter: 快速发送回复
    if (e.ctrlKey && e.key === 'Enter') {
      if (isInputFocused()) {
        e.preventDefault();
        handlers.submitReply();
        return;
      }
    }

    // 输入聚焦时不处理普通键
    if (isInputFocused() && !e.ctrlKey && e.key !== 'Escape') {
      return;
    }

    // 处理各快捷键
    switch (e.key) {
      case '/':
        e.preventDefault();
        handlers.focusSearch();
        break;
      case 'Escape':
        e.preventDefault();
        handlers.closeModal();
        highlightedIndex = -1;
        highlightItem(-1);
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        handlers.nextItem();
        break;
      case 'k':
      case 'K':
        e.preventDefault();
        handlers.prevItem();
        break;
      case 'Enter':
        if (!isInputFocused()) {
          e.preventDefault();
          handlers.openHighlighted();
        }
        break;
      case 't':
      case 'T':
        if (!e.ctrlKey) {
          e.preventDefault();
          handlers.quickTake();
        }
        break;
      case 'r':
      case 'R':
        if (!e.ctrlKey) {
          e.preventDefault();
          handlers.quickResolve();
        }
        break;
      case '?':
        e.preventDefault();
        handlers.toggleHelp();
        break;
      case 'n':
      case 'N':
        if (!e.ctrlKey) {
          e.preventDefault();
          handlers.goNotifications();
        }
        break;
    }
  });

  // 添加高亮样式
  const style = document.createElement('style');
  style.textContent = `
    .ticket-item.highlighted, [data-ticket-id].highlighted {
      outline: 2px solid var(--accent) !important;
      outline-offset: -2px;
      background: var(--accent-dim) !important;
    }
  `;
  document.head.appendChild(style);

  console.log('[快捷键] 已加载，按 ? 查看所有快捷键');
})();
