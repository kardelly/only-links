# only.link Chrome Extension

Save any webpage to [only.link](https://onlylinks.id) with a single click.

## Features

- 🚀 One-click bookmark saving
- 🏷️ Add tags directly from the extension
- 🔒 Public/private bookmarks
- 📝 Automatically captures page title and URL
- ✨ Captures selected text as description

## Installation

### From Source (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension is now installed!

### Usage

1. **Click the extension icon** in your browser toolbar
2. The popup will show the current page's details
3. Add tags, adjust title/description if needed
4. Click "Save bookmark"
5. Done! Your bookmark is saved to only.link

### Keyboard Shortcut (Optional)

You can set up a keyboard shortcut:

1. Go to `chrome://extensions/shortcuts`
2. Find "only.link - Quick Save"
3. Set your preferred shortcut (e.g., `Ctrl+Shift+D`)

## Requirements

- You must be logged in to [onlylinks.id](https://onlylinks.id)
- Chrome/Edge/Brave browser (Manifest V3 compatible)

## Privacy

This extension:
- ✅ Only accesses the current tab when you click the extension icon
- ✅ Does not track your browsing history
- ✅ Does not collect any personal data
- ✅ Only communicates with onlylinks.id when saving bookmarks

## Development

To modify the extension:

1. Edit files in the `chrome-extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Popup interface
- `popup.js` - Popup logic
- `background.js` - Background service worker
- `icons/` - Extension icons (placeholder - add your own)

## Support

For issues or questions, visit [onlylinks.id](https://onlylinks.id)

## License

MIT - See LICENSE file in the main project
