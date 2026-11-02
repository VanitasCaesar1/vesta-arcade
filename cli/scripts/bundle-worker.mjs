// Bundles the arcade Worker into the CLI package, so `npx vesta-cli setup`
// can deploy it without cloning the repo.
import { build } from "esbuild";
import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, "../../worker");
const outDir = join(here, "../dist/worker");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await build({
  entryPoints: [join(worker, "src/index.ts")],
  outfile: join(outDir, "index.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  minify: true,
  legalComments: "none",
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  conditions: ["workerd", "worker", "browser"],
  mainFields: ["module", "main"],
  logLevel: "warning",
});
await cp(join(worker, "migrations"), join(outDir, "migrations"), { recursive: true });
await chmod(join(here, "../dist/cli.js"), 0o755);
console.log("Bundled the arcade Worker into dist/worker");
