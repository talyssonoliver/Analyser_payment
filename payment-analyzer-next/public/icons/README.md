# PWA Icons

This directory contains the Progressive Web App (PWA) icons.

## Current Status - ✅ COMPLETE

All required PWA icons have been generated successfully!

### Generated Files

- ✅ icon.svg (template - created)
- ✅ icon-72x72.png
- ✅ icon-96x96.png
- ✅ icon-128x128.png
- ✅ icon-144x144.png
- ✅ icon-152x152.png
- ✅ icon-192x192.png
- ✅ icon-384x384.png
- ✅ icon-512x512.png
- ✅ apple-touch-icon.png

## How Icons Were Generated

Icons were generated using Sharp (Node.js library):

```bash
pnpm add -D sharp
node scripts/generate-icons.js
```

## Regenerating Icons

If you need to regenerate the icons (e.g., after updating icon.svg):

### Option 1: Use Sharp (Automated - Recommended)
```bash
node scripts/generate-icons.js
```

### Option 2: Use HTML Generator
1. Open `generate-icons.html` in your browser
2. Click "Generate All Icons"
3. Download each icon (right-click → Save Image As)

### Option 3: Use Online Tool
1. Visit https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Download the generated package
4. Extract to this directory

### Option 4: Use ImageMagick
```bash
cd public/icons
convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
convert icon.svg -resize 180x180 apple-touch-icon.png
```

## PWA Manifest Integration

These icons are referenced in `/public/manifest.json` for Progressive Web App functionality.

## Testing

To verify the icons are working:

1. Start the development server: `pnpm dev`
2. Open Chrome DevTools → Application → Manifest
3. Verify all icon URLs return 200 status
4. Test PWA installation on mobile devices

## Icon Design

The icon features:
- Financial/calculator theme
- Blue gradient (#0ea5e9 theme color)
- Optimized for both light and dark backgrounds
- Safe area within 80% of canvas for rounded corners

## Date Generated

October 19, 2025

- ❌ apple-touch-icon.png (180x180)
- ❌ favicon.ico

## Development Notes

- The app will work with the SVG in development
- For production, generate PNG files for broader compatibility
- PWA installation requires proper PNG icons
- Service worker is only active in production builds
