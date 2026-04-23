const API = '/api/v1';
let token = localStorage.getItem('token') || '';
let currentUser = null;

// ── Utilities ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data;
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function badge(value, extra = '') {
  const cls = (value || '').toLowerCase().replace(/_/g, '-');
  return `<span class="badge badge-${cls} ${extra}">${value}</span>`;
}

function fmt(val) {
  if (val == null) return '-';
  if (val instanceof Date || (typeof val === 'string' && val.includes('T'))) {
    return new Date(val).toLocaleString('zh-CN');
  }
  return val;
}

// ── Auth ───────────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('login-userId').value.trim();
  const email = document.getElementById('login-email').value.trim();
  const role = document.getElementById('login-role').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const data = await api('POST', '/auth/login', { userId, email, role });
    token = data.token;
    localStorage.setItem('token', token);
    currentUser = { userId, email, role };
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try { await api('POST', '/auth/logout'); } catch (_) {}
  token = '';
  localStorage.removeItem('token');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
});

function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-info').textContent = `${currentUser.role}`;
  navigateTo('dashboard');
}

// ── Navigation ─────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

function navigateTo(page) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  const loaders = { dashboard: loadDashboard, servers: loadServers, allocations: loadAllocations, alerts: loadAlerts, clusters: loadClusters };
  loaders[page]?.();
}

// ── Dashboard ──────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const [servers, allocs, alerts, clusters, health] = await Promise.allSettled([
      api('GET', '/servers'),
      api('GET', '/allocations'),
      api('GET', '/alerts'),
      api('GET', '/clusters'),
      fetch('/health').then(r => r.json()),
    ]);
    document.getElementById('stat-servers').textContent = servers.status === 'fulfilled' ? servers.value.length : '-';
    document.getElementById('stat-allocations').textContent = allocs.status === 'fulfilled' ? allocs.value.filter(a => a.status === 'ACTIVE').length : '-';
    document.getElementById('stat-alerts').textContent = alerts.status === 'fulfilled' ? alerts.value.filter(a => a.status === 'FIRING').length : '-';
    document.getElementById('stat-clusters').textContent = clusters.status === 'fulfilled' ? clusters.value.length : '-';
    if (health.status === 'fulfilled') {
      const h = health.value;
      document.getElementById('health-status').innerHTML =
        `系统状态: <strong style="color:${h.status==='ok'?'var(--success)':'var(--warning)'}">
        ${h.status.toUpperCase()}</strong> &nbsp;|&nbsp; 数据库: ${h.db ? '✅' : '❌'} &nbsp;|&nbsp; 缓存: ${h.cache ? '✅' : '❌'}`;
    }
  } catch (_) {}
}

// ── Servers ────────────────────────────────────────────────────────────────

async function loadServers() {
  try {
    const servers = await api('GET', '/servers');
    const tbody = servers.map(s => `
      <tr>
        <td>${s.name}</td><td>${s.ip}:${s.port}</td>
        <td>${s.gpuModel}</td><td>${s.gpuCount}</td>
        <td>${badge(s.status)}</td>
        <td>${new Date(s.createdAt).toLocaleDateString('zh-CN')}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewGPUs('${s.id}','${s.name}')">查看 GPU</button>
          <button class="btn btn-sm btn-danger" onclick="deleteServer('${s.id}')">注销</button>
        </td>
      </tr>`).join('') || `<tr class="empty-row"><td colspan="7">暂无服务器</td></tr>`;
    document.getElementById('server-list').innerHTML = `
      <table><thead><tr>
        <th>名称</th><th>地址</th><th>GPU 型号</th><th>GPU 数</th><th>状态</th><th>注册时间</th><th>操作</th>
      </tr></thead><tbody>${tbody}</tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('add-server-btn').addEventListener('click', () => {
  document.getElementById('server-modal').classList.remove('hidden');
});
document.getElementById('cancel-server').addEventListener('click', () => {
  document.getElementById('server-modal').classList.add('hidden');
});
document.getElementById('server-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd);
  body.port = parseInt(body.port);
  body.gpuCount = parseInt(body.gpuCount);
  body.totalMemory = parseInt(body.totalMemory);
  try {
    await api('POST', '/servers', body);
    toast('服务器注册成功');
    document.getElementById('server-modal').classList.add('hidden');
    e.target.reset();
    loadServers();
  } catch (err) { toast(err.message, 'error'); }
});

async function deleteServer(id) {
  if (!confirm('确认注销该服务器？')) return;
  try {
    await api('DELETE', `/servers/${id}`);
    toast('服务器已注销');
    loadServers();
  } catch (err) { toast(err.message, 'error'); }
}

async function viewGPUs(serverId, serverName) {
  try {
    const gpus = await api('GET', `/servers/${serverId}/gpus`);
    const rows = gpus.map(g => `
      <tr><td>${g.index}</td><td>${g.model}</td>
      <td>${Math.round(Number(g.memory)/1024)} GB</td>
      <td>${Math.round(Number(g.usedMemory)/1024)} GB</td>
      <td>${badge(g.status)}</td></tr>`).join('') || `<tr class="empty-row"><td colspan="5">暂无 GPU</td></tr>`;
    alert(`服务器 ${serverName} 的 GPU 列表:\n\n` + gpus.map(g => `GPU ${g.index}: ${g.model} ${badge(g.status)} ${Math.round(Number(g.memory)/1024)}GB`).join('\n'));
  } catch (err) { toast(err.message, 'error'); }
}

// ── Allocations ────────────────────────────────────────────────────────────

async function loadAllocations() {
  try {
    const allocs = await api('GET', '/allocations');
    const tbody = allocs.map(a => `
      <tr>
        <td><code style="font-size:11px">${a.id.slice(0,8)}…</code></td>
        <td><code style="font-size:11px">${a.gpuId.slice(0,8)}…</code></td>
        <td>${badge(a.status)}</td>
        <td>${fmt(a.allocatedAt)}</td>
        <td>${fmt(a.expiresAt)}</td>
        <td>${a.status === 'ACTIVE' ? `<button class="btn btn-sm btn-danger" onclick="releaseAlloc('${a.id}')">释放</button>` : ''}</td>
      </tr>`).join('') || `<tr class="empty-row"><td colspan="6">暂无分配记录</td></tr>`;
    document.getElementById('alloc-list').innerHTML = `
      <table><thead><tr>
        <th>ID</th><th>GPU ID</th><th>状态</th><th>分配时间</th><th>到期时间</th><th>操作</th>
      </tr></thead><tbody>${tbody}</tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('alloc-btn').addEventListener('click', () => {
  document.getElementById('alloc-modal').classList.remove('hidden');
});
document.getElementById('cancel-alloc').addEventListener('click', () => {
  document.getElementById('alloc-modal').classList.add('hidden');
});
document.getElementById('alloc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    gpuModel: fd.get('gpuModel'),
    memoryRequired: parseInt(fd.get('memoryRequired')),
    durationSeconds: parseInt(fd.get('durationSeconds')),
  };
  try {
    await api('POST', '/allocations', body);
    toast('GPU 申请成功');
    document.getElementById('alloc-modal').classList.add('hidden');
    e.target.reset();
    loadAllocations();
  } catch (err) { toast(err.message, 'error'); }
});

async function releaseAlloc(id) {
  if (!confirm('确认释放该 GPU 分配？')) return;
  try {
    await api('DELETE', `/allocations/${id}`);
    toast('已释放');
    loadAllocations();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Alerts ─────────────────────────────────────────────────────────────────

async function loadAlerts() {
  const status = document.getElementById('alert-status-filter').value;
  const severity = document.getElementById('alert-severity-filter').value;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  try {
    const alerts = await api('GET', `/alerts?${params}`);
    const tbody = alerts.map(a => `
      <tr>
        <td>${badge(a.severity)}</td>
        <td>${a.source}</td>
        <td>${a.message}</td>
        <td>${badge(a.status)}</td>
        <td>${fmt(a.triggeredAt)}</td>
        <td>
          ${a.status === 'FIRING' ? `<button class="btn btn-sm btn-outline" onclick="ackAlert('${a.id}')">确认</button>` : ''}
          ${a.status !== 'RESOLVED' ? `<button class="btn btn-sm btn-outline" onclick="resolveAlert('${a.id}')">解决</button>` : ''}
        </td>
      </tr>`).join('') || `<tr class="empty-row"><td colspan="6">暂无告警</td></tr>`;
    document.getElementById('alert-list').innerHTML = `
      <table><thead><tr>
        <th>级别</th><th>来源</th><th>消息</th><th>状态</th><th>触发时间</th><th>操作</th>
      </tr></thead><tbody>${tbody}</tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('alert-status-filter').addEventListener('change', loadAlerts);
document.getElementById('alert-severity-filter').addEventListener('change', loadAlerts);
document.getElementById('refresh-alerts').addEventListener('click', loadAlerts);

async function ackAlert(id) {
  const by = currentUser?.userId || prompt('确认人 ID (UUID):');
  if (!by) return;
  try {
    await api('POST', `/alerts/${id}/acknowledge`, { acknowledgedBy: by });
    toast('告警已确认');
    loadAlerts();
  } catch (err) { toast(err.message, 'error'); }
}

async function resolveAlert(id) {
  try {
    await api('POST', `/alerts/${id}/resolve`);
    toast('告警已解决');
    loadAlerts();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Clusters ───────────────────────────────────────────────────────────────

async function loadClusters() {
  try {
    const clusters = await api('GET', '/clusters');
    const tbody = clusters.map(c => `
      <tr>
        <td>${c.name}</td>
        <td><code style="font-size:11px">${c.apiServer}</code></td>
        <td>${c.nodeCount}</td><td>${c.gpuNodeCount}</td>
        <td>${badge(c.status)}</td>
        <td>${c.version || '-'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteCluster('${c.id}')">注销</button></td>
      </tr>`).join('') || `<tr class="empty-row"><td colspan="7">暂无集群</td></tr>`;
    document.getElementById('cluster-list').innerHTML = `
      <table><thead><tr>
        <th>名称</th><th>API Server</th><th>节点数</th><th>GPU 节点</th><th>状态</th><th>版本</th><th>操作</th>
      </tr></thead><tbody>${tbody}</tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('add-cluster-btn').addEventListener('click', () => {
  document.getElementById('cluster-modal').classList.remove('hidden');
});
document.getElementById('cancel-cluster').addEventListener('click', () => {
  document.getElementById('cluster-modal').classList.add('hidden');
});
document.getElementById('cluster-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    name: fd.get('name'),
    apiServer: fd.get('apiServer'),
    kubeconfig: fd.get('kubeconfig'),
    nodeCount: parseInt(fd.get('nodeCount')) || 0,
    gpuNodeCount: parseInt(fd.get('gpuNodeCount')) || 0,
  };
  try {
    await api('POST', '/clusters', body);
    toast('集群注册成功');
    document.getElementById('cluster-modal').classList.add('hidden');
    e.target.reset();
    loadClusters();
  } catch (err) { toast(err.message, 'error'); }
});

async function deleteCluster(id) {
  if (!confirm('确认注销该集群？')) return;
  try {
    await api('DELETE', `/clusters/${id}`);
    toast('集群已注销');
    loadClusters();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Init ───────────────────────────────────────────────────────────────────

if (token) {
  // Try to restore session from stored token
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUser = { userId: payload.userId, email: payload.email, role: payload.role };
    showApp();
  } catch (_) {
    localStorage.removeItem('token');
    token = '';
  }
}
