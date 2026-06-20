import { renderLayout } from '../../components/Layout.js';
import { eventsApi } from '../../api/events.js';
import { openModal } from '../../components/Modal.js';
import { toast } from '../../components/Toast.js';

const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DAYS_VI   = ['CN','T2','T3','T4','T5','T6','T7'];

let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let allEvents    = [];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function renderCalendarGrid() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);
  const today       = new Date();
  const todayStr    = today.toISOString().slice(0, 10);

  // Update header
  document.getElementById('cal-month').textContent = `${MONTHS_VI[currentMonth]} ${currentYear}`;

  // Filter events for this month
  const monthStart = new Date(currentYear, currentMonth, 1).toISOString();
  const monthEnd   = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
  const monthEvents = allEvents.filter(e => e.start_at >= monthStart && e.start_at <= monthEnd);

  let html = '';

  // Day headers
  html += DAYS_VI.map(d => `
    <div style="text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);
      padding:8px 0;text-transform:uppercase;letter-spacing:0.05em">${d}</div>
  `).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div></div>`;
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayEvents = monthEvents.filter(e => e.start_at.slice(0,10) === dateStr);

    html += `
      <div class="cal-day" data-date="${dateStr}" style="
        min-height:80px;
        padding:6px;
        border-radius:10px;
        border:1px solid ${isToday ? 'var(--primary)' : 'var(--border)'};
        background:${isToday ? 'rgba(108,99,255,0.1)' : 'var(--bg-card)'};
        cursor:pointer;
        transition:all 0.2s;
        position:relative;
      ">
        <div style="
          font-size:13px;font-weight:${isToday ? '800' : '500'};
          color:${isToday ? 'var(--primary-light)' : 'var(--text-primary)'};
          margin-bottom:4px;
          ${isToday ? `
            width:24px;height:24px;border-radius:50%;
            background:var(--primary);color:white;
            display:flex;align-items:center;justify-content:center;font-size:12px;
          ` : ''}
        ">${day}</div>
        <div style="display:flex;flex-direction:column;gap:2px">
          ${dayEvents.slice(0,3).map(e => `
            <div title="${e.title}" style="
              font-size:10px;font-weight:600;
              padding:2px 6px;border-radius:4px;
              background:${e.color || '#6C63FF'}33;
              color:${e.color || '#6C63FF'};
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            ">${e.title}</div>
          `).join('')}
          ${dayEvents.length > 3 ? `<div style="font-size:10px;color:var(--text-muted)">+${dayEvents.length-3} nữa</div>` : ''}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;

  // Click day to create event
  grid.querySelectorAll('.cal-day').forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      cell.style.background = 'var(--bg-card-hover)';
      cell.style.transform  = 'scale(1.02)';
    });
    cell.addEventListener('mouseleave', () => {
      const dt = cell.dataset.date;
      const isToday = dt === todayStr;
      cell.style.background = isToday ? 'rgba(108,99,255,0.1)' : 'var(--bg-card)';
      cell.style.transform = '';
    });
    cell.addEventListener('click', () => openEventModal(cell.dataset.date));
  });

  // Render event list sidebar
  renderEventList(monthEvents);
}

function renderEventList(events) {
  const listEl = document.getElementById('events-list');
  if (!listEl) return;

  if (!events.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:24px 0">
      <div style="font-size:32px;margin-bottom:8px">📅</div>
      <p>Không có sự kiện tháng này</p>
    </div>`;
    return;
  }

  listEl.innerHTML = events
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
    .map(e => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:4px;min-width:4px;height:40px;border-radius:4px;background:${e.color || '#6C63FF'};margin-top:2px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${e.title}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            ${new Date(e.start_at).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit'})}
            ${new Date(e.start_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}
            ${e.location ? '• 📍 ' + e.location : ''}
          </div>
        </div>
        <button class="del-event" data-id="${e.id}"
          style="width:24px;height:24px;border-radius:6px;border:none;background:rgba(255,107,107,0.1);
          color:var(--danger);cursor:pointer;font-size:11px;flex-shrink:0">✕</button>
      </div>
    `).join('');

  listEl.querySelectorAll('.del-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Xoá sự kiện này?')) return;
      try {
        await eventsApi.delete(btn.dataset.id);
        allEvents = allEvents.filter(e => e.id !== btn.dataset.id);
        renderCalendarGrid();
        toast.success('Đã xoá sự kiện');
      } catch { toast.error('Không thể xoá'); }
    });
  });
}

function openEventModal(defaultDate = '') {
  const COLOR_PRESETS = ['#6C63FF','#06D6A0','#FF6B6B','#FFD166','#38BDF8','#F472B6'];
  const modal = openModal({
    title: '📅 Thêm sự kiện',
    content: `
      <form id="event-form" style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tiêu đề *</label>
          <input class="form-control" id="ev-title" placeholder="Tên sự kiện..." />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Địa điểm</label>
          <input class="form-control" id="ev-loc" placeholder="VD: Google Meet, Phòng 201..." />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Bắt đầu *</label>
            <input class="form-control" id="ev-start" type="datetime-local"
              value="${defaultDate ? defaultDate + 'T09:00' : ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Kết thúc *</label>
            <input class="form-control" id="ev-end" type="datetime-local"
              value="${defaultDate ? defaultDate + 'T10:00' : ''}" />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Màu sắc</label>
          <div style="display:flex;gap:8px">
            ${COLOR_PRESETS.map((c,i) => `
              <button type="button" data-color="${c}" class="ev-color"
                style="width:28px;height:28px;border-radius:50%;background:${c};
                border:3px solid ${i===0?'white':'transparent'};cursor:pointer"
                id="evc-${c.replace('#','')}"></button>
            `).join('')}
          </div>
          <input type="hidden" id="ev-color" value="${COLOR_PRESETS[0]}" />
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
          <button type="button" class="btn btn-ghost" id="ev-cancel">Huỷ</button>
          <button type="submit" class="btn btn-primary">Thêm sự kiện</button>
        </div>
      </form>
    `,
  });

  document.getElementById('ev-cancel')?.addEventListener('click', () => modal.close());

  document.querySelectorAll('.ev-color').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ev-color').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'white';
      document.getElementById('ev-color').value = btn.dataset.color;
    });
  });

  document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title    = document.getElementById('ev-title').value.trim();
    const startAt  = document.getElementById('ev-start').value;
    const endAt    = document.getElementById('ev-end').value;
    if (!title || !startAt || !endAt) { toast.error('Vui lòng điền đủ thông tin'); return; }
    if (new Date(endAt) <= new Date(startAt)) { toast.error('Thời gian kết thúc phải sau bắt đầu'); return; }

    try {
      const data = await eventsApi.create({
        title,
        location: document.getElementById('ev-loc').value.trim() || null,
        startAt: new Date(startAt).toISOString(),
        endAt:   new Date(endAt).toISOString(),
        color:   document.getElementById('ev-color').value,
      });
      allEvents.push(data.event);
      renderCalendarGrid();
      modal.close();
      toast.success('✅ Đã thêm sự kiện!');
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra'); }
  });
}

export async function renderCalendar() {
  renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">📅 Lịch</h1>
        <p class="page-subtitle">Xem và quản lý sự kiện của bạn</p>
      </div>
      <button class="btn btn-primary" id="add-event-btn">+ Thêm sự kiện</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">

      <!-- Calendar -->
      <div class="card" style="padding:24px">
        <!-- Month nav -->
        <div class="flex-between" style="margin-bottom:20px">
          <button class="btn btn-ghost btn-icon" id="cal-prev">◀</button>
          <h2 id="cal-month" style="font-size:18px;font-weight:700;color:var(--text-primary)">
            ${MONTHS_VI[currentMonth]} ${currentYear}
          </h2>
          <button class="btn btn-ghost btn-icon" id="cal-next">▶</button>
        </div>

        <!-- Day grid -->
        <div id="calendar-grid" style="
          display:grid;
          grid-template-columns:repeat(7,1fr);
          gap:4px;
        "></div>
      </div>

      <!-- Events list -->
      <div class="card">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--text-primary)">
          📋 Sự kiện tháng này
        </h3>
        <div id="events-list">
          <div style="display:flex;justify-content:center;padding:20px">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  `);

  // Load events
  try {
    const from = new Date(currentYear, currentMonth, 1).toISOString();
    const to   = new Date(currentYear, currentMonth + 1, 0, 23, 59).toISOString();
    const data = await eventsApi.getAll({ from, to });
    allEvents = data.events || [];
  } catch {}

  renderCalendarGrid();

  document.getElementById('add-event-btn').addEventListener('click', () => openEventModal());
  document.getElementById('cal-prev').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    loadMonthEvents();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    loadMonthEvents();
  });
}

async function loadMonthEvents() {
  try {
    const from = new Date(currentYear, currentMonth, 1).toISOString();
    const to   = new Date(currentYear, currentMonth + 1, 0, 23, 59).toISOString();
    const data = await eventsApi.getAll({ from, to });
    allEvents  = data.events || [];
  } catch {}
  renderCalendarGrid();
}
