/**
 * みんカレ PWA アイコン生成 (jimp-compact ベース)
 */
const Jimp = require('../node_modules/jimp-compact');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '../public/icons');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SRC = path.join(__dirname, '../assets/images/icon.png');

async function run() {
  const sizes = [
    { size: 512, name: 'icon-512.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 32,  name: 'favicon-32.png' },
  ];

  for (const { size, name } of sizes) {
    const img = await Jimp.read(SRC);
    img.resize(size, size);
    await img.writeAsync(path.join(OUT, name));
    console.log(`✅ ${name} (${size}x${size})`);
  }
  console.log('Done!');
}

run().catch(console.error);
