/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Create Placeholder Icon Files
 *
 * This script creates placeholder icon files by copying the SVG
 * and creating symlinks or copies for development purposes.
 *
 * For production, use the HTML generator or install Sharp.
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('📱 Creating Placeholder Icon Files\n');

// Read the SVG content
const svgContent = fs.readFileSync(SVG_PATH, 'utf8');

console.log('Creating placeholder references...\n');

// Create a README file explaining the icons
const readmeContent = `# PWA Icons

This directory contains the Progressive Web App (PWA) icons.

## Current Status

The SVG template has been created. To generate PNG icons:

### Option 1: Use HTML Generator (Easiest)
1. Open \`generate-icons.html\` in your browser
2. Click "Generate All Icons"
3. Download each icon (right-click → Save Image As)

### Option 2: Use Online Tool (Recommended for Production)
1. Visit https://realfavicongenerator.net/
2. Upload \`icon.svg\`
3. Download the generated package
4. Extract to this directory

### Option 3: Use Sharp (Automated)
\`\`\`bash
pnpm add -D sharp
node ../scripts/generate-icons.js
\`\`\`

### Option 4: Use ImageMagick
\`\`\`bash
cd public/icons
${SIZES.map(size => `convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png`).join('\n')}
convert icon.svg -resize 180x180 apple-touch-icon.png
\`\`\`

## Required Files

- ✅ icon.svg (template - created)
- ❌ icon-72x72.png
- ❌ icon-96x96.png
- ❌ icon-128x128.png
- ❌ icon-144x144.png
- ❌ icon-152x152.png
- ❌ icon-192x192.png
- ❌ icon-384x384.png
- ❌ icon-512x512.png
- ❌ apple-touch-icon.png (180x180)
- ❌ favicon.ico

## Development Notes

- The app will work with the SVG in development
- For production, generate PNG files for broader compatibility
- PWA installation requires proper PNG icons
- Service worker is only active in production builds
`;

fs.writeFileSync(path.join(ICONS_DIR, 'README.md'), readmeContent);
console.log('✅ Created README.md with instructions');

// Create a placeholder index.html to remind developers
const indexContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=generate-icons.html">
  <title>Redirecting to Icon Generator...</title>
</head>
<body>
  <p>Redirecting to icon generator... If not redirected, <a href="generate-icons.html">click here</a>.</p>
</body>
</html>
`;

fs.writeFileSync(path.join(ICONS_DIR, 'index.html'), indexContent);
console.log('✅ Created index.html redirect');

console.log('\n📋 Next Steps:');
console.log('   1. Open: public/icons/generate-icons.html in browser');
console.log('   2. Download all generated icons');
console.log('   3. Save them to: public/icons/');
console.log('   4. Run: pnpm build to verify\n');

console.log('💡 For automated generation, install Sharp:');
console.log('   pnpm add -D sharp');
console.log('   node scripts/generate-icons.js\n');
