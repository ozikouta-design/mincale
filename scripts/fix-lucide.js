#!/usr/bin/env node
// Fixes broken lucide-react-native package.json main field
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../node_modules/lucide-react-native/package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('lucide-react-native not found, skipping fix.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Find the actual entry file
const candidates = [
  './dist/esm/lucide-react-native/src/lucide-react-native.js',
  './src/lucide-react-native.js',
];

const pkgDir = path.dirname(pkgPath);
const actualMain = candidates.find((c) => fs.existsSync(path.resolve(pkgDir, c)));

if (!actualMain) {
  console.error('Could not find lucide-react-native entry file. Candidates tried:', candidates);
  process.exit(0);
}

if (pkg.main !== actualMain) {
  pkg.main = actualMain;
  // Also fix exports field if present
  if (pkg.exports) {
    pkg.exports = { '.': actualMain };
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('Fixed lucide-react-native package.json main ->', actualMain);
} else {
  console.log('lucide-react-native package.json already correct.');
}
