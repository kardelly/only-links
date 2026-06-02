/**
 * Settings Page Controller
 */

// State
const settingsState = {
  currentUser: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  setupEventListeners();
});

// Check user session — delegates to session.js singleton
async function checkSession() {
  const { user } = await window.getSession();

  if (!user) {
    window.location.href = '/';
    return;
  }

  const data = { user };
  settingsState.currentUser = user;

    // Update username in dropdown and link
    const profileMenuUsername = document.getElementById('profile-menu-username');
    if (profileMenuUsername) {
      profileMenuUsername.textContent = `@${data.user.username}`;
    }
    const profileHeaderLink = document.getElementById('profile-menu-header-link');
    if (profileHeaderLink) {
      profileHeaderLink.href = `/user/${data.user.username}`;
    }
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
      profileLink.href = `/user/${data.user.username}`;
    }

    // Update avatar initial and preview
    const profileAvatarInitial = document.getElementById('profile-avatar-initial');
    const avatarPreviewInitial = document.getElementById('avatar-preview-initial');

    if (profileAvatarInitial) {
      profileAvatarInitial.textContent = data.user.username.charAt(0).toUpperCase();
    }

    if (avatarPreviewInitial) {
      avatarPreviewInitial.textContent = data.user.username.charAt(0).toUpperCase();
    }

    // Load avatar if exists
    if (data.user.avatar) {
      updateAvatarDisplay(data.user.avatar);

      // Update preview
      const avatarPreview = document.getElementById('avatar-preview');
      if (avatarPreview && avatarPreviewInitial) {
        avatarPreviewInitial.style.display = 'none';
        let img = avatarPreview.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          avatarPreview.appendChild(img);
        }
        img.src = data.user.avatar;
      }

      // Show remove button
      const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
      if (avatarRemoveBtn) {
        avatarRemoveBtn.style.display = 'inline-flex';
      }
    }

    // Update username field
    const usernameField = document.getElementById('username-field');
    if (usernameField) {
      usernameField.value = data.user.username;
      usernameField.dataset.originalUsername = data.user.username;
    }

    // Load email if available
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.value = data.user.email || '';
      console.log('Email loaded:', data.user.email);
    }

    // Load user preferences
    await loadPreferences();
  } catch (err) {
    console.error('Session check error:', err);
    window.location.href = '/';
  }
}

// Load user preferences
async function loadPreferences() {
  try {
    const response = await fetch('/api/settings/preferences');
    if (!response.ok) return;

    const data = await response.json();

    // Set default public toggle
    const defaultPublicToggle = document.getElementById('default-public');
    if (defaultPublicToggle && data.preferences) {
      defaultPublicToggle.checked = data.preferences.default_public !== false;
    }
  } catch (err) {
    console.error('Load preferences error:', err);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Username form
  const usernameForm = document.getElementById('username-form');
  if (usernameForm) {
    usernameForm.addEventListener('submit', handleUsernameChange);
  }

  // Username availability check
  const usernameField = document.getElementById('username-field');
  const usernameIcon = document.getElementById('username-icon');
  const usernameHelper = document.getElementById('username-helper');
  let usernameCheckTimeout;

  if (usernameField) {
    usernameField.addEventListener('input', () => {
      const username = usernameField.value.trim();
      const originalUsername = usernameField.dataset.originalUsername;

      clearTimeout(usernameCheckTimeout);

      // Reset if empty or same as original
      if (!username || username === originalUsername) {
        usernameIcon.textContent = '';
        usernameHelper.textContent = '';
        usernameHelper.className = 'form-helper';
        return;
      }

      // Show checking state
      usernameIcon.textContent = '⏳';
      usernameHelper.textContent = 'Checking availability...';
      usernameHelper.className = 'form-helper';

      // Debounce API call
      usernameCheckTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
          const data = await response.json();

          if (data.available) {
            usernameIcon.textContent = '✅';
            usernameHelper.textContent = 'Username available';
            usernameHelper.className = 'form-helper success';
          } else {
            usernameIcon.textContent = '❌';
            usernameHelper.textContent = data.error || 'Username not available';
            usernameHelper.className = 'form-helper error';
          }
        } catch (err) {
          usernameIcon.textContent = '';
          usernameHelper.textContent = '';
          usernameHelper.className = 'form-helper';
        }
      }, 500);
    });
  }

  // Email form
  const emailForm = document.getElementById('email-form');
  if (emailForm) {
    emailForm.addEventListener('submit', handleEmailChange);
  }

  // Password form
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // Privacy toggle
  const defaultPublicToggle = document.getElementById('default-public');
  if (defaultPublicToggle) {
    defaultPublicToggle.addEventListener('change', handlePrivacyChange);
  }

  // Delete all bookmarks
  const deleteAllBookmarksBtn = document.getElementById('delete-all-bookmarks-btn');
  if (deleteAllBookmarksBtn) {
    deleteAllBookmarksBtn.addEventListener('click', handleDeleteAllBookmarks);
  }

  // Delete account
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);
  }

  // Profile dropdown toggle
  const profileAvatarBtn = document.getElementById('profile-avatar-btn');
  const profileMenu = document.getElementById('profile-menu');

  if (profileAvatarBtn && profileMenu) {
    profileAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && e.target !== profileAvatarBtn) {
        profileMenu.classList.remove('active');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // Avatar upload
  const avatarUploadBtn = document.getElementById('avatar-upload-btn');
  const avatarInput = document.getElementById('avatar-input');
  const avatarRemoveBtn = document.getElementById('avatar-remove-btn');

  if (avatarUploadBtn && avatarInput) {
    avatarUploadBtn.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', handleAvatarUpload);
  }

  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener('click', handleAvatarRemove);
  }

  // Import/Export
  const exportBtn = document.getElementById('export-bookmarks-btn');
  const importBtn = document.getElementById('import-bookmarks-btn');
  const importFileInput = document.getElementById('import-file-input');

  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportBookmarks);
  }

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    importFileInput.addEventListener('change', handleImportBookmarks);
  }
}

// Handle username change
async function handleUsernameChange(e) {
  e.preventDefault();

  const username = document.getElementById('username-field').value.trim();
  const originalUsername = document.getElementById('username-field').dataset.originalUsername;

  if (username === originalUsername) {
    showAlert('username-alert', 'error', 'Username is the same as current');
    return;
  }

  console.log('Updating username to:', username);

  try {
    const response = await fetch('/api/settings/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    console.log('Username update response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update username');
    }

    // Update local state and original username
    settingsState.currentUser.username = username;
    document.getElementById('username-field').dataset.originalUsername = username;

    // Update dropdown and avatar
    const profileMenuUsername = document.getElementById('profile-menu-username');
    if (profileMenuUsername) {
      profileMenuUsername.textContent = `@${username}`;
    }

    const profileAvatarInitial = document.getElementById('profile-avatar-initial');
    if (profileAvatarInitial) {
      profileAvatarInitial.textContent = username.charAt(0).toUpperCase();
    }

    showAlert('username-alert', 'success', 'Username updated successfully. You will need to sign in again.');

    // Logout after 2 seconds
    setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    }, 2000);
  } catch (err) {
    console.error('Username update error:', err);
    showAlert('username-alert', 'error', err.message);
  }
}

// Handle email change
async function handleEmailChange(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  console.log('Updating email to:', email);

  try {
    const response = await fetch('/api/settings/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log('Email update response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update email');
    }

    // Update local state
    settingsState.currentUser.email = email;

    showAlert('email-alert', 'success', 'Email updated successfully');

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      hideAlert('email-alert');
    }, 3000);
  } catch (err) {
    console.error('Email update error:', err);
    showAlert('email-alert', 'error', err.message);
  }
}

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showAlert('password-alert', 'error', 'New passwords do not match');
    return;
  }

  // Validate password length
  if (newPassword.length < 8) {
    showAlert('password-alert', 'error', 'Password must be at least 8 characters long');
    return;
  }

  try {
    const response = await fetch('/api/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    showAlert('password-alert', 'success', 'Password updated successfully');

    // Reset form
    document.getElementById('password-form').reset();
  } catch (err) {
    showAlert('password-alert', 'error', err.message);
  }
}

// Handle privacy setting change
async function handlePrivacyChange(e) {
  const defaultPublic = e.target.checked;

  try {
    const response = await fetch('/api/settings/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_public: defaultPublic })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update preferences');
    }

    showAlert('privacy-alert', 'success', 'Privacy settings updated');

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      hideAlert('privacy-alert');
    }, 3000);
  } catch (err) {
    showAlert('privacy-alert', 'error', err.message);
    // Revert toggle on error
    e.target.checked = !defaultPublic;
  }
}

// Handle delete all bookmarks
async function handleDeleteAllBookmarks() {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm');
  const cancelBtn = document.getElementById('confirmation-cancel');

  // Show confirmation modal
  titleEl.textContent = 'Delete all bookmarks?';
  messageEl.textContent = 'This will permanently delete all your bookmarks. Your account will remain active, but all your saved links will be lost forever. This action cannot be undone.';

  modal.classList.add('active');

  // Wait for user decision
  const confirmed = await new Promise((resolve) => {
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleBackdropClick);
    };

    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBackdropClick);
  });

  if (!confirmed) {
    modal.classList.remove('active');
    return;
  }

  // Show loading state in modal
  titleEl.textContent = 'Deleting bookmarks...';
  messageEl.textContent = 'Please wait while we delete all your bookmarks.';
  confirmBtn.style.display = 'none';
  cancelBtn.style.display = 'none';

  try {
    const response = await fetch('/api/settings/bookmarks', {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete bookmarks');
    }

    // Show success state
    titleEl.textContent = '✅ All bookmarks deleted';
    titleEl.style.color = 'var(--accent)';
    messageEl.textContent = 'All your bookmarks have been successfully deleted. Refreshing page...';

    // Auto-close and reload after 2 seconds
    setTimeout(() => {
      modal.classList.remove('active');
      titleEl.style.color = '';
      confirmBtn.style.display = '';
      cancelBtn.style.display = '';
      window.location.reload();
    }, 2000);

  } catch (err) {
    // Show error state
    titleEl.textContent = '❌ Error';
    titleEl.style.color = 'var(--danger)';
    messageEl.textContent = `Failed to delete bookmarks: ${err.message}`;

    // Show close button
    cancelBtn.style.display = '';
    cancelBtn.textContent = 'Close';

    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      titleEl.style.color = '';
      titleEl.textContent = 'Confirm action';
      cancelBtn.textContent = 'Cancel';
      confirmBtn.style.display = '';
    }, { once: true });
  }
}

// Handle account deletion
async function handleDeleteAccount() {
  const confirmed = await showDeleteAccountModal();

  if (!confirmed) return;

  try {
    const response = await fetch('/api/settings/account', {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete account');
    }

    // Redirect to home after successful deletion
    alert('Your account has been deleted.');
    window.location.href = '/';
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Show alert message
function showAlert(alertId, type, message) {
  const alert = document.getElementById(alertId);
  if (!alert) return;

  alert.textContent = message;
  alert.className = `alert alert-${type} visible`;
}

// Hide alert message
function hideAlert(alertId) {
  const alert = document.getElementById(alertId);
  if (!alert) return;

  alert.classList.remove('visible');
}

// Handle avatar upload
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    showAlert('avatar-alert', 'error', 'File size must be less than 2MB');
    return;
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showAlert('avatar-alert', 'error', 'Only JPG, PNG, and WebP files are allowed');
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (event) => {
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarPreviewInitial = document.getElementById('avatar-preview-initial');

    if (avatarPreview && avatarPreviewInitial) {
      avatarPreviewInitial.style.display = 'none';

      let img = avatarPreview.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        avatarPreview.appendChild(img);
      }
      img.src = event.target.result;
    }
  };
  reader.readAsDataURL(file);

  // Upload to server
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const response = await fetch('/api/settings/avatar', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload avatar');
    }

    // Update avatar in header
    updateAvatarDisplay(data.avatarPath);

    // Show remove button
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    if (avatarRemoveBtn) {
      avatarRemoveBtn.style.display = 'inline-flex';
    }

    showAlert('avatar-alert', 'success', 'Avatar updated successfully');

    setTimeout(() => {
      hideAlert('avatar-alert');
    }, 3000);
  } catch (err) {
    console.error('Avatar upload error:', err);
    showAlert('avatar-alert', 'error', err.message);
  }
}

// Handle avatar removal
async function handleAvatarRemove() {
  const confirmed = await showConfirmationModal(
    'Remove avatar',
    'Are you sure you want to remove your profile photo? This action cannot be undone.'
  );

  if (!confirmed) return;

  try {
    const response = await fetch('/api/settings/avatar', {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove avatar');
    }

    // Reset preview to initial
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarPreviewInitial = document.getElementById('avatar-preview-initial');

    if (avatarPreview && avatarPreviewInitial) {
      const img = avatarPreview.querySelector('img');
      if (img) {
        img.remove();
      }
      avatarPreviewInitial.style.display = 'flex';
      avatarPreviewInitial.textContent = settingsState.currentUser.username.charAt(0).toUpperCase();
    }

    // Update avatar in header
    updateAvatarDisplay(null);

    // Hide remove button
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    if (avatarRemoveBtn) {
      avatarRemoveBtn.style.display = 'none';
    }

    // Reset file input
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
      avatarInput.value = '';
    }

    showAlert('avatar-alert', 'success', 'Avatar removed successfully');

    setTimeout(() => {
      hideAlert('avatar-alert');
    }, 3000);
  } catch (err) {
    console.error('Avatar remove error:', err);
    showAlert('avatar-alert', 'error', err.message);
  }
}

// Update avatar display throughout the page
function updateAvatarDisplay(avatarPath) {
  const profileAvatarBtn = document.getElementById('profile-avatar-btn');
  const profileAvatarInitial = document.getElementById('profile-avatar-initial');

  if (profileAvatarBtn && profileAvatarInitial) {
    if (avatarPath) {
      profileAvatarInitial.style.display = 'none';

      let img = profileAvatarBtn.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        profileAvatarBtn.appendChild(img);
      }
      img.src = avatarPath;
    } else {
      const img = profileAvatarBtn.querySelector('img');
      if (img) {
        img.remove();
      }
      profileAvatarInitial.style.display = 'flex';
      profileAvatarInitial.textContent = settingsState.currentUser.username.charAt(0).toUpperCase();
    }
  }
}

// Show confirmation modal
function showConfirmationModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmation-modal');
    const titleEl = document.getElementById('confirmation-title');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirmation-confirm');
    const cancelBtn = document.getElementById('confirmation-cancel');

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleBackdropClick);
    };

    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBackdropClick);
  });
}

// Show delete account modal
function showDeleteAccountModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('delete-account-modal');
    const usernameInput = document.getElementById('delete-account-username');
    const confirmBtn = document.getElementById('delete-account-confirm');
    const cancelBtn = document.getElementById('delete-account-cancel');
    const errorEl = document.getElementById('delete-account-error');

    modal.classList.add('active');
    usernameInput.value = '';
    confirmBtn.disabled = true;
    errorEl.style.display = 'none';

    const handleUsernameInput = () => {
      const value = usernameInput.value.trim();
      if (value === settingsState.currentUser.username) {
        confirmBtn.disabled = false;
        errorEl.style.display = 'none';
      } else {
        confirmBtn.disabled = true;
        if (value) {
          errorEl.textContent = 'Username does not match';
          errorEl.style.display = 'block';
        } else {
          errorEl.style.display = 'none';
        }
      }
    };

    const handleConfirm = () => {
      if (usernameInput.value.trim() === settingsState.currentUser.username) {
        cleanup();
        resolve(true);
      }
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove('active');
      usernameInput.removeEventListener('input', handleUsernameInput);
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleBackdropClick);
    };

    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    usernameInput.addEventListener('input', handleUsernameInput);
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBackdropClick);

    // Focus input
    setTimeout(() => usernameInput.focus(), 100);
  });
}

// Export bookmarks
async function handleExportBookmarks() {
  try {
    const response = await fetch('/api/bookmarks?mine=true&limit=10000');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to export bookmarks');
    }

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user: settingsState.currentUser.username,
      bookmarks: data.items.map(bookmark => ({
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        tags: bookmark.tags,
        is_public: bookmark.is_public,
        created_at: bookmark.created_at
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `only-link-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert('data-alert', 'success', `Successfully exported ${exportData.bookmarks.length} bookmarks`);

    setTimeout(() => {
      hideAlert('data-alert');
    }, 3000);
  } catch (err) {
    console.error('Export error:', err);
    showAlert('data-alert', 'error', err.message);
  }
}

// Import bookmarks
async function handleImportBookmarks(e) {
  const file = e.target.files[0];
  if (!file) return;

  const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
  const isHTML = file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm');

  if (!isJSON && !isHTML) {
    showAlert('data-alert', 'error', 'Please select a valid JSON or HTML file');
    e.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    let bookmarks = [];

    if (isJSON) {
      const data = JSON.parse(text);
      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid JSON format. Expected a bookmarks array.');
      }
      bookmarks = data.bookmarks;
    } else {
      bookmarks = parseNetscapeBookmarks(text);
    }

    if (bookmarks.length === 0) {
      throw new Error('No bookmarks found in the file.');
    }

    // Debug: log first and last bookmarks
    console.log('First bookmark in file:', bookmarks[0]?.title);
    console.log('Last bookmark in file:', bookmarks[bookmarks.length - 1]?.title);

    // Show preview modal with original order
    const confirmed = await showImportPreviewModal(bookmarks);

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    // Import in REVERSE order so first bookmark in HTML gets highest ID
    // When displayed with ORDER BY id DESC, first HTML bookmark appears first
    const reversed = [...bookmarks].reverse();
    console.log('Will import first (gets lowest ID):', reversed[0]?.title);
    console.log('Will import last (gets highest ID):', reversed[reversed.length - 1]?.title);

    await performImport(reversed);

    e.target.value = '';
  } catch (err) {
    console.error('Import error:', err);
    showAlert('data-alert', 'error', err.message || 'Failed to import bookmarks');
    e.target.value = '';
  }
}

// Show import preview modal
function showImportPreviewModal(bookmarks) {
  return new Promise((resolve) => {
    const modal = document.getElementById('import-preview-modal');
    const totalCountEl = document.getElementById('import-total-count');
    const previewListEl = document.getElementById('import-preview-list');
    const confirmBtn = document.getElementById('import-preview-confirm');
    const cancelBtn = document.getElementById('import-preview-cancel');

    // Update total count
    totalCountEl.textContent = `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`;

    // Show preview of first 10 bookmarks
    const previewItems = bookmarks.slice(0, 10);
    previewListEl.innerHTML = previewItems.map(bm => `
      <div style="padding: var(--space-3); border-bottom: 1px solid var(--border); last:border-bottom: none;">
        <div style="font-size: var(--text-sm); font-weight: 600; color: var(--fg); margin-bottom: var(--space-1);">
          ${escapeHTML(bm.title || 'Untitled')}
        </div>
        <div style="font-size: var(--text-xs); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHTML(bm.url)}
        </div>
      </div>
    `).join('');

    if (bookmarks.length > 10) {
      previewListEl.innerHTML += `
        <div style="padding: var(--space-3); text-align: center; color: var(--muted); font-size: var(--text-sm);">
          + ${bookmarks.length - 10} more bookmarks...
        </div>
      `;
    }

    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// Perform import with progress tracking
async function performImport(bookmarks) {
  return new Promise((resolve) => {
    const modal = document.getElementById('import-progress-modal');
    const progressBar = document.getElementById('import-progress-bar');
    const progressText = document.getElementById('import-progress-text');
    const successCount = document.getElementById('import-success-count');
    const failedCount = document.getElementById('import-failed-count');
    const closeBtn = document.getElementById('import-progress-close');
    const errorDetails = document.getElementById('import-error-details');
    const errorList = document.getElementById('import-error-list');

    let imported = 0;
    let failed = 0;
    const errors = {};

    modal.classList.add('active');
    closeBtn.disabled = true;

    progressText.textContent = `0 / ${bookmarks.length}`;
    successCount.textContent = '0';
    failedCount.textContent = '0';
    errorDetails.style.display = 'none';
    errorList.innerHTML = '';

    let currentIndex = 0;

    async function importBatch() {
      const batchSize = 10; // Import 10 at a time (sequentially)
      const batch = bookmarks.slice(currentIndex, currentIndex + batchSize);

      if (batch.length === 0) {
        // Done - show success state in modal
        const modalTitle = document.querySelector('#import-progress-modal .modal-title');
        if (modalTitle) {
          modalTitle.textContent = '✅ Import Complete!';
          modalTitle.style.color = 'var(--accent)';
        }

        closeBtn.disabled = false;
        closeBtn.textContent = 'Done';
        closeBtn.className = 'btn btn-primary';

        // Show success alert outside modal
        showAlert('data-alert', 'success', `Successfully imported ${imported} bookmark${imported !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}.`);

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          modal.classList.remove('active');

          // Reset modal for next use
          if (modalTitle) {
            modalTitle.textContent = 'Importing Bookmarks...';
            modalTitle.style.color = '';
          }
          closeBtn.textContent = 'Close';
          closeBtn.className = 'btn btn-secondary';

          resolve();

          // Hide alert after another 3 seconds
          setTimeout(() => {
            hideAlert('data-alert');
          }, 3000);
        }, 2000);

        return;
      }

      // Process batch in parallel for speed (up to 10 concurrent requests)
      const promises = batch.map(bookmark =>
        fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: bookmark.url,
            title: bookmark.title || 'Untitled',
            description: bookmark.description || '',
            tags: Array.isArray(bookmark.tags) ? bookmark.tags.join(', ') : (bookmark.tags || ''),
            is_public: bookmark.is_public !== undefined ? bookmark.is_public : 1
          })
        })
        .then(response => {
          if (response.ok) {
            imported++;
            return { success: true };
          } else {
            failed++;
            return response.json().then(data => {
              const errorMsg = data.error || 'Unknown error';
              errors[errorMsg] = (errors[errorMsg] || 0) + 1;
              return { success: false };
            });
          }
        })
        .catch(err => {
          failed++;
          const errorMsg = err.message || 'Network error';
          errors[errorMsg] = (errors[errorMsg] || 0) + 1;
          return { success: false };
        })
      );

      await Promise.all(promises);
      currentIndex += batch.length;

      // Update UI
      const progress = (currentIndex / bookmarks.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${currentIndex} / ${bookmarks.length}`;
      successCount.textContent = imported;
      failedCount.textContent = failed;

      // Show error details if there are errors
      if (failed > 0) {
        errorDetails.style.display = 'block';
        errorList.innerHTML = Object.entries(errors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([msg, count]) => `<li>${escapeHTML(msg)} (${count}x)</li>`)
          .join('');
      }

      // Continue with next batch
      importBatch();
    }

    importBatch();
  });
}

// Parse Netscape Bookmark HTML format
function parseNetscapeBookmarks(html) {
  const bookmarks = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find all <A> tags (bookmark links)
  const links = doc.querySelectorAll('a');

  links.forEach(link => {
    const url = link.getAttribute('href');
    const title = link.textContent.trim();

    if (url && title) {
      // Extract tags from various attributes
      let tags = [];
      const tagsAttr = link.getAttribute('tags') || link.getAttribute('data-tags');
      if (tagsAttr) {
        tags = tagsAttr.split(',').map(t => t.trim()).filter(t => t);
      }

      // Look for description in next DD element or shortcutdescription attribute
      let description = '';
      const descAttr = link.getAttribute('shortcutdescription');
      if (descAttr) {
        description = descAttr;
      } else {
        // Check for next DD sibling
        let nextElement = link.parentElement?.nextElementSibling;
        if (nextElement && nextElement.tagName === 'DD') {
          description = nextElement.textContent.trim();
        }
      }

      bookmarks.push({
        url: url,
        title: title,
        description: description,
        tags: tags,
        is_public: 1
      });
    }
  });

  return bookmarks;
}

// HTML escape helper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
