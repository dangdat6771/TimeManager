import { authApi } from '../../api/auth.js';
import { api } from '../../api/client.js';
import { authStore } from '../../store/auth.js';
import { router } from '../../router/index.js';
import { toast } from '../../components/Toast.js';

function getAuthHTML(isLogin) {
  return `
  <div class="auth-page">
    <div class="auth-bg-shapes">
      <div class="auth-shape auth-shape-1"></div>
      <div class="auth-shape auth-shape-2"></div>
      <div class="auth-shape auth-shape-3"></div>
    </div>
    <div class="auth-card animate-scale-in">
      <div class="auth-logo">
        <div class="auth-logo-icon">⏱</div>
        <span class="auth-logo-text">TimeManager</span>
      </div>

      <h1 class="auth-title">${isLogin ? 'Chào mừng trở lại! 👋' : 'Tạo tài khoản 🚀'}</h1>
      <p class="auth-subtitle">${isLogin
        ? 'Đăng nhập để tiếp tục hành trình quản lý thời gian.'
        : 'Bắt đầu hành trình năng suất của bạn hôm nay.'}</p>

      <form id="auth-form" novalidate>
        ${!isLogin ? `
        <div class="form-group">
          <label class="form-label" for="fullName">Họ và tên</label>
          <input class="form-control" id="fullName" name="fullName" type="text"
            placeholder="Nguyễn Văn A" autocomplete="name" />
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input class="form-control" id="email" name="email" type="email"
            placeholder="ban@email.com" autocomplete="email" />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Mật khẩu</label>
          <div style="position:relative">
            <input class="form-control" id="password" name="password" type="password"
              placeholder="${isLogin ? '••••••••' : 'Tối thiểu 8 ký tự'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
            <button type="button" id="toggle-pw" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
              background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;">👁</button>
          </div>
        </div>

        <div id="auth-error" style="display:none;color:var(--danger);font-size:13px;margin-bottom:16px;
          padding:10px 14px;background:rgba(255,107,107,0.1);border-radius:8px;border:1px solid rgba(255,107,107,0.2)"></div>

        <button class="btn btn-primary btn-full btn-lg" type="submit" id="auth-submit">
          <span id="submit-text">${isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
        </button>
      </form>

      <div class="auth-switch">
        ${isLogin
          ? `Chưa có tài khoản? <a id="switch-mode">Đăng ký ngay</a>`
          : `Đã có tài khoản? <a id="switch-mode">Đăng nhập</a>`
        }
      </div>
    </div>
  </div>
  `;
}

function initAuthPage(isLogin) {
  const app = document.getElementById('app');
  app.innerHTML = getAuthHTML(isLogin);

  // Toggle password visibility
  const togglePw = document.getElementById('toggle-pw');
  const pwInput  = document.getElementById('password');
  if (togglePw) {
    togglePw.addEventListener('click', () => {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
      togglePw.textContent = pwInput.type === 'password' ? '👁' : '🙈';
    });
  }

  // Switch mode
  document.getElementById('switch-mode')?.addEventListener('click', () => {
    router.navigate(isLogin ? '/register' : '/login');
  });

  // Form submit
  const form    = document.getElementById('auth-form');
  const errEl   = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const submitText = document.getElementById('submit-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName')?.value.trim();

    // Basic validation
    if (!email || !password) {
      errEl.textContent = 'Vui lòng điền đầy đủ thông tin.';
      errEl.style.display = 'block';
      return;
    }
    if (!isLogin && !fullName) {
      errEl.textContent = 'Vui lòng nhập họ tên.';
      errEl.style.display = 'block';
      return;
    }
    if (!isLogin && password.length < 8) {
      errEl.textContent = 'Mật khẩu phải có ít nhất 8 ký tự.';
      errEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitText.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';

    try {
      if (isLogin) {
        const data = await authApi.login({ email, password });
        api.setTokens(data.accessToken, data.refreshToken);
        authStore.setUser(data.user);
        toast.success(`Chào mừng, ${data.user.full_name}! 🎉`);
        router.navigate('/dashboard');
      } else {
        await authApi.register({ email, password, fullName });
        toast.success('Tạo tài khoản thành công! Hãy đăng nhập.');
        router.navigate('/login');
      }
    } catch (err) {
      errEl.textContent = err.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitText.textContent = isLogin ? 'Đăng nhập' : 'Tạo tài khoản';
    }
  });
}

export function renderLogin()    { initAuthPage(true); }
export function renderRegister() { initAuthPage(false); }
