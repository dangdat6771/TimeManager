import { renderLayout } from '../../components/Layout.js';
import { accountApi } from '../../api/categories.js';
import { focusApi } from '../../api/focus.js';
import { authStore } from '../../store/auth.js';
import { toast } from '../../components/Toast.js';

export async function renderSettings() {
  const user = authStore.getUser();

  renderLayout(`
    <div class="page-header">
      <h1 class="page-title">⚙️ Cài đặt</h1>
      <p class="page-subtitle">Tuỳ chỉnh ứng dụng theo sở thích của bạn</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">

      <!-- Profile -->
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;color:var(--text-primary)">
          👤 Thông tin cá nhân
        </h3>

        <!-- Avatar -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <div id="settings-avatar" style="
            width:64px;height:64px;border-radius:50%;
            background:linear-gradient(135deg,#6C63FF,#4F46E5);
            display:flex;align-items:center;justify-content:center;
            font-size:24px;font-weight:700;color:white;
            box-shadow:0 4px 15px rgba(108,99,255,0.4)
          ">${(user?.full_name||'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${user?.full_name||'Người dùng'}</div>
            <div style="font-size:13px;color:var(--text-muted)">${user?.email||''}</div>
          </div>
        </div>

        <form id="profile-form" style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Họ và tên</label>
            <input class="form-control" id="p-name" value="${user?.full_name||''}" placeholder="Họ và tên" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Email</label>
            <input class="form-control" id="p-email" value="${user?.email||''}" type="email" disabled
              style="opacity:0.6;cursor:not-allowed" />
            <div class="form-hint">Email không thể thay đổi</div>
          </div>
          <button type="submit" class="btn btn-primary">💾 Lưu thông tin</button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;color:var(--text-primary)">
          🔒 Đổi mật khẩu
        </h3>
        <form id="password-form" style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Mật khẩu hiện tại</label>
            <input class="form-control" id="pw-current" type="password" placeholder="••••••••" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Mật khẩu mới</label>
            <input class="form-control" id="pw-new" type="password" placeholder="Tối thiểu 8 ký tự" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Xác nhận mật khẩu mới</label>
            <input class="form-control" id="pw-confirm" type="password" placeholder="Nhập lại mật khẩu" />
          </div>
          <button type="submit" class="btn btn-ghost">🔑 Đổi mật khẩu</button>
        </form>
      </div>

      <!-- Pomodoro Settings -->
      <div class="card" style="grid-column:1/-1">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;color:var(--text-primary)">
          ⏱ Cài đặt Pomodoro
        </h3>
        <div id="pomo-settings-body">
          <div class="spinner" style="margin:0 auto"></div>
        </div>
      </div>

      <!-- App Info -->
      <div class="card" style="grid-column:1/-1">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text-primary)">ℹ️ Về ứng dụng</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          <div style="text-align:center;padding:16px;background:rgba(108,99,255,0.08);border-radius:12px">
            <div style="font-size:28px;margin-bottom:8px">⏱</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">TimeManager</div>
            <div style="font-size:11px;color:var(--text-muted)">v1.0.0</div>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(6,214,160,0.08);border-radius:12px">
            <div style="font-size:28px;margin-bottom:8px">🚀</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">Mục tiêu</div>
            <div style="font-size:11px;color:var(--text-muted)">Tối ưu năng suất</div>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(255,209,102,0.08);border-radius:12px">
            <div style="font-size:28px;margin-bottom:8px">💛</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">Made with love</div>
            <div style="font-size:11px;color:var(--text-muted)">Dành cho giới trẻ</div>
          </div>
        </div>
      </div>
    </div>
  `);

  // Load pomodoro settings
  try {
    const data = await focusApi.getSettings();
    const s = data.settings || {};
    document.getElementById('pomo-settings-body').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[
          { label:'Focus (phút)', key:'work_duration',       val: s.work_duration||25,       color:'var(--primary)', id:'ps-work' },
          { label:'Nghỉ ngắn',   key:'short_break',          val: s.short_break||5,          color:'var(--accent)',  id:'ps-short' },
          { label:'Nghỉ dài',    key:'long_break',            val: s.long_break||15,          color:'var(--warning)', id:'ps-long' },
        ].map(item => `
          <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid var(--border)">
            <div style="font-size:36px;font-weight:800;color:${item.color};margin-bottom:4px">${item.val}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${item.label}</div>
            <input type="range" min="1" max="120" value="${item.val}" id="${item.id}"
              style="width:100%;accent-color:${item.color}" />
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;text-align:right">
        <button class="btn btn-primary" id="save-pomo-settings">💾 Lưu cài đặt Pomodoro</button>
      </div>
    `;

    // Slider feedback
    ['ps-work','ps-short','ps-long'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const parent = el.closest('[style]');
        const valueEl = parent?.querySelector('[style*="font-size:36px"]');
        if (valueEl) valueEl.textContent = el.value;
      });
    });

    document.getElementById('save-pomo-settings').addEventListener('click', async () => {
      try {
        await focusApi.updateSettings({
          workDuration:      Number(document.getElementById('ps-work').value),
          shortBreak:        Number(document.getElementById('ps-short').value),
          longBreak:         Number(document.getElementById('ps-long').value),
        });
        toast.success('✅ Đã lưu cài đặt Pomodoro!');
      } catch { toast.error('Không thể lưu cài đặt'); }
    });
  } catch {}

  // Profile form
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('p-name').value.trim();
    if (!fullName) { toast.error('Vui lòng nhập họ tên'); return; }
    try {
      const data = await accountApi.updateProfile({ fullName });
      authStore.setUser({ ...user, full_name: fullName });
      document.getElementById('settings-avatar').textContent =
        fullName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
      toast.success('✅ Đã cập nhật thông tin!');
    } catch (err) { toast.error(err.message || 'Không thể cập nhật'); }
  });

  // Password form
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('pw-current').value;
    const newPw   = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;
    if (newPw !== confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (newPw.length < 8)  { toast.error('Mật khẩu phải có ít nhất 8 ký tự'); return; }
    try {
      await accountApi.changePassword({ currentPassword: current, newPassword: newPw });
      toast.success('✅ Đã đổi mật khẩu!');
      document.getElementById('password-form').reset();
    } catch (err) { toast.error(err.message || 'Không thể đổi mật khẩu'); }
  });
}
