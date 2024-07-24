const { compile } = require("nexe");
const path = require("path");

compile({
  input: "./out/src/server.js",
  output: "./build/pls",
  build: true,
  resources: [
    path.resolve(
      __dirname,
      "node_modules/tree-sitter-publicodes/prebuilds/**/*",
    ),
    path.resolve(__dirname, "node_modules/tree-sitter/prebuilds/**/*"),
  ],
  // build: true, //required to use patches
  // patches: [
  //   async (compiler, next) => {
  //     await compiler.setFileContentsAsync(
  //       'lib/new-native-module.js',
  //       'module.exports = 42'
  //     )
  //     return next()
  //   }
  // ]
}).then(() => {
  console.log("success");
});
