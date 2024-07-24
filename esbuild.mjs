import { build } from "esbuild";
import { nativeModulesPlugin } from "@douglasneuroinformatics/esbuild-plugin-native-modules";

const commonConfig = {
  bundle: true,
  format: "cjs",
  platform: "node",
  logLevel: "debug",
  minify: false,
  sourcemap: true,
  loader: {
    ".node": "file",
  },
};

console.log("Building server");
build({
  ...commonConfig,
  entryPoints: ["server/src/server.ts"],
  outfile: "server/out/server.js",
  plugins: [
    // {
    //   name: "native-modules",
    //   setup(build) {
    //     build.onResolve({ filter: /^*/ }, (args) => {
    //       console.log("onResolve:", JSON.stringify(args, null, 2));
    //       return {
    //         path: args.path,
    //         namespace: "native",
    //       };
    //     });
    //     build.onLoad({ filter: /.*/, namespace: "native" }, (args) => {
    //       console.log("onLoad:", JSON.stringify(args, null, 2));
    //       return {};
    //     });
    //   },
    // },
  ],
}).then(() => {
  console.log("Building client");
  build({
    ...commonConfig,
    entryPoints: ["client/src/extension.ts"],
    outfile: "client/out/extension.js",
    external: ["vscode"],
  });
});
