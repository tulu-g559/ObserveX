import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const entryPoints = [
  { in: "src/background/background.ts", out: "background/background" },
  { in: "src/content/content.ts", out: "content/content" },
  { in: "src/popup/popup.ts", out: "popup/popup" },
  { in: "src/options/options.ts", out: "options/options" },
];

const ctx = await esbuild.context({
  entryPoints: entryPoints.map((e) => e.in),
  outdir: ".",
  outbase: "src",
  bundle: true,
  format: "esm",
  target: "chrome116",
  sourcemap: true,
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
