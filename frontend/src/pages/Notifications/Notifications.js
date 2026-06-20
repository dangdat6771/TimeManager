import { renderLayout } from '../../components/Layout.js';
import { notificationsApi } from '../../api/notifications.js';
import { toast } from '../../components/Toast.js';

const TYPE_LABELS = {
  task_deadline: 'Deadline',
  habit_reminder: 'Habit',
  system: 'System',
  broadcast: 'Broadcast',
  achievement: 'Achievement',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function renderNotificationItem(item) {
  return `
    <div class="card" style="padding:16px;border-color:${item.is_read ? 'var(--border)' : 'rgba(108,99,255,0.45)'}">
      <div class="flex-between" style="gap:16px;align-items:flex-start">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span class="badge ${item.is_read ? 'badge-ghost' : 'badge-primary'}">${item.is_read ? 'Da doc' : 'Moi'}</span>
            <span class="badge badge-info">${TYPE_LABELS[item.type] || item.type}</span>
            <span style="font-size:12px;color:var(--text-muted)">${formatDate(item.sent_at)}</span>
          </div>
          <h3 style="font-size:16px;color:var(--text-primary);margin-bottom:4px">${item.title}</h3>
          <p style="font-size:13px;margin:0">${item.body || 'Khong co noi dung chi tiet.'}</p>
        </div>
        ${item.is_read ? '' : `<button class="btn btn-sm btn-ghost mark-read-btn" data-id="${item.id}">Danh dau da doc</button>`}
      </div>
    </div>
  `;
}

function renderSettings(settings) {
  const s = settings || {};
  return `
    <form id="notif-settings-form" class="card" style="display:flex;flex-direction:column;gap:14px">
      <h3 style="font-size:16px;color:var(--text-primary)">Cai dat thong bao</h3>
      <label style="display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--text-secondary)">
        Nhac deadline cong viec
        <input type="checkbox" id="task-deadline-notif" ${s.task_deadline_notif !== false ? 'checked' : ''} />
      </label>
      <label style="display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--text-secondary)">
        Nhac thoi quen
        <input type="checkbox" id="habit-reminder-notif" ${s.habit_reminder_notif !== false ? 'checked' : ''} />
      </label>
      <label style="display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--text-secondary)">
        Gui email thong bao
        <input type="checkbox" id="email-notifications" ${s.email_notifications !== false ? 'checked' : ''} />
      </label>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Nhac truoc deadline (phut)</label>
        <input class="form-control" id="deadline-remind-minutes" type="number" min="0" max="10080" value="${s.deadline_remind_minutes ?? 30}" />
      </div>
      <button class="btn btn-primary" type="submit">Luu cai dat</button>
    </form>
  `;
}

export async function renderNotifications() {
  renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">Theo doi nhac viec, broadcast va thong bao he thong.</p>
      </div>
      <button class="btn btn-primary" id="mark-all-read">Danh dau tat ca da doc</button>
    </div>

    <div class="grid page-split-grid">
      <div id="notifications-list">
        <div class="card"><div class="spinner" style="margin:0 auto"></div></div>
      </div>
      <div id="notifications-settings">
        <div class="card"><div class="spinner" style="margin:0 auto"></div></div>
      </div>
    </div>
  `);

  async function load() {
    const [listData, settingsData] = await Promise.all([
      notificationsApi.getAll(),
      notificationsApi.getSettings(),
    ]);

    const notifications = listData.notifications || [];
    document.getElementById('notifications-list').innerHTML = notifications.length
      ? `<div style="display:flex;flex-direction:column;gap:12px">${notifications.map(renderNotificationItem).join('')}</div>`
      : `<div class="empty-state card"><div class="empty-state-icon">!</div><h3>Chua co thong bao</h3><p>Cac thong bao moi se hien thi tai day.</p></div>`;

    document.getElementById('notifications-settings').innerHTML = renderSettings(settingsData.settings);

    document.querySelectorAll('.mark-read-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await notificationsApi.markRead(btn.dataset.id);
          toast.success('Da danh dau thong bao da doc');
          await load();
        } catch (err) {
          toast.error(err.message || 'Khong the cap nhat thong bao');
        }
      });
    });

    document.getElementById('notif-settings-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await notificationsApi.updateSettings({
          taskDeadlineNotif: document.getElementById('task-deadline-notif').checked,
          habitReminderNotif: document.getElementById('habit-reminder-notif').checked,
          emailNotifications: document.getElementById('email-notifications').checked,
          deadlineRemindMinutes: Number(document.getElementById('deadline-remind-minutes').value || 0),
        });
        toast.success('Da luu cai dat thong bao');
      } catch (err) {
        toast.error(err.message || 'Khong the luu cai dat');
      }
    });
  }

  document.getElementById('mark-all-read').addEventListener('click', async () => {
    try {
      await notificationsApi.markAllRead();
      toast.success('Da danh dau tat ca da doc');
      await load();
    } catch (err) {
      toast.error(err.message || 'Khong the cap nhat thong bao');
    }
  });

  try {
    await load();
  } catch (err) {
    document.getElementById('notifications-list').innerHTML = `<div class="card"><p>Khong the tai thong bao: ${err.message}</p></div>`;
  }
}
