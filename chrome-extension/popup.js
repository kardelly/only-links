const API_BASE = 'https://onlylinks.id';

// Get current tab info
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Check authentication
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include'
    });

    return response.ok;
  } catch (err) {
    console.error('Auth check failed:', err);
    return false;
  }
}

// Save bookmark
async function saveBookmark(bookmarkData) {
  const response = await fetch(`${API_BASE}/api/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(bookmarkData)
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save bookmark');
  }

  return response.json();
}

// Show error
function showError(message) {
  const errorAlert = document.getElementById('error-alert');
  const successAlert = document.getElementById('success-alert');

  errorAlert.textContent = message;
  errorAlert.classList.remove('hidden');
  successAlert.classList.add('hidden');
}

// Show success
function showSuccess(message) {
  const errorAlert = document.getElementById('error-alert');
  const successAlert = document.getElementById('success-alert');

  successAlert.textContent = message;
  successAlert.classList.remove('hidden');
  errorAlert.classList.add('hidden');
}

// Initialize popup
async function init() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    document.getElementById('save-form-container').classList.add('hidden');
    document.getElementById('login-prompt').classList.remove('hidden');
    return;
  }

  // Get current tab
  const tab = await getCurrentTab();

  // Populate form
  document.getElementById('url').value = tab.url;
  document.getElementById('title').value = tab.title;

  // Try to get selected text
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString()
    });

    if (result && result.result) {
      document.getElementById('description').value = result.result;
    }
  } catch (err) {
    console.log('Could not get selected text:', err);
  }

  // Handle form submission
  document.getElementById('save-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('save-btn');

    // Disable button
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving<span class="loading"></span>';

    const bookmarkData = {
      url: document.getElementById('url').value,
      title: document.getElementById('title').value,
      description: document.getElementById('description').value || '',
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
      is_public: document.getElementById('is-public').checked
    };

    try {
      await saveBookmark(bookmarkData);

      // Show success
      showSuccess('✓ Bookmark saved successfully!');

      // Close popup after 1 second
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
      showError(err.message);

      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save bookmark';
    }
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
