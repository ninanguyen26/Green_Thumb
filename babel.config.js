module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // reanimated plugin must stay last
    plugins: ["react-native-reanimated/plugin"],
  };
};
