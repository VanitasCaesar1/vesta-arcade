// Works out what to publish: which folder, which files, and the game's details.
import { existsSync } from "node:fs";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

export const MAX_FILES = 1000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

/** vesta.json, kept next to the game's source so the next publish updates the same game. */
export interface ProjectConfig {
  slug?: string;
  title?: string;
  description?: string;
  author?: string;
  madeWith?: string[];
  tags?: string[];
  /** Build folder, relative to vesta.json. */
  dir?: string;
  /** Cover image, relative to vesta.json. PNG, JPEG, WebP or GIF, under 2 MB. */
  cover?: string;
  sourceUrl?: string;
  keyboardRequired?: boolean;
  /** Width/height of the player, e.g. "16/9" or "9/16" for a phone game. */
  aspect?: string;
  /** Command that builds the game, run by `vesta publish --build`. */
  build?: string;
}

export interface FileEntry {
  path: string;
  abs: string;
  size: number;
}

const BUILD_DIRS = ["dist", "build", "out", "www", "public", "docs", "_site", "web-build", "export/web", "build/web"];
const SKIP_DIRS = new Set(["node_modules", "__pycache__"]);
const SKIP_FILES = new Set(["vesta.json", "Thumbs.db", "desktop.ini"]);
const BLOCKED = /\.(exe|dll|msi|bat|cmd|com|scr|ps1|vbs|sh|app|dmg|pkg|apk|jar|so|dylib|deb|rpm)$/i;

export class PublishError extends Error {}

/** Finds the folder vesta.json lives in, walking up from `start` (stops at a .git root). */
export function findProjectRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "vesta.json"))) return dir;
    if (existsSync(join(dir, ".git")) || existsSync(join(dir, "package.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

export async function loadProject(root: string): Promise<{ config: ProjectConfig; exists: boolean }> {
  try {
    return { config: JSON.parse(await readFile(join(root, "vesta.json"), "utf8")), exists: true };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { config: {}, exists: false };
    throw new PublishError(`vesta.json is not valid JSON: ${(e as Error).message}`);
  }
}

export async function saveProject(root: string, config: ProjectConfig): Promise<void> {
  const clean = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));
  await writeFile(join(root, "vesta.json"), JSON.stringify({ $schema: "https://unpkg.com/vesta-cli/vesta.schema.json", ...clean }, null, 2) + "\n");
}

async function readJSON(path: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * The folder to upload. A source index.html that loads /src/main.ts (Vite and
 * friends) isn't playable as-is, so a project with a build script must be built.
 */
export async function resolveBuildDir(root: string, explicit?: string): Promise<string> {
  if (explicit) {
    const dir = resolve(root, explicit);
    if (!existsSync(join(dir, "index.html"))) throw new PublishError(`${relative(process.cwd(), dir) || "."} has no index.html at its top level.`);
    return dir;
  }
  const pkg = await readJSON(join(root, "package.json"));
  const scripts = (pkg?.scripts ?? {}) as Record<string, string>;
  for (const d of BUILD_DIRS) {
    const dir = join(root, d);
    if (existsSync(join(dir, "index.html"))) {
      // public/ in a Vite project is static assets, not the build.
      if (d === "public" && scripts.build) continue;
      return dir;
    }
  }
  if (existsSync(join(root, "index.html"))) {
    const html = await readFile(join(root, "index.html"), "utf8");
    const needsBuild = scripts.build && /<script[^>]+src=["']\/?src\/[^"']+\.(tsx?|jsx)["']/i.test(html);
    if (!needsBuild) return root;
  }
  if (scripts.build) throw new PublishError("No build folder found. Build the game first (npm run build), or publish with --build.");
  throw new PublishError("No index.html found. Point me at the folder that has one: vesta publish <dir>");
}

/** Every file to upload, skipping hidden files, node_modules and anything that can't be served. */
export async function collectFiles(dir: string): Promise<{ files: FileEntry[]; skipped: string[]; total: number }> {
  const files: FileEntry[] = [];
  const skipped: string[] = [];
  let total = 0;
  async function walk(abs: string) {
    for (const ent of await readdir(abs, { withFileTypes: true })) {
      const full = join(abs, ent.name);
      const rel = relative(dir, full).split(sep).join("/");
      if (SKIP_FILES.has(ent.name) || ent.name === ".DS_Store") continue;
      if (ent.name.startsWith(".") || SKIP_DIRS.has(ent.name)) {
        skipped.push(rel);
        continue;
      }
      const st = await lstat(full);
      if (st.isSymbolicLink()) {
        skipped.push(`${rel} (symlink)`);
        continue;
      }
      if (st.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!st.isFile()) continue;
      if (BLOCKED.test(ent.name)) {
        skipped.push(`${rel} (executable)`);
        continue;
      }
      if (st.size > MAX_FILE_BYTES) throw new PublishError(`${rel} is ${(st.size / 1048576).toFixed(1)} MB; the limit is 25 MB per file.`);
      files.push({ path: rel, abs: full, size: st.size });
      total += st.size;
      if (files.length > MAX_FILES) throw new PublishError(`More than ${MAX_FILES} files in ${dir}. Is this the right folder?`);
    }
  }
  await walk(dir);
  if (total > MAX_TOTAL_BYTES) throw new PublishError(`The build is ${(total / 1048576).toFixed(1)} MB; the limit is 100 MB.`);
  if (!files.some((f) => f.path === "index.html")) throw new PublishError("index.html must be at the top level of the build folder.");
  files.sort((a, b) => (a.path === "index.html" ? 1 : b.path === "index.html" ? -1 : a.path.localeCompare(b.path)));
  return { files, skipped, total };
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/^@[^/]+\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 48)
      .replace(/-+$/, "") || "game"
  );
}

export async function guessTitle(buildDir: string, root: string): Promise<string> {
  try {
    const html = await readFile(join(buildDir, "index.html"), "utf8");
    const t = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i)?.[1]?.trim();
    if (t && !/^(vite|react|vue|svelte)?\s*(app|\+ ?\w+)?$/i.test(t) && t.toLowerCase() !== "document") return decodeEntities(t);
  } catch {}
  const pkg = await readJSON(join(root, "package.json"));
  const name = typeof pkg?.name === "string" ? pkg.name.replace(/^@[^/]+\//, "") : basename(root);
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** Which AI tool made this, from the environment the CLI runs in and files in the project. */
export function detectTools(root: string, clientName?: string): string[] {
  const found = new Set<string>();
  const env = process.env;
  const client = (clientName ?? "").toLowerCase();
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT || client.includes("claude")) found.add("Claude Code");
  if (env.CURSOR_TRACE_ID || env.CURSOR_AGENT || client.includes("cursor")) found.add("Cursor");
  if (env.CODEX_SANDBOX || env.CODEX_HOME || client.includes("codex")) found.add("Codex");
  if (client.includes("windsurf") || client.includes("codeium")) found.add("Windsurf");
  if (client.includes("gemini")) found.add("Gemini CLI");
  if (client.includes("opencode") || env.OPENCODE) found.add("OpenCode");
  if (client.includes("cline")) found.add("Cline");
  if (client.includes("copilot") || client.includes("vscode")) found.add("Copilot");
  const has = (p: string) => existsSync(join(root, p));
  if (has("CLAUDE.md") || has(".claude")) found.add("Claude Code");
  if (has(".cursor") || has(".cursorrules")) found.add("Cursor");
  if (has(".windsurfrules") || has(".windsurf")) found.add("Windsurf");
  if (has("GEMINI.md") || has(".gemini")) found.add("Gemini CLI");
  if (has(".bolt")) found.add("Bolt");
  if (has(".github/copilot-instructions.md")) found.add("Copilot");
  return [...found].slice(0, 4);
}
