// const { getDefaultConfig } = require("expo/metro-config");
// const { withNativeWind } = require('nativewind/metro');

// const config = getDefaultConfig(__dirname)

// module.exports = withNativeWind(config, { input: './global.css' })

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

let config = getDefaultConfig(__dirname);

// Kết hợp cấu hình NativeWind
config = withNativeWind(config, { input: './global.css' });

// Kết hợp cấu hình React Native Reanimated
config = wrapWithReanimatedMetroConfig(config);

module.exports = config;


  