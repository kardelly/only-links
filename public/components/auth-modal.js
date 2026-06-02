/**
 * Auth Modal — login, signup, password reset
 */

async function initAuthModal() {
  const placeholder = document.getElementById('auth-modal-placeholder');
  if (!placeholder) return;

  try {
    const res = await fetch('/components/auth-modal.html');
    if (!res.ok) throw new Error('Failed to load auth modal');
    placeholder.innerHTML = await res.text();
    setupAuthModal();
    window.dispatchEvent(new CustomEvent('authModalReady'));
  } catch (err) {
    console.error('Auth modal init error:', err);
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.am-tab').forEach(t => {
    const active = t.dataset.tab === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });

  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  if (tab === 'login') {
    document.getElementById('login-form')?.classList.add('active');
    document.getElementById('login-username')?.focus();
  } else {
    document.getElementById('signup-form')?.classList.add('active');
    document.getElementById('signup-username')?.focus();
  }

  clearAllErrors();
}

// ── Helpers ──────────────────────────────────────────────

function setFieldError(groupId, errorId, message) {
  const group = document.getElementById(groupId);
  const error = document.getElementById(errorId);
  if (!group || !error) return;
  group.classList.toggle('has-error', !!message);
  group.classList.toggle('has-success', false);
  error.textContent = message || '';
}

function setFieldSuccess(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.classList.remove('has-error');
  group.classList.add('has-success');
}

function showGlobalError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function hideGlobalError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

function showSuccess(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function clearAllErrors() {
  document.querySelectorAll('.am-field').forEach(f => {
    f.classList.remove('has-error', 'has-success');
  });
  document.querySelectorAll('.am-field-error').forEach(e => e.textContent = '');
  ['login-global-error', 'signup-global-error', 'reset-global-error'].forEach(hideGlobalError);
}

function setSubmitLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
}

// ── Password requirements ─────────────────────────────────

const PW_RULES = [
  { id: 'req-length',    test: pw => pw.length >= 8,              label: 'At least 8 characters' },
  { id: 'req-uppercase', test: pw => /[A-Z]/.test(pw),            label: 'One uppercase letter' },
  { id: 'req-lowercase', test: pw => /[a-z]/.test(pw),            label: 'One lowercase letter' },
  { id: 'req-number',    test: pw => /[0-9]/.test(pw),            label: 'One number' },
  { id: 'req-special',   test: pw => /[^A-Za-z0-9]/.test(pw),    label: 'One special character' },
];

function calcStrength(pw) {
  return PW_RULES.filter(r => r.test(pw)).length;
}

function updateStrength(pw) {
  const reqs = document.getElementById('sf-reqs');
  if (!reqs) return;

  if (!pw) {
    reqs.classList.remove('visible');
    PW_RULES.forEach(r => document.getElementById(r.id)?.classList.remove('met'));
    return;
  }

  reqs.classList.add('visible');
  PW_RULES.forEach(r => {
    document.getElementById(r.id)?.classList.toggle('met', r.test(pw));
  });
}

// ── Username availability check (debounced) ───────────────

let usernameCheckTimer = null;

function checkUsernameAvailability(username) {
  clearTimeout(usernameCheckTimer);
  const statusEl = document.getElementById('sf-username-status');
  if (!statusEl) return;

  if (username.length < 3) {
    statusEl.textContent = '';
    return;
  }

  statusEl.textContent = '…';

  usernameCheckTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.available) {
        statusEl.textContent = '✓';
        statusEl.style.color = 'oklch(54% 0.15 145)';
        setFieldSuccess('sf-username-group');
        setFieldError('sf-username-group', 'sf-username-error', '');
      } else {
        statusEl.textContent = '✕';
        statusEl.style.color = 'oklch(58% 0.18 25)';
        setFieldError('sf-username-group', 'sf-username-error', 'Username is already taken');
      }
    } catch {
      statusEl.textContent = '';
    }
  }, 400);
}

// ── Setup ─────────────────────────────────────────────────

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');

  // Close
  document.getElementById('auth-modal-close')?.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Tabs
  document.querySelectorAll('.am-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // Password toggles
  document.getElementById('login-toggle-pw')?.addEventListener('click', function () {
    togglePassword('login-password', this);
  });
  document.getElementById('signup-toggle-pw')?.addEventListener('click', function () {
    togglePassword('signup-password', this);
  });

  // Username availability
  document.getElementById('signup-username')?.addEventListener('input', e => {
    checkUsernameAvailability(e.target.value.trim());
  });

  // Password strength
  document.getElementById('signup-password')?.addEventListener('input', e => {
    updateStrength(e.target.value);
  });

  // ── Login ────────────────────────────────────────────────
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username) return setFieldError('lf-username-group', 'lf-username-error', 'Enter your username');
    if (!password) return setFieldError('lf-password-group', 'lf-password-error', 'Enter your password');

    setSubmitLoading('login-submit', true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        // Map known errors to specific fields
        const msg = data.error || 'Login failed';
        if (/username|user not found/i.test(msg)) {
          setFieldError('lf-username-group', 'lf-username-error', 'No account with this username');
        } else if (/password|invalid/i.test(msg)) {
          setFieldError('lf-password-group', 'lf-password-error', 'Incorrect password');
        } else {
          showGlobalError('login-global-error', msg);
        }
        return;
      }

      window.location.href = '/app';
    } catch {
      showGlobalError('login-global-error', 'Connection error. Please try again.');
    } finally {
      setSubmitLoading('login-submit', false);
    }
  });

  // ── Signup ───────────────────────────────────────────────
  document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const username = document.getElementById('signup-username').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm-password').value;

    let hasError = false;

    if (!username) {
      setFieldError('sf-username-group', 'sf-username-error', 'Choose a username');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      setFieldError('sf-username-group', 'sf-username-error', '3-20 chars: letters, numbers, _ or -');
      hasError = true;
    }

    if (!email) {
      setFieldError('sf-email-group', 'sf-email-error', 'Enter your email address');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('sf-email-group', 'sf-email-error', 'Enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setFieldError('sf-password-group', 'sf-password-error', 'Choose a password');
      hasError = true;
    } else if (calcStrength(password) < 2) {
      setFieldError('sf-password-group', 'sf-password-error', 'Password is too weak — add numbers or symbols');
      hasError = true;
    }

    if (!confirm) {
      setFieldError('sf-confirm-group', 'sf-confirm-error', 'Confirm your password');
      hasError = true;
    } else if (password && confirm !== password) {
      setFieldError('sf-confirm-group', 'sf-confirm-error', 'Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setSubmitLoading('signup-submit', true);

    try {
      const body = { username, password };
      if (email) body.email = email;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Signup failed';
        if (/username.*taken|already.*exist/i.test(msg)) {
          setFieldError('sf-username-group', 'sf-username-error', 'Username is already taken');
        } else if (/email/i.test(msg)) {
          setFieldError('sf-email-group', 'sf-email-error', 'Email is already in use');
        } else if (/password/i.test(msg)) {
          setFieldError('sf-password-group', 'sf-password-error', msg);
        } else {
          showGlobalError('signup-global-error', msg);
        }
        return;
      }

      window.location.href = '/app';
    } catch {
      showGlobalError('signup-global-error', 'Connection error. Please try again.');
    } finally {
      setSubmitLoading('signup-submit', false);
    }
  });

  // Confirm password inline check
  document.getElementById('signup-confirm-password')?.addEventListener('input', e => {
    const pw = document.getElementById('signup-password')?.value;
    if (!e.target.value) {
      setFieldError('sf-confirm-group', 'sf-confirm-error', '');
      return;
    }
    if (e.target.value !== pw) {
      setFieldError('sf-confirm-group', 'sf-confirm-error', 'Passwords do not match');
    } else {
      setFieldError('sf-confirm-group', 'sf-confirm-error', '');
      setFieldSuccess('sf-confirm-group');
    }
  });

  // ── Forgot password ──────────────────────────────────────
  document.getElementById('forgot-password-link')?.addEventListener('click', () => {
    document.querySelectorAll('.auth-form').forEach(f => {
      f.classList.remove('active');
      f.style.display = '';
    });
    document.getElementById('reset-form').style.display = 'block';
    document.querySelectorAll('.am-tab').forEach(t => t.classList.remove('active'));
    clearAllErrors();
    document.getElementById('reset-username')?.focus();
  });

  document.getElementById('back-to-login')?.addEventListener('click', () => {
    document.getElementById('reset-form').style.display = 'none';
    switchAuthTab('login');
  });

  // ── Password reset ───────────────────────────────────────
  document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const identifier = document.getElementById('reset-username').value.trim();
    if (!identifier) return setFieldError('rf-username-group', 'rf-username-error', 'Enter your username or email');

    setSubmitLoading('reset-submit', true);

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: identifier })
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Reset request failed';
        if (/user.*not.*found|no.*account/i.test(msg)) {
          setFieldError('rf-username-group', 'rf-username-error', 'No account with this username');
        } else {
          showGlobalError('reset-global-error', msg);
        }
        return;
      }

      // Show success inline — same message regardless (prevent enumeration)
      document.getElementById('reset-submit').style.display = 'none';
      showSuccess('reset-success', 'If an account exists with that username or email, reset instructions are on their way.');
    } catch {
      showGlobalError('reset-global-error', 'Connection error. Please try again.');
    } finally {
      setSubmitLoading('reset-submit', false);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthModal);
} else {
  initAuthModal();
}
