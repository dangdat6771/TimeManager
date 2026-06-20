import { renderLayout } from '../../components/Layout.js';
import { habitsApi } from '../../api/habits.js';
import { openModal } from '../../components/Modal.js';
import { toast } from '../../components/Toast.js';

let allHabits = [];

const FREQ_MAP = {
  daily:   'Hàng ngày',
  weekly:  'Hàng tuần',
  custom:  'Tuỳ chỉnh',
};

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const PRESET_COLORS = ['#6C63FF','#06D6A0','#FF6B6B','#FFD166','#38BDF8','#F472B6','#A78BFA','#34D399'];
const PRESET_ICONS  = ['🏃','💧','📚','🧘','💪','🍎','😴','✍️','🎯','🎵','🌿','☀️'];

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function habitCardHTML(habit) {
  const last7 = getLast7Days();
  const today = getTodayStr();
  const todayLog = habit._logs?.find(l => l.log_date?.slice(0,10) === today);
  const isDoneToday = todayLog?.is_completed === true;

  const miniDots = last7.map(day => {
    const log = habit._logs?.find(l => l.log_date?.slice(0,10) === day);
    const done = log?.is_completed;
    const isToday = day === today;
    return `<div title="${day}" style="
      width:28px;height:28px;border-radius:50%;
      background:${done ? habit.color : 'rgba(255,255,255,0.08)'};
      border:${isToday ? `2px solid ${habit.color}` : '2px solid transparent'};
      display:flex;align-items:center;justify-content:center;
      font-size:12px;cursor:default;
      transition:transform 0.2s;
    " onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform=''">
      ${done ? '✓' : ''}
    </div>`;
  }).join('');

  const streak = Number(habit.current_streak || 0);
  const longest = Number(habit.longest_streak || 0);

  return `
    <div class="habit-card" data-id="${habit.id}" style="
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:16px;
      padding:20px;
      transition:all 0.25s ease;
      opacity:${habit.is_active ? 1 : 0.5};
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:44px;height:44px;border-radius:12px;background:${habit.color}22;
          display:flex;align-items:center;justify-content:center;font-size:22px;
          border:1px solid ${habit.color}44;flex-shrink:0">
          ${habit.icon || '🎯'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${habit.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${FREQ_MAP[habit.frequency_type] || 'Hàng ngày'}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="edit-habit" data-id="${habit.id}"
            style="width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,255,255,0.06);
            color:var(--text-muted);cursor:pointer;font-size:13px">✏</button>
          <button class="delete-habit" data-id="${habit.id}"
            style="width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,107,107,0.1);
            color:var(--danger);cursor:pointer;font-size:13px">🗑</button>
        </div>
      </div>

      <!-- Streak -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;
        padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:10px">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:${streak > 0 ? habit.color : 'var(--text-muted)'};line-height:1">
            ${streak > 0 ? `<span class="streak-flame">🔥</span>` : '○'} ${streak}
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Hiện tại</div>
        </div>
        <div style="width:1px;height:30px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--warning);line-height:1">🏆 ${longest}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Kỷ lục</div>
        </div>
        <div style="margin-left:auto">
          <button class="checkin-btn" data-id="${habit.id}" data-done="${isDoneToday}"
            style="padding:8px 16px;border-radius:20px;border:none;cursor:pointer;
            font-size:13px;font-weight:600;font-family:var(--font-family);
            transition:all 0.2s;
            background:${isDoneToday ? 'rgba(6,214,160,0.2)' : `${habit.color}33`};
            color:${isDoneToday ? 'var(--accent)' : habit.color};">
            ${isDoneToday ? '✓ Xong' : '+ Check-in'}
          </button>
        </div>
      </div>

      <!-- 7 days mini calendar -->
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">7 ngày qua</div>
        <div style="display:flex;gap:4px;align-items:center">
          ${last7.map((day, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="font-size:9px;color:var(--text-muted)">${DAYS_VI[new Date(day).getDay()]}</div>
              ${(() => {
                const log = habit._logs?.find(l => l.log_date?.slice(0,10) === day);
                const done = log?.is_completed;
                const isToday = day === today;
                return `<div style="
                  width:26px;height:26px;border-radius:50%;
                  background:${done ? habit.color : 'rgba(255,255,255,0.06)'};
                  border:${isToday ? `2px solid ${habit.color}` : '2px solid transparent'};
                  display:flex;align-items:center;justify-content:center;
                  font-size:11px;color:white;font-weight:600">
                  ${done ? '✓' : ''}
                </div>`;
              })()}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function openHabitModal(existing = null) {
  const isEdit = !!existing;
  const modal = openModal({
    title: isEdit ? '✏️ Chỉnh sửa Habit' : '✨ Tạo Habit mới',
    content: `
      <form id="habit-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tên habit *</label>
          <input class="form-control" id="h-name" placeholder="VD: Uống 8 ly nước mỗi ngày" value="${existing?.name || ''}" />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Icon</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${PRESET_ICONS.map(ic => `
              <button type="button" class="icon-pick" data-icon="${ic}"
                style="width:36px;height:36px;border-radius:8px;border:2px solid ${existing?.icon===ic?'var(--primary)':'var(--border)'};
                background:${existing?.icon===ic?'rgba(108,99,255,0.2)':'var(--bg-input)'};font-size:18px;cursor:pointer;
                transition:all 0.15s" id="icon-${ic}">${ic}</button>
            `).join('')}
          </div>
          <input type="hidden" id="h-icon" value="${existing?.icon || '🎯'}" />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Màu sắc</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${PRESET_COLORS.map(c => `
              <button type="button" class="color-pick" data-color="${c}"
                style="width:32px;height:32px;border-radius:50%;background:${c};border:3px solid ${existing?.color===c?'white':'transparent'};
                cursor:pointer;transition:transform 0.15s" id="color-${c.replace('#','')}"></button>
            `).join('')}
            <input type="color" id="h-color-custom" value="${existing?.color||'#6C63FF'}"
              style="width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;padding:0;background:none" />
          </div>
          <input type="hidden" id="h-color" value="${existing?.color || '#6C63FF'}" />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tần suất</label>
          <select class="form-control" id="h-freq">
            <option value="daily" ${(!existing||existing.frequency_type==='daily')?'selected':''}>Hàng ngày</option>
            <option value="weekly" ${existing?.frequency_type==='weekly'?'selected':''}>Hàng tuần</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Mô tả (tuỳ chọn)</label>
          <input class="form-control" id="h-desc" placeholder="Mục tiêu, lý do..." value="${existing?.description || ''}" />
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
          <button type="button" class="btn btn-ghost" id="habit-cancel">Huỷ</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Lưu thay đổi' : 'Tạo Habit'}</button>
        </div>
      </form>
    `,
  });

  document.getElementById('habit-cancel').addEventListener('click', () => modal.close());

  // Icon picker
  document.querySelectorAll('.icon-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-pick').forEach(b => {
        b.style.borderColor = 'var(--border)';
        b.style.background = 'var(--bg-input)';
      });
      btn.style.borderColor = 'var(--primary)';
      btn.style.background = 'rgba(108,99,255,0.2)';
      document.getElementById('h-icon').value = btn.dataset.icon;
    });
  });

  // Color picker
  document.querySelectorAll('.color-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-pick').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'white';
      document.getElementById('h-color').value = btn.dataset.color;
      document.getElementById('h-color-custom').value = btn.dataset.color;
    });
  });
  document.getElementById('h-color-custom').addEventListener('input', (e) => {
    document.getElementById('h-color').value = e.target.value;
    document.querySelectorAll('.color-pick').forEach(b => b.style.borderColor = 'transparent');
  });

  document.getElementById('habit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('h-name').value.trim();
    if (!name) { toast.error('Vui lòng nhập tên habit'); return; }

    const data = {
      name,
      description: document.getElementById('h-desc').value.trim() || null,
      icon: document.getElementById('h-icon').value || '🎯',
      color: document.getElementById('h-color').value || '#6C63FF',
      frequencyType: document.getElementById('h-freq').value,
      isActive: true,
    };

    try {
      if (isEdit) {
        await habitsApi.update(existing.id, data);
        toast.success('Đã cập nhật habit!');
      } else {
        await habitsApi.create(data);
        toast.success('✨ Đã tạo habit mới!');
      }
      modal.close();
      await loadAndRender();
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra');
    }
  });
}

async function loadAndRender() {
  try {
    const data = await habitsApi.getAll();
    allHabits = data.habits || [];

    // Load logs for each habit (7 days)
    await Promise.all(allHabits.map(async habit => {
      try {
        const logsData = await habitsApi.getLogs(habit.id);
        habit._logs = logsData.logs || [];
      } catch { habit._logs = []; }
    }));

    renderHabitCards();
  } catch (err) {
    toast.error('Không thể tải habits');
  }
}

function renderHabitCards() {
  const container = document.getElementById('habits-grid');
  if (!container) return;

  if (!allHabits.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔥</div>
        <h3>Chưa có habit nào</h3>
        <p>Tạo habit đầu tiên để bắt đầu hành trình của bạn</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="grid grid-3 stagger-children" style="gap:16px">${allHabits.map(habitCardHTML).join('')}</div>`;

  // Attach events
  container.querySelectorAll('.checkin-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isDone = btn.dataset.done === 'true';
      try {
        await habitsApi.checkIn(id, { logDate: getTodayStr(), isCompleted: !isDone });
        toast.success(isDone ? 'Đã bỏ check-in' : '🔥 Check-in thành công!');
        await loadAndRender();
      } catch (err) { toast.error(err.message || 'Lỗi check-in'); }
    });
  });

  container.querySelectorAll('.edit-habit').forEach(btn => {
    btn.addEventListener('click', () => {
      const habit = allHabits.find(h => h.id === btn.dataset.id);
      if (habit) openHabitModal(habit);
    });
  });

  container.querySelectorAll('.delete-habit').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Xoá habit này? Dữ liệu check-in sẽ bị mất.')) return;
      try {
        await habitsApi.delete(btn.dataset.id);
        toast.success('Đã xoá habit');
        await loadAndRender();
      } catch { toast.error('Không thể xoá habit'); }
    });
  });

  container.querySelectorAll('.habit-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = 'var(--shadow-lg)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
  });
}

export async function renderHabits() {
  const todayDone = allHabits.filter(h => h._logs?.some(l => l.log_date?.slice(0,10) === getTodayStr() && l.is_completed)).length;

  renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">🔥 Habits</h1>
        <p class="page-subtitle">Xây dựng thói quen tốt mỗi ngày</p>
      </div>
      <button class="btn btn-primary" id="add-habit-btn">+ Tạo Habit</button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-3" style="margin-bottom:24px" id="habit-stats">
      <div class="stat-card">
        <div class="stat-icon green">🔥</div>
        <div class="stat-value" id="hs-active">—</div>
        <div class="stat-label">Habits đang hoạt động</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">✓</div>
        <div class="stat-value" id="hs-today">—</div>
        <div class="stat-label">Hoàn thành hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🏆</div>
        <div class="stat-value" id="hs-streak">—</div>
        <div class="stat-label">Streak dài nhất</div>
      </div>
    </div>

    <!-- Habits grid -->
    <div id="habits-grid">
      <div style="display:flex;align-items:center;justify-content:center;height:200px">
        <div class="spinner spinner-lg"></div>
      </div>
    </div>
  `);

  await loadAndRender();

  // Update stats
  const active = allHabits.filter(h => h.is_active).length;
  const today = allHabits.filter(h => h._logs?.some(l => l.log_date?.slice(0,10) === getTodayStr() && l.is_completed)).length;
  const maxStreak = Math.max(0, ...allHabits.map(h => Number(h.longest_streak || 0)));

  document.getElementById('hs-active').textContent = active;
  document.getElementById('hs-today').textContent  = today;
  document.getElementById('hs-streak').textContent = maxStreak;

  document.getElementById('add-habit-btn').addEventListener('click', () => openHabitModal());
}
