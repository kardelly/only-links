# Extension Icons

You need to create 4 icon sizes for the Chrome extension:

- `icon-16.png` - 16x16 pixels
- `icon-32.png` - 32x32 pixels  
- `icon-48.png` - 48x48 pixels
- `icon-128.png` - 128x128 pixels

## Quick way to create icons

### Option 1: Using an online tool

1. Go to https://realfavicongenerator.net/ or https://www.favicon-generator.org/
2. Upload your logo/icon
3. Download the generated icons
4. Rename them to match the names above

### Option 2: Using ImageMagick (if installed)

```bash
# If you have a logo.png file (at least 128x128)
convert logo.png -resize 16x16 icon-16.png
convert logo.png -resize 32x32 icon-32.png
convert logo.png -resize 48x48 icon-48.png
convert logo.png -resize 128x128 icon-128.png
```

### Option 3: Simple SVG text icon

Create an SVG with text "o.l" (for only.link) and export as PNG at different sizes using any design tool (Figma, Canva, etc.)

## Temporary placeholder

For now, you can use any 128x128 PNG and just duplicate it with different names until you create proper icons.

## Design tips

- Use a simple, recognizable symbol
- Make sure it's readable at 16x16 pixels
- Use high contrast (works in light and dark themes)
- Keep it simple - avoid fine details at small sizes
