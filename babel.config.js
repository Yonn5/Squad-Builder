module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Hermes (Expo Go / hermesc) rejects private class syntax
      // ("private properties are not supported"), which react-native 0.81
      // ships in its DOMRect sources — transpile it away.
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
      ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ],
  };
};
