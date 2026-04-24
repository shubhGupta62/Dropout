// ─── DOM References ────────────────────────────────────────────────
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminInfo = document.getElementById('adminInfo');
const statusBox = document.getElementById('status');
const statsGrid = document.getElementById('statsGrid');
const usersTable = document.getElementById('usersTable');
const dropsTable = document.getElementById('dropsTable');
const analyticsTable = document.getElementById('analyticsTable');
const analyticsCards = document.getElementById('analyticsCards');

const TOKEN_KEY = 'dropamyn_admin_token';
const ADMIN_KEY = 'dropamyn_admin_info';

// ─── Auth Helpers ──────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function getAdminInfo() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY)) || null;
  } catch {
    return null;
  }
}

function saveAuth(token, admin) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

/**
 * Wipe all rendered dashboard data so stale content
 * is never visible after logout or failed login.
 */
function clearDashboardDOM() {
  statsGrid.innerHTML = '';
  usersTable.innerHTML = '';
  dropsTable.innerHTML = '';
  analyticsTable.innerHTML = '';
  analyticsCards.innerHTML = '';
  adminInfo.innerHTML = '';
  statusBox.className = 'status hidden';
  statusBox.textContent = '';
}

// ─── Screen Navigation ────────────────────────────────────────────
function showLogin() {
  // SECURITY: always nuke tokens + DOM before showing login
  clearAuth();
  clearDashboardDOM();
  loginScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
  loginError.classList.add('hidden');
  loginEmail.value = '';
  loginPassword.value = '';
}

const ADMIN_ROLES = ['admin', 'super_admin'];

function showDashboard() {
  // SECURITY: guard — never show dashboard without a valid admin token
  const token = getToken();
  const admin = getAdminInfo();
  if (!token || !admin || !ADMIN_ROLES.includes(admin.role)) {
    showLogin();
    return;
  }

  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');

  adminInfo.innerHTML = `
    <div class="admin-name">${admin.name || admin.email}</div>
    <div class="admin-role">${admin.role}</div>
  `;
}

// ─── API Client (auto-attaches JWT) ───────────────────────────────
async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => ({
    success: false,
    message: 'Invalid server response',
  }));

  // SECURITY: Auto-logout on 401 (expired/invalid token) or 403 (role revoked)
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    clearDashboardDOM();
    showLogin();
    throw new Error(
      res.status === 401
        ? 'Session expired — please log in again'
        : 'Access denied — admin privileges required'
    );
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed with ${res.status}`);
  }

  return json.data;
}

// ─── Status Messages ──────────────────────────────────────────────
function showStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

// ─── Login Handler ────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  // SECURITY: Clear any old session BEFORE attempting login.
  // This prevents stale tokens from being used if the new login fails.
  clearAuth();
  clearDashboardDOM();

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Login failed');
    }

    // SECURITY: Verify the server returned an admin role before granting access
    const adminData = json.data?.admin;
    if (!adminData || !ADMIN_ROLES.includes(adminData.role)) {
      throw new Error('Access denied — admin privileges required');
    }

    // Only store token on verified success
    saveAuth(json.data.token, adminData);

    // Switch to dashboard and load data
    showDashboard();
    loadAll();
  } catch (err) {
    // SECURITY: Ensure NO token persists on any failure
    clearAuth();
    clearDashboardDOM();
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// ─── Logout Handler ───────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  clearAuth();
  clearDashboardDOM();
  showLogin();
});

// ─── Data Loaders (unchanged logic) ───────────────────────────────
function formatDate(value) {
  return new Date(value).toLocaleString();
}

function statCard(label, value) {
  return `
    <article class="card">
      <div class="card-label">${label}</div>
      <div class="card-value">${value}</div>
    </article>
  `;
}

async function loadStats() {
  const stats = await api('/api/admin/stats');
  statsGrid.innerHTML = [
    statCard('Users', stats.totalUsers),
    statCard('Drops', stats.totalDrops),
    statCard('Likes', stats.totalLikes),
    statCard('Comments', stats.totalComments),
    statCard('Brands', stats.totalBrands),
  ].join('');
}

async function loadUsers() {
  const response = await api('/api/admin/users');
  const users = Array.isArray(response) ? response : (response.users || []);
  usersTable.innerHTML = users.map((user) => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>${user.isBanned ? 'Banned' : 'Active'}</td>
      <td>
        ${user.role === 'admin' || user.role === 'super_admin'
      ? '<span class="muted">Locked</span>'
      : `<button class="small-btn" data-user-id="${user.id}" data-banned="${user.isBanned}">
              ${user.isBanned ? 'Unban' : 'Ban'}
            </button>`}
      </td>
    </tr>
  `).join('');
}

async function loadDrops() {
  const response = await api('/api/admin/drops');
  const drops = Array.isArray(response) ? response : (response.drops || []);
  dropsTable.innerHTML = drops.map((drop) => `
    <tr>
      <td>${drop.title}</td>
      <td>${drop.brand?.name || '-'}</td>
      <td>${drop.views}</td>
      <td>${drop.likes ?? drop.stats?.likes ?? 0}</td>
      <td>${drop.comments ?? drop.stats?.comments ?? 0}</td>
      <td><button class="danger-btn" data-drop-id="${drop.id}">Delete</button></td>
    </tr>
  `).join('');
}

async function loadAnalytics() {
  const analytics = await api('/api/admin/analytics');
  const totals = analytics.daily.reduce((acc, day) => ({
    users: acc.users + day.users,
    drops: acc.drops + day.drops,
    likes: acc.likes + day.likes,
    comments: acc.comments + day.comments,
    brands: acc.brands + day.brands,
  }), { users: 0, drops: 0, likes: 0, comments: 0, brands: 0 });

  analyticsCards.innerHTML = [
    statCard('New Users (30d)', totals.users),
    statCard('New Drops (30d)', totals.drops),
    statCard('New Likes (30d)', totals.likes),
    statCard('New Comments (30d)', totals.comments),
    statCard('New Brands (30d)', totals.brands),
  ].join('');

  analyticsTable.innerHTML = analytics.daily.map((day) => `
    <tr>
      <td>${day.date}</td>
      <td>${day.users}</td>
      <td>${day.drops}</td>
      <td>${day.likes}</td>
      <td>${day.comments}</td>
      <td>${day.brands}</td>
    </tr>
  `).join('');
}

async function loadAll() {
  showStatus('Loading admin data...', 'info');
  try {
    await Promise.all([loadStats(), loadUsers(), loadDrops(), loadAnalytics()]);
    showStatus('Admin console ready.', 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

// ─── Navigation ───────────────────────────────────────────────────
document.querySelectorAll('.nav:not(.logout-btn)').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav:not(.logout-btn)').forEach((nav) => nav.classList.remove('active'));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.view).classList.add('active');
  });
});

// ─── Table Actions ────────────────────────────────────────────────
document.getElementById('refreshUsersBtn').addEventListener('click', () => loadUsers().catch((error) => showStatus(error.message, 'error')));
document.getElementById('refreshDropsBtn').addEventListener('click', () => loadDrops().catch((error) => showStatus(error.message, 'error')));
document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => loadAnalytics().catch((error) => showStatus(error.message, 'error')));

usersTable.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-user-id]');
  if (!button) return;

  const userId = button.dataset.userId;
  const nextBanned = button.dataset.banned !== 'true';

  try {
    await api(`/api/admin/users/${userId}/ban`, {
      method: 'PATCH',
      body: { banned: nextBanned },
    });
    showStatus(`User ${nextBanned ? 'banned' : 'unbanned'} successfully.`, 'success');
    await loadUsers();
    await loadStats();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

dropsTable.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-drop-id]');
  if (!button) return;

  const dropId = button.dataset.dropId;
  const confirmed = window.confirm('Delete this drop permanently?');
  if (!confirmed) return;

  try {
    await api(`/api/admin/drops/${dropId}`, { method: 'DELETE' });
    showStatus('Drop deleted successfully.', 'success');
    await loadDrops();
    await Promise.all([loadStats(), loadAnalytics()]);
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

// ─── Boot: Strict token validation before any dashboard access ────
(async function boot() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }

  try {
    // Verify token AND role against the backend
    const admin = await api('/api/admin/me');

    if (!admin || !ADMIN_ROLES.includes(admin.role)) {
      throw new Error('Not an admin');
    }

    // Token is valid and user is admin — update stored info and show dashboard
    saveAuth(token, admin);
    showDashboard();
    loadAll();
  } catch {
    // Token invalid, expired, or user is not admin — full cleanup
    clearAuth();
    clearDashboardDOM();
    showLogin();
  }
})();
