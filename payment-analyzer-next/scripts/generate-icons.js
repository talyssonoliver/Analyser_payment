/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Icon Generation Script
 *
 * This script generates PWA icons in various sizes.
 *
 * For now, it creates placeholder files that reference the SVG.
 *
 * To generate actual PNG files, you can:
 * 1. Use an online tool like https://realfavicongenerator.net/
 * 2. Install sharp: pnpm add -D sharp
 * 3. Use ImageMagick: convert icon.svg -resize 512x512 icon-512x512.png
 */

const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "../public/icons");
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

console.log("📱 PWA Icon Generation Script");
console.log("===============================\n");

console.log("✅ Icons directory exists:", ICONS_DIR);
console.log("✅ SVG icon template created");
console.log("\n📝 Required icon sizes:", SIZES.join(", "));

console.log("\n🎨 To generate PNG icons, you have several options:");
console.log("\n1. Online Generator (Recommended):");
console.log("   - Visit: https://realfavicongenerator.net/");
console.log("   - Upload: public/icons/icon.svg");
console.log("   - Download and extract to public/icons/");

console.log("\n2. Using Sharp (Node.js):");
console.log("   - Install: pnpm add -D sharp");
console.log("   - Run this script with Sharp support");

console.log("\n3. Using ImageMagick (CLI):");
console.log("   cd public/icons");
for (const size of SIZES) {
  console.log(`   convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png`);
}

console.log("\n4. Using GIMP or Photoshop:");
console.log("   - Open icon.svg");
console.log("   - Export for each size");

console.log("\n📋 Additional files needed:");
console.log("   - apple-touch-icon.png (180x180)");
console.log("   - favicon.ico (multiple sizes: 16x16, 32x32, 48x48)");

console.log("\n🔍 Once generated, verify files exist:");
for (const size of SIZES) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(ICONS_DIR, filename);
  const exists = fs.existsSync(filepath);
  console.log(`   ${exists ? "✅" : "❌"} ${filename}`);
}

console.log("\n💡 For development, you can use the SVG directly in some contexts.");
console.log("   For production, PNG files are required for broader compatibility.\n");

// Try to use Sharp if available
try {
  const sharp = require("sharp");

  console.log("\n🎉 Sharp detected! Generating PNG icons...\n");

  const svgPath = path.join(ICONS_DIR, "icon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  const promises = SIZES.map(async (size) => {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  });

  // Generate apple-touch-icon
  promises.push(
    sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(ICONS_DIR, "apple-touch-icon.png"))
      .then(() => console.log("✅ Generated: apple-touch-icon.png"))
  );

  Promise.all(promises)
    .then(() => {
      console.log("\n✅ All icons generated successfully!");
      console.log("📋 Next steps:");
      console.log("   1. Generate favicon.ico using: https://favicon.io/");
      console.log("   2. Test PWA manifest: npm run build");
      console.log("   3. Verify installability in Chrome DevTools\n");
    })
    .catch((error) => {
      console.error("\n❌ Error generating icons:", error.message);
      process.exit(1);
    });
} catch (error) {
  console.log("ℹ️  Sharp not installed. Install with: pnpm add -D sharp");
  console.log("   Or use one of the manual methods listed above.\n");
}
