const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/wallet.js"],
  bundle: true,
  outfile: "background/wallet.bundle.js",
  format: "iife",
  globalName: "PatronWallet",
  platform: "browser",
  target: "chrome110",
  minify: !watch,
  define: {
    "process.env.NODE_ENV": '"production"',
    global: "globalThis",
  },
};

if (watch) {
  esbuild.context(config).then((ctx) => {
    ctx.watch();
    console.log("Watching for changes...");
  });
} else {
  esbuild.build(config).then(() => {
    console.log("Built background/wallet.bundle.js");
  });
}
