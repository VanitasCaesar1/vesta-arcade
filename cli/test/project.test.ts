import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectFiles, guessTitle, resolveBuildDir, slugify, PublishError } from "../src/project.ts";

async function project(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "vesta-test-"));
  for (const [path, body] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body);
  }
  return root;
}

test("slugify", () => {
  assert.equal(slugify("Hug of Death!"), "hug-of-death");
  assert.equal(slugify("@scope/My Game"), "my-game");
  assert.equal(slugify("Ünïcödé  -- Rocks"), "unicode-rocks");
  assert.equal(slugify("???"), "game");
});

test("prefers the build folder of a Vite project over its source index.html", async () => {
  const root = await project({
    "package.json": JSON.stringify({ scripts: { build: "vite build" } }),
    "index.html": '<script type="module" src="/src/main.ts"></script>',
    "public/index.html": "<p>static asset, not the build</p>",
    "dist/index.html": "<title>Built</title>",
  });
  assert.equal(await resolveBuildDir(root), join(root, "dist"));
});

test("asks for a build when only Vite source exists", async () => {
  const root = await project({
    "package.json": JSON.stringify({ scripts: { build: "vite build" } }),
    "index.html": '<script type="module" src="/src/main.tsx"></script>',
  });
  await assert.rejects(resolveBuildDir(root), /npm run build/);
});

test("publishes a plain HTML game from its own folder", async () => {
  const root = await project({ "index.html": "<title>Snake</title><script src=game.js></script>", "game.js": "1" });
  assert.equal(await resolveBuildDir(root), root);
  assert.equal(await guessTitle(root, root), "Snake");
});

test("collects files, skipping hidden files, node_modules and executables", async () => {
  const root = await project({
    "index.html": "<title>x</title>",
    "assets/a.png": "png",
    ".env": "SECRET=1",
    ".git/config": "x",
    "node_modules/x/index.js": "x",
    "tools/run.sh": "rm -rf /",
    "vesta.json": "{}",
  });
  const { files, skipped } = await collectFiles(root);
  assert.deepEqual(files.map((f) => f.path).sort(), ["assets/a.png", "index.html"]);
  assert.ok(skipped.includes(".env") && skipped.includes(".git") && skipped.some((s) => s.startsWith("tools/run.sh")));
  assert.ok(!skipped.includes("vesta.json"));
});

test("refuses a folder without index.html", async () => {
  const root = await project({ "game.js": "1" });
  await assert.rejects(collectFiles(root), PublishError);
});

test("ignores placeholder titles like 'Vite + React'", async () => {
  const root = await project({ "package.json": JSON.stringify({ name: "space-dodger" }), "dist/index.html": "<title>Vite + React</title>" });
  assert.equal(await guessTitle(join(root, "dist"), root), "Space Dodger");
});
