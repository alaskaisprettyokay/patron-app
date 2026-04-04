const esbuild = require("esbuild");
require("dotenv").config();

const watch = process.argv.includes("--watch");

const ESCROW_ADDRESS = process.env.PATRON_ESCROW_ADDRESS ?? "0x0000000000000000000000000000000000000000";
if (ESCROW_ADDRESS === "0x0000000000000000000000000000000000000000") {
  console.warn("Warning: PATRON_ESCROW_ADDRESS not set in .env — using zero address");
}

const WEB_URL = process.env.PATRON_WEB_URL ?? "http://localhost:3000";

const shared = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome110",
  minify: !watch,
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.PATRON_ESCROW_ADDRESS": JSON.stringify(ESCROW_ADDRESS),
    "process.env.PATRON_WEB_URL": JSON.stringify(WEB_URL),
    global: "globalThis",
  },
};

const configs = [
  {
    ...shared,
    entryPoints: ["src/service-worker.js"],
    outfile: "background/service-worker.js",
  },
  {
    ...shared,
    entryPoints: ["src/popup.js"],
    outfile: "popup/popup.js",
  },
];

if (watch) {
  Promise.all(
    configs.map((config) =>
      esbuild.context(config).then((ctx) => ctx.watch())
    )
  ).then(() => console.log("Watching for changes..."));
} else {
  Promise.all(configs.map((config) => esbuild.build(config))).then(() => {
    console.log("Built background/service-worker.js and popup/popup.js");
  });
}
