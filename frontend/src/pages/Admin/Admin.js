import { renderLayout } from '../../components/Layout.js';
import { adminApi } from '../../api/admin.js';
import { authStore } from '../../store/auth.js';
import { toast } from '../../components/Toast.js';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function statCard(label, value, tone = 'purple') {
  return `
    <div class="stat-card">
      <div class="stat-icon ${tone}">#</div>
      <div class="stat-value">${value ?? 0}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function renderUsers(users, currentUserId) {
  if (!users.length) {
    return `<div class="empty-state"><h3>Chua co nguoi dung</h3></div>`;
  }

  return `
    <div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border)">
            <th style="padding:10px">Nguoi dung</th>
            <th style="padding:10px">Role</th>
            <th style="padding:10px">Trang thai</th>
            <th style="padding:10px">Dang nhap cuoi</th>
            <th style="padding:10px;text-align:right">Thao tac</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((user) => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px">
                <div style="font-weight:700;color:var(--text-primary)">${user.full_name}</div>
                <div style="color:var(--text-muted);font-size:12px">${user.email}</div>
              </td>
              <td style="padding:10px"><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-ghost'}">${user.role}</span></td>
              <td style="padding:10px"><span class="badge ${user.is_active ? 'badge-accent' : 'badge-danger'}">${user.is_active ? 'Active' : 'Locked'}</span></td>
              <td style="padding:10px;color:var(--text-secondary)">${formatDate(user.last_login_at)}</td>
              <td style="padding:10px;text-align:right">
                <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-accent'} user-status-btn"
                  data-id="${user.id}" data-active="${String(!user.is_active)}" ${user.id === currentUserId ? 'disabled' : ''}>
                  ${user.is_active ? 'Khoa' : 'Mo khoa'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLogs(logs) {
  if (!logs.length) {
    return `<div class="empty-state" style="padding:24px"><h3>Chua co system logs</h3></div>`;
  }

  return logs.slice(0, 50).map((log) => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="flex-between" style="gap:12px">
        <strong style="font-size:13px;color:var(--text-primary)">${log.action}</strong>
        <span style="font-size:12px;color:var(--text-muted)">${formatDate(log.created_at)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary)">${log.entity_type || 'system'} ${log.entity_id || ''}</div>
    </div>
  `).join('');
}

export async function renderAdmin() {
  const currentUser = authStore.getUser();

  renderLayout(`
    <div class="page-header">
      <h1 class="page-title">Admin</h1>
      <p class="page-subtitle">Quan ly nguoi dung, broadcast va system logs.</p>
    </div>

    <div id="admin-stats" class="grid grid-4" style="margin-bottom:24px">
      ${['', '', '', ''].map(() => `<div class="stat-card"><div class="spinner"></div></div>`).join('')}
    </div>

    <div class="grid page-split-grid">
      <div class="card">
        <div class="flex-between" style="margin-bottom:16px">
          <h3 style="font-size:16px;color:var(--text-primary)">Nguoi dung</h3>
          <button class="btn btn-sm btn-ghost" id="refresh-admin">Tai lai</button>
        </div>
        <div id="admin-users"><div class="spinner" style="margin:0 auto"></div></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        <form id="broadcast-form" class="card" style="display:flex;flex-direction:column;gap:14px">
          <h3 style="font-size:16px;color:var(--text-primary)">Gui broadcast</h3>
          <input class="form-control" id="broadcast-title" placeholder="Tieu de" required />
          <textarea class="form-control" id="broadcast-body" placeholder="Noi dung thong bao"></textarea>
          <button class="btn btn-primary" type="submit">Gui thong bao</button>
        </form>

        <div class="card">
          <h3 style="font-size:16px;color:var(--text-primary);margin-bottom:12px">System logs</h3>
          <div id="admin-logs"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </div>
  `);

  async function load() {
    const [usersData, statsData, logsData] = await Promise.all([
      adminApi.getUsers(),
      adminApi.getStats(),
      adminApi.getLogs(),
    ]);

    const stats = statsData.stats || {};
    document.getElementById('admin-stats').innerHTML = [
      statCard('Tong users', stats.total_users, 'purple'),
      statCard('Users active', stats.active_users, 'green'),
      statCard('Tong tasks', stats.total_tasks, 'blue'),
      statCard('Focus sessions', stats.total_focus_sessions, 'orange'),
    ].join('');

    document.getElementById('admin-users').innerHTML = renderUsers(usersData.users || [], currentUser?.id);
    document.getElementById('admin-logs').innerHTML = renderLogs(logsData.logs || []);

    document.querySelectorAll('.user-status-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await adminApi.updateUserStatus(btn.dataset.id, btn.dataset.active === 'true');
          toast.success('Da cap nhat trang thai nguoi dung');
          await load();
        } catch (err) {
          toast.error(err.message || 'Khong the cap nhat nguoi dung');
        }
      });
    });
  }

  document.getElementById('refresh-admin').addEventListener('click', load);
  document.getElementById('broadcast-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const title = document.getElementById('broadcast-title').value.trim();
      const body = document.getElementById('broadcast-body').value.trim();
      await adminApi.sendBroadcast({ title, body });
      toast.success('Da gui broadcast');
      event.target.reset();
      await load();
    } catch (err) {
      toast.error(err.message || 'Khong the gui broadcast');
    }
  });

  try {
    await load();
  } catch (err) {
    document.getElementById('admin-users').innerHTML = `<p>Khong the tai admin data: ${err.message}</p>`;
  }
}
