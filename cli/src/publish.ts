// The publish pipeline, shared by the CLI and the MCP server.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { ApiError, Client } from "./client.ts";
import { gameKey, keysPath, loadConfig, PUBLIC_ARCADE, saveGameKey, type ArcadeConfig } from "./config.ts";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import {
  collectFiles,
  detectTools,
  findProjectRoot,
  guessTitle,
  loadProject,
  PublishError,
  resolveBuildDir,
  saveProject,
  slugify,
  type FileEntry,
  type ProjectConfig,
} from "./project.ts";
import { keyArt, screenshot } from "./screenshot.ts";
import { bytes, c, type Out } from "./ui.ts";

export interface PublishOptions {
  /** Project folder or build folder. Defaults to the current directory. */
  path?: string;
  notes?: string;
  title?: string;
  description?: string;
  slug?: string;
  madeWith?: string[];
  /** Run the project's build first. */
  build?: boolean;
  screenshot?: boolean;
  /** MCP client name, used to tag "made with". */
  clientName?: string;
  /** Enter the game into this AI Arena prompt (e.g. "packet-runner"), with the model that made it. */
  arena?: string;
  model?: string;
  out: Out;
}

export interface PublishResult {
  slug: string;
  title: string;
  version: number;
  url: string;
  playUrl: string;
  files: number;
  bytes: number;
  created: boolean;
  cover: "uploaded" | "screenshot" | "kept" | "none";
  skipped: string[];
  projectFile: string;
  /** Published to the public arcade with a per-game key. */
  public: boolean;
  /** Set when the game was entered into an AI Arena prompt. */
  arena?: string;
}

const COVER_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export async function publish(opts: PublishOptions): Promise<PublishResult> {
  const own = await loadConfig();
  const { out } = opts;
  const start = resolve(opts.path ?? process.cwd());
  if (!existsSync(start)) throw new PublishError(`${start} does not exist.`);

  // A path straight to a build folder (dist/) belongs to the project above it.
  // A build folder (dist/, build/…) belongs to the project above it. Any other folder with an
  // index.html is a project of its own, even inside a bigger repo.
  const has = (f: string) => existsSync(resolve(start, f));
  const looksLikeBuild = /^(dist|build|out|public|www|_site|docs)$/i.test(basename(start)) && has("index.html") && !has("package.json") && !has("vesta.json");
  const root = looksLikeBuild ? findProjectRoot(resolve(start, "..")) : has("vesta.json") || has("index.html") || has("package.json") ? start : findProjectRoot(start);
  const { config: project, exists: hasProjectFile } = await loadProject(root);

  if (opts.build) await runBuild(root, project, out);

  const buildDir = looksLikeBuild && start !== root ? start : await resolveBuildDir(root, project.dir);
  const { files, skipped, total } = await collectFiles(buildDir);
  const relDir = relative(root, buildDir) || ".";

  const title = opts.title ?? project.title ?? (await guessTitle(buildDir, root));
  let slug = opts.slug ?? project.slug ?? slugify(title);
  const madeWith = opts.madeWith ?? project.madeWith ?? detectTools(root, opts.clientName);

  // No arcade of your own: publish to the public one. The arcade picks a free slug and
  // hands back a key that can update this game only; it's kept in keys.json.
  let cfg: ArcadeConfig;
  if (own) cfg = own;
  else {
    let key = await gameKey(PUBLIC_ARCADE, slug);
    if (!key) {
      const claim = await new Client({ url: PUBLIC_ARCADE, token: "" }).request<{ slug: string; key: string }>("POST", "/api/claim", { title });
      slug = claim.slug;
      key = claim.key;
      await saveGameKey(PUBLIC_ARCADE, slug, key);
    }
    cfg = { url: PUBLIC_ARCADE, token: key, public: true };
  }
  const client = new Client(cfg);

  // First publish from this project: don't overwrite a different game that happens to share the slug.
  let existing = await client.game(slug);
  if (existing && !existing.version && cfg.public) existing = null;
  if (existing && !project.slug && !opts.slug && !cfg.public) {
    for (let i = 2; existing && i < 100; i++) {
      slug = `${slugify(title).slice(0, 44)}-${i}`;
      existing = await client.game(slug);
    }
  }

  out.log(`${c.dim("Publishing")} ${c.bold(title)} ${c.dim(`(${slug}) from ${relDir}/: ${files.length} files, ${bytes(total)}`)}`);

  const meta: Record<string, unknown> = { title };
  if (opts.description ?? project.description) meta.description = opts.description ?? project.description;
  for (const key of ["author", "tags", "sourceUrl", "keyboardRequired", "aspect"] as const) if (project[key] !== undefined) meta[key] = project[key];
  if (madeWith.length || project.madeWith) meta.madeWith = madeWith;
  await client.request("PUT", `/api/games/${slug}`, meta);

  const created = await client.request<{ version: number }>("POST", `/api/games/${slug}/versions`, {
    files: files.map((f) => ({ path: f.path, size: f.size })),
    notes: opts.notes ?? "",
  });
  const version = created.version;

  await uploadAll(client, slug, version, files, total, out);
  const live = await client.request<{ url: string; playUrl: string }>("POST", `/api/games/${slug}/versions/${version}/finalize`);

  // Cover: the project's own image wins; otherwise screenshot the game once.
  let cover: PublishResult["cover"] = existing?.hasCover ? "kept" : "none";
  const coverPath = project.cover ? resolve(root, project.cover) : null;
  if (coverPath && existsSync(coverPath) && COVER_TYPES[extname(coverPath).toLowerCase()]) {
    await client.request("PUT", `/api/games/${slug}/cover`, new Uint8Array(await readFile(coverPath)), { "content-type": COVER_TYPES[extname(coverPath).toLowerCase()]! });
    cover = "uploaded";
  } else if (!existing?.hasCover && opts.screenshot !== false) {
    out.progress(c.dim("Taking a cover screenshot…"));
    // Community games only load inside the arcade's frame, so screenshot the local build instead.
    const shotUrl = cfg.public ? `${pathToFileURL(join(buildDir, "index.html")).href}?vesta-preview=1` : `${live.playUrl}?vesta-preview=1`;
    const shot = await screenshot(shotUrl);
    if (shot) {
      out.progress(c.dim("Composing key art…"));
      const art = (await keyArt(shot, { title, author: project.author, arcadeUrl: cfg.url }).catch(() => null)) ?? shot;
      await client.request("PUT", `/api/games/${slug}/cover`, art, { "content-type": "image/png" });
      cover = "screenshot";
    }
    out.done();
  }

  let arena: string | undefined;
  if (opts.arena) {
    if (!opts.model) throw new PublishError('Say which model made the game: --model "GPT-6 Luna" (it is shown after people vote).');
    const r = await client.request<{ arena: string }>("POST", `/api/games/${slug}/arena`, { prompt: opts.arena, model: opts.model });
    arena = r.arena;
  }

  const next: ProjectConfig = { ...project, slug, title, dir: relDir === "." ? undefined : relDir };
  if (!project.madeWith && madeWith.length) next.madeWith = madeWith;
  if (!hasProjectFile || JSON.stringify(next) !== JSON.stringify(project)) await saveProject(root, next);

  return {
    slug,
    title,
    version,
    url: live.url,
    playUrl: live.playUrl,
    files: files.length,
    bytes: total,
    created: !existing,
    cover,
    skipped,
    projectFile: resolve(root, "vesta.json"),
    public: !!cfg.public,
    arena,
  };
}

async function uploadAll(client: Client, slug: string, version: number, files: FileEntry[], total: number, out: Out) {
  let done = 0;
  let sent = 0;
  const queue = [...files];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const body = new Uint8Array(await readFile(f.abs));
      if (body.byteLength !== f.size) throw new PublishError(`${f.path} changed while uploading. Run publish again.`);
      const path = f.path.split("/").map(encodeURIComponent).join("/");
      for (let attempt = 1; ; attempt++) {
        try {
          await client.request("PUT", `/api/games/${slug}/versions/${version}/files/${path}`, body, { "content-type": "application/octet-stream" });
          break;
        } catch (e) {
          const retryable = !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.status === 429;
          if (!retryable || attempt >= 4) throw e;
          await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
        }
      }
      done++;
      sent += f.size;
      out.progress(`${c.ember("▲")} Uploading ${done}/${files.length} files ${c.dim(`${bytes(sent)} / ${bytes(total)}`)}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
  out.done();
}

async function runBuild(root: string, project: ProjectConfig, out: Out): Promise<void> {
  const pkgPath = resolve(root, "package.json");
  let cmd = project.build;
  if (!cmd && existsSync(pkgPath)) {
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    if (pkg.scripts?.build) {
      const pm = existsSync(resolve(root, "pnpm-lock.yaml")) ? "pnpm" : existsSync(resolve(root, "bun.lockb")) || existsSync(resolve(root, "bun.lock")) ? "bun" : existsSync(resolve(root, "yarn.lock")) ? "yarn" : "npm";
      cmd = `${pm} run build`;
    }
  }
  if (!cmd) return;
  out.log(c.dim(`$ ${cmd}`));
  await new Promise<void>((ok, fail) => {
    const p = spawn(cmd!, { cwd: root, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    p.stdout.on("data", (d) => (log += d));
    p.stderr.on("data", (d) => (log += d));
    p.on("exit", (code) => (code === 0 ? ok() : fail(new PublishError(`Build failed (${cmd}):\n${log.slice(-3000)}`))));
  });
}
