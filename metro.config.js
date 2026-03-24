const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'lucide-react-native': path.resolve(
    __dirname,
    'node_modules/lucide-react-native/dist/esm/lucide-react-native/src/lucide-react-native.js'
  ),
};

module.exports = config;
