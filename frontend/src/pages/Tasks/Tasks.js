import { renderLayout } from '../../components/Layout.js';
import { tasksApi } from '../../api/tasks.js';
import { categoriesApi } from '../../api/categories.js';
import { openModal } from '../../components/Modal.js';
import { toast } from '../../components/Toast.js';

const STATUS_MAP = {
  todo:        { label: 'Cần làm',   cls: 'status-todo',        icon: '○' },
  in_progress: { label: 'Đang làm',  cls: 'status-in_progress', icon: '◑' },
  done:        { label: 'Xong',       cls: 'status-done',        icon: '●' },
  cancelled:   { label: 'Huỷ',       cls: 'status-cancelled',   icon: '✕' },
};
const PRIORITY_MAP = {
  urgent: { label: '🔴 Khẩn cấp', cls: 'priority-urgent' },
  high:   { label: '🟠 Cao',      cls: 'priority-high' },
  medium: { label: '🔵 Trung bình',cls: 'priority-medium' },
  low:    { label: '⚪ Thấp',     cls: 'priority-low' },
};

let allTasks = [];
let categories = [];
let currentView = 'list';
let filters = { status: '', priority: '', search: '' };

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function isOverdue(task) {
  return task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' && task.status !== 'cancelled';
}

function getFilteredTasks() {
  return allTasks.filter(t => {
    if (filters.status   && t.status   !== filters.status)   return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function taskCardHTML(task) {
  const overdue = isOverdue(task);
  const st = STATUS_MAP[task.status] || STATUS_MAP.todo;
  const pr = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
  const tags = Array.isArray(task.tags) ? task.tags.filter(Boolean) : [];

  return `
    <div class="task-card" data-id="${task.id}" style="
      background:var(--bg-card);
      border:1px solid ${overdue ? 'rgba(255,107,107,0.3)' : 'var(--border)'};
      border-radius:12px;
      padding:16px;
      cursor:pointer;
      transition:all 0.2s ease;
      position:relative;
      overflow:hidden;
    ">
      ${overdue ? `<div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--gradient-danger)"></div>` : ''}
      <div style="display:flex;align-items:flex-start;gap:10px">
        <button class="status-toggle" data-id="${task.id}" data-status="${task.status}"
          style="width:22px;height:22px;min-width:22px;border-radius:50%;border:2px solid ${
            task.status === 'done' ? 'var(--accent)' : 'rgba(255,255,255,0.2)'
          };background:${task.status === 'done' ? 'var(--accent)' : 'transparent'};
          cursor:pointer;color:white;font-size:12px;display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;margin-top:2px">
          ${task.status === 'done' ? '✓' : ''}
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:${task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)'};
            text-decoration:${task.status === 'done' ? 'line-through' : 'none'};
            margin-bottom:4px;word-break:break-word">${task.title}</div>
          ${task.description ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${task.description}</div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge ${pr.cls}" style="font-size:11px">${pr.label}</span>
            ${task.deadline ? `<span style="font-size:11px;color:${overdue ? 'var(--danger)' : 'var(--text-muted)'};display:flex;align-items:center;gap:3px">
              📅 ${formatDate(task.deadline)}${overdue ? ' ⚠' : ''}
            </span>` : ''}
            ${task.category_name ? `<span style="font-size:11px;padding:2px 8px;border-radius:20px;
              background:rgba(255,255,255,0.08);color:var(--text-secondary)">${task.category_name}</span>` : ''}
            ${tags.slice(0,3).map(tag => `
              <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${tag.color}22;color:${tag.color}">#${tag.name}</span>
            `).join('')}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn-edit-task" data-id="${task.id}"
            style="width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,255,255,0.06);
            color:var(--text-muted);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">✏</button>
          <button class="btn-delete-task" data-id="${task.id}"
            style="width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,107,107,0.1);
            color:var(--danger);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">🗑</button>
        </div>
      </div>
    </div>
  `;
}

function renderListView(container, tasks) {
  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Chưa có task nào</h3>
        <p>Nhấn "+ Thêm Task" để tạo task đầu tiên của bạn</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px" class="stagger-children">${tasks.map(taskCardHTML).join('')}</div>`;
}

function renderKanbanView(container, tasks) {
  const columns = ['todo','in_progress','done','cancelled'];
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;min-height:400px">
      ${columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col);
        const st = STATUS_MAP[col];
        return `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);
              display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:700;color:var(--text-primary)">${st.icon} ${st.label}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.08);color:var(--text-muted)">${colTasks.length}</span>
            </div>
            <div style="padding:10px;display:flex;flex-direction:column;gap:8px">
              ${colTasks.map(task => `
                <div class="task-card" data-id="${task.id}" style="
                  background:var(--bg-surface);border:1px solid var(--border);
                  border-radius:10px;padding:12px;cursor:pointer">
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">${task.title}</div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="badge ${(PRIORITY_MAP[task.priority]||PRIORITY_MAP.medium).cls}" style="font-size:11px">
                      ${(PRIORITY_MAP[task.priority]||PRIORITY_MAP.medium).label}
                    </span>
                    ${task.deadline ? `<span style="font-size:11px;color:${isOverdue(task)?'var(--danger)':'var(--text-muted)'}">📅 ${formatDate(task.deadline)}</span>` : ''}
                  </div>
                </div>
              `).join('')}
              ${colTasks.length === 0 ? `<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:13px">Trống</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openTaskModal(existingTask = null) {
  const isEdit = !!existingTask;

  const catOptions = categories.map(c =>
    `<option value="${c.id}" ${existingTask?.category_id === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  const modal = openModal({
    title: isEdit ? '✏️ Chỉnh sửa Task' : '➕ Tạo Task mới',
    content: `
      <form id="task-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tiêu đề *</label>
          <input class="form-control" id="t-title" placeholder="Tên task..." value="${existingTask?.title || ''}" required />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Mô tả</label>
          <textarea class="form-control" id="t-desc" rows="2" placeholder="Mô tả...">${existingTask?.description || ''}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Trạng thái</label>
            <select class="form-control" id="t-status">
              ${Object.entries(STATUS_MAP).map(([v,s]) =>
                `<option value="${v}" ${(existingTask?.status||'todo')===v?'selected':''}>${s.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Độ ưu tiên</label>
            <select class="form-control" id="t-priority">
              ${Object.entries(PRIORITY_MAP).map(([v,p]) =>
                `<option value="${v}" ${(existingTask?.priority||'medium')===v?'selected':''}>${p.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Deadline</label>
            <input class="form-control" id="t-deadline" type="datetime-local"
              value="${existingTask?.deadline ? new Date(existingTask.deadline).toISOString().slice(0,16) : ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Danh mục</label>
            <select class="form-control" id="t-category">
              <option value="">-- Không có --</option>
              ${catOptions}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Huỷ</button>
          <button type="submit" class="btn btn-primary" id="task-submit">
            ${isEdit ? 'Lưu thay đổi' : 'Tạo Task'}
          </button>
        </div>
      </form>
    `,
  });

  document.getElementById('modal-cancel')?.addEventListener('click', () => modal.close());

  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('task-submit');
    const title = document.getElementById('t-title').value.trim();
    if (!title) { toast.error('Vui lòng nhập tiêu đề'); return; }

    const data = {
      title,
      description: document.getElementById('t-desc').value.trim() || null,
      status:      document.getElementById('t-status').value,
      priority:    document.getElementById('t-priority').value,
      deadline:    document.getElementById('t-deadline').value ? new Date(document.getElementById('t-deadline').value).toISOString() : null,
      categoryId:  document.getElementById('t-category').value || null,
    };

    btn.disabled = true;
    try {
      if (isEdit) {
        await tasksApi.update(existingTask.id, data);
        toast.success('Đã cập nhật task!');
      } else {
        await tasksApi.create(data);
        toast.success('Đã tạo task mới!');
      }
      modal.close();
      await loadAndRender();
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra');
      btn.disabled = false;
    }
  });
}

async function loadAndRender() {
  try {
    const data = await tasksApi.getAll();
    allTasks = data.tasks || [];
    rerenderTaskList();
  } catch (err) {
    toast.error('Không thể tải danh sách task');
  }
}

function rerenderTaskList() {
  const container = document.getElementById('tasks-content');
  if (!container) return;
  const tasks = getFilteredTasks();
  if (currentView === 'kanban') {
    renderKanbanView(container, tasks);
  } else {
    renderListView(container, tasks);
  }
  attachTaskEvents(container);
}

function attachTaskEvents(container) {
  // Status toggle (quick complete)
  container.querySelectorAll('.status-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const current = btn.dataset.status;
      const newStatus = current === 'done' ? 'todo' : 'done';
      try {
        await tasksApi.update(id, { status: newStatus });
        const task = allTasks.find(t => t.id === id);
        if (task) task.status = newStatus;
        rerenderTaskList();
        toast.success(newStatus === 'done' ? '✅ Task hoàn thành!' : 'Task đã mở lại');
      } catch { toast.error('Không thể cập nhật task'); }
    });
  });

  // Edit
  container.querySelectorAll('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = allTasks.find(t => t.id === btn.dataset.id);
      if (task) openTaskModal(task);
    });
  });

  // Delete
  container.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Xoá task này?')) return;
      try {
        await tasksApi.delete(btn.dataset.id);
        allTasks = allTasks.filter(t => t.id !== btn.dataset.id);
        rerenderTaskList();
        toast.success('Đã xoá task');
      } catch { toast.error('Không thể xoá task'); }
    });
  });

  // Kanban card click → edit
  container.querySelectorAll('.task-card').forEach(card => {
    card.style.setProperty('--hover-bg', 'var(--bg-card-hover)');
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = 'var(--shadow-md)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
  });
}

export async function renderTasks() {
  const main = renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">📋 Tasks</h1>
        <p class="page-subtitle">Quản lý công việc của bạn</p>
      </div>
      <button class="btn btn-primary" id="add-task-btn">
        + Thêm Task
      </button>
    </div>

    <!-- Filter bar -->
    <div class="card" style="padding:16px;margin-bottom:20px">
      <div class="filter-bar">
        <div class="search-box" style="flex:1">
          <span class="icon">🔍</span>
          <input class="form-control" id="search-input" placeholder="Tìm kiếm task..." />
        </div>
        <select class="form-control" id="filter-status" style="width:140px">
          <option value="">Tất cả trạng thái</option>
          ${Object.entries(STATUS_MAP).map(([v,s]) => `<option value="${v}">${s.label}</option>`).join('')}
        </select>
        <select class="form-control" id="filter-priority" style="width:150px">
          <option value="">Tất cả ưu tiên</option>
          ${Object.entries(PRIORITY_MAP).map(([v,p]) => `<option value="${v}">${p.label}</option>`).join('')}
        </select>
        <div class="tabs" style="flex-shrink:0">
          <button class="tab-btn ${currentView==='list'?'active':''}" id="view-list">☰ Danh sách</button>
          <button class="tab-btn ${currentView==='kanban'?'active':''}" id="view-kanban">⊞ Kanban</button>
        </div>
      </div>
    </div>

    <!-- Tasks container -->
    <div id="tasks-content">
      <div style="display:flex;align-items:center;justify-content:center;height:200px">
        <div class="spinner spinner-lg"></div>
      </div>
    </div>
  `);

  // Load data
  [allTasks, categories] = await Promise.all([
    tasksApi.getAll().then(d => d.tasks || []).catch(() => []),
    categoriesApi.getAll().then(d => d.categories || []).catch(() => []),
  ]);

  rerenderTaskList();

  // Events
  document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());

  document.getElementById('search-input').addEventListener('input', (e) => {
    filters.search = e.target.value;
    rerenderTaskList();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    filters.status = e.target.value;
    rerenderTaskList();
  });

  document.getElementById('filter-priority').addEventListener('change', (e) => {
    filters.priority = e.target.value;
    rerenderTaskList();
  });

  document.getElementById('view-list').addEventListener('click', () => {
    currentView = 'list';
    document.getElementById('view-list').classList.add('active');
    document.getElementById('view-kanban').classList.remove('active');
    rerenderTaskList();
  });

  document.getElementById('view-kanban').addEventListener('click', () => {
    currentView = 'kanban';
    document.getElementById('view-kanban').classList.add('active');
    document.getElementById('view-list').classList.remove('active');
    rerenderTaskList();
  });
}
