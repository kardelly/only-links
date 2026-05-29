/**
 * Shared Footer Component Controller
 * Loads footer HTML
 */

// Load footer HTML
async function initFooter() {
  const placeholder = document.getElementById('footer-placeholder');
  if (!placeholder) {
    console.error('Footer placeholder not found');
    return;
  }

  try {
    const response = await fetch('/components/footer.html');
    if (!response.ok) throw new Error('Failed to load footer');
    const html = await response.text();
    placeholder.innerHTML = html;
  } catch (err) {
    console.error('Error loading footer:', err);
  }
}

// Initialize footer on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  initFooter();
}
