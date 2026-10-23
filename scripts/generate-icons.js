/**
 * My Routine App Icon Generator
 *
 * Automatically generates production-ready icons from `public/icon-master.png` for:
 * 1. Web & PWA: Favicon (.ico & .png), Apple touch icon, PWA standard & maskable icons.
 * 2. In-App Branding: logo.png, MyRoutine.png, and src/app/favicon.ico.
 * 3. Android Native: All density-specific standard, round, and adaptive foreground icons.
 *
 * Usage:
 *   node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const MASTER_ICON = path.join(ROOT_DIR, 'public', 'icon-master.png');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const APP_DIR = path.join(ROOT_DIR, 'src', 'app');
const ANDROID_RES_DIR = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');

const BG_COLOR = '#0B1A32'; // Sampled dark navy background of the artwork

// Helper: build valid Windows/Browser multi-resolution ICO file from PNG buffers
function buildIcoBuffer(images) {
  const count = images.length;
  const headerSize = 6;
  const directorySize = count * 16;
  let offset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Count

  const directories = [];
  for (const img of images) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    dir.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    dir.writeUInt8(0, 2); // Color palette
    dir.writeUInt8(0, 3); // Reserved
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(img.buffer.length, 8); // Size
    dir.writeUInt32LE(offset, 12); // Offset
    directories.push(dir);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...directories, ...images.map((img) => img.buffer)]);
}

async function generateWebIcons() {
  console.log('🌐 Generating Web & PWA icons from master artwork...');

  // 1. Favicons
  await sharp(MASTER_ICON)
    .resize(16, 16, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));

  await sharp(MASTER_ICON)
    .resize(32, 32, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));

  // 2. Apple Touch Icon (180x180)
  await sharp(MASTER_ICON)
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // 3. PWA Icons (192x192 & 512x512)
  await sharp(MASTER_ICON)
    .resize(192, 192, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-192x192.png'));

  await sharp(MASTER_ICON)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-512x512.png'));

  // 4. PWA Maskable Icon (512x512)
  // W3C recommendation: artwork fits safely within 80% safe zone circle to prevent mask clipping
  const maskableInnerSize = Math.round(512 * 0.78); // ~400px
  const resizedInner = await sharp(MASTER_ICON)
    .resize(maskableInnerSize, maskableInnerSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      {
        input: resizedInner,
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-maskable-512x512.png'));

  // 5. In-app Branding Logos
  await sharp(MASTER_ICON)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo.png'));

  await sharp(MASTER_ICON)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'MyRoutine.png'));

  // 6. Multi-resolution favicon.ico (16, 32, 48) - must be RGBA for Next.js Turbopack decoder
  const b16 = await sharp(MASTER_ICON).resize(16, 16).ensureAlpha().png().toBuffer();
  const b32 = await sharp(MASTER_ICON).resize(32, 32).ensureAlpha().png().toBuffer();
  const b48 = await sharp(MASTER_ICON).resize(48, 48).ensureAlpha().png().toBuffer();

  const icoBuffer = buildIcoBuffer([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
  ]);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);

  console.log('✅ Web & PWA assets generated successfully in public/ and src/app/');
}

async function generateAndroidIcons() {
  console.log('📱 Generating Android native launcher & adaptive icons...');

  // Standard density definitions
  const densities = [
    { name: 'mdpi', launcherSize: 48, adaptiveSize: 108 },
    { name: 'hdpi', launcherSize: 72, adaptiveSize: 162 },
    { name: 'xhdpi', launcherSize: 96, adaptiveSize: 216 },
    { name: 'xxhdpi', launcherSize: 144, adaptiveSize: 324 },
    { name: 'xxxhdpi', launcherSize: 192, adaptiveSize: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(ANDROID_RES_DIR, `mipmap-${d.name}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Standard legacy launcher (ic_launcher.png)
    await sharp(MASTER_ICON)
      .resize(d.launcherSize, d.launcherSize, { fit: 'contain' })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. Legacy round launcher (ic_launcher_round.png)
    const circleSvg = Buffer.from(
      `<svg width="${d.launcherSize}" height="${d.launcherSize}"><circle cx="${d.launcherSize / 2}" cy="${d.launcherSize / 2}" r="${d.launcherSize / 2}" fill="white"/></svg>`
    );
    await sharp(MASTER_ICON)
      .resize(d.launcherSize, d.launcherSize, { fit: 'contain' })
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. Adaptive launcher foreground (ic_launcher_foreground.png)
    // Android safe zone is inner 66% (72dp of 108dp canvas).
    // Scale artwork to 72% of adaptiveSize and center on transparent canvas.
    const innerSize = Math.round(d.adaptiveSize * 0.72);
    const innerBuf = await sharp(MASTER_ICON)
      .resize(innerSize, innerSize, { fit: 'contain' })
      .toBuffer();

    await sharp({
      create: {
        width: d.adaptiveSize,
        height: d.adaptiveSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: innerBuf,
          gravity: 'center',
        },
      ])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ mipmap-${d.name}: launcher=${d.launcherSize}px, adaptive=${d.adaptiveSize}px`);
  }

  // 4. Update adaptive background color
  const bgXmlPath = path.join(ANDROID_RES_DIR, 'values', 'ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG_COLOR}</color>\n</resources>\n`;
  fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf-8');
  console.log(`  ✓ Updated ic_launcher_background.xml to ${BG_COLOR}`);

  console.log('✅ Android launcher icons generated successfully.');
}

async function main() {
  if (!fs.existsSync(MASTER_ICON)) {
    console.error(`❌ Master icon not found at: ${MASTER_ICON}`);
    process.exit(1);
  }

  console.log(`🎨 Master icon found at ${MASTER_ICON}`);
  await generateWebIcons();
  await generateAndroidIcons();
  console.log('🎉 All icons generated successfully!');
}

main().catch((err) => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
