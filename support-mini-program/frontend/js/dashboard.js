/**
 * 仪表盘数据可视化模块
 */
const Dashboard = {
  charts: {},
  token: localStorage.getItem('token'),

  async init() {
    if (!this.token) { window.location.href = '/'; return; }
    await this.loadMetrics('month');
    this.loadTrend();
    this.loadCategoryDist();
    this.loadStaffPerf('month');
    this.loadSla('month');

    document.getElementById('period-select').addEventListener('change', (e) => {
      const period = e.target.value;
      this.loadMetrics(period);
      this.loadStaffPerf(period);
      this.loadSla(period);
    });
  },

  async api(path) {
    const res = await fetch('http://localhost:3000' + path, {
      headers: { 'Authorization': this.token }
    });
    if (res.status === 401) { window.location.href = '/'; return null; }
    return res.json();
  },

  async loadMetrics(period) {
    try {
      const res = await this.api('/api/tickets/dashboard/summary?period=' + period);
      if (!res || res.code !== 0) return;
      const d = res.data;
      document.getElementById('met-new').textContent = d.newTickets || 0;
      document.getElementById('met-resolved').textContent = d.resolved || 0;
      document.getElementById('met-avg-time').textContent = (d.avgResolveHours || '-') + ' h';
      document.getElementById('met-avg-rating').textContent = d.avgRating || '-';
    } catch (e) { console.error('加载指标失败:', e); }
  },

  async loadTrend() {
    try {
      const res = await this.api('/api/tickets/dashboard/trend?period=30d');
      if (!res || res.code !== 0) return;
      const data = res.data || [];
      const labels = data.map(d => d.date);
      const created = data.map(d => d.created || 0);
      const resolved = data.map(d => d.resolved || 0);

      if (this.charts.trend) this.charts.trend.destroy();
      this.charts.trend = new Chart(document.getElementById('trend-chart'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '新增', data: created, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', fill: true, tension: 0.3 },
            { label: '已解决', data: resolved, borderColor: '#00e676', backgroundColor: 'rgba(0,230,118,0.1)', fill: true, tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8899aa' } } },
          scales: {
            x: { ticks: { color: '#556677' }, grid: { color: 'rgba(0,212,255,0.06)' } },
            y: { ticks: { color: '#556677' }, grid: { color: 'rgba(0,212,255,0.06)' } }
          }
        }
      });
    } catch (e) { console.error('趋势图失败:', e); }
  },

  async loadCategoryDist() {
    try {
      const res = await this.api('/api/tickets/dashboard/category-distribution');
      if (!res || res.code !== 0) return;
      const data = res.data || [];
      const categories = [...new Set(data.map(d => d.category))];
      const statuses = [...new Set(data.map(d => d.status))];
      const statusColors = { pending: '#ffab40', processing: '#448aff', resolved: '#00e676' };

      const datasets = statuses.map(status => ({
        label: status, data: categories.map(cat => {
          const item = data.find(d => d.category === cat && d.status === status);
          return item ? item.cnt : 0;
        }), backgroundColor: statusColors[status] || '#8899aa'
      }));

      if (this.charts.category) this.charts.category.destroy();
      this.charts.category = new Chart(document.getElementById('category-chart'), {
        type: 'bar',
        data: { labels: categories, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8899aa' } } },
          scales: {
            x: { stacked: true, ticks: { color: '#556677' }, grid: { color: 'rgba(0,212,255,0.06)' } },
            y: { stacked: true, ticks: { color: '#556677' }, grid: { color: 'rgba(0,212,255,0.06)' } }
          }
        }
      });
    } catch (e) { console.error('分类图失败:', e); }
  },

  async loadStaffPerf(period) {
    try {
      const res = await this.api('/api/tickets/dashboard/staff-performance?period=' + period);
      if (!res || res.code !== 0) return;
      const data = res.data || [];
      const labels = data.map(d => d.name);
      const counts = data.map(d => d.resolved_count || 0);
      const avgs = data.map(d => Math.round((d.avg_hours || 0) * 10) / 10);

      if (this.charts.staff) this.charts.staff.destroy();
      this.charts.staff = new Chart(document.getElementById('staff-chart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: '解决数', data: counts, backgroundColor: 'rgba(0,212,255,0.6)', borderColor: '#00d4ff', borderWidth: 1 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8899aa' } } },
          scales: {
            x: { ticks: { color: '#556677' }, grid: { color: 'rgba(0,212,255,0.06)' } },
            y: { ticks: { color: '#8899aa' }, grid: { display: false } }
          }
        }
      });
    } catch (e) { console.error('绩效图失败:', e); }
  },

  async loadSla(period) {
    try {
      const res = await this.api('/api/tickets/dashboard/sla-compliance?period=' + period);
      if (!res || res.code !== 0) return;
      const d = res.data;
      document.getElementById('sla-gauge-value').textContent = d.complianceRate + '%';
      document.getElementById('sla-detail').innerHTML = `
        总工单: ${d.total || 0}<br>
        已解决: ${d.resolvedCount || 0}<br>
        按时响应: ${d.respondedOnTime || 0}
      `;
    } catch (e) { console.error('SLA数据失败:', e); }
  }
};

Dashboard.init();
