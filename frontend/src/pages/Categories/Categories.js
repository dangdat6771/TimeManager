import { renderLayout } from '../../components/Layout.js';
import { categoriesApi } from '../../api/categories.js';
import { tasksApi } from '../../api/tasks.js';
import { openModal } from '../../components/Modal.js';
import { toast } from '../../components/Toast.js';

const ICON_OPTIONS = [
  { value: 'book', label: 'Sách' },
  { value: 'briefcase', label: 'Công việc' },
  { value: 'heart', label: 'Sức khỏe' },
  { value: 'user', label: 'Cá nhân' },
  { value: 'target', label: 'Mục tiêu' },
  { value: 'calendar', label: 'Lịch' },
  { value: 'star', label: 'Quan trọng' },
  { value: 'code', label: 'Code' },
  { value: 'home', label: 'Nhà' },
  { value: 'folder', label: 'Thư mục' },
];

const COLOR_OPTIONS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#38BDF8', '#FF6B6B', '#8B5CF6', '#14B8A6'];

let categories = [];
let tasks = [];
let filters = { search: '', type: 'all' };

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getIconLabel(icon) {
  return ICON_OPTIONS.find(item => item.value === icon)?.label || icon || 'Thư mục';
}

function getCategoryStats(categoryId) {
  const related = tasks.filter(task => task.category_id === categoryId);
  return {
    total: related.length,
    done: related.filter(task => task.status === 'done').length,
    open: related.filter(task => task.status !== 'done' && task.status !== 'cancelled').length,
  };
}

function getFilteredCategories() {
  return categories.filter(category => {
    if (filters.type === 'default' && !category.is_default) return false;
    if (filters.type === 'custom' && category.is_default) return false;
    if (filters.search && !category.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function categoryCardHTML(category) {
  const stats = getCategoryStats(category.id);
  const canEdit = !category.is_default;
  const name = escapeHtml(category.name);
  const icon = escapeHtml(category.icon || 'folder');
  const color = category.color || '#6366F1';

  return `
    <div class="category-card" style="
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:12px;
      padding:18px;
      transition:all 0.2s ease;
      position:relative;
      overflow:hidden;
    ">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color}"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div style="
            width:44px;height:44px;min-width:44px;border-radius:10px;
            background:${color}22;color:${color};
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:800;text-transform:uppercase;
            border:1px solid ${color}44;
          ">${escapeHtml(icon.slice(0, 2))}</div>
          <div style="min-width:0">
            <div style="font-size:15px;font-weight:800;color:var(--text-primary);word-break:break-word">${name}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${escapeHtml(getIconLabel(category.icon))}</div>
          </div>
        </div>
        <span class="badge ${category.is_default ? 'badge-primary' : 'badge-accent'}">
          ${category.is_default ? 'Mặc định' : 'Của bạn'}
        </span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
        <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--text-primary)">${stats.total}</div>
          <div style="font-size:11px;color:var(--text-muted)">Task</div>
        </div>
        <div style="padding:10px;border-radius:10px;background:rgba(6,214,160,0.08);text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--accent)">${stats.done}</div>
          <div style="font-size:11px;color:var(--text-muted)">Xong</div>
        </div>
        <div style="padding:10px;border-radius:10px;background:rgba(255,209,102,0.08);text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--warning)">${stats.open}</div>
          <div style="font-size:11px;color:var(--text-muted)">Đang mở</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <button class="btn btn-sm btn-ghost btn-edit-category" data-id="${category.id}" ${canEdit ? '' : 'disabled title="Danh mục mặc định không thể sửa"'}>
            Sửa
          </button>
          <button class="btn btn-sm btn-danger btn-delete-category" data-id="${category.id}" ${canEdit ? '' : 'disabled title="Danh mục mặc định không thể xóa"'}>
            Xóa
          </button>
      </div>
    </div>
  `;
}

function renderCategoryList() {
  const container = document.getElementById('categories-content');
  const filtered = getFilteredCategories();
  const totalCustom = categories.filter(category => !category.is_default).length;
  const totalDefault = categories.filter(category => category.is_default).length;

  document.getElementById('category-count-total').textContent = categories.length;
  document.getElementById('category-count-custom').textContent = totalCustom;
  document.getElementById('category-count-default').textContent = totalDefault;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">▦</div>
        <h3>Chưa có danh mục phù hợp</h3>
        <p>Thử đổi bộ lọc hoặc tạo danh mục mới cho công việc của bạn.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${filtered.map(categoryCardHTML).join('')}
    </div>
  `;

  container.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = 'var(--shadow-md)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  container.querySelectorAll('.btn-edit-category').forEach(button => {
    button.addEventListener('click', () => {
      const category = categories.find(item => item.id === button.dataset.id);
      if (category && !category.is_default) openCategoryModal(category);
    });
  });

  container.querySelectorAll('.btn-delete-category').forEach(button => {
    button.addEventListener('click', async () => {
      const category = categories.find(item => item.id === button.dataset.id);
      if (!category || category.is_default) return;
      if (!confirm(`Xóa danh mục "${category.name}"? Task đang gắn danh mục này sẽ được bỏ liên kết.`)) return;

      try {
        await categoriesApi.delete(category.id);
        toast.success('Đã xóa danh mục');
        await loadData();
      } catch (error) {
        toast.error(error.message || 'Không thể xóa danh mục');
      }
    });
  });
}

function openCategoryModal(existingCategory = null) {
  const isEdit = Boolean(existingCategory);
  const selectedColor = existingCategory?.color || COLOR_OPTIONS[0];

  const modal = openModal({
    title: isEdit ? 'Sửa danh mục' : 'Tạo danh mục mới',
    content: `
      <form id="category-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tên danh mục *</label>
          <input class="form-control" id="category-name" maxlength="100" value="${escapeHtml(existingCategory?.name || '')}" placeholder="Ví dụ: Đồ án tốt nghiệp" required />
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:12px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Icon</label>
            <select class="form-control" id="category-icon">
              ${ICON_OPTIONS.map(item => `
                <option value="${item.value}" ${(existingCategory?.icon || 'folder') === item.value ? 'selected' : ''}>${item.label}</option>
              `).join('')}
            </select>
          </div>
          <input id="category-color" type="hidden" value="${selectedColor}" />
        </div>

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Bảng màu</label>
          <div id="category-color-grid" style="display:flex;gap:8px;flex-wrap:wrap">
            ${COLOR_OPTIONS.map(color => `
              <button type="button" class="category-color-choice" data-color="${color}" style="
                width:34px;height:34px;border-radius:10px;
                background:${color};
                border:2px solid ${color === selectedColor ? 'white' : 'rgba(255,255,255,0.18)'};
                cursor:pointer;
              " aria-label="${color}"></button>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border)">
          <div id="category-preview-icon" style="
            width:42px;height:42px;border-radius:10px;
            background:${selectedColor}22;color:${selectedColor};
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:800;text-transform:uppercase;
            border:1px solid ${selectedColor}44;
          ">${escapeHtml((existingCategory?.icon || 'folder').slice(0, 2))}</div>
          <div>
            <div id="category-preview-name" style="font-size:14px;font-weight:800;color:var(--text-primary)">${escapeHtml(existingCategory?.name || 'Danh mục mới')}</div>
            <div style="font-size:12px;color:var(--text-muted)">Xem trước danh mục</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
          <button type="button" class="btn btn-ghost" id="category-cancel">Hủy</button>
          <button type="submit" class="btn btn-primary" id="category-submit">${isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}</button>
        </div>
      </form>
    `,
  });

  const nameInput = document.getElementById('category-name');
  const iconInput = document.getElementById('category-icon');
  const colorInput = document.getElementById('category-color');
  const previewIcon = document.getElementById('category-preview-icon');
  const previewName = document.getElementById('category-preview-name');

  function refreshPreview() {
    const color = colorInput.value || selectedColor;
    const icon = iconInput.value || 'folder';
    previewIcon.textContent = icon.slice(0, 2);
    previewIcon.style.background = `${color}22`;
    previewIcon.style.color = color;
    previewIcon.style.borderColor = `${color}44`;
    previewName.textContent = nameInput.value.trim() || 'Danh mục mới';

    document.querySelectorAll('.category-color-choice').forEach(button => {
      button.style.borderColor = button.dataset.color === color ? 'white' : 'rgba(255,255,255,0.18)';
    });
  }

  document.getElementById('category-cancel')?.addEventListener('click', () => modal.close());
  nameInput.addEventListener('input', refreshPreview);
  iconInput.addEventListener('change', refreshPreview);
  colorInput.addEventListener('input', refreshPreview);
  document.querySelectorAll('.category-color-choice').forEach(button => {
    button.addEventListener('click', () => {
      colorInput.value = button.dataset.color;
      refreshPreview();
    });
  });

  document.getElementById('category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.getElementById('category-submit');
    const name = nameInput.value.trim();
    const color = colorInput.value.trim();
    const icon = iconInput.value;

    if (!name) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      toast.error('Mã màu phải có định dạng #RRGGBB');
      return;
    }

    submit.disabled = true;
    try {
      if (isEdit) {
        await categoriesApi.update(existingCategory.id, { name, color, icon });
        toast.success('Đã cập nhật danh mục');
      } else {
        await categoriesApi.create({ name, color, icon });
        toast.success('Đã tạo danh mục');
      }
      modal.close();
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Không thể lưu danh mục');
      submit.disabled = false;
    }
  });
}

async function loadData() {
  const [categoryData, taskData] = await Promise.all([
    categoriesApi.getAll(),
    tasksApi.getAll(),
  ]);
  categories = categoryData.categories || [];
  tasks = taskData.tasks || [];
  renderCategoryList();
}

export async function renderCategories() {
  renderLayout(`
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">▦ Danh mục</h1>
        <p class="page-subtitle">Quản lý nhóm công việc để lọc, thống kê và lập kế hoạch rõ ràng hơn.</p>
      </div>
      <button class="btn btn-primary" id="add-category-btn">+ Thêm danh mục</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-icon purple">▦</div>
        <div class="stat-value" id="category-count-total">0</div>
        <div class="stat-label">Tổng danh mục</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">+</div>
        <div class="stat-value" id="category-count-custom">0</div>
        <div class="stat-label">Danh mục của bạn</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">*</div>
        <div class="stat-value" id="category-count-default">0</div>
        <div class="stat-label">Danh mục mặc định</div>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:20px">
      <div class="filter-bar">
        <div class="search-box" style="flex:1">
          <span class="icon">⌕</span>
          <input class="form-control" id="category-search" placeholder="Tìm danh mục..." />
        </div>
        <select class="form-control" id="category-type-filter" style="width:180px">
          <option value="all">Tất cả danh mục</option>
          <option value="custom">Danh mục của bạn</option>
          <option value="default">Danh mục mặc định</option>
        </select>
      </div>
    </div>

    <div id="categories-content">
      <div style="display:flex;align-items:center;justify-content:center;height:220px">
        <div class="spinner spinner-lg"></div>
      </div>
    </div>
  `);

  document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
  document.getElementById('category-search').addEventListener('input', event => {
    filters.search = event.target.value;
    renderCategoryList();
  });
  document.getElementById('category-type-filter').addEventListener('change', event => {
    filters.type = event.target.value;
    renderCategoryList();
  });

  try {
    await loadData();
  } catch (error) {
    toast.error(error.message || 'Không thể tải danh mục');
    document.getElementById('categories-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">▦</div>
        <h3>Không thể tải danh mục</h3>
        <p>Kiểm tra backend và thử lại sau.</p>
      </div>
    `;
  }
}
