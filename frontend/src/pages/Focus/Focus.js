import { renderLayout } from '../../components/Layout.js';
import { focusApi } from '../../api/focus.js';
import { tasksApi } from '../../api/tasks.js';
import { toast } from '../../components/Toast.js';

let timerState = {
  mode: 'work',       // 'work' | 'short_break' | 'long_break'
  running: false,
  timeLeft: 0,        // seconds
  totalTime: 0,
  sessionId: null,
  startTime: null,
  settings: { work_duration: 25, short_break: 5, long_break: 15, sessions_until_long: 4 },
  completedWork: 0,
  interval: null,
};

const MODE_CONFIG = {
  work:        { label: '🎯 Focus',        color: '#6C63FF', bg: 'rgba(108,99,255,0.15)' },
  short_break: { label: '☕ Nghỉ ngắn',   color: '#06D6A0', bg: 'rgba(6,214,160,0.15)' },
  long_break:  { label: '🌴 Nghỉ dài',    color: '#FFD166', bg: 'rgba(255,209,102,0.15)' },
};

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getDuration(mode, settings) {
  if (mode === 'work')        return (settings.work_duration || 25) * 60;
  if (mode === 'short_break') return (settings.short_break   || 5)  * 60;
  if (mode === 'long_break')  return (settings.long_break    || 15) * 60;
  return 1500;
}

function updateTimerDisplay() {
  const timeEl  = document.getElementById('timer-time');
  const ringEl  = document.getElementById('timer-ring');
  const btnEl   = document.getElementById('timer-btn');
  const modeEl  = document.getElementById('timer-mode-label');

  if (!timeEl) return;

  const cfg = MODE_CONFIG[timerState.mode];
  const progress = timerState.totalTime > 0
    ? 1 - (timerState.timeLeft / timerState.totalTime)
    : 0;
  const circumference = 2 * Math.PI * 130; // r=130

  timeEl.textContent = formatTime(timerState.timeLeft);
  if (ringEl) {
    ringEl.style.strokeDashoffset = circumference * (1 - progress);
    ringEl.style.stroke = cfg.color;
  }
  if (modeEl) modeEl.textContent = cfg.label;
  if (btnEl) {
    btnEl.textContent = timerState.running ? '⏸ Tạm dừng' : (timerState.timeLeft < timerState.totalTime ? '▶ Tiếp tục' : '▶ Bắt đầu');
    btnEl.style.background = timerState.running
      ? 'rgba(255,255,255,0.1)'
      : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`;
  }

  // Update session dots
  const dotsEl = document.getElementById('session-dots');
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({ length: timerState.settings.sessions_until_long || 4 }, (_, i) => `
      <div style="width:12px;height:12px;border-radius:50%;
        background:${i < timerState.completedWork ? cfg.color : 'rgba(255,255,255,0.15)'}"></div>
    `).join('');
  }

  document.title = timerState.running
    ? `${formatTime(timerState.timeLeft)} – ${cfg.label} | TimeManager`
    : 'TimeManager – Focus Timer';
}

async function startTimer(selectedTaskId) {
  if (timerState.running) return;

  try {
    const planMins = timerState.totalTime / 60;
    const session = await focusApi.startSession({
      type: timerState.mode,
      plannedDuration: Math.round(planMins),
      taskId: selectedTaskId || null,
    });
    timerState.sessionId = session.session.id;
    timerState.startTime = Date.now();
    timerState.running   = true;

    timerState.interval = setInterval(() => {
      timerState.timeLeft = Math.max(0, timerState.timeLeft - 1);
      updateTimerDisplay();
      if (timerState.timeLeft === 0) {
        clearInterval(timerState.interval);
        timerState.running = false;
        onTimerComplete();
      }
    }, 1000);

    updateTimerDisplay();
    toast.info(`${MODE_CONFIG[timerState.mode].label} bắt đầu! Hãy tập trung 💪`);
  } catch (err) {
    toast.error('Không thể bắt đầu phiên: ' + err.message);
  }
}

function pauseTimer() {
  if (!timerState.running) return;
  clearInterval(timerState.interval);
  timerState.running = false;
  updateTimerDisplay();
}

async function onTimerComplete() {
  if (timerState.sessionId) {
    const elapsed = Math.round((Date.now() - timerState.startTime) / 60000);
    try {
      await focusApi.finishSession(timerState.sessionId, {
        status: 'completed',
        actualDuration: elapsed,
      });
    } catch {}
    timerState.sessionId = null;
  }

  if (timerState.mode === 'work') {
    timerState.completedWork++;
    toast.success('🎉 Phiên focus hoàn thành! Nghỉ ngơi đi nào.');
    const shouldLong = timerState.completedWork % (timerState.settings.sessions_until_long || 4) === 0;
    setMode(shouldLong ? 'long_break' : 'short_break');
  } else {
    toast.info('⏰ Hết giờ nghỉ! Bắt đầu focus nào.');
    setMode('work');
  }
}

function resetTimer() {
  if (timerState.running) {
    clearInterval(timerState.interval);
    timerState.running = false;
    // Cancel session
    if (timerState.sessionId) {
      const elapsed = Math.round((Date.now() - (timerState.startTime || Date.now())) / 60000);
      focusApi.finishSession(timerState.sessionId, { status: 'cancelled', actualDuration: elapsed }).catch(() => {});
      timerState.sessionId = null;
    }
  }
  timerState.timeLeft  = getDuration(timerState.mode, timerState.settings);
  timerState.totalTime = timerState.timeLeft;
  updateTimerDisplay();
}

function setMode(mode) {
  if (timerState.running) pauseTimer();
  timerState.mode      = mode;
  timerState.timeLeft  = getDuration(mode, timerState.settings);
  timerState.totalTime = timerState.timeLeft;
  timerState.sessionId = null;

  // Update mode buttons
  ['work','short_break','long_break'].forEach(m => {
    const btn = document.getElementById(`mode-${m}`);
    if (btn) {
      btn.classList.toggle('active', m === mode);
      btn.style.background = m === mode ? MODE_CONFIG[m].color + '33' : 'transparent';
      btn.style.color = m === mode ? MODE_CONFIG[m].color : 'var(--text-secondary)';
      btn.style.borderColor = m === mode ? MODE_CONFIG[m].color + '55' : 'transparent';
    }
  });

  // Update ring color background
  const ringBg = document.getElementById('timer-ring-bg');
  if (ringBg) {
    ringBg.style.background = MODE_CONFIG[mode].bg;
  }

  updateTimerDisplay();
}

export async function renderFocus() {
  renderLayout(`
    <div class="page-header">
      <h1 class="page-title">⏱ Focus Timer</h1>
      <p class="page-subtitle">Phương pháp Pomodoro – Tập trung tối đa</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start">

      <!-- Timer card -->
      <div class="card card-elevated" style="display:flex;flex-direction:column;align-items:center;padding:40px 32px;text-align:center">

        <!-- Mode buttons -->
        <div class="tabs" style="margin-bottom:32px">
          <button class="tab-btn active" id="mode-work" data-mode="work">🎯 Focus</button>
          <button class="tab-btn" id="mode-short_break" data-mode="short_break">☕ Ngắn</button>
          <button class="tab-btn" id="mode-long_break" data-mode="long_break">🌴 Dài</button>
        </div>

        <!-- Mode label -->
        <div id="timer-mode-label" style="font-size:15px;color:var(--text-secondary);font-weight:600;margin-bottom:24px">
          🎯 Focus
        </div>

        <!-- Circular timer -->
        <div id="timer-ring-bg" style="
          width:280px;height:280px;border-radius:50%;
          background:rgba(108,99,255,0.15);
          display:flex;align-items:center;justify-content:center;
          margin-bottom:32px;position:relative;
          transition:background 0.5s ease
        ">
          <svg viewBox="0 0 300 300" width="280" height="280"
            style="position:absolute;inset:0;transform:rotate(-90deg)">
            <circle cx="150" cy="150" r="130" fill="none"
              stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
            <circle id="timer-ring" cx="150" cy="150" r="130" fill="none"
              stroke="#6C63FF" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${2 * Math.PI * 130}"
              stroke-dashoffset="${2 * Math.PI * 130}"
              style="transition:stroke-dashoffset 0.5s ease, stroke 0.5s ease"/>
          </svg>
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center">
            <div id="timer-time" style="
              font-size:64px;font-weight:800;color:var(--text-primary);
              letter-spacing:-2px;line-height:1;font-variant-numeric:tabular-nums;
            ">25:00</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:6px">phút : giây</div>
          </div>
        </div>

        <!-- Session dots -->
        <div id="session-dots" style="display:flex;gap:8px;margin-bottom:28px">
          <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
        </div>

        <!-- Task selector -->
        <div class="form-group" style="width:100%;margin-bottom:20px">
          <label class="form-label">Task đang làm</label>
          <select class="form-control" id="focus-task" style="text-align:left">
            <option value="">-- Không chọn --</option>
          </select>
        </div>

        <!-- Controls -->
        <div style="display:flex;gap:12px;width:100%;justify-content:center">
          <button id="timer-btn" class="btn btn-primary btn-lg" style="flex:1;max-width:200px;font-size:16px;
            background:linear-gradient(135deg,#6C63FF,#6C63FFcc)">
            ▶ Bắt đầu
          </button>
          <button id="timer-reset" class="btn btn-ghost btn-lg" style="width:52px;font-size:20px">↺</button>
        </div>
      </div>

      <!-- Right panel -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Settings -->
        <div class="card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--text-primary)">⚙ Cài đặt</h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label class="form-label">Focus (phút): <span id="work-val">25</span></label>
              <input type="range" id="s-work" min="5" max="90" value="25"
                style="width:100%;accent-color:var(--primary)" />
            </div>
            <div>
              <label class="form-label">Nghỉ ngắn (phút): <span id="short-val">5</span></label>
              <input type="range" id="s-short" min="1" max="30" value="5"
                style="width:100%;accent-color:var(--accent)" />
            </div>
            <div>
              <label class="form-label">Nghỉ dài (phút): <span id="long-val">15</span></label>
              <input type="range" id="s-long" min="5" max="60" value="15"
                style="width:100%;accent-color:var(--warning)" />
            </div>
            <div>
              <label class="form-label">Pomodoros/chu kỳ: <span id="cycle-val">4</span></label>
              <input type="range" id="s-cycle" min="2" max="8" value="4"
                style="width:100%;accent-color:var(--info)" />
            </div>
            <button class="btn btn-ghost btn-sm" id="save-settings" style="width:100%">💾 Lưu cài đặt</button>
          </div>
        </div>

        <!-- Recent sessions -->
        <div class="card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--text-primary)">📈 Phiên gần đây</h3>
          <div id="recent-sessions">
            <div class="spinner" style="margin:0 auto"></div>
          </div>
        </div>
      </div>
    </div>
  `);

  // Load settings & tasks
  try {
    const [settingsData, tasksData, sessionsData] = await Promise.all([
      focusApi.getSettings().catch(() => ({ settings: {} })),
      tasksApi.getAll({ status: 'in_progress' }).catch(() => ({ tasks: [] })),
      focusApi.getSessions().catch(() => ({ sessions: [] })),
    ]);

    // Apply settings
    const s = settingsData.settings || {};
    timerState.settings = {
      work_duration:      s.work_duration      || 25,
      short_break:        s.short_break        || 5,
      long_break:         s.long_break         || 15,
      sessions_until_long: s.sessions_until_long || 4,
    };

    // Set slider values
    const setSlider = (id, val, displayId) => {
      const el = document.getElementById(id);
      const dEl = document.getElementById(displayId);
      if (el) { el.value = val; el.addEventListener('input', () => { if(dEl) dEl.textContent = el.value; }); }
      if (dEl) dEl.textContent = val;
    };
    setSlider('s-work',  timerState.settings.work_duration,       'work-val');
    setSlider('s-short', timerState.settings.short_break,         'short-val');
    setSlider('s-long',  timerState.settings.long_break,          'long-val');
    setSlider('s-cycle', timerState.settings.sessions_until_long, 'cycle-val');

    // Init timer
    timerState.timeLeft  = getDuration('work', timerState.settings);
    timerState.totalTime = timerState.timeLeft;
    updateTimerDisplay();

    // Populate task dropdown
    const taskSel = document.getElementById('focus-task');
    (tasksData.tasks || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      taskSel.appendChild(opt);
    });

    // Render recent sessions
    const sessEl = document.getElementById('recent-sessions');
    const sessions = (sessionsData.sessions || []).slice(0, 8);
    if (!sessions.length) {
      sessEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center">Chưa có phiên nào</p>`;
    } else {
      sessEl.innerHTML = sessions.map(s => {
        const cfg = MODE_CONFIG[s.type] || MODE_CONFIG.work;
        const dur = s.actual_duration || s.planned_duration || 0;
        const statusColor = s.status === 'completed' ? 'var(--accent)' : s.status === 'cancelled' ? 'var(--danger)' : 'var(--text-muted)';
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:16px">${s.type === 'work' ? '🎯' : '☕'}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${cfg.label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${dur} phút</div>
            </div>
            <span style="font-size:11px;color:${statusColor};font-weight:600">
              ${s.status === 'completed' ? '✓ Xong' : s.status === 'cancelled' ? '✕ Huỷ' : '⏸ Tạm dừng'}
            </span>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    console.error(err);
  }

  // Mode buttons
  ['work','short_break','long_break'].forEach(mode => {
    document.getElementById(`mode-${mode}`)?.addEventListener('click', () => setMode(mode));
  });

  // Timer button
  document.getElementById('timer-btn').addEventListener('click', () => {
    if (timerState.running) {
      pauseTimer();
    } else {
      const taskId = document.getElementById('focus-task')?.value || null;
      if (timerState.timeLeft === timerState.totalTime) {
        startTimer(taskId);
      } else {
        // Resume
        timerState.running = true;
        timerState.startTime = Date.now() - ((timerState.totalTime - timerState.timeLeft) * 1000);
        timerState.interval = setInterval(() => {
          timerState.timeLeft = Math.max(0, timerState.timeLeft - 1);
          updateTimerDisplay();
          if (timerState.timeLeft === 0) {
            clearInterval(timerState.interval);
            timerState.running = false;
            onTimerComplete();
          }
        }, 1000);
        updateTimerDisplay();
      }
    }
  });

  // Reset
  document.getElementById('timer-reset').addEventListener('click', () => {
    resetTimer();
    toast.info('Timer đã được reset');
  });

  // Save settings
  document.getElementById('save-settings').addEventListener('click', async () => {
    const data = {
      workDuration:      Number(document.getElementById('s-work').value),
      shortBreak:        Number(document.getElementById('s-short').value),
      longBreak:         Number(document.getElementById('s-long').value),
      sessionsUntilLong: Number(document.getElementById('s-cycle').value),
    };
    try {
      await focusApi.updateSettings(data);
      timerState.settings = {
        work_duration:       data.workDuration,
        short_break:         data.shortBreak,
        long_break:          data.longBreak,
        sessions_until_long: data.sessionsUntilLong,
      };
      resetTimer();
      toast.success('✅ Đã lưu cài đặt!');
    } catch (err) { toast.error('Không thể lưu cài đặt'); }
  });
}
