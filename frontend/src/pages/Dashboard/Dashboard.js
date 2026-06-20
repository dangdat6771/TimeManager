import { renderLayout } from '../../components/Layout.js';
import { dashboardApi } from '../../api/dashboard.js';
import { authStore } from '../../store/auth.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', emoji: '☀️' };
  if (h < 18) return { text: 'Chào buổi chiều', emoji: '🌤' };
  return { text: 'Chào buổi tối', emoji: '🌙' };
}

function formatDeadline(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return `<span style="color:var(--danger)">Quá hạn ${Math.abs(days)} ngày</span>`;
  if (days === 0) return `<span style="color:var(--warning)">Hôm nay</span>`;
  if (days === 1) return `<span style="color:var(--warning)">Ngày mai</span>`;
  return `<span style="color:var(--text-secondary)">${days} ngày nữa</span>`;
}

const PRIORITY_MAP = {
  urgent: { label: 'Khẩn cấp', cls: 'priority-urgent' },
  high:   { label: 'Cao',      cls: 'priority-high' },
  medium: { label: 'Trung bình',cls: 'priority-medium' },
  low:    { label: 'Thấp',     cls: 'priority-low' },
};

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export async function renderDashboard() {
  const user = authStore.getUser();
  const greeting = getGreeting();

  const main = renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">${greeting.text}, ${user?.full_name?.split(' ').pop() || 'bạn'}! ${greeting.emoji}</h1>
        <p class="page-subtitle">${new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-4 stagger-children" id="stat-cards" style="margin-bottom:32px">
      ${['','','',''].map(() => `
        <div class="stat-card">
          <div class="skeleton" style="width:48px;height:48px;border-radius:10px;margin-bottom:16px"></div>
          <div class="skeleton" style="width:60px;height:32px;border-radius:6px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:100px;height:14px;border-radius:4px"></div>
        </div>
      `).join('')}
    </div>

    <!-- Charts + Tasks row -->
    <div class="grid" style="grid-template-columns:1fr 380px;gap:24px;margin-bottom:24px">
      <!-- Weekly chart -->
      <div class="card">
        <div class="flex-between" style="margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;color:var(--text-primary)">📊 Hoạt động 7 ngày qua</h3>
        </div>
        <div style="position:relative;height:220px">
          <canvas id="weekly-chart"></canvas>
        </div>
      </div>

      <!-- Score card -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <div style="position:relative;width:160px;height:160px;margin-bottom:16px">
          <svg viewBox="0 0 160 160" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
            <circle id="score-ring" cx="80" cy="80" r="68" fill="none"
              stroke="url(#scoreGrad)" stroke-width="12" stroke-linecap="round"
              stroke-dasharray="427" stroke-dashoffset="427"
              style="transition:stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1)"/>
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6C63FF"/>
                <stop offset="100%" stop-color="#06D6A0"/>
              </linearGradient>
            </defs>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <span id="score-value" style="font-size:36px;font-weight:800;color:var(--text-primary)">0</span>
            <span style="font-size:12px;color:var(--text-muted)">Focus Score</span>
          </div>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.5">
          Điểm năng suất hôm nay<br/>
          <span style="font-size:12px;color:var(--text-muted)">Dựa trên tasks, habits & pomodoros</span>
        </div>
      </div>
    </div>

    <!-- Upcoming & Overdue tasks -->
    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:16px">⏰ Tasks sắp tới</h3>
        <div id="upcoming-tasks"><div class="skeleton" style="height:60px;border-radius:8px;margin-bottom:8px"></div></div>
      </div>
      <div class="card">
        <h3 style="font-size:15px;font-weight:700;color:var(--danger);margin-bottom:16px">🚨 Quá hạn</h3>
        <div id="overdue-tasks"><div class="skeleton" style="height:60px;border-radius:8px;margin-bottom:8px"></div></div>
      </div>
    </div>
  `);

  // Load data
  try {
    const [overview, weekly] = await Promise.all([
      dashboardApi.getOverview(),
      dashboardApi.getWeekly(),
    ]);

    const o = overview.overview;

    // Render stat cards
    document.getElementById('stat-cards').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon purple">✓</div>
        <div class="stat-value" id="sc1">0</div>
        <div class="stat-label">Tasks hoàn thành hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🔥</div>
        <div class="stat-value" id="sc2">0</div>
        <div class="stat-label">Habits hoàn thành</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⏱</div>
        <div class="stat-value" id="sc3">0</div>
        <div class="stat-label">Pomodoros hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">📋</div>
        <div class="stat-value" id="sc4">0</div>
        <div class="stat-label">Tasks đang mở</div>
      </div>
    `;

    // Animate counters
    function animateCount(id, target) {
      const el = document.getElementById(id);
      if (!el) return;
      let current = 0;
      const step = Math.ceil(target / 20);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 50);
    }
    animateCount('sc1', Number(o.tasks_done_today || 0));
    animateCount('sc2', Number(o.habits_done_today || 0));
    animateCount('sc3', Number(o.pomodoros_today || 0));
    animateCount('sc4', Number(o.tasks_open || 0));

    // Score ring
    const score = Number(o.focus_score || 0);
    setTimeout(() => {
      const ring = document.getElementById('score-ring');
      const scoreVal = document.getElementById('score-value');
      if (ring) ring.style.strokeDashoffset = 427 - (427 * score / 100);
      if (scoreVal) {
        let c = 0;
        const t = setInterval(() => {
          c = Math.min(c + Math.ceil(score / 20), score);
          scoreVal.textContent = c;
          if (c >= score) clearInterval(t);
        }, 60);
      }
    }, 300);

    // Weekly chart
    const ctx = document.getElementById('weekly-chart');
    if (ctx && weekly.days) {
      const labels = weekly.days.map(d => {
        const date = new Date(d.day);
        return DAYS_VI[date.getDay()];
      });
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Tasks xong',
              data: weekly.days.map(d => Number(d.completed_tasks)),
              backgroundColor: 'rgba(108,99,255,0.7)',
              borderRadius: 6,
            },
            {
              label: 'Pomodoros',
              data: weekly.days.map(d => Number(d.pomodoros)),
              backgroundColor: 'rgba(6,214,160,0.7)',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: 'rgba(255,255,255,0.6)', font: { family: 'Inter', size: 12 } },
            },
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } },
            y: { ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    }

    // Upcoming tasks
    const upcomingEl = document.getElementById('upcoming-tasks');
    if (!overview.upcomingTasks.length) {
      upcomingEl.innerHTML = `<div class="empty-state" style="padding:24px 0">
        <div style="font-size:32px;margin-bottom:8px">🎉</div>
        <p>Không có tasks sắp tới</p>
      </div>`;
    } else {
      upcomingEl.innerHTML = overview.upcomingTasks.map(t => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${t.title}</div>
            <div style="font-size:12px">${formatDeadline(t.deadline)}</div>
          </div>
          <span class="badge ${PRIORITY_MAP[t.priority]?.cls || 'badge-ghost'}" style="margin-left:auto">
            ${PRIORITY_MAP[t.priority]?.label || t.priority}
          </span>
        </div>
      `).join('');
    }

    // Overdue tasks
    const overdueEl = document.getElementById('overdue-tasks');
    if (!overview.overdueTasks.length) {
      overdueEl.innerHTML = `<div class="empty-state" style="padding:24px 0">
        <div style="font-size:32px;margin-bottom:8px">✅</div>
        <p>Tuyệt vời! Không có tasks quá hạn</p>
      </div>`;
    } else {
      overdueEl.innerHTML = overview.overdueTasks.map(t => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${t.title}</div>
            <div style="font-size:12px">${formatDeadline(t.deadline)}</div>
          </div>
          <span class="badge ${PRIORITY_MAP[t.priority]?.cls || 'badge-ghost'}" style="margin-left:auto">
            ${PRIORITY_MAP[t.priority]?.label || t.priority}
          </span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Dashboard error:', err);
  }
}
