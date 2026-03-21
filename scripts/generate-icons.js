const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');

// みんカレ アイコン SVG デザイン
// テーマカラー: #2563eb (blue-600)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- 背景: 丸角四角 -->
  <rect width="512" height="512" rx="100" ry="100" fill="#2563eb"/>

  <!-- カレンダー本体 (白) -->
  <rect x="88" y="130" width="336" height="300" rx="24" ry="24" fill="white"/>

  <!-- カレンダーヘッダー (青) -->
  <rect x="88" y="130" width="336" height="90" rx="24" ry="24" fill="#1d4ed8"/>
  <rect x="88" y="175" width="336" height="45" fill="#1d4ed8"/>

  <!-- バインダーリング 左 -->
  <rect x="166" y="90" width="28" height="70" rx="14" ry="14" fill="#93c5fd"/>
  <!-- バインダーリング 右 -->
  <rect x="318" y="90" width="28" height="70" rx="14" ry="14" fill="#93c5fd"/>

  <!-- ヘッダーテキスト: "みんカレ" 的なカレンダーグリッドアイコン -->
  <!-- 月表示エリア (白テキスト風の装飾) -->
  <text x="256" y="195" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="white" text-anchor="middle">3月</text>

  <!-- グリッド: 日 -->
  <!-- Row 1 -->
  <rect x="112" y="252" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="162" y="252" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="212" y="252" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="262" y="252" width="36" height="36" rx="8" fill="#2563eb"/>
  <rect x="312" y="252" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="362" y="252" width="36" height="36" rx="8" fill="#dbeafe"/>

  <!-- Row 2 -->
  <rect x="112" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="162" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="212" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="262" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="312" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="362" y="302" width="36" height="36" rx="8" fill="#dbeafe"/>

  <!-- Row 3 -->
  <rect x="112" y="352" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="162" y="352" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="212" y="352" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="262" y="352" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="312" y="352" width="36" height="36" rx="8" fill="#dbeafe"/>
  <rect x="362" y="352" width="36" height="36" rx="8" fill="#eff6ff"/>

  <!-- 今日ハイライト: 中央のブルーセルに白テキスト -->
  <text x="280" y="278" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">今</text>
</svg>`;

async function generateIcons() {
  const svgBuffer = Buffer.from(svgIcon);

  // icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // favicon-32.png (faviconに使用)
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  const favicon16 = await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toBuffer();

  // favicon.pngとして32x32を保存（.icoの代替）
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ favicon.png');

  // favicon.ico用: 32x32 PNG を ICO フォーマットで出力
  // sharp は .ico をネイティブ非対応のため、PNG を ICO として扱うシンプルな方法を使用
  // ICO ファイルを手動で構築 (32x32 single entry)
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const icoBuffer = createIcoFromPng(png32, 32, 32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ favicon.ico');

  console.log('\nAll icons generated successfully!');
}

// シンプルなICOファイル生成 (PNG埋め込み形式)
function createIcoFromPng(pngBuffer, width, height) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const imageOffset = headerSize + dirEntrySize;

  const buf = Buffer.alloc(headerSize + dirEntrySize + pngBuffer.length);

  // ICO Header
  buf.writeUInt16LE(0, 0);       // Reserved (must be 0)
  buf.writeUInt16LE(1, 2);       // Type: 1 = ICO
  buf.writeUInt16LE(1, 4);       // Number of images

  // Directory Entry
  buf.writeUInt8(width >= 256 ? 0 : width, 6);   // Width
  buf.writeUInt8(height >= 256 ? 0 : height, 7);  // Height
  buf.writeUInt8(0, 8);          // Color palette count (0 = no palette)
  buf.writeUInt8(0, 9);          // Reserved
  buf.writeUInt16LE(1, 10);      // Color planes
  buf.writeUInt16LE(32, 12);     // Bits per pixel
  buf.writeUInt32LE(pngBuffer.length, 14); // Image data size
  buf.writeUInt32LE(imageOffset, 18);      // Offset to image data

  // PNG data
  pngBuffer.copy(buf, imageOffset);

  return buf;
}

generateIcons().catch(console.error);
