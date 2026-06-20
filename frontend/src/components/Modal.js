// Modal component
let modalStack = [];

function injectModalStyles() {
  if (document.getElementById('modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'modal-styles';
  style.textContent = `
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: overlayFadeIn 0.2s ease;
    }
    .modal-box {
      background: rgba(20,20,36,0.98);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
      animation: modalFadeIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      font-family: var(--font-family);
    }
    .modal-box.modal-lg { max-width: 720px; }
    .modal-box.modal-sm { max-width: 380px; }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .modal-close {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.06);
      border: none;
      border-radius: 8px;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .modal-close:hover {
      background: rgba(255,255,255,0.12);
      color: var(--text-primary);
    }
    .modal-body { padding: 24px 28px; }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 28px 24px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
  `;
  document.head.appendChild(style);
}

export function openModal({ title, content, size = '', onClose } = {}) {
  injectModalStyles();
  const container = document.getElementById('modal-container');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <span class="modal-title">${title || ''}</span>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body" id="modal-body-content"></div>
    </div>
  `;

  // Insert content
  const bodyEl = overlay.querySelector('#modal-body-content');
  if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    bodyEl.appendChild(content);
  }

  const close = () => {
    overlay.style.animation = 'overlayFadeIn 0.15s ease reverse';
    setTimeout(() => {
      overlay.remove();
      modalStack = modalStack.filter(m => m !== overlay);
      if (onClose) onClose();
    }, 150);
  };

  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  container.appendChild(overlay);
  modalStack.push(overlay);

  return { close, overlay, bodyEl };
}

export function closeAllModals() {
  modalStack.forEach(m => m.remove());
  modalStack = [];
}
