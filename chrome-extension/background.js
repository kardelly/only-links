// Background service worker for only.link Chrome Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('only.link extension installed');
});

// Optional: Add keyboard shortcut listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-bookmark') {
    // Open popup
    chrome.action.openPopup();
  }
});

// Optional: Context menu for saving links
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-onlylink',
    title: 'Save to only.link',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-onlylink') {
    // Open popup
    chrome.action.openPopup();
  }
});
