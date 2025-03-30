// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Thêm rule cho font files
  config.module.rules.push({
    test: /\.ttf$/,
    loader: 'url-loader',
  });

  return config;
};