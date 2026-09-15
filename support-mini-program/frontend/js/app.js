/**
 * 主应用逻辑 - SPA 路由与页面渲染
 */
const App = {
  user: null,
  currentPage: '',
  unreadCount: 0,
  SESSION_TIMEOUT: 10 * 60 * 1000, // 10分钟会话超时
  sessionTimer: null,             // setTimeout 的 ID

  /* ========== 初始化 ========== */
  async init() {
    // 初始化主题
    this.initTheme();
    // 初始化骨架屏状态
    this._skeletonTimers = [];

    // 设置 API 层的会话过期回调
    API.onSessionExpired = () => this.handleSessionExpired();

    // 从 localStorage 恢复用户信息（持久化，刷新不丢失）
    const saved = localStorage.getItem('user');
    if (saved) {
      try { this.user = JSON.parse(saved); } catch (e) { this.user = null; }
    }

    // 标记初始化阶段，避免回调中弹出重复提示
    this._initializing = true;

    // 如果有缓存用户，向服务端验证 token 是否仍然有效
    if (this.user) {
      let verified = false;
      try {
        const res = await API.getProfile();
        if (res.code === 0) {
          // token 有效，更新用户信息
          this.user = res.data;
          localStorage.setItem('user', JSON.stringify(this.user));
          this.startSessionTimer();
          verified = true;
        } else if (res.code === 401) {
          // token 真正过期，清除会话
          this.clearLocalSession();
        }
        // 其他错误码（如 500）保留本地会话作为降级
      } catch (e) {
        // 网络错误：保留本地会话作为降级，方便离线或服务暂不可用时仍可使用
        console.warn('[Session] 服务端验证失败（网络错误），保留本地会话:', e.message);
        this.startSessionTimer();
        verified = true;
      }

      // 如果验证成功（或降级保留），确保用户不为 null
      if (verified && this.user) {
        // 会话已就绪
      } else if (!verified && !this.user) {
        // 会话已被清除，无需额外处理
      }
    }

    this._initializing = false;

    this.bindEvents();
    this.setupActivityTracking();
    this.bindRippleEffect();
    this.bindKeyboardShortcuts();
    this.route();
    this.loadUnreadCount();
  },

  /* ========== 主题管理 ========== */
  initTheme() {
    const saved = localStorage.getItem('theme');
    this._theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', this._theme);
    this._updateThemeToggle();
  },
  toggleTheme() {
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this._theme);
    localStorage.setItem('theme', this._theme);
    this._updateThemeToggle();
  },
  _updateThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = this._theme === 'dark' ? '☀️' : '🌙';
      btn.title = this._theme === 'dark' ? '切换亮色主题' : '切换暗色主题';
    }
    const inlineBtn = document.getElementById('theme-toggle-inline');
    if (inlineBtn) {
      inlineBtn.textContent = this._theme === 'dark' ? '☀️' : '🌙';
    }
  },

  /* ========== 波纹效果 ========== */
  bindRippleEffect() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .btn-ripple');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  },

  /* ========== 骨架屏工具 ========== */
  showSkeleton(el, type = 'card', count = 4) {
    if (type === 'card') {
      el.innerHTML = Array(count).fill(0).map(() => `
        <div class="skeleton-card stagger-item">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      `).join('');
    } else if (type === 'stats') {
      el.innerHTML = `<div class="stats-grid">
        ${Array(4).fill(0).map(() => `
          <div class="skeleton-card">
            <div class="skeleton skeleton-stat"></div>
            <div class="skeleton skeleton-stat-label"></div>
          </div>
        `).join('')}
      </div>`;
    } else if (type === 'detail') {
      el.innerHTML = `
        <div class="skeleton-card" style="margin-bottom:12px">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line medium"></div>
        </div>
        <div class="skeleton-card" style="margin-bottom:12px">
          <div class="skeleton skeleton-title" style="width:40%"></div>
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line medium"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton skeleton-title" style="width:30%"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      `;
    }
    // 清除旧的骨架屏计时器
    (this._skeletonTimers || []).forEach(t => clearTimeout(t));
    this._skeletonTimers = [];
  },

  /* ========== 全局事件 ========== */
  bindEvents() {
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-page]');
      if (nav) {
        e.preventDefault();
        this.navigate(nav.dataset.page);
        // 移动端关闭侧边栏
        this._closeSidebar();
      }
    });

    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.dataset.action === 'login')         { e.preventDefault(); this.handleLogin(); }
      if (form.dataset.action === 'register')      { e.preventDefault(); this.handleRegister(); }
      if (form.dataset.action === 'create-ticket')  { e.preventDefault(); this.handleCreateTicket(); }
      if (form.dataset.action === 'reply')          { e.preventDefault(); this.handleReply(); }
      if (form.dataset.action === 'edit-ticket')    { e.preventDefault(); this.handleEditTicket(); }
      if (form.dataset.action === 'change-password'){ e.preventDefault(); this.handleChangePassword(); }
      if (form.dataset.action === 'update-profile') { e.preventDefault(); this.handleUpdateProfile(); }
      if (form.dataset.action === 'add-category')  { e.preventDefault(); this.handleAddCategory(); }
      if (form.dataset.action === 'edit-category') { e.preventDefault(); this.handleEditCategory(); }
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
    });

    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.onclick = () => this.toggleTheme();

    // 侧边栏移动端切换
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarToggle) sidebarToggle.onclick = () => this._toggleSidebar();
    if (sidebarOverlay) sidebarOverlay.onclick = () => this._closeSidebar();
  },

  _toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  },
  _closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  },

  /* ========== 工具：防抖 ========== */
  _debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /* ========== 全局搜索 ========== */
  async _globalSearch() {
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    if (!input || !results) return;
    const keyword = input.value.trim();
    if (keyword.length < 2) { results.style.display = 'none'; return; }
    try {
      const res = await API.globalSearch(keyword, 5);
      if (res.code !== 0) return;
      const { tickets, kb } = res.data;
      if (tickets.length === 0 && kb.length === 0) {
        results.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">未找到匹配结果</div>';
      } else {
        results.innerHTML = `
          ${tickets.length ? '<div class="search-section-label">📋 工单</div>' : ''}
          ${tickets.map(t => `
            <div class="search-result-item" data-type="ticket" data-id="${t.id}">
              <span class="status-tag ${t.status}" style="font-size:10px;padding:1px 6px">${t.status}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${this.escapeHtml(t.title)}</span>
              <span style="font-size:11px;color:var(--text-muted)">${t.ticket_no}</span>
            </div>
          `).join('')}
          ${kb.length ? '<div class="search-section-label">📚 知识库</div>' : ''}
          ${kb.map(a => `
            <div class="search-result-item" data-type="kb" data-id="${a.id}">
              <span style="font-size:11px;color:var(--text-muted)">📄</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${this.escapeHtml(a.title)}</span>
            </div>
          `).join('')}
        `;
        results.querySelectorAll('.search-result-item').forEach(item => {
          item.onclick = () => {
            results.style.display = 'none';
            input.value = '';
            if (item.dataset.type === 'ticket') {
              this.navigate('ticket-detail', { id: item.dataset.id });
            } else {
              this.navigate('kb-detail', { id: item.dataset.id });
            }
          };
        });
      }
      results.style.display = 'block';
    } catch (e) { results.style.display = 'none'; }
  },

  /* ========== 键盘快捷键 ========== */
  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K -> 聚焦搜索
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.target.closest('input,textarea,select'))) {
        e.preventDefault();
        const si = document.getElementById('global-search-input');
        if (si) si.focus();
      }
      // Esc -> 关闭弹窗/搜索结果
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.modal-overlay.active');
        if (overlay) overlay.classList.remove('active');
        const sr = document.getElementById('global-search-results');
        if (sr) sr.style.display = 'none';
      }
      // Ctrl+Enter -> 提交表单
      if (e.ctrlKey && e.key === 'Enter') {
        const form = e.target.closest('form');
        if (form) { e.preventDefault(); form.dispatchEvent(new Event('submit', { bubbles: true })); }
      }
    });
  },

  async loadUnreadCount() {
    if (!this.user) return;
    try {
      const res = await API.getNotifications({ pageSize: 1 });
      if (res.code === 0) this.unreadCount = res.data.unreadCount || 0;
    } catch (e) {}
  },

  /* ========== Toast ========== */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  },

  /* ========== 路由 ========== */
  navigate(page, params = null) {
    this.currentParams = params;
    // 未登录用户强制跳转登录页
    if (!this.user && page !== 'auth') { page = 'auth'; }
    // 已登录用户访问登录页则重定向到首页
    if (this.user && page === 'auth') { page = 'home'; }
    this.currentPage = page;
    // 同步 URL hash，确保刷新后能回到当前页面
    if (window.location.hash !== '#' + page) {
      history.replaceState(null, '', '#' + page);
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    // 控制侧边栏和主题按钮显示
    const sidebar = document.getElementById('sidebar');
    const themeToggle = document.getElementById('theme-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mainContent = document.getElementById('main-content');
    const isAuth = page === 'auth';

    if (sidebar) sidebar.style.display = isAuth ? 'none' : '';
    if (themeToggle) themeToggle.style.display = isAuth ? 'none' : '';
    if (sidebarToggle) sidebarToggle.style.display = isAuth ? 'none' : '';
    if (mainContent) mainContent.style.marginLeft = isAuth ? '0' : '';

    this.renderNavbar();
    this.renderPage(page);
    window.scrollTo(0, 0);
  },

  route() {
    const hash = window.location.hash.replace('#', '');
    // 登录用户无 hash 时默认跳首页，未登录时跳登录页
    const fallback = this.user ? 'home' : 'auth';
    this.navigate(hash || fallback);
  },

  /* ========== 侧边栏导航 ========== */
  renderNavbar() {
    const el = document.getElementById('sidebar');
    if (!this.user) { el.innerHTML = ''; return; }

    const isAdmin = this.user.role === 'admin' || this.user.role === 'staff';
    const pageName = this.currentPage;
    const roleLabel = { admin: '管理员', staff: '处理员', user: '普通用户' };

    const navItems = [
      { page: 'home', icon: '🏠', label: '概览面板', show: true },
      { page: 'submit', icon: '📝', label: '提交工单', show: true },
      { page: 'my-tickets', icon: '📂', label: '我的工单', show: true },
      { page: 'knowledge-base', icon: '📚', label: '知识库', show: true },
      { page: 'admin', icon: '🛠', label: '管理面板', show: isAdmin },
      { page: 'profile', icon: '👤', label: '个人中心', show: true, badge: this.unreadCount > 0 ? this.unreadCount : 0 }
    ];

    el.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">⚙</div>
        <div class="sidebar-title">问题工单系统</div>
        <button class="theme-toggle-inline" id="theme-toggle-inline" title="切换主题">☀️</button>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-search" style="padding:0 14px 8px">
          <input class="form-input" id="global-search-input" placeholder="🔍 搜索工单/知识库... Ctrl+K" style="font-size:12px;padding:8px 10px">
          <div class="global-search-results" id="global-search-results" style="display:none"></div>
        </div>
        ${navItems.filter(n => n.show).map(n => `
          <button class="nav-item ${pageName === n.page ? 'active' : ''}" data-page="${n.page}">
            <span class="nav-icon">${n.icon}</span>
            <span>${n.label}</span>
            ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
          </button>
        `).join('')}
        <button class="nav-item logout-item" id="btn-logout">
          <span class="nav-icon">🚪</span>
          <span>退出登录</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="user-avatar">${(this.user.real_name || this.user.username || '?')[0]}</div>
        <div class="user-info">
          <div class="user-name">${this.escapeHtml(this.user.real_name || this.user.username)}</div>
          <div class="user-role">${this.user.role === 'staff' ? '处理员' : this.user.role === 'admin' ? '管理员' : '普通用户'}</div>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.onclick = () => this.logout();

    this._updateThemeToggle();
    const inlineToggle = document.getElementById('theme-toggle-inline');
    if (inlineToggle) inlineToggle.onclick = () => this.toggleTheme();

    // 全局搜索绑定
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('global-search-results');
    if (searchInput) {
      searchInput.oninput = this._debounce(() => this._globalSearch(), 300);
      searchInput.onfocus = () => { if (searchInput.value.trim().length >= 2) this._globalSearch(); };
      document.addEventListener('click', (e) => {
        if (searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.style.display = 'none';
        }
      });
    }
  },

  /* ========== 页面渲染 ========== */
  renderPage(page) {
    switch (page) {
      case 'auth': this.renderAuth(); break;
      case 'home': this.renderHome(); break;
      case 'submit': this.renderSubmit(); break;
      case 'my-tickets': this.renderMyTickets(); break;
      case 'ticket-detail': this.renderTicketDetail(); break;
      case 'admin': this.renderAdmin(); break;
      case 'profile': this.renderProfile(); break;
      case 'dashboard': this.renderDashboard(); break;
      case 'notifications': this.renderNotifications(); break;
      case 'users': this.renderUserManagement(); break;
      case 'categories': this.renderCategoryManagement(); break;
      case 'audit-logs': this.renderAuditLogs(); break;
      case 'knowledge-base': this.renderKBList(); break;
      case 'kb-detail': this.renderKBDetail(); break;
      default: this.renderHome();
    }
  },

  /* ========== 认证 ========== */
  renderAuth() {
    const el = document.getElementById('page-auth');
    el.innerHTML = `
      <div class="auth-container">
        <div class="auth-box card">
          <div class="auth-logo">⚙</div>
          <div class="auth-title">问题工单系统</div>
          <div class="auth-subtitle">专业 · 高效 · 智能运维</div>
          <form class="auth-form-login" data-action="login">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input class="form-input" name="username" placeholder="请输入用户名" required autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input class="form-input" type="password" name="password" placeholder="请输入密码" required autocomplete="current-password">
            </div>
            <div class="form-group" id="captcha-group" style="display:none">
              <label class="form-label">验证码</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input class="form-input" name="captcha-code" placeholder="请输入验证码" style="flex:1;width:auto" maxlength="4">
                <img id="captcha-img" src="" alt="验证码" style="width:120px;height:48px;border-radius:8px;cursor:pointer;border:1px solid var(--border)" title="点击刷新">
              </div>
            </div>
            <input type="hidden" name="captcha-id" id="captcha-id" value="">
            <button type="submit" class="btn btn-primary btn-block">登 录</button>
          </form>
          <form class="auth-form-register" data-action="register" style="display:none">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input class="form-input" name="reg-username" placeholder="请输入用户名" required>
            </div>
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input class="form-input" name="reg-realname" placeholder="请输入真实姓名" required>
            </div>
            <div class="form-group">
              <label class="form-label">手机号</label>
              <input class="form-input" name="reg-phone" placeholder="请输入手机号（选填）">
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input class="form-input" type="password" name="reg-password" placeholder="至少8位，含字母和数字" required minlength="8">
            </div>
            <button type="submit" class="btn btn-primary btn-block">注 册</button>
          </form>
          <div class="auth-toggle" id="auth-toggle">
            还没有账号？<a id="link-register">立即注册</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('link-register').onclick = () => this.renderAuth();
    // Switch to register view
    el.querySelector('#link-register').onclick = () => {
      el.querySelector('.auth-form-login').style.display = 'none';
      el.querySelector('.auth-form-register').style.display = 'block';
      el.querySelector('#auth-toggle').innerHTML = '已有账号？<a id="link-login">返回登录</a>';
      el.querySelector('#link-login').onclick = () => this.renderAuth();
    };

    // 加载验证码
    this._loadCaptcha();
  },

  async _loadCaptcha() {
    try {
      const res = await API.getCaptcha();
      if (res.code === 0) {
        const captchaGroup = document.getElementById('captcha-group');
        const captchaImg = document.getElementById('captcha-img');
        const captchaId = document.getElementById('captcha-id');
        if (captchaGroup) captchaGroup.style.display = 'block';
        if (captchaImg) {
          captchaImg.src = 'data:image/svg+xml;base64,' + res.data.svg;
          captchaImg.onclick = () => this._loadCaptcha();
        }
        if (captchaId) captchaId.value = res.data.captchaId;
      }
    } catch (e) { /* captcha 加载失败不阻止登录 */ }
  },

  async handleLogin() {
    const username = document.querySelector('input[name="username"]').value.trim();
    const password = document.querySelector('input[name="password"]').value.trim();
    if (!username || !password) { this.toast('请输入用户名和密码', 'error'); return; }

    const captchaId = document.getElementById('captcha-id')?.value || '';
    const captchaCode = document.querySelector('input[name="captcha-code"]')?.value?.trim() || '';

    const res = await API.login(username, password, captchaId, captchaCode);
    if (res.code === 0) {
      API.setToken(res.data.token);
      if (res.data.refreshToken) {
        API.setRefreshToken(res.data.refreshToken);
      }
      this.user = res.data.userInfo;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.startSessionTimer();
      this._startTokenRefreshTimer();
      this.toast('登录成功', 'success');
      this.loadUnreadCount();
      this.navigate('home');
    } else {
      // 登录失败刷新验证码
      this._loadCaptcha();
      this.toast(res.message || '登录失败', 'error');
    }
  },

  // 自动刷新 Token（过期前5分钟刷新）
  _refreshTimer: null,
  _startTokenRefreshTimer() {
    this._stopTokenRefreshTimer();
    // 每30分钟尝试刷新一次（access token 2小时过期）
    this._refreshTimer = setInterval(async () => {
      const rt = API.getRefreshToken();
      if (!rt) return;
      try {
        const res = await API.refreshToken(rt);
        if (res.code === 0) {
          API.setToken(res.data.token);
          if (res.data.refreshToken) API.setRefreshToken(res.data.refreshToken);
          this.user = res.data.userInfo;
          localStorage.setItem('user', JSON.stringify(this.user));
          console.log('[Auth] Token 自动刷新成功');
        }
      } catch (e) { /* 刷新失败不中断 */ }
    }, 30 * 60 * 1000);
  },
  _stopTokenRefreshTimer() {
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
  },

  async handleRegister() {
    const username = document.querySelector('input[name="reg-username"]').value.trim();
    const realName = document.querySelector('input[name="reg-realname"]').value.trim();
    const phone = document.querySelector('input[name="reg-phone"]').value.trim();
    const password = document.querySelector('input[name="reg-password"]').value.trim();
    if (!username || !realName || !password) { this.toast('请填写必填项', 'error'); return; }
    if (password.length < 8) { this.toast('密码至少8位', 'error'); return; }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { this.toast('密码需包含字母和数字', 'error'); return; }
    const res = await API.register(username, password, realName, phone);
    if (res.code === 0) {
      this.toast('注册成功，请登录', 'success');
      this.renderAuth();
    } else {
      this.toast(res.message || '注册失败', 'error');
    }
  },

  logout() {
    this.stopSessionTimer();
    this._stopTokenRefreshTimer();
    API.clearToken();
    this.user = null;
    this.unreadCount = 0;
    this.toast('已退出登录', 'info');
    this.navigate('auth');
  },

  /* ========== 会话管理 ========== */
  // 清除本地会话（不清除 cookie 等，仅清除 localStorage）
  clearLocalSession() {
    this.user = null;
    this.unreadCount = 0;
    API.clearToken();
    this.stopSessionTimer();
    this._stopTokenRefreshTimer();
  },

  // 会话过期处理：清除状态并跳转到登录页
  handleSessionExpired() {
    if (!this.user) return; // 已经过期，避免重复处理
    this.stopSessionTimer();
    this._stopTokenRefreshTimer();
    this.user = null;
    this.unreadCount = 0;
    API.clearToken();
    // 初始化阶段不弹 toast，静默跳转
    if (!this._initializing) {
      this.toast('会话已过期（10分钟无操作），请重新登录', 'warning');
    }
    this.navigate('auth');
  },

  // 启动空闲超时定时器
  startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, this.SESSION_TIMEOUT);
  },

  // 重置空闲超时定时器（用户有操作时调用）
  resetSessionTimer() {
    if (!this.user) return; // 未登录时不需重置
    this.stopSessionTimer();
    this.sessionTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, this.SESSION_TIMEOUT);
  },

  // 停止空闲超时定时器
  stopSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  },

  // 监听用户活动事件，重置空闲计时器
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => {
      document.addEventListener(evt, () => {
        this.resetSessionTimer();
      }, { passive: true });
    });
  },

  /* ========== 首页 ========== */
  async renderHome() {
    const el = document.getElementById('page-home');
    this.showSkeleton(el, 'stats', 4);

    let stats = null;
    try {
      const res = await API.getStats();
      if (res.code === 0) stats = res.data;
    } catch (e) { stats = null; }

    const isAdmin = this.user.role === 'admin' || this.user.role === 'staff';

    let extraHtml = '';

    // 评分概览
    if (stats && stats.ratingCount > 0) {
      extraHtml += `
      <div class="card card-hoverable" style="margin-bottom:24px">
        <div style="font-size:14px;color:var(--accent);margin-bottom:12px;font-weight:600">⭐ 服务质量评分</div>
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <div>
            <div style="font-size:36px;font-weight:700;color:var(--warning)">${stats.avgRating || 0}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${stats.ratingCount} 条评价</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            ${[5,4,3,2,1].map(s => {
              const d = (stats.ratingDist || []).find(r => r.rating === s);
              const cnt = d ? d.cnt : 0;
              const maxCnt = Math.max(...(stats.ratingDist || []).map(r => r.cnt), 1);
              return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:20px;color:var(--text-secondary)">${s}分</span>
                <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(cnt/maxCnt*100)}%;background:var(--warning);border-radius:4px"></div>
                </div>
                <span style="width:24px;color:var(--text-muted);text-align:right">${cnt}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    }

    // 超时告警
    if (isAdmin && stats && stats.overdueCount > 0) {
      extraHtml += `
      <div class="card card-hoverable" style="margin-bottom:24px;border-color:rgba(255,82,82,0.3)">
        <div style="font-size:14px;color:var(--danger);margin-bottom:12px;font-weight:600">⚠️ 超时告警 (${stats.overdueCount} 个工单超过48小时未处理)</div>
        <div class="ticket-list">
          ${stats.overdue.map(t => `
            <div class="ticket-item" data-ticket="${t.id}" style="border-color:rgba(255,82,82,0.2)">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:14px;font-weight:600">${this.escapeHtml(t.title)}</span>
                <span class="status-tag processing">处理中</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                ${t.ticket_no} | 处理人：${this.escapeHtml(t.handler_name || '未分配')} | 最后更新：${this.fmtTime(t.updated_at)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    el.innerHTML = `
      <div class="page-title">概览面板</div>
      ${stats ? `
      <div class="stats-grid">
        <div class="stat-card card-hoverable" data-page="admin">
          <div class="stat-icon total">📋</div>
          <div class="stat-value count-animate" data-count="${stats.total || 0}">${stats.total || 0}</div>
          <div class="stat-label">工单总数</div>
        </div>
        <div class="stat-card card-hoverable">
          <div class="stat-icon pending">⏳</div>
          <div class="stat-value count-animate" data-count="${stats.pending || 0}">${stats.pending || 0}</div>
          <div class="stat-label">待处理</div>
        </div>
        <div class="stat-card card-hoverable">
          <div class="stat-icon processing">🔄</div>
          <div class="stat-value count-animate" data-count="${stats.processing || 0}">${stats.processing || 0}</div>
          <div class="stat-label">处理中</div>
        </div>
        <div class="stat-card card-hoverable">
          <div class="stat-icon resolved">✅</div>
          <div class="stat-value count-animate" data-count="${stats.resolved || 0}">${stats.resolved || 0}</div>
          <div class="stat-label">已解决</div>
        </div>
      </div>
      ` : `<div class="empty-state">
        <div class="empty-state-illustration">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="100" height="80" rx="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
            <rect x="20" y="32" width="60" height="6" rx="3" fill="currentColor" opacity="0.3"/>
            <rect x="20" y="44" width="80" height="4" rx="2" fill="currentColor" opacity="0.2"/>
            <rect x="20" y="54" width="50" height="4" rx="2" fill="currentColor" opacity="0.2"/>
            <circle cx="100" cy="28" r="12" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
            <path d="M94 28l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
          </svg>
        </div>
        <div class="empty-state-title">暂无统计数据</div>
        <div class="empty-state-desc">工单数据将在提交后同步显示</div>
        <div class="empty-state-actions">
          <button class="btn btn-primary btn-sm" data-page="submit">📝 提交第一个工单</button>
        </div>
      </div>`}

      ${stats && stats.avgResolveTime ? `
      <div class="card card-hoverable" style="margin-bottom:24px;text-align:center">
        <span style="font-size:13px;color:var(--text-secondary)">平均解决时长：</span>
        <span style="font-size:18px;font-weight:700;color:var(--success)">${Math.round(stats.avgResolveTime)} 小时</span>
      </div>
      ` : ''}

      ${extraHtml}

      ${stats && stats.trend && stats.trend.length ? `
      <div class="card card-hoverable" style="margin-bottom:24px">
        <div style="font-size:14px;color:var(--accent);margin-bottom:16px;font-weight:600">📈 近期趋势 (7天)</div>
        <div class="chart-bar-wrap">
          ${stats.trend.map(d => `
            <div class="chart-bar-col">
              <div class="chart-bar-val">${d.cnt}</div>
              <div class="chart-bar" style="height:${Math.max(d.cnt * 16, 4)}px"></div>
              <div class="chart-bar-label">${String(d.date||'').slice(5)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${isAdmin && stats ? `
      <div class="charts-row">
        ${stats.categoryStats && stats.categoryStats.length ? `
        <div class="chart-card card-hoverable">
          <div class="chart-title">📂 分类分布</div>
          <canvas id="chart-category"></canvas>
        </div>
        ` : ''}
        ${stats.trend && stats.trend.length ? `
        <div class="chart-card card-hoverable">
          <div class="chart-title">📈 工单趋势</div>
          <canvas id="chart-trend"></canvas>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${isAdmin && stats && stats.handlerStats && stats.handlerStats.length ? `
      <div class="card card-hoverable" style="margin-bottom:24px">
        <div style="font-size:14px;color:var(--accent);margin-bottom:12px;font-weight:600">🔧 处理人工作量</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${stats.handlerStats.map(h => `
            <div style="display:flex;align-items:center;gap:12px">
              <span style="width:80px;font-size:13px;color:var(--text-secondary)">${this.escapeHtml(h.name)}</span>
              <div style="flex:1;height:20px;background:var(--border);border-radius:10px;overflow:hidden">
                <div style="height:100%;width:${Math.round(h.cnt / stats.handlerStats[0].cnt * 100)}%;background:linear-gradient(90deg,var(--accent),#0099cc);border-radius:10px"></div>
              </div>
              <span style="font-size:13px;font-weight:600;color:var(--accent);width:30px">${h.cnt}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="stats-grid" style="grid-template-columns:1fr 1fr">
        <div class="card card-hoverable" style="text-align:center;cursor:pointer" data-page="submit">
          <div style="font-size:36px;margin-bottom:8px">📝</div>
          <div style="font-weight:600">提交工单</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">描述您遇到的问题</div>
        </div>
        <div class="card card-hoverable" style="text-align:center;cursor:pointer" data-page="my-tickets">
          <div style="font-size:36px;margin-bottom:8px">📂</div>
          <div style="font-weight:600">我的工单</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">查看处理进度</div>
        </div>
        ${isAdmin ? `
        <div class="card card-hoverable" style="text-align:center;cursor:pointer" data-page="admin">
          <div style="font-size:36px;margin-bottom:8px">🛠</div>
          <div style="font-weight:600">管理面板</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">工单管理与搜索</div>
        </div>
        <div class="card card-hoverable" style="text-align:center;cursor:pointer" data-page="profile">
          <div style="font-size:36px;margin-bottom:8px">👤</div>
          <div style="font-weight:600">个人中心</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">资料管理与通知</div>
        </div>
        ` : ''}
      </div>
    `;

    el.querySelectorAll('[data-page]').forEach(card => {
      card.onclick = () => this.navigate(card.dataset.page);
    });
    // bind overdue ticket clicks
    el.querySelectorAll('[data-ticket]').forEach(item => {
      item.onclick = () => this.navigate('ticket-detail', { id: item.dataset.ticket });
    });

    // Render Chart.js charts
    this._renderHomeCharts(stats);
  },

  _renderHomeCharts(stats) {
    if (!stats || typeof Chart === 'undefined') return;

    // 分类分布饼图
    const catCanvas = document.getElementById('chart-category');
    if (catCanvas && stats.categoryStats && stats.categoryStats.length) {
      const ctx = catCanvas.getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: stats.categoryStats.map(c => c.category),
          datasets: [{
            data: stats.categoryStats.map(c => c.cnt),
            backgroundColor: [
              'rgba(0, 212, 255, 0.7)', 'rgba(68, 138, 255, 0.7)',
              'rgba(255, 171, 64, 0.7)', 'rgba(0, 230, 118, 0.7)',
              'rgba(255, 82, 82, 0.7)', 'rgba(124, 58, 237, 0.7)',
              'rgba(136, 153, 170, 0.7)'
            ],
            borderColor: 'var(--bg-card)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8899aa', padding: 12, font: { size: 11 }, usePointStyle: true }
            }
          }
        }
      });
    }

    // 趋势折线图
    const trendCanvas = document.getElementById('chart-trend');
    if (trendCanvas && stats.trend && stats.trend.length) {
      const ctx = trendCanvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: stats.trend.map(d => String(d.date || '').slice(5)),
          datasets: [{
            label: '工单数',
            data: stats.trend.map(d => d.cnt),
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00d4ff',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#8899aa' }, grid: { color: 'rgba(0,212,255,0.08)' } },
            y: { ticks: { color: '#8899aa', stepSize: 1 }, grid: { color: 'rgba(0,212,255,0.08)' }, beginAtZero: true }
          }
        }
      });
    }
  },

  /* ========== 提交工单 ========== */
  async renderSubmit() {
    const el = document.getElementById('page-submit');
    this.showSkeleton(el, 'detail');
    let staffList = [];
    try {
      const res = await API.getStaffList();
      if (res.code === 0) staffList = res.data;
    } catch (e) {}

    el.innerHTML = `
      <div class="page-title">提交工单</div>
      <div class="card" style="max-width:680px">
        <form data-action="create-ticket">
          <div class="form-group">
            <label class="form-label">问题标题 *</label>
            <input class="form-input" name="ticket-title" placeholder="简要描述您遇到的问题" required maxlength="100">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="form-group">
              <label class="form-label">问题分类 *</label>
              <select class="form-select" name="ticket-category" required>
                <option value="">请选择分类</option>
                <option value="系统故障">系统故障</option>
                <option value="功能异常">功能异常</option>
                <option value="账号问题">账号问题</option>
                <option value="性能问题">性能问题</option>
                <option value="数据问题">数据问题</option>
                <option value="安全相关">安全相关</option>
                <option value="其他问题">其他问题</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">优先级 *</label>
              <select class="form-select" name="ticket-priority" required>
                <option value="">请选择优先级</option>
                <option value="urgent">🔴 紧急</option>
                <option value="high">🟠 高</option>
                <option value="normal" selected>🔵 普通</option>
                <option value="low">⚪ 低</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">指定处理人 <span style="font-size:12px;color:var(--text-muted);font-weight:400">（可选）</span></label>
            <select class="form-select" name="ticket-assignee">
              <option value="">-- 自动分配 --</option>
              ${staffList.map(s => `<option value="${s.id}">${this.escapeHtml(s.real_name || s.username)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">详细描述 *</label>
            <textarea class="form-textarea" name="ticket-description" placeholder="请详细描述问题现象、操作步骤、期望结果等信息..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">上传附件 <span style="font-size:12px;color:var(--text-muted);font-weight:400">（可选，支持图片、文档、压缩包）</span></label>
            <div class="file-upload-wrap">
              <input type="file" id="submit-file-input" multiple style="display:none" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-select-files">📎 选择文件</button>
              <span id="submit-file-names" style="font-size:12px;color:var(--text-muted);margin-left:8px"></span>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">提交工单</button>
        </form>
      </div>
    `;

    const fileInput = el.querySelector('#submit-file-input');
    const btnSelect = el.querySelector('#btn-select-files');
    const fileNames = el.querySelector('#submit-file-names');
    btnSelect.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const names = Array.from(fileInput.files).map(f => f.name).join(', ');
      fileNames.textContent = names || '未选择文件';
    };
  },

  async handleCreateTicket() {
    const title = document.querySelector('input[name="ticket-title"]').value.trim();
    const category = document.querySelector('select[name="ticket-category"]').value;
    const priority = document.querySelector('select[name="ticket-priority"]').value;
    const assigneeId = document.querySelector('select[name="ticket-assignee"]').value;
    const description = document.querySelector('textarea[name="ticket-description"]').value.trim();

    if (!title || !category || !priority || !description) {
      this.toast('请填写所有必填项', 'error'); return;
    }
    const payload = { title, category, priority, description };
    if (assigneeId) payload.assignee_id = assigneeId;

    const res = await API.createTicket(payload);
    if (res.code === 0) {
      const ticketId = res.data.id;

      // 上传附件
      const fileInput = document.getElementById('submit-file-input');
      if (fileInput && fileInput.files.length > 0) {
        for (const file of fileInput.files) {
          try { await API.uploadAttachment(ticketId, file); } catch (e) {}
        }
      }

      const extra = res.data.handlerName ? `，已分配给 ${res.data.handlerName}` : '';
      this.toast('工单提交成功！工单号：' + res.data.ticketNo + extra, 'success');
      setTimeout(() => this.navigate('my-tickets'), 2000);
    } else {
      this.toast(res.message || '提交失败', 'error');
    }
  },

  /* ========== 我的工单 ========== */
  async renderMyTickets(status = '', page = 1) {
    const el = document.getElementById('page-my-tickets');
    this.showSkeleton(el, 'card', 5);

    const keyword = this._myTicketKeyword || '';
    const pageSize = 10;
    const params = { page, pageSize };
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;

    let tickets = [], total = 0;
    try {
      const res = await API.getMyTickets(params);
      if (res.code === 0) { tickets = res.data.list || []; total = res.data.total || 0; }
    } catch (e) { tickets = []; }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const statusText = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
    const priorityText = { urgent: '紧急', high: '高', normal: '普通', low: '低' };
    const isStaff = this.user.role === 'admin' || this.user.role === 'staff';

    el.innerHTML = `
      <div class="page-title">我的工单</div>
      <div class="filter-bar" style="margin-bottom:12px">
        <input class="form-input" id="my-ticket-search" placeholder="🔍 搜索标题/编号..." value="${this.escapeHtml(keyword)}" style="max-width:200px">
        <button class="btn btn-sm btn-primary" id="btn-my-search">搜索</button>
      </div>
      <div class="filter-bar">
        <button class="btn btn-sm ${!status?'btn-primary':'btn-secondary'}" data-filter="">全部(${total})</button>
        <button class="btn btn-sm ${status==='pending'?'btn-primary':'btn-secondary'}" data-filter="pending">⏳ 待处理</button>
        <button class="btn btn-sm ${status==='processing'?'btn-primary':'btn-secondary'}" data-filter="processing">🔄 处理中</button>
        <button class="btn btn-sm ${status==='resolved'?'btn-primary':'btn-secondary'}" data-filter="resolved">✅ 已解决</button>
        <button class="btn btn-sm ${status==='closed'?'btn-primary':'btn-secondary'}" data-filter="closed">🔒 已关闭</button>
      </div>

      ${tickets.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-illustration">
            <svg viewBox="0 0 120 120" fill="none"><rect x="15" y="20" width="90" height="80" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><rect x="28" y="35" width="64" height="8" rx="4" fill="currentColor" opacity="0.2"/><rect x="28" y="52" width="45" height="5" rx="2.5" fill="currentColor" opacity="0.15"/><rect x="28" y="64" width="55" height="5" rx="2.5" fill="currentColor" opacity="0.15"/><circle cx="90" cy="80" r="12" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/><path d="M84 80h12M90 74v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.2"/></svg>
          </div>
          <div class="empty-state-title">${status ? '该状态下暂无工单' : '暂无工单记录'}</div>
          <div class="empty-state-desc">提交你的第一个问题工单，我们会尽快处理</div>
          <div class="empty-state-actions">
            <button class="btn btn-primary" data-page="submit">📝 提交问题工单</button>
          </div>
        </div>
      ` : `
        <div class="ticket-list">
          ${tickets.map((t, i) => '<div class="stagger-item" style="animation-delay:' + (i*0.05) + 's">' + this.buildTicketCard(t, statusText, priorityText, isStaff) + '</div>').join('')}
        </div>
        ${totalPages > 1 ? this._buildPagination(page, totalPages, status, 'my-tickets') : ''}
      `}
    `;

    el.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => { this._myTicketKeyword = keyword; this.renderMyTickets(btn.dataset.filter, 1); };
    });
    el.querySelectorAll('[data-ticket]').forEach(item => {
      item.onclick = () => this.navigate('ticket-detail', { id: item.dataset.ticket });
    });
    const submitBtn = el.querySelector('[data-page="submit"]');
    if (submitBtn) submitBtn.onclick = () => this.navigate('submit');
    const searchBtn = el.querySelector('#btn-my-search');
    if (searchBtn) searchBtn.onclick = () => {
      this._myTicketKeyword = el.querySelector('#my-ticket-search').value.trim();
      this.renderMyTickets(status, 1);
    };
    const searchInput = el.querySelector('#my-ticket-search');
    if (searchInput) searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') { this._myTicketKeyword = searchInput.value.trim(); this.renderMyTickets(status, 1); }
    };
    el.querySelectorAll('[data-page-num]').forEach(btn => {
      btn.onclick = () => this.renderMyTickets(status, parseInt(btn.dataset.pageNum));
    });
  },

  _buildPagination(current, total, status, pageType) {
    const pages = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - current) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return '<div style="display:flex;gap:6px;justify-content:center;margin-top:16px">' +
      pages.map(p => p === '...'
        ? '<span style="padding:6px;color:var(--text-muted)">...</span>'
        : '<button class="btn btn-sm ' + (p === current ? 'btn-primary' : 'btn-secondary') + '" data-page-num="' + p + '">' + p + '</button>'
      ).join('') +
      '<span style="font-size:12px;color:var(--text-muted);align-self:center;margin-left:8px">共 ' + total + ' 页</span></div>';
  },

  buildTicketCard(t, statusText, priorityText, isStaff = false) {
    const statusFlow = {
      pending:    ['● 待处理', '○ 处理中', '○ 已解决'],
      processing: ['✓ 已提交', '● 处理中', '○ 已解决'],
      resolved:   ['✓ 已提交', '✓ 已处理', '● 已解决'],
      closed:     ['✓ 已提交', '✓ 已处理', '● 已关闭'],
      rejected:   ['✓ 已提交', '↩ 已退回', '○ 待修改'],
      reopened:   ['✓ 已提交', '● 处理中', '↻ 已重开'],
      suspended:  ['✓ 已提交', '⏸ 已挂起', '○ 待恢复']
    };
    const flow = statusFlow[t.status] || statusFlow.pending;
    const hasHandler = t.handler_name && t.handler_name !== '';
    let sourceBadge = '';
    if (isStaff) {
      if (t.is_creator === 1 || t.is_creator === '1' || t.is_creator === true) {
        sourceBadge = '<span class="source-badge created">📝 我创建的</span>';
      } else {
        sourceBadge = '<span class="source-badge assigned">📥 分配给我</span>';
      }
    }
    return `
      <div class="ticket-item" data-ticket="${t.id}">
        <div class="ticket-header">
          <div class="ticket-title">${this.escapeHtml(t.title)}${sourceBadge}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="priority-tag ${t.priority || 'normal'}">🔺 ${priorityText[t.priority] || '普通'}</span>
            <span class="status-tag ${t.status}">${statusText[t.status] || t.status}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0;margin:12px 0;padding:0 8px">
          ${flow.map((step, i) => `
            <div style="flex:1;display:flex;align-items:center">
              <span style="font-size:12px;color:${step.startsWith('●') ? 'var(--accent)' : 'var(--text-muted)'};white-space:nowrap">${step}</span>
              ${i < flow.length - 1 ? `<div style="flex:1;height:2px;margin:0 6px;background:${i < flow.findIndex(s=>s.startsWith('●')) ? 'var(--accent)' : 'var(--border)'};border-radius:1px"></div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="ticket-meta">
          <span>📋 ${t.ticket_no || ''}</span>
          <span>👤 ${this.escapeHtml(t.creator_name || '')}</span>
          <span>📂 ${t.category || ''}</span>
          <span>🕐 ${this.fmtTime(t.created_at)}</span>
          ${hasHandler ? `<span style="color:var(--accent)">🔧 ${this.escapeHtml(t.handler_name)} 处理中</span>` : ''}
          ${t.updated_at ? `<span>🔄 更新于 ${this.fmtTime(t.updated_at)}</span>` : ''}
          ${t.rating ? `<span>⭐ ${t.rating}分</span>` : ''}
        </div>
      </div>
    `;
  },

  buildProgressTimeline(t) {
    const steps = [
      { label: '工单提交', time: t.created_at, done: true, icon: '📝' },
      { label: '处理人接单', time: null, done: false, icon: '✋' },
      { label: '问题解决', time: t.resolved_at, done: false, icon: '✅' },
      { label: '工单关闭', time: null, done: false, icon: '🔒' }
    ];
    if (t.status === 'closed') {
      steps[1].done = true; steps[2].done = true; steps[3].done = true;
      steps[3].time = t.updated_at;
    } else if (t.status === 'resolved') {
      steps[1].done = true; steps[2].done = true;
    } else if (t.status === 'processing') {
      steps[1].done = true; steps[1].time = t.updated_at;
    }
    if (t.handler_name && (t.status === 'processing' || t.status === 'resolved' || t.status === 'closed')) {
      steps[1].label = `处理人接单 (${this.escapeHtml(t.handler_name)})`;
    }
    const header = t.status === 'pending'
      ? '<div style="font-size:14px;color:var(--warning);margin-bottom:16px;font-weight:600">⏳ 工单已提交，等待管理员接单处理...</div>'
      : t.status === 'processing'
        ? '<div style="font-size:14px;color:var(--accent);margin-bottom:16px;font-weight:600">🔄 您的工单正在处理中，请耐心等待</div>'
        : t.status === 'resolved'
          ? '<div style="font-size:14px;color:var(--success);margin-bottom:16px;font-weight:600">✅ 工单已处理完成，请查看解决方案并评价</div>'
          : '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;font-weight:600">🔒 工单已关闭</div>';
    return `
      ${header}
      <div style="position:relative;padding-left:32px">
        ${steps.map((step, i) => `
          <div style="position:relative;padding-bottom:${i < steps.length-1 ? '28px' : '0'}">
            ${i < steps.length-1 ? `<div style="position:absolute;left:-24px;top:28px;width:2px;height:calc(100% - 4px);background:${step.done ? 'var(--accent)' : 'var(--border)'};border-radius:1px"></div>` : ''}
            <div style="position:absolute;left:-29px;top:2px;width:12px;height:12px;border-radius:50%;background:${step.done ? 'var(--accent)' : 'var(--bg-input)'};border:2px solid ${step.done ? 'var(--accent)' : 'var(--border)'};${i === 1 && !step.done && t.status==='pending' ? 'animation: pulse 2s infinite' : ''}"></div>
            <div style="font-size:14px;font-weight:600;color:${step.done ? 'var(--accent)' : 'var(--text-muted)'}">
              ${step.icon} ${step.label}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
              ${step.time ? this.fmtTime(step.time) : (step.done ? '' : '等待中...')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /* ========== 工单详情 ========== */
  async renderTicketDetail() {
    const el = document.getElementById('page-ticket-detail');
    if (!el) return;
    this.showSkeleton(el, 'detail');

    const id = this.currentParams?.id;
    if (!id || id === 'undefined' || id === 'null') {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-illustration">
            <svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="40" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><path d="M40 60h40M60 40v40" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.3"/></svg>
          </div>
          <div class="empty-state-title">工单ID无效</div>
          <div class="empty-state-actions"><button class="btn btn-primary btn-sm" data-page="my-tickets">← 返回工单列表</button></div>
        </div>`; return;
    }

    let res;
    try {
      res = await API.getTicketDetail(id);
    } catch (e) {
      console.error('请求工单详情失败:', e);
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-illustration">
            <svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="40" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><path d="M45 75l30-30M75 75l-30-30" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.3"/></svg>
          </div>
          <div class="empty-state-title">网络请求失败</div>
          <div class="empty-state-desc">请检查网络连接后重试</div>
          <div class="empty-state-actions">
            <button class="btn btn-primary btn-sm" data-page="my-tickets">← 返回列表</button>
            <button class="btn btn-secondary btn-sm" id="btn-retry-detail">🔄 重新加载</button>
          </div>
        </div>`;
      el.querySelector('#btn-retry-detail').onclick = () => this.navigate('ticket-detail', { id });
      return;
    }

    if (!res || res.code !== 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">${(res && res.message) || '加载失败'}</div>
          <div class="empty-state-actions"><button class="btn btn-primary btn-sm" data-page="my-tickets">← 返回工单列表</button></div>
        </div>`; return;
    }

    const t = res.data;
    const statusText = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭', rejected: '已退回', reopened: '已重开', suspended: '已挂起' };
    const replies = t.replies || [];
    const attachments = t.attachments || [];
    const isAdmin = this.user.role === 'admin' || this.user.role === 'staff';
    const isCreator = t.user_id === this.user.id;
    const canReply = (isAdmin || isCreator) && !['closed', 'suspended'].includes(t.status);
    const canTake = isAdmin && t.status === 'pending';
    const canClose = isCreator && (t.status === 'resolved' || t.status === 'rejected');
    const canEdit = isCreator && t.status === 'pending';
    const canReject = isAdmin && t.status === 'processing';
    const canReopen = isCreator && t.status === 'resolved';
    const canSuspend = isAdmin && ['pending', 'processing'].includes(t.status);
    const canResume = isAdmin && t.status === 'suspended';
    const timeline = this.buildProgressTimeline(t);

    el.innerHTML = `
      <button class="btn btn-secondary btn-sm" style="margin-bottom:16px" data-page="my-tickets">← 返回列表</button>

      <div class="detail-header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="ticket-no">工单号：${t.ticket_no}</div>
            <h2>${this.escapeHtml(t.title)}</h2>
          </div>
          ${canEdit ? `<button class="btn btn-sm btn-secondary" id="btn-edit-ticket">✏️ 编辑工单</button>` : ''}
        </div>
        <div class="meta-row">
          <span class="status-tag ${t.status}">${statusText[t.status] || t.status}</span>
          <span class="priority-tag ${t.priority || 'normal'}">${t.priority || '普通'}</span>
          <span>📂 ${t.category || ''}</span>
          <span>👤 ${this.escapeHtml(t.creator_name || '')}</span>
          <span>🕐 ${this.fmtTime(t.created_at)}</span>
          ${t.handler_name ? `<span>🔧 处理人：${this.escapeHtml(t.handler_name)}</span>` : ''}
        </div>
      </div>

      ${canEdit ? `
      <div class="detail-section" id="edit-ticket-form" style="display:none">
        <div class="section-title">✏️ 编辑工单</div>
        <form data-action="edit-ticket">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input class="form-input" name="edit-title" value="${this.escapeHtml(t.title)}" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select class="form-select" name="edit-category">
                ${['系统故障','功能异常','账号问题','性能问题','数据问题','安全相关','其他问题'].map(c => `<option value="${c}" ${c===t.category?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select class="form-select" name="edit-priority">
                <option value="urgent" ${t.priority==='urgent'?'selected':''}>🔴 紧急</option>
                <option value="high" ${t.priority==='high'?'selected':''}>🟠 高</option>
                <option value="normal" ${t.priority==='normal'?'selected':''}>🔵 普通</option>
                <option value="low" ${t.priority==='low'?'selected':''}>⚪ 低</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea class="form-textarea" name="edit-description" required style="min-height:80px">${this.escapeHtml(t.description)}</textarea>
          </div>
          <div style="display:flex;gap:12px">
            <button type="submit" class="btn btn-primary btn-sm">保存修改</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit">取消</button>
          </div>
        </form>
      </div>
      ` : ''}

      <div class="detail-section">
        <div class="section-title">📋 处理进度</div>
        ${timeline}
      </div>

      <div class="detail-section">
        <div class="section-title">问题描述</div>
        <div class="description">${this.escapeHtml(t.description || '无')}</div>
      </div>

      ${t.solution ? `
      <div class="detail-section">
        <div class="section-title">💡 解决方案</div>
        <div class="solution">${this.escapeHtml(t.solution)}</div>
      </div>
      ` : ''}

      ${attachments.length > 0 ? `
      <div class="detail-section">
        <div class="section-title">📎 附件 (${attachments.length})</div>
        <div class="attachments-list">
          ${attachments.map(a => this.buildAttachmentItem(a, isCreator || isAdmin)).join('')}
        </div>
      </div>
      ` : ''}

      <div class="detail-section">
        <div class="section-title">沟通记录 (${replies.length})</div>
        ${replies.length === 0 ? '<div style="color:var(--text-muted);font-size:14px;padding:8px 0">暂无回复，等待处理人响应</div>' : ''}
        <div class="reply-list">
          ${replies.map((r, i) => '<div class="stagger-item" style="animation-delay:' + (i*0.06) + 's">' + this.buildReplyItem(r, isAdmin) + '</div>').join('')}
        </div>
      </div>

      ${canReply ? `
      <div class="action-bar">
        <div class="reply-input-wrap">
          <form data-action="reply">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap">
              <label class="reply-type-toggle" id="reply-type-toggle" style="display:${isAdmin ? 'flex' : 'none'};align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer">
                <span id="reply-type-label">💬 公开回复</span>
                <input type="checkbox" id="reply-is-internal" style="display:none">
                <span class="toggle-switch"></span>
              </label>
            </div>
            <textarea class="form-textarea" name="reply-content" placeholder="${isAdmin ? '输入回复内容...（使用 @用户名 提及用户）' : '输入回复内容...'}" required></textarea>
            <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-select-reply-files">📎 附件</button>
              <input type="file" id="reply-file-input" multiple style="display:none" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar">
              <span id="reply-file-names" style="font-size:12px;color:var(--text-muted)"></span>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:12px;flex-wrap:wrap">
              <button type="submit" class="btn btn-primary btn-sm">💬 发送回复</button>
              ${canTake ? '<button type="button" class="btn btn-success btn-sm" id="btn-take">✋ 接单处理</button>' : ''}
              ${t.status === 'processing' && isAdmin ? '<button type="button" class="btn btn-success btn-sm" id="btn-resolve">✅ 标记已解决</button>' : ''}
              ${canReject ? '<button type="button" class="btn btn-warning btn-sm" id="btn-reject">↩️ 退回工单</button>' : ''}
              ${canSuspend ? '<button type="button" class="btn btn-secondary btn-sm" id="btn-suspend">⏸️ 挂起</button>' : ''}
              ${canResume ? '<button type="button" class="btn btn-success btn-sm" id="btn-resume">▶️ 恢复处理</button>' : ''}
              ${(t.status === 'pending' || t.status === 'processing') && isAdmin ? '<button type="button" class="btn btn-warning btn-sm" id="btn-reassign">↗️ 转派</button>' : ''}
              ${canClose ? '<button type="button" class="btn btn-warning btn-sm" id="btn-close">🔒 关闭工单</button>' : ''}
            </div>
          </form>
        </div>
      </div>
      ` : ''}

      ${t.status === 'resolved' && isCreator ? `
      <div class="action-bar">
        <button class="btn btn-warning btn-sm" id="btn-close">🔒 关闭工单</button>
        <button class="btn btn-secondary btn-sm" id="btn-reopen" style="margin-left:8px">↩️ 重新打开</button>
        <div style="margin-left:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text-secondary)">评价：</span>
          <button class="btn btn-sm btn-primary" id="btn-rate-ticket">⭐ 评价本次服务</button>
        </div>
      </div>
      ` : ''}
    `;

    // Return button
    el.querySelector('[data-page="my-tickets"]').onclick = () => this.navigate('my-tickets');

    // Edit ticket
    const btnEdit = el.querySelector('#btn-edit-ticket');
    if (btnEdit) btnEdit.onclick = () => {
      document.getElementById('edit-ticket-form').style.display = 'block';
      btnEdit.style.display = 'none';
    };
    const btnCancel = el.querySelector('#btn-cancel-edit');
    if (btnCancel) btnCancel.onclick = () => {
      document.getElementById('edit-ticket-form').style.display = 'none';
      if (btnEdit) btnEdit.style.display = '';
    };

    // Take
    const btnTake = el.querySelector('#btn-take');
    if (btnTake) btnTake.onclick = async () => {
      const r = await API.takeTicket(id);
      if (r.code === 0) { this.toast('接单成功', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '接单失败', 'error');
    };

    // Resolve
    const btnResolve = el.querySelector('#btn-resolve');
    if (btnResolve) btnResolve.onclick = async () => {
      const solution = prompt('请输入解决方案：');
      if (!solution) return;
      const r = await API.resolveTicket(id, solution);
      if (r.code === 0) { this.toast('工单已解决', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '操作失败', 'error');
    };

    // Reassign
    const btnReassign = el.querySelector('#btn-reassign');
    if (btnReassign) btnReassign.onclick = async () => {
      const staffRes = await API.getStaffList();
      const staff = (staffRes.code === 0 ? staffRes.data : []).filter(s => s.id !== t.handler_id);
      if (staff.length === 0) { this.toast('没有可转派的处理人', 'error'); return; }
      const names = staff.map((s, i) => (i + 1) + '. ' + (s.real_name || s.username)).join('\n');
      const idx = parseInt(prompt('选择转派处理人：\n' + names)) - 1;
      if (isNaN(idx) || idx < 0 || idx >= staff.length) return;
      const r = await API.reassignTicket(id, staff[idx].id);
      if (r.code === 0) { this.toast('转派成功', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '转派失败', 'error');
    };

    // Close
    const btnClose = el.querySelector('#btn-close');
    if (btnClose) btnClose.onclick = async () => {
      if (!confirm('确定关闭此工单吗？')) return;
      const r = await API.closeTicket(id);
      if (r.code === 0) { this.toast('工单已关闭', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '关闭失败', 'error');
    };

    // Reject (处理员退回工单)
    const btnReject = el.querySelector('#btn-reject');
    if (btnReject) btnReject.onclick = async () => {
      const reason = prompt('请输入退回原因：');
      if (!reason) return;
      const r = await API.rejectTicket(id, reason);
      if (r.code === 0) { this.toast('工单已退回', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '退回失败', 'error');
    };

    // Reopen (用户重新打开工单)
    const btnReopenDetail = el.querySelector('#btn-reopen');
    if (btnReopenDetail) btnReopenDetail.onclick = async () => {
      const reason = prompt('请输入重新打开的原因（可选）：') || '';
      const r = await API.reopenTicket(id, reason);
      if (r.code === 0) { this.toast('工单已重新打开', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '操作失败', 'error');
    };

    // Suspend
    const btnSuspend = el.querySelector('#btn-suspend');
    if (btnSuspend) btnSuspend.onclick = async () => {
      const reason = prompt('请输入挂起原因：');
      if (!reason) return;
      const r = await API.suspendTicket(id, reason);
      if (r.code === 0) { this.toast('工单已挂起', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '挂起失败', 'error');
    };

    // Resume
    const btnResume = el.querySelector('#btn-resume');
    if (btnResume) btnResume.onclick = async () => {
      if (!confirm('确定恢复该工单的处理吗？')) return;
      const r = await API.resumeTicket(id);
      if (r.code === 0) { this.toast('工单已恢复', 'success'); this.navigate('ticket-detail', { id }); }
      else this.toast(r.message || '恢复失败', 'error');
    };

    // Interactive rating button
    const btnRate = el.querySelector('#btn-rate-ticket');
    if (btnRate) btnRate.onclick = () => this._showRatingModal(id);

    // Reply file
    const replyFileInput = el.querySelector('#reply-file-input');
    const btnReplyFiles = el.querySelector('#btn-select-reply-files');
    const replyFileNames = el.querySelector('#reply-file-names');
    if (btnReplyFiles) btnReplyFiles.onclick = () => replyFileInput.click();
    if (replyFileInput) replyFileInput.onchange = () => {
      const names = Array.from(replyFileInput.files).map(f => f.name).join(', ');
      replyFileNames.textContent = names || '未选择文件';
    };

    // 内部备注切换
    const replyTypeToggle = el.querySelector('#reply-type-toggle');
    const replyIsInternal = el.querySelector('#reply-is-internal');
    const replyTypeLabel = el.querySelector('#reply-type-label');
    if (replyTypeToggle && replyIsInternal) {
      replyTypeToggle.onclick = () => {
        replyIsInternal.checked = !replyIsInternal.checked;
        replyTypeLabel.textContent = replyIsInternal.checked ? '🔒 内部备注' : '💬 公开回复';
        const textarea = el.querySelector('textarea[name="reply-content"]');
        if (textarea) textarea.placeholder = replyIsInternal.checked ? '输入内部备注（仅处理员可见）...' : '输入回复内容...';
      };
    }

    // Edit / Delete reply buttons
    this.bindReplyActions(el, id, isAdmin);
  },

  bindReplyActions(el, ticketId, isAdmin) {
    el.querySelectorAll('.reply-item').forEach(item => {
      const replyId = item.dataset.replyId;
      if (!replyId) return;

      // Edit
      const btnEditReply = item.querySelector('.reply-action-edit');
      if (btnEditReply) btnEditReply.onclick = (e) => {
        e.stopPropagation();
        const contentEl = item.querySelector('.reply-content');
        const currentContent = contentEl.textContent;
        const editArea = document.createElement('div');
        editArea.innerHTML = `
          <textarea class="form-textarea" style="min-height:60px;margin-bottom:8px">${this.escapeHtml(currentContent)}</textarea>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm reply-save-edit">保存</button>
            <button class="btn btn-secondary btn-sm reply-cancel-edit">取消</button>
          </div>
        `;
        contentEl.style.display = 'none';
        contentEl.parentNode.insertBefore(editArea, contentEl.nextSibling);

        editArea.querySelector('.reply-save-edit').onclick = async () => {
          const newContent = editArea.querySelector('textarea').value.trim();
          if (!newContent) { this.toast('内容不能为空', 'error'); return; }
          const r = await API.editReply(replyId, newContent);
          if (r.code === 0) { this.toast('回复已更新', 'success'); this.navigate('ticket-detail', { id: ticketId }); }
          else this.toast(r.message || '更新失败', 'error');
        };
        editArea.querySelector('.reply-cancel-edit').onclick = () => {
          editArea.remove();
          contentEl.style.display = '';
        };
      };

      // Delete
      const btnDelReply = item.querySelector('.reply-action-delete');
      if (btnDelReply) btnDelReply.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('确定删除此回复吗？')) return;
        const r = await API.deleteReply(replyId);
        if (r.code === 0) { this.toast('回复已删除', 'success'); this.navigate('ticket-detail', { id: ticketId }); }
        else this.toast(r.message || '删除失败', 'error');
      };

      // Delete attachment
      item.querySelectorAll('.att-del-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const attId = btn.dataset.attId;
          if (!confirm('确定删除此附件吗？')) return;
          const r = await API.deleteAttachment(attId);
          if (r.code === 0) { this.toast('附件已删除', 'success'); this.navigate('ticket-detail', { id: ticketId }); }
          else this.toast(r.message || '删除失败', 'error');
        };
      });
    });
  },

  buildReplyItem(r, isAdmin) {
    const isOwnReply = r.user_id === this.user.id;
    const isSystem = r.reply_type === 'system' || (r.content && r.content.startsWith('[系统]'));
    const isInternal = r.reply_type === 'internal';
    const canEdit = isOwnReply && !isSystem;
    const canDelete = (isOwnReply || isAdmin) && !isSystem;
    const edited = r.updated_at ? ` <span style="font-size:11px;color:var(--text-muted)">(已编辑)</span>` : '';

    return `
      <div class="reply-item ${isInternal ? 'internal-note' : (r.user_role === 'staff' || r.user_role === 'admin' ? 'staff' : 'user-reply')}" data-reply-id="${r.id}">
        <div class="reply-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="reply-author">${this.escapeHtml(r.user_name || '')} ${r.user_role === 'staff' || r.user_role === 'admin' ? '🔧 处理员' : '👤 用户'}${isInternal ? ' <span style="color:var(--warning);font-size:11px">🔒 内部</span>' : ''}${edited}</span>
            ${canEdit ? `<button class="reply-action-edit btn-action-icon" title="编辑">✏️</button>` : ''}
            ${canDelete ? `<button class="reply-action-delete btn-action-icon" title="删除">🗑️</button>` : ''}
          </div>
          <span class="reply-time">${this.fmtTime(r.created_at)}</span>
        </div>
        <div class="reply-content ${isInternal ? 'internal-content' : ''}">${this.escapeHtml(r.content)}</div>
      </div>
    `;
  },

  buildAttachmentItem(a, canDelete) {
    const iconMap = { 'image': '🖼️', 'application/pdf': '📄', 'text': '📝', 'application/zip': '📦', 'application/vnd.ms-excel': '📊' };
    let icon = '📎';
    for (const [k, v] of Object.entries(iconMap)) {
      if ((a.mime_type || '').startsWith(k)) { icon = v; break; }
    }
    const sizeStr = a.size < 1024 ? `${a.size}B` : a.size < 1048576 ? `${(a.size/1024).toFixed(1)}KB` : `${(a.size/1048576).toFixed(1)}MB`;
    return `
      <div class="att-item">
        <span>${icon}</span>
        <a href="${window.API_BASE || 'http://localhost:3000'}/uploads/${a.file_path || a.filename}" target="_blank" class="att-link">${this.escapeHtml(a.original_name)}</a>
        <span style="font-size:12px;color:var(--text-muted)">${sizeStr}</span>
        ${canDelete ? `<button class="att-del-btn btn-action-icon" data-att-id="${a.id}" title="删除附件">🗑️</button>` : ''}
      </div>
    `;
  },

  async handleReply() {
    const id = this.currentParams?.id;
    const content = document.querySelector('textarea[name="reply-content"]').value.trim();
    if (!content) { this.toast('请输入回复内容', 'error'); return; }
    const isInternal = document.getElementById('reply-is-internal')?.checked;
    const res = isInternal ? await API.replyInternal(id, content) : await API.replyTicket(id, content);
    if (res.code === 0) {
      const fileInput = document.getElementById('reply-file-input');
      if (fileInput && fileInput.files.length > 0) {
        for (const file of fileInput.files) {
          try { await API.uploadAttachment(id, file); } catch (e) {}
        }
      }
      this.toast(isInternal ? '内部备注已添加' : '回复成功', 'success');
      this.navigate('ticket-detail', { id });
    } else {
      this.toast(res.message || '回复失败', 'error');
    }
  },

  async handleEditTicket() {
    const id = this.currentParams?.id;
    const title = document.querySelector('input[name="edit-title"]').value.trim();
    const category = document.querySelector('select[name="edit-category"]').value;
    const priority = document.querySelector('select[name="edit-priority"]').value;
    const description = document.querySelector('textarea[name="edit-description"]').value.trim();
    if (!title || !description) { this.toast('标题和描述不能为空', 'error'); return; }
    const res = await API.updateTicket(id, { title, category, priority, description });
    if (res.code === 0) { this.toast('工单已更新', 'success'); this.navigate('ticket-detail', { id }); }
    else this.toast(res.message || '更新失败', 'error');
  },

  /* ========== 交互式评分弹窗 ========== */
  _showRatingModal(ticketId) {
    const overlay = document.getElementById('rating-modal-overlay');
    const modal = document.getElementById('rating-modal');
    if (!overlay || !modal) return;

    const ratingLabels = { 1: '非常不满意', 2: '不满意', 3: '一般', 4: '满意', 5: '非常满意' };
    const quickTags = [
      { text: '响应迅速', icon: '⚡' },
      { text: '态度友好', icon: '😊' },
      { text: '技术专业', icon: '💡' },
      { text: '解决方案有效', icon: '✅' },
      { text: '沟通清晰', icon: '💬' },
      { text: '处理及时', icon: '⏰' }
    ];

    let selectedRating = 0;
    let selectedTags = [];

    modal.innerHTML = `
      <div class="rating-modal-content">
        <div class="modal-title">⭐ 评价服务</div>
        <div style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">请为本次工单处理进行评价</div>
        <div class="star-rating" id="rating-stars">
          ${[1,2,3,4,5].map(s => `<span class="star" data-value="${s}">★</span>`).join('')}
        </div>
        <div class="rating-hint" id="rating-hint">点击星星评分</div>
        <div class="rating-quick-tags" id="rating-tags">
          ${quickTags.map(t => `<span class="rating-tag" data-tag="${t.text}">${t.icon} ${t.text}</span>`).join('')}
        </div>
        <div class="form-group" style="text-align:left">
          <label class="form-label">补充评价（可选）</label>
          <textarea class="form-textarea" id="rating-feedback" placeholder="分享更多体验感受..." style="min-height:60px"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btn-rating-cancel">取消</button>
          <button class="btn btn-primary" id="btn-rating-submit" disabled>提交评价</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');

    // Star hover/click
    const stars = modal.querySelectorAll('#rating-stars .star');
    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.dataset.value);
        stars.forEach((s, i) => {
          s.classList.toggle('hover', i < val);
        });
        document.getElementById('rating-hint').textContent = val + '分 · ' + (ratingLabels[val] || '');
      });
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.value);
        stars.forEach((s, i) => {
          s.classList.toggle('active', i < selectedRating);
        });
        document.getElementById('btn-rating-submit').disabled = false;
      });
    });

    // Tags
    modal.querySelectorAll('#rating-tags .rating-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        selectedTags = [...modal.querySelectorAll('#rating-tags .rating-tag.selected')]
          .map(t => t.dataset.tag);
      });
    });

    // Cancel
    document.getElementById('btn-rating-cancel').onclick = () => {
      overlay.classList.remove('active');
    };

    // Submit
    document.getElementById('btn-rating-submit').onclick = async () => {
      if (selectedRating === 0) { this.toast('请选择评分', 'error'); return; }
      const feedback = (document.getElementById('rating-feedback').value.trim() || '') +
        (selectedTags.length ? (' [' + selectedTags.join(', ') + ']') : '');
      const r = await API.rateTicket(ticketId, selectedRating, feedback);
      overlay.classList.remove('active');
      if (r.code === 0) { this.toast('评价成功，感谢反馈！', 'success'); this.navigate('ticket-detail', { id: ticketId }); }
      else this.toast(r.message || '评价失败', 'error');
    };
  },

  /* ========== 管理面板（增强搜索 + 导出）========== */
  async renderAdmin() {
    const el = document.getElementById('page-admin');
    this.showSkeleton(el, 'stats', 4);

    const [statsRes, ticketsRes, staffRes] = await Promise.all([
      API.getStats(),
      API.getTickets({ pageSize: 50 }),
      API.getStaffList()
    ]);

    const stats = statsRes.code === 0 ? statsRes.data : { total: 0, pending: 0, processing: 0, resolved: 0 };
    const tickets = ticketsRes.code === 0 ? (ticketsRes.data.list || ticketsRes.data || []) : [];
    const staffList = staffRes.code === 0 ? staffRes.data : [];
    const statusText = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };

    const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

    el.innerHTML = `
      <div class="admin-tabs" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn btn-sm ${!this.currentAdminTab || this.currentAdminTab==='tickets'?'btn-primary':'btn-secondary'}" data-admin-tab="tickets">📋 工单管理</button>
        <button class="btn btn-sm ${this.currentAdminTab==='categories'?'btn-primary':'btn-secondary'}" data-admin-tab="categories">📂 分类管理</button>
        <button class="btn btn-sm ${this.currentAdminTab==='users'?'btn-primary':'btn-secondary'}" data-admin-tab="users">👥 用户管理</button>
        <button class="btn btn-sm ${this.currentAdminTab==='logs'?'btn-primary':'btn-secondary'}" data-admin-tab="logs">📝 操作日志</button>
      </div>
      <div id="admin-tab-content"></div>
    `;

    // Tab switching
    el.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.onclick = () => {
        this.currentAdminTab = btn.dataset.adminTab;
        this._renderAdminTab();
      };
    });

    this._renderAdminTab();
  },

  async _renderAdminTab() {
    const tab = this.currentAdminTab || 'tickets';
    const content = document.getElementById('admin-tab-content');
    if (!content) return;
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    if (tab === 'tickets') await this._renderAdminTickets(content);
    else if (tab === 'categories') await this._renderAdminCategories(content);
    else if (tab === 'users') await this._renderAdminUsers(content);
    else if (tab === 'logs') await this._renderAdminLogs(content);
  },

  async _renderAdminTickets(content) {
    const [statsRes, ticketsRes, staffRes] = await Promise.all([
      API.getStats(),
      API.getTickets({ pageSize: 50 }),
      API.getStaffList()
    ]);

    const stats = statsRes.code === 0 ? statsRes.data : { total: 0, pending: 0, processing: 0, resolved: 0 };
    const tickets = ticketsRes.code === 0 ? (ticketsRes.data.list || ticketsRes.data || []) : [];
    const staffList = staffRes.code === 0 ? staffRes.data : [];
    const statusText = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭', rejected: '已退回', reopened: '已重开', suspended: '已挂起' };
    const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div class="page-title" style="margin-bottom:0">工单管理</div>
        <button class="btn btn-success btn-sm" id="btn-export">📥 导出 CSV</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon total">📋</div><div class="stat-value">${stats.total || 0}</div><div class="stat-label">工单总数</div></div>
        <div class="stat-card"><div class="stat-icon pending">⏳</div><div class="stat-value">${stats.pending || 0}</div><div class="stat-label">待处理</div></div>
        <div class="stat-card"><div class="stat-icon processing">🔄</div><div class="stat-value">${stats.processing || 0}</div><div class="stat-label">处理中</div></div>
        <div class="stat-card"><div class="stat-icon resolved">✅</div><div class="stat-value">${stats.resolved || 0}</div><div class="stat-label">已解决</div></div>
      </div>
      <div class="card" style="margin-bottom:16px;padding:16px 20px">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;font-weight:600">🔍 高级筛选</div>
        <div class="filter-bar" style="margin-bottom:0">
          <input class="form-input search-input" id="admin-search" placeholder="🔍 搜索工单号/标题..." value="">
          <select class="form-select" id="admin-filter-status" style="max-width:140px">
            <option value="">全部状态</option>
            <option value="pending">待处理</option><option value="processing">处理中</option><option value="resolved">已解决</option><option value="closed">已关闭</option>
            <option value="rejected">已退回</option><option value="reopened">已重开</option><option value="suspended">已挂起</option>
          </select>
          <select class="form-select" id="admin-filter-priority" style="max-width:120px">
            <option value="">全部优先级</option>
            <option value="urgent">紧急</option><option value="high">高</option><option value="normal">普通</option><option value="low">低</option>
          </select>
          <select class="form-select" id="admin-filter-category" style="max-width:140px">
            <option value="">全部分类</option>
            ${categories.map(c => '<option value="' + this.escapeHtml(c) + '">' + this.escapeHtml(c) + '</option>').join('')}
          </select>
          <select class="form-select" id="admin-filter-handler" style="max-width:140px">
            <option value="">全部处理人</option>
            ${staffList.map(s => '<option value="' + s.id + '">' + this.escapeHtml(s.real_name || s.username) + '</option>').join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-admin-search">搜索</button>
          <button class="btn btn-secondary btn-sm" id="btn-admin-reset">重置</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer">
          <input type="checkbox" id="admin-select-all" class="ticket-checkbox"> 全选
        </label>
        <button class="btn btn-sm btn-primary" id="btn-batch-take" style="display:none">✋ 批量接单</button>
        <button class="btn btn-sm btn-warning" id="btn-batch-close" style="display:none">🔒 批量关闭</button>
        <span id="batch-count" style="font-size:12px;color:var(--text-muted);display:none"></span>
      </div>
      <div class="ticket-list" id="admin-ticket-list">
        ${tickets.length === 0 ? `<div class="empty-state">
          <div class="empty-state-illustration"><svg viewBox="0 0 120 120" fill="none"><rect x="15" y="20" width="90" height="80" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><circle cx="60" cy="55" r="20" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/></svg></div>
          <div class="empty-state-title">暂无工单</div><div class="empty-state-desc">工单数据将在这里显示</div></div>` :
          tickets.map((t, i) => '<div class="stagger-item" style="animation-delay:' + (i*0.04) + 's">' + this._buildAdminTicketItem(t, statusText) + '</div>').join('')}
      </div>
    `;

    // Bind events
    this._bindAdminTicketEvents(content);
    this._bindAdminSearch();
  },

  _buildAdminTicketItem(t, statusText) {
    return `<div class="ticket-item admin-ticket-item" data-ticket="${t.id}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <input type="checkbox" class="ticket-checkbox" data-ticket="${t.id}" style="margin-top:3px;flex-shrink:0" onclick="event.stopPropagation()">
        <div style="flex:1;min-width:0">
          <div class="ticket-header">
            <div class="ticket-title">${this.escapeHtml(t.title)}</div>
            <div>
              <span class="status-tag ${t.status}">${statusText[t.status] || t.status}</span>
              <span class="priority-tag ${t.priority || 'normal'}" style="margin-left:6px">${t.priority || '普通'}</span>
            </div>
          </div>
          <div class="ticket-meta">
            <span>📋 ${t.ticket_no || ''}</span>
            <span>👤 ${this.escapeHtml(t.creator_name || '')}</span>
            <span>📂 ${t.category || ''}</span>
            <span>🕐 ${this.fmtTime(t.created_at)}</span>
            ${t.handler_name ? '<span>🔧 ' + this.escapeHtml(t.handler_name) + '</span>' : ''}
          </div>
        </div>
      </div>
    </div>`;
  },

  _bindAdminTicketEvents(content) {
    const exportBtn = content.querySelector('#btn-export');
    if (exportBtn) {
      exportBtn.onclick = async () => {
        const status = content.querySelector('#admin-filter-status').value;
        const params = status ? { status } : {};
        const token = API.getToken();
        try {
          const res = await fetch(API.getExportUrl(params), { headers: { 'Authorization': token } });
          // 检查响应是否为 CSV（防止后端返回 JSON 错误时当成 CSV 下载）
          const contentType = res.headers.get('Content-Type') || '';
          if (!res.ok || !contentType.includes('text/csv')) {
            const errData = await res.json().catch(() => ({}));
            this.toast(errData.message || '导出失败，请稍后重试', 'error');
            return;
          }
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = 'tickets_' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          this.toast('CSV 导出成功', 'success');
        } catch (err) {
          console.error('导出CSV失败:', err);
          this.toast('导出失败，网络异常', 'error');
        }
      };
    }

    content.querySelectorAll('[data-ticket]').forEach(item => {
      item.onclick = () => this.navigate('ticket-detail', { id: item.dataset.ticket });
    });

    // 批量操作：全选
    const selectAll = content.querySelector('#admin-select-all');
    if (selectAll) {
      selectAll.onchange = () => {
        content.querySelectorAll('.ticket-checkbox[data-ticket]').forEach(cb => {
          cb.checked = selectAll.checked;
        });
        this._updateBatchUI(content);
      };
    }

    // 批量操作：单个复选框变化
    content.querySelectorAll('.ticket-checkbox[data-ticket]').forEach(cb => {
      cb.addEventListener('change', () => this._updateBatchUI(content));
    });

    // 批量操作：批量接单
    const btnBatchTake = content.querySelector('#btn-batch-take');
    if (btnBatchTake) {
      btnBatchTake.onclick = async () => {
        const checked = [...content.querySelectorAll('.ticket-checkbox[data-ticket]:checked')];
        if (checked.length === 0) { this.toast('请选择工单', 'error'); return; }
        const ids = checked.map(cb => Number(cb.dataset.ticket));
        const res = await API.batchTake(ids);
        if (res.code === 0) {
          this.toast(`已接单 ${res.data?.success || 0} 个工单`, 'success');
          this._renderAdminTickets(document.getElementById('admin-tab-content'));
        } else {
          this.toast(res.message || '批量接单失败', 'error');
        }
      };
    }

    // 批量操作：批量关闭
    const btnBatchClose = content.querySelector('#btn-batch-close');
    if (btnBatchClose) {
      btnBatchClose.onclick = async () => {
        const checked = [...content.querySelectorAll('.ticket-checkbox[data-ticket]:checked')];
        if (checked.length === 0) { this.toast('请选择工单', 'error'); return; }
        if (!confirm(`确定要关闭选中的 ${checked.length} 个工单吗？`)) return;
        const ids = checked.map(cb => Number(cb.dataset.ticket));
        const res = await API.batchClose(ids);
        if (res.code === 0) {
          this.toast(`已关闭 ${res.data?.success || 0} 个工单`, 'success');
          this._renderAdminTickets(document.getElementById('admin-tab-content'));
        } else {
          this.toast(res.message || '批量关闭失败', 'error');
        }
      };
    }
  },

  _updateBatchUI(content) {
    const allCbs = content.querySelectorAll('.ticket-checkbox[data-ticket]');
    const checked = [...allCbs].filter(cb => cb.checked);
    const count = checked.length;
    const btnTake = content.querySelector('#btn-batch-take');
    const btnClose = content.querySelector('#btn-batch-close');
    const countEl = content.querySelector('#batch-count');
    const selectAll = content.querySelector('#admin-select-all');

    const show = count > 0;
    if (btnTake) btnTake.style.display = show ? '' : 'none';
    if (btnClose) btnClose.style.display = show ? '' : 'none';
    if (countEl) {
      countEl.style.display = show ? '' : 'none';
      countEl.textContent = `已选 ${count} 个工单`;
    }
    // 如果全部选中，同步全选框状态
    if (selectAll) selectAll.checked = count === allCbs.length;
  },

  _bindAdminSearch() {
    const doSearch = async () => {
      const params = { pageSize: 50 };
      const keyword = document.getElementById('admin-search').value.trim();
      const status = document.getElementById('admin-filter-status').value;
      const priority = document.getElementById('admin-filter-priority').value;
      const category = document.getElementById('admin-filter-category').value;
      const handlerId = document.getElementById('admin-filter-handler').value;
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;
      if (handlerId) params.handler_id = handlerId;
      const res = await API.getTickets(params);
      const filtered = res.code === 0 ? (res.data.list || res.data || []) : [];
      const list = document.getElementById('admin-ticket-list');
      const statusText = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
      if (!list) return;
      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-title">暂无匹配工单</div><div class="empty-state-desc">尝试调整筛选条件</div></div>';
      } else {
        list.innerHTML = filtered.map((t, i) => '<div class="stagger-item" style="animation-delay:' + (i*0.04) + 's">' + this._buildAdminTicketItem(t, statusText) + '</div>').join('');
        list.querySelectorAll('[data-ticket]').forEach(item => {
          item.onclick = () => this.navigate('ticket-detail', { id: item.dataset.ticket });
        });
        // 重新绑定批量操作事件
        const content = document.getElementById('admin-tab-content');
        if (content) {
          content.querySelectorAll('.ticket-checkbox[data-ticket]').forEach(cb => {
            cb.addEventListener('change', () => this._updateBatchUI(content));
          });
          this._updateBatchUI(content);
        }
      }
    };
    const searchBtn = document.getElementById('btn-admin-search');
    const resetBtn = document.getElementById('btn-admin-reset');
    if (searchBtn) searchBtn.onclick = doSearch;
    if (resetBtn) resetBtn.onclick = () => {
      ['admin-search','admin-filter-status','admin-filter-priority','admin-filter-category','admin-filter-handler'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      doSearch();
    };
  },

  // ====== 分类管理 ======
  async _renderAdminCategories(content) {
    const res = await API.getCategories();
    const cats = res.code === 0 ? res.data : [];
    content.innerHTML = `
      <div class="page-title">分类管理</div>
      <div class="card" style="margin-bottom:16px;padding:16px 20px">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;font-weight:600">添加分类</div>
        <form data-action="add-category" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px"><label>名称</label><input class="form-input" name="cat-name" required placeholder="分类名称"></div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px"><label>图标</label><input class="form-input" name="cat-icon" placeholder="gear"></div>
          <div class="form-group" style="margin-bottom:0;width:80px"><label>排序</label><input class="form-input" name="cat-sort" type="number" value="0"></div>
          <button type="submit" class="btn btn-primary btn-sm" style="height:38px">添加</button>
        </form>
      </div>
      <div class="card">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;font-weight:600">分类列表 (${cats.length})</div>
        ${cats.length === 0 ? '<div class="empty-state"><div class="empty-text">暂无分类</div></div>' :
          cats.map(c => `
            <div class="cat-edit-row" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:18px;width:30px">⚙</span>
              <input class="form-input cat-edit-name" value="${this.escapeHtml(c.name)}" style="flex:1;min-width:120px" data-id="${c.id}">
              <input class="form-input cat-edit-icon" value="${this.escapeHtml(c.icon || 'gear')}" style="width:80px" data-id="${c.id}">
              <input class="form-input cat-edit-sort" value="${c.sort_order || 0}" type="number" style="width:60px" data-id="${c.id}">
              <button class="btn btn-sm btn-secondary cat-save-btn" data-id="${c.id}">保存</button>
              <button class="btn btn-sm btn-danger cat-del-btn" data-id="${c.id}" data-name="${this.escapeHtml(c.name)}">删除</button>
            </div>
          `).join('')
        }
      </div>
    `;

    // Save button
    content.querySelectorAll('.cat-save-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const name = content.querySelector('.cat-edit-name[data-id="' + id + '"]').value.trim();
        const icon = content.querySelector('.cat-edit-icon[data-id="' + id + '"]').value.trim();
        const sortOrder = parseInt(content.querySelector('.cat-edit-sort[data-id="' + id + '"]').value) || 0;
        const res = await API.updateCategory(id, name, icon, sortOrder);
        if (res.code === 0) { this.toast('更新成功', 'success'); } else { this.toast(res.message, 'error'); }
      };
    });

    // Delete button
    content.querySelectorAll('.cat-del-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('确定要删除分类 "' + btn.dataset.name + '" 吗？')) return;
        const res = await API.deleteCategory(btn.dataset.id);
        if (res.code === 0) { this.toast('已删除', 'success'); this._renderAdminCategories(content); }
        else { this.toast(res.message, 'error'); }
      };
    });
  },

  handleAddCategory() {
    const name = document.querySelector('[name="cat-name"]').value.trim();
    const icon = document.querySelector('[name="cat-icon"]').value.trim() || 'gear';
    const sortOrder = parseInt(document.querySelector('[name="cat-sort"]').value) || 0;
    API.createCategory(name, icon, sortOrder).then(res => {
      if (res.code === 0) { this.toast('分类已添加', 'success'); this._renderAdminCategories(document.getElementById('admin-tab-content')); }
      else { this.toast(res.message, 'error'); }
    });
  },

  handleEditCategory() { /* handled inline */ },

  // ====== 用户管理 ======
  async _renderAdminUsers(content) {
    const res = await API.getUserList({ pageSize: 100 });
    const users = res.code === 0 ? (res.data.list || []) : [];
    const roleMap = { admin: '管理员', staff: '处理员', user: '普通用户' };
    content.innerHTML = `
      <div class="page-title">用户管理</div>
      <div class="card">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;font-weight:600">用户列表 (${res.code === 0 ? res.data.total : 0})</div>
        ${users.length === 0 ? '<div class="empty-state"><div class="empty-text">暂无用户</div></div>' :
          '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:8px;text-align:left">用户名</th><th style="padding:8px;text-align:left">姓名</th><th style="padding:8px;text-align:left">角色</th><th style="padding:8px;text-align:left">状态</th><th style="padding:8px;text-align:right">操作</th></tr></thead><tbody>' +
          users.map(u => '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">' + this.escapeHtml(u.username) + '</td><td style="padding:8px">' + this.escapeHtml(u.real_name) + '</td><td style="padding:8px"><select class="form-select user-role-select" data-id="' + u.id + '" style="padding:2px 6px;font-size:12px"><option value="user"' + (u.role === 'user' ? ' selected' : '') + '>普通用户</option><option value="staff"' + (u.role === 'staff' ? ' selected' : '') + '>处理员</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>管理员</option></select></td><td style="padding:8px"><span style="color:' + (u.status === 'disabled' ? 'var(--danger)' : 'var(--success)') + '">' + (u.status === 'disabled' ? '已禁用' : '正常') + '</span></td><td style="padding:8px;text-align:right"><div style="display:flex;gap:4px;justify-content:flex-end"><button class="btn btn-sm ' + (u.status === 'active' ? 'btn-warning' : 'btn-success') + ' user-toggle-btn" data-id="' + u.id + '" data-status="' + u.status + '">' + (u.status === 'active' ? '禁用' : '启用') + '</button><button class="btn btn-sm btn-secondary user-reset-btn" data-id="' + u.id + '" data-name="' + this.escapeHtml(u.username) + '">重置密码</button></div></td></tr>').join('') +
          '</tbody></table></div>'
        }
      </div>
    `;

    // Role change
    content.querySelectorAll('.user-role-select').forEach(sel => {
      sel.onchange = async () => {
        const res = await API.updateUserRole(sel.dataset.id, sel.value);
        this.toast(res.code === 0 ? '角色已更新' : res.message, res.code === 0 ? 'success' : 'error');
      };
    });

    // Toggle status
    content.querySelectorAll('.user-toggle-btn').forEach(btn => {
      btn.onclick = async () => {
        const newStatus = btn.dataset.status === 'active' ? 'disabled' : 'active';
        const res = await API.updateUserStatus(btn.dataset.id, newStatus);
        if (res.code === 0) { this.toast(newStatus === 'active' ? '已启用' : '已禁用', 'success'); this._renderAdminUsers(content); }
        else { this.toast(res.message, 'error'); }
      };
    });

    // Reset password
    content.querySelectorAll('.user-reset-btn').forEach(btn => {
      btn.onclick = () => {
        const pwd = prompt('为 ' + btn.dataset.name + ' 设置新密码（至少6位）：');
        if (!pwd || pwd.length < 6) { this.toast('密码至少6位', 'error'); return; }
        API.resetUserPassword(btn.dataset.id, pwd).then(res => {
          this.toast(res.code === 0 ? '密码已重置' : res.message, res.code === 0 ? 'success' : 'error');
        });
      };
    });
  },

  // ====== 操作日志 ======
  async _renderAdminLogs(content) {
    const res = await API.getAuditLogs({ pageSize: 100 });
    const logs = res.code === 0 ? (res.data.list || []) : [];
    const actionMap = { '创建工单': '📝', '接单': '🤝', '回复': '💬', '转派': '↗️', '添加分类': '📂', '删除分类': '🗑️' };

    content.innerHTML = `
      <div class="page-title">操作日志</div>
      <div class="card">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;font-weight:600">最近操作记录</div>
        ${logs.length === 0 ? '<div class="empty-state"><div class="empty-text">暂无操作记录</div></div>' :
          logs.map(l => '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="font-size:16px">' + (actionMap[l.action] || '📌') + '</span><span style="font-weight:600;min-width:60px">' + this.escapeHtml(l.action) + '</span><span style="color:var(--accent)">' + this.escapeHtml(l.user_name) + '</span><span style="color:var(--text-muted);flex:1">' + this.escapeHtml(l.detail) + '</span><span style="color:var(--text-muted);font-size:12px">' + this.fmtTime(l.created_at) + '</span></div>').join('')
        }
      </div>
    `;
  },

  /* ========== 个人中心 ========== */
  async renderProfile() {
    const el = document.getElementById('page-profile');
    this.showSkeleton(el, 'detail');

    let profile = null;
    let profileError = null;
    let notifications = { list: [], unreadCount: 0 };

    try {
      const [profileRes, notifRes] = await Promise.all([
        API.getProfile().catch(e => ({ code: -1, message: '网络错误：' + (e.message || '无法连接服务器') })),
        API.getNotifications({ pageSize: 5 }).catch(() => ({ code: 0, data: { list: [], unreadCount: 0 } }))
      ]);

      if (profileRes.code === 0) {
        profile = profileRes.data;
      } else {
        profileError = profileRes.message || '获取个人信息失败';
      }

      if (notifRes.code === 0) {
        notifications = notifRes.data || { list: [], unreadCount: 0 };
      }
      this.unreadCount = notifications.unreadCount || 0;
    } catch (e) {
      profileError = '加载失败：' + (e.message || '未知错误');
    }

    // 如果后端接口失败，使用本地缓存的用户信息作为兜底
    if (!profile && this.user) {
      profile = {
        id: this.user.id,
        username: this.user.username,
        real_name: this.user.realName || this.user.real_name || '',
        role: this.user.role,
        avatar: this.user.avatar || '',
        phone: this.user.phone || '',
        ticketCount: 0,
        resolvedCount: 0
      };
    }

    if (!profile) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-text">${profileError ? this.escapeHtml(profileError) : '加载失败'}</div>
          <button class="btn btn-primary" style="margin-top:16px" id="btn-retry-profile">重新加载</button>
        </div>`;
      el.querySelector('#btn-retry-profile').onclick = () => this.renderProfile();
      return;
    }

    el.innerHTML = `
      <div class="page-title">个人中心</div>

      ${profileError ? `
      <div class="card" style="margin-bottom:16px;border-color:rgba(255,82,82,0.3);background:rgba(255,82,82,0.05)">
        <div style="font-size:13px;color:var(--danger)">⚠️ ${this.escapeHtml(profileError)}，以下为本地缓存信息</div>
      </div>` : ''}

      <div class="stats-grid" style="grid-template-columns:1fr 1fr">
        <div class="card">
          <div style="font-size:14px;color:var(--accent);margin-bottom:16px;font-weight:600">👤 基本信息</div>
          <form data-action="update-profile">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input class="form-input" value="${this.escapeHtml(profile.username)}" disabled style="opacity:0.6">
            </div>
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input class="form-input" name="profile-realname" value="${this.escapeHtml(profile.real_name || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">手机号</label>
              <input class="form-input" name="profile-phone" value="${this.escapeHtml(profile.phone || '')}" placeholder="请输入手机号">
            </div>
            <div class="form-group">
              <label class="form-label">角色</label>
              <input class="form-input" value="${profile.role === 'admin' ? '管理员' : profile.role === 'staff' ? '处理员' : '普通用户'}" disabled style="opacity:0.6">
            </div>
            <button type="submit" class="btn btn-primary btn-sm">保存资料</button>
          </form>
        </div>

        <div class="card">
          <div style="font-size:14px;color:var(--accent);margin-bottom:16px;font-weight:600">🔒 修改密码</div>
          <form data-action="change-password">
            <div class="form-group">
              <label class="form-label">旧密码</label>
              <input class="form-input" type="password" name="old-password" placeholder="请输入旧密码" required>
            </div>
            <div class="form-group">
              <label class="form-label">新密码</label>
              <input class="form-input" type="password" name="new-password" placeholder="至少6位新密码" required minlength="6">
            </div>
            <button type="submit" class="btn btn-warning btn-sm">修改密码</button>
          </form>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-top:0">
        <div class="stat-card" style="text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${profile.ticketCount || 0}</div>
          <div style="font-size:12px;color:var(--text-secondary)">提交工单</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--success)">${profile.resolvedCount || 0}</div>
          <div style="font-size:12px;color:var(--text-secondary)">已解决</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--warning)">${notifications.unreadCount || 0}</div>
          <div style="font-size:12px;color:var(--text-secondary)">未读通知</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:14px;color:var(--accent);font-weight:600">🔔 最新通知</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" id="btn-read-all">全部已读</button>
            <button class="btn btn-sm btn-secondary" data-page="notifications">查看全部 →</button>
          </div>
        </div>
        ${notifications.list.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">暂无通知</div>' :
          notifications.list.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" data-ticket="${n.ticket_id}" ${!n.is_read ? `data-notif-id="${n.id}"` : ''} style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--transition)">
              <div style="font-size:14px;font-weight:${n.is_read ? '400' : '600'};color:${n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)'}">
                ${n.is_read ? '' : '🔵 '}${this.escapeHtml(n.title)}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${this.escapeHtml(n.content)} · ${this.fmtTime(n.created_at)}</div>
            </div>
          `).join('')}
      </div>
    `;

    // Read all
    const btnReadAll = document.getElementById('btn-read-all');
    if (btnReadAll) btnReadAll.onclick = async () => {
      await API.readAllNotifications();
      this.loadUnreadCount();
      this.renderProfile();
    };

    // Notification click -> mark read + go to detail
    el.querySelectorAll('.notif-item').forEach(item => {
      item.onclick = async () => {
        const notifId = item.dataset.notifId;
        const ticketId = item.dataset.ticket;
        // 忽略标记已读失败，不影响跳转
        if (notifId) {
          try { await API.readNotification(notifId); } catch (e) {
            console.warn('标记通知已读失败:', notifId, e);
          }
        }
        // 防御：避免 ticketId 为无效值
        if (!ticketId || ticketId === 'undefined' || ticketId === 'null') {
          this.toast('通知关联的工单不存在', 'error');
          return;
        }
        this.navigate('ticket-detail', { id: ticketId });
      };
    });

    // Nav links
    el.querySelectorAll('[data-page]').forEach(btn => {
      btn.onclick = () => this.navigate(btn.dataset.page);
    });
  },

  async handleUpdateProfile() {
    const realName = document.querySelector('input[name="profile-realname"]').value.trim();
    const phone = document.querySelector('input[name="profile-phone"]').value.trim();
    const res = await API.updateProfile({ realName, phone });
    if (res.code === 0) {
      // Update local user info
      this.user.realName = realName || this.user.realName;
      this.user.phone = phone || this.user.phone;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.toast('资料更新成功', 'success');
    } else {
      this.toast(res.message || '更新失败', 'error');
    }
  },

  async handleChangePassword() {
    const oldPassword = document.querySelector('input[name="old-password"]').value.trim();
    const newPassword = document.querySelector('input[name="new-password"]').value.trim();
    if (!oldPassword || !newPassword) { this.toast('请填写完整', 'error'); return; }
    if (newPassword.length < 6) { this.toast('新密码至少6位', 'error'); return; }
    const res = await API.changePassword(oldPassword, newPassword);
    if (res.code === 0) {
      this.toast('密码修改成功，请重新登录', 'success');
      setTimeout(() => this.logout(), 1500);
    } else {
      this.toast(res.message || '修改失败', 'error');
    }
  },

  /* ========== 通知页面 ========== */
  async renderNotifications() {
    const el = document.getElementById('page-notifications');
    this.showSkeleton(el, 'card', 5);

    const res = await API.getNotifications({ pageSize: 100 });
    const data = res.code === 0 ? res.data : { list: [], unreadCount: 0 };

    el.innerHTML = `
      <div class="page-title">通知中心</div>
      ${data.list.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-illustration"><svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="50" r="25" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><path d="M50 55a5 3 0 1 0 0-6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/><path d="M70 55a5 3 0 1 0 0-6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/><path d="M50 65a15 10 45 1 0 20 0" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/><line x1="35" y1="80" x2="85" y2="80" stroke="currentColor" stroke-width="2" opacity="0.15"/><line x1="40" y1="88" x2="80" y2="88" stroke="currentColor" stroke-width="2" opacity="0.1"/></svg></div>
          <div class="empty-state-title">暂无通知</div>
          <div class="empty-state-desc">当工单有新的进展时，会在这里收到通知</div>
        </div>
      ` : `
        <button class="btn btn-sm btn-secondary" id="btn-read-all2" style="margin-bottom:12px">✅ 全部已读</button>
        <div class="notif-list">
          ${data.list.map((n, i) => `
            <div class="notif-card stagger-item ${n.is_read ? '' : 'unread'}" data-ticket="${n.ticket_id}" ${!n.is_read ? `data-notif-id="${n.id}"` : ''} style="animation-delay:${i*0.04}s">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="font-weight:${n.is_read?'400':'600'};font-size:14px">${n.is_read?'':'🔵 '}${this.escapeHtml(n.title)}</div>
                <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;margin-left:8px">${this.fmtTime(n.created_at)}</span>
              </div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:6px">${this.escapeHtml(n.content)}</div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    document.getElementById('btn-read-all2').onclick = async () => {
      await API.readAllNotifications();
      this.loadUnreadCount();
      this.navigate('notifications');
    };

    el.querySelectorAll('.notif-card').forEach(card => {
      card.onclick = async () => {
        const notifId = card.dataset.notifId;
        const ticketId = card.dataset.ticket;
        // 忽略标记已读失败，不影响跳转
        if (notifId) {
          try { await API.readNotification(notifId); } catch (e) {
            console.warn('标记通知已读失败:', notifId, e);
          }
        }
        this.loadUnreadCount();
        // 防御：避免 ticketId 为无效值
        if (!ticketId || ticketId === 'undefined' || ticketId === 'null') {
          this.toast('通知关联的工单不存在', 'error');
          return;
        }
        this.navigate('ticket-detail', { id: ticketId });
      };
    });
  },

  /* ========== 知识库 ========== */
  async renderKBList(keyword = '', page = 1, category = '') {
    const el = document.getElementById('page-knowledge-base');
    if (!el) { console.warn('知识库页面未找到'); return; }
    this.showSkeleton(el, 'card', 4);
    
    const params = { page, pageSize: 12 };
    if (keyword) params.keyword = keyword;
    if (category) params.category = category;
    const [kbRes, catRes] = await Promise.all([
      API.getKBList(params),
      API.getKBCategories()
    ]);
    
    const articles = kbRes.code === 0 ? (kbRes.data.list || []) : [];
    const total = kbRes.code === 0 ? (kbRes.data.total || 0) : 0;
    const categories = catRes.code === 0 ? catRes.data : [];
    const totalPages = Math.max(1, Math.ceil(total / 12));
    const isStaff = this.user.role === 'admin' || this.user.role === 'staff';
    
    el.innerHTML = `
      <div class="page-title">📚 知识库</div>
      <div class="filter-bar" style="margin-bottom:16px">
        <input class="form-input search-input" id="kb-search" placeholder="搜索文章..." value="${this.escapeHtml(keyword)}">
        <button class="btn btn-primary btn-sm" id="btn-kb-search">搜索</button>
        ${isStaff ? `<button class="btn btn-success btn-sm" id="btn-kb-create" style="margin-left:auto">✏️ 写文章</button>` : ''}
      </div>
      ${categories.length ? `
      <div class="filter-bar" style="gap:6px;margin-bottom:16px">
        ${categories.map(c => `<span class="rating-tag" style="cursor:pointer" data-kb-cat="${this.escapeHtml(c)}">📂 ${this.escapeHtml(c)}</span>`).join('')}
      </div>` : ''}
      ${articles.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-illustration"><svg viewBox="0 0 120 120" fill="none"><rect x="20" y="15" width="80" height="90" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/><rect x="30" y="30" width="60" height="4" rx="2" fill="currentColor" opacity="0.15"/><rect x="30" y="42" width="45" height="3" rx="1.5" fill="currentColor" opacity="0.1"/></svg></div>
          <div class="empty-state-title">暂无知识库文章</div>
          <div class="empty-state-desc">知识库文章将帮助用户自助解决问题</div>
          ${isStaff ? `<div class="empty-state-actions"><button class="btn btn-primary btn-sm" id="btn-kb-create2">✏️ 创建第一篇文章</button></div>` : ''}
        </div>
      ` : `
        <div class="kb-grid">
          ${articles.map((a, i) => `
            <div class="kb-card stagger-item card-hoverable" data-kb-id="${a.id}" style="animation-delay:${i*0.06}s">
              <div class="kb-card-title">${this.escapeHtml(a.title)}</div>
              <div class="kb-card-meta">
                ${a.category ? `<span class="cat-badge">📂 ${this.escapeHtml(a.category)}</span>` : ''}
                ${a.tags ? a.tags.split(',').map(t => `<span class="tag-chip">${this.escapeHtml(t.trim())}</span>`).join('') : ''}
              </div>
              <div class="kb-card-footer">
                <span>👁 ${a.view_count || 0}</span>
                <span>👍 ${a.helpful_count || 0}</span>
                <span>🕐 ${this.fmtTime(a.created_at)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${totalPages > 1 ? this._buildPagination(page, totalPages, '', 'knowledge-base') : ''}
      `}
    `;
    
    el.querySelectorAll('[data-kb-id]').forEach(card => {
      card.onclick = () => this.navigate('kb-detail', { id: card.dataset.kbId });
    });
    const searchBtn = el.querySelector('#btn-kb-search');
    if (searchBtn) searchBtn.onclick = () => this.renderKBList(el.querySelector('#kb-search').value.trim(), 1);
    const searchInput = el.querySelector('#kb-search');
    if (searchInput) searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') this.renderKBList(searchInput.value.trim(), 1);
    };
    // 绑定所有创建按钮（空状态和搜索栏中可能同时存在两个按钮）
    el.querySelectorAll('#btn-kb-create, #btn-kb-create2').forEach(btn => {
      btn.onclick = () => this._showKBEditor();
    });
    // 分类标签筛选
    el.querySelectorAll('[data-kb-cat]').forEach(tag => {
      tag.onclick = () => this.renderKBList(keyword, 1, tag.dataset.kbCat);
    });
    el.querySelectorAll('[data-page-num]').forEach(btn => {
      btn.onclick = () => this.renderKBList(keyword, parseInt(btn.dataset.pageNum), category);
    });
  },
  
  _showKBEditor(existingArticle = null) {
    const isEdit = !!existingArticle;
    const modal = document.getElementById('rating-modal');
    const overlay = document.getElementById('rating-modal-overlay');
    if (!modal || !overlay) return;
    
    modal.innerHTML = `
      <div class="rating-modal-content" style="text-align:left">
        <div class="modal-title">${isEdit ? '✏️ 编辑文章' : '✏️ 创建知识库文章'}</div>
        <form data-action="kb-save">
          <div class="form-group">
            <label class="form-label">标题 *</label>
            <input class="form-input" name="kb-title" value="${this.escapeHtml(existingArticle?.title || '')}" required placeholder="文章标题">
          </div>
          <div class="form-group">
            <label class="form-label">分类</label>
            <input class="form-input" name="kb-category" value="${this.escapeHtml(existingArticle?.category || '')}" placeholder="如：常见问题、操作指南">
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input class="form-input" name="kb-tags" value="${this.escapeHtml(existingArticle?.tags || '')}" placeholder="如：登录,账号,密码">
          </div>
          <div class="form-group">
            <label class="form-label">内容 *</label>
            <textarea class="form-textarea" name="kb-content" required placeholder="编写文章内容..." style="min-height:200px">${this.escapeHtml(existingArticle?.content || '')}</textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="btn-kb-cancel">取消</button>
            <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '发布'}</button>
          </div>
        </form>
      </div>
    `;
    
    overlay.classList.add('active');
    document.getElementById('btn-kb-cancel').onclick = () => { overlay.classList.remove('active'); };
    
    const form = modal.querySelector('form[data-action="kb-save"]');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const title = form.querySelector('[name="kb-title"]').value.trim();
      const content = form.querySelector('[name="kb-content"]').value.trim();
      const category = form.querySelector('[name="kb-category"]').value.trim();
      const tags = form.querySelector('[name="kb-tags"]').value.trim();
      if (!title || !content) { this.toast('标题和内容不能为空', 'error'); return; }
      
      let res;
      if (isEdit) {
        res = await API.updateKB(existingArticle.id, { title, content, category, tags });
      } else {
        res = await API.createKB({ title, content, category, tags });
      }
      overlay.classList.remove('active');
      if (res.code === 0) {
        this.toast(isEdit ? '文章已更新' : '文章已发布', 'success');
        this.navigate('knowledge-base');
      } else { this.toast(res.message || '操作失败', 'error'); }
    };
  },
  
  async renderKBDetail() {
    const el = document.getElementById('page-kb-detail');
    if (!el) { console.warn('知识库详情页未找到'); return; }
    this.showSkeleton(el, 'detail');
    
    const id = this.currentParams?.id;
    if (!id) { el.innerHTML = '<div class="empty-state"><div class="empty-state-title">文章不存在</div><div class="empty-state-actions"><button class="btn btn-primary btn-sm" data-page="knowledge-base">← 返回知识库</button></div></div>'; return; }
    
    const res = await API.getKBDetail(id);
    if (res.code !== 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-title">${res.message}</div><div class="empty-state-actions"><button class="btn btn-primary btn-sm" data-page="knowledge-base">← 返回知识库</button></div></div>`;
      return;
    }
    
    const a = res.data;
    const isStaff = this.user.role === 'admin' || this.user.role === 'staff';
    const isAuthor = a.author_id === this.user.id;
    
    el.innerHTML = `
      <button class="btn btn-secondary btn-sm" style="margin-bottom:16px" data-page="knowledge-base">← 返回知识库</button>
      <div class="card" style="margin-bottom:16px">
        <h2 style="font-size:22px;margin-bottom:12px">${this.escapeHtml(a.title)}</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
          <span>👤 ${this.escapeHtml(a.author_name)}</span>
          <span>🕐 ${this.fmtTime(a.created_at)}</span>
          ${a.updated_at && a.updated_at !== a.created_at ? `<span>✏️ 更新于 ${this.fmtTime(a.updated_at)}</span>` : ''}
          <span>👁 ${a.view_count || 0} 阅读</span>
          ${a.category ? `<span>📂 ${this.escapeHtml(a.category)}</span>` : ''}
        </div>
        ${a.tags ? `<div style="margin-bottom:16px">${a.tags.split(',').map(t => `<span class="rating-tag" style="display:inline-block;margin-right:6px">${this.escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
        <div class="kb-article-content" style="line-height:1.8;font-size:15px;color:var(--text-secondary);white-space:pre-wrap">${this.escapeHtml(a.content)}</div>
        <div style="display:flex;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--border);align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm btn-success" id="btn-kb-helpful">👍 有帮助 (${a.helpful_count || 0})</button>
          ${(isStaff || isAuthor) ? `<button class="btn btn-sm btn-secondary" id="btn-kb-edit">✏️ 编辑</button>` : ''}
          ${isStaff ? `<button class="btn btn-sm btn-danger" id="btn-kb-delete">🗑️ 删除</button>` : ''}
          ${a.source_ticket_id ? `<button class="btn btn-sm btn-secondary" data-ticket="${a.source_ticket_id}">📋 查看源工单</button>` : ''}
        </div>
      </div>
    `;
    
    el.querySelector('[data-page="knowledge-base"]').onclick = () => this.navigate('knowledge-base');
    const helpfulBtn = el.querySelector('#btn-kb-helpful');
    if (helpfulBtn) helpfulBtn.onclick = async () => {
      await API.markKBHelpful(id);
      this.toast('感谢反馈！', 'success');
      helpfulBtn.textContent = '👍 有帮助 (' + ((a.helpful_count || 0) + 1) + ')';
      helpfulBtn.disabled = true;
    };
    const editBtn = el.querySelector('#btn-kb-edit');
    if (editBtn) editBtn.onclick = () => this._showKBEditor(a);
    const deleteBtn = el.querySelector('#btn-kb-delete');
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('确定删除此文章吗？')) return;
      const r = await API.deleteKB(id);
      if (r.code === 0) { this.toast('文章已删除', 'success'); this.navigate('knowledge-base'); }
      else this.toast(r.message, 'error');
    };
    const sourceBtn = el.querySelector('[data-ticket]');
    if (sourceBtn) sourceBtn.onclick = () => this.navigate('ticket-detail', { id: sourceBtn.dataset.ticket });
  },

  /* ========== 工具函数 ========== */
  fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('hashchange', () => App.route());
