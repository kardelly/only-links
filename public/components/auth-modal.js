/**
 * Shared Auth Modal Component Controller
 * Handles login, signup, and password reset
 */

// Load auth modal HTML and initialize
async function initAuthModal() {
  const placeholder = document.getElementById('auth-modal-placeholder');
  if (!placeholder) return;

  try {
    const response = await fetch('/components/auth-modal.html');
    if (!response.ok) throw new Error('Failed to load auth modal');
    const html = await response.text();
    placeholder.innerHTML = html;

    setupAuthModalListeners();
  } catch (err) {
    console.error('Error loading auth modal:', err);
  }
}

// Switch between auth tabs
function switchAuthTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(t => {
    if (t.dataset.tab === tab) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  forms.forEach(f => {
    f.classList.remove('active');
  });

  if (tab === 'login') {
    document.getElementById('login-form').classList.add('active');
  } else if (tab === 'register') {
    document.getElementById('signup-form').classList.add('active');
  }

  // Clear error
  const errorEl = document.getElementById('auth-error');
  if (errorEl) errorEl.style.display = 'none';
}

// Setup all auth modal event listeners
function setupAuthModalListeners() {
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');
  const modalBackdrop = authModal?.querySelector('.modal-backdrop');

  // Close modal
  [authModalClose, modalBackdrop].forEach(el => {
    el?.addEventListener('click', () => {
      authModal.classList.remove('active');
    });
  });

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchAuthTab(tab.dataset.tab);
    });
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Success - redirect to app
      window.location.href = '/app';
    } catch (err) {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });

  // Signup form
  const signupForm = document.getElementById('signup-form');
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Success - redirect to app
      window.location.href = '/app';
    } catch (err) {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });

  // Password strength indicator
  const signupPasswordInput = document.getElementById('signup-password');
  const strengthIndicator = document.getElementById('password-strength');

  signupPasswordInput?.addEventListener('input', () => {
    const password = signupPasswordInput.value;

    if (password.length === 0) {
      strengthIndicator.style.display = 'none';
      return;
    }

    strengthIndicator.style.display = 'block';

    const requirements = [
      { id: 'req-length', test: password.length >= 8 },
      { id: 'req-uppercase', test: /[A-Z]/.test(password) },
      { id: 'req-lowercase', test: /[a-z]/.test(password) },
      { id: 'req-number', test: /[0-9]/.test(password) },
      { id: 'req-special', test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) }
    ];

    requirements.forEach(req => {
      const el = document.getElementById(req.id);
      if (el) {
        if (req.test) {
          el.classList.add('met');
        } else {
          el.classList.remove('met');
        }
      }
    });
  });

  // Forgot password link
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  forgotPasswordLink?.addEventListener('click', () => {
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    document.getElementById('reset-form').style.display = 'block';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  });

  // Back to login
  const backToLoginBtn = document.getElementById('back-to-login');
  backToLoginBtn?.addEventListener('click', () => {
    document.getElementById('reset-form').style.display = 'none';
    switchAuthTab('login');
  });

  // Reset password form
  const resetForm = document.getElementById('reset-form');
  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reset-username').value;

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reset request failed');
      }

      alert('Password reset instructions have been generated. Check the server console for your reset link.');
      document.getElementById('reset-form').style.display = 'none';
      switchAuthTab('login');
    } catch (err) {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthModal);
} else {
  initAuthModal();
}
