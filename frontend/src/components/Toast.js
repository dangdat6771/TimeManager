// Toast notification system
let toastCount = 0;

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const COLORS = {
  success: 'var(--accent)',
  error:   'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--primary-light)',
};

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${++toastCount}`;
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = 'tm-toast';
  toast.innerHTML = `
    <div class="tm-toast-icon" style="color:${COLORS[type]}">${ICONS[type]}</div>
    <span class="tm-toast-message">${message}</span>
    <button class="tm-toast-close" onclick="document.getElementById('${id}').remove()">✕</button>
  `;

  // Styles (injected once)
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      #toast-container {
        position: fixed;
        top: 20px; right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 360px;
        width: 100%;
      }
      .tm-toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: rgba(22,22,42,0.95);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        animation: toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
        font-family: var(--font-family);
        font-size: 14px;
        color: var(--text-primary);
      }
      .tm-toast.removing {
        animation: toastSlideOut 0.25s ease forwards;
      }
      .tm-toast-icon {
        font-size: 18px;
        font-weight: 700;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
      }
      .tm-toast-message { flex: 1; line-height: 1.4; }
      .tm-toast-close {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 12px;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.15s;
      }
      .tm-toast-close:hover { color: var(--text-primary); }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return id;
}

export const toast = {
  success: (msg, d) => showToast(msg, 'success', d),
  error:   (msg, d) => showToast(msg, 'error',   d),
  warning: (msg, d) => showToast(msg, 'warning', d),
  info:    (msg, d) => showToast(msg, 'info',    d),
};
