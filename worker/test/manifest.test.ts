import { test } from "node:test";
import assert from "node:assert/strict";
import { validateManifest, validatePath, validateSlug, ManifestError } from "../src/lib/manifest.ts";

test("accepts a normal build", () => {
  const r = validateManifest([{ path: "index.html", size: 10 }, { path: "assets/game.js", size: 20 }]);
  assert.equal(r.totalBytes, 30);
  assert.equal(r.files.length, 2);
});

test("requires index.html at the top level", () => {
  assert.throws(() => validateManifest([{ path: "dist/index.html", size: 1 }]), /index.html/);
});

for (const bad of ["../x.js", "/etc/passwd", "a/../b", "a//b", ".env", "src/.git/config", "a\\b", "x\u0000y", "tool.exe", "run.SH", ""]) {
  test(`rejects path ${JSON.stringify(bad)}`, () => assert.throws(() => validatePath(bad), ManifestError));
}

test("rejects duplicates, bad sizes and oversize builds", () => {
  assert.throws(() => validateManifest([{ path: "index.html", size: 1 }, { path: "index.html", size: 1 }]), /duplicate/);
  assert.throws(() => validateManifest([{ path: "index.html", size: -1 }]), /invalid size/);
  assert.throws(() => validateManifest([{ path: "index.html", size: 26 * 1024 * 1024 }]), /larger than/);
  const many = Array.from({ length: 5 }, (_, i) => ({ path: `f${i}.bin`, size: 24 * 1024 * 1024 }));
  assert.throws(() => validateManifest([{ path: "index.html", size: 1 }, ...many]), /build is larger/);
  assert.throws(() => validateManifest([]), /no files/);
});

test("slugs", () => {
  assert.equal(validateSlug("hug-of-death"), "hug-of-death");
  for (const bad of ["", "-a", "a-", "a--b", "Caps", "admin", "a".repeat(49), "a b"]) assert.throws(() => validateSlug(bad), ManifestError);
});
