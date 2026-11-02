// Takes a cover screenshot of the live game with whatever Chromium-based
// browser is installed, so shared links get a real preview image.
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function candidates(): string[] {
  const env = process.env.VESTA_CHROME || process.env.CHROME_PATH;
  const list = env ? [env] : [];
  if (process.platform === "darwin") {
    list.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    );
  } else if (process.platform === "win32") {
    const pf = [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean) as string[];
    for (const base of pf) {
      list.push(join(base, "Google/Chrome/Application/chrome.exe"), join(base, "Microsoft/Edge/Application/msedge.exe"), join(base, "Chromium/Application/chrome.exe"));
    }
  } else {
    for (const bin of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]) {
      for (const dir of ["/usr/bin", "/usr/local/bin", "/snap/bin"]) list.push(join(dir, bin));
    }
  }
  list.push(...playwrightBrowsers());
  return list;
}

/** Chromium that Playwright or Puppeteer downloaded, which many developers already have. */
function playwrightBrowsers(): string[] {
  const roots =
    process.platform === "darwin"
      ? [join(homedir(), "Library/Caches/ms-playwright")]
      : process.platform === "win32"
        ? [join(process.env.LOCALAPPDATA ?? "", "ms-playwright")]
        : [join(homedir(), ".cache/ms-playwright")];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) roots.unshift(process.env.PLAYWRIGHT_BROWSERS_PATH);
  const found: string[] = [];
  for (const root of roots) {
    let dirs: string[] = [];
    try {
      dirs = readdirSync(root).filter((d) => d.startsWith("chromium")).sort().reverse();
    } catch {
      continue;
    }
    for (const d of dirs) {
      for (const rel of [
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-linux64/chrome",
        "chrome-linux/chrome",
        "chrome-win64/chrome.exe",
        "chrome-win/chrome.exe",
      ]) {
        found.push(join(root, d, rel));
      }
    }
  }
  return found;
}

export function findBrowser(): string | null {
  return candidates().find((p) => existsSync(p)) ?? null;
}

/** Returns PNG bytes, or null when no browser is available or the shot looks empty. */
export async function screenshot(url: string, opts: { width?: number; height?: number; waitMs?: number } = {}): Promise<Uint8Array | null> {
  const browser = findBrowser();
  if (!browser) return null;
  const dir = await mkdtemp(join(tmpdir(), "vesta-shot-"));
  const out = join(dir, "cover.png");
  const args = [
    "--headless=new",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    // Software WebGL, so canvas and three.js games render without a GPU.
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
    `--user-data-dir=${join(dir, "profile")}`,
    `--window-size=${opts.width ?? 1200},${opts.height ?? 675}`,
    `--virtual-time-budget=${opts.waitMs ?? 4000}`,
    `--screenshot=${out}`,
    url,
  ];
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(browser, args, { timeout: 45_000 }, (err) => (err && !existsSync(out) ? reject(err) : resolve()));
    });
    const png = await readFile(out);
    // A blank page compresses to almost nothing.
    return png.byteLength > 6_000 ? new Uint8Array(png) : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/**
 * Key art: the gameplay shot under a dark scrim, with the title set large in
 * the arcade's display face. Every game on the floor gets the same frame, so
 * the arcade looks curated even when the games are all different.
 */
export async function keyArt(shot: Uint8Array, o: { title: string; author?: string; arcadeUrl: string }): Promise<Uint8Array | null> {
  const dir = await mkdtemp(join(tmpdir(), "vesta-art-"));
  const title = o.title.trim();
  const len = title.length;
  const size = len <= 10 ? 116 : len <= 16 ? 100 : len <= 24 ? 84 : 68;
  const font = (f: string) => `${o.arcadeUrl.replace(/\/$/, "")}/static/${f}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${font("archivo.woff2")}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:M;src:url(${font("geist-mono.woff2")}) format("woff2");font-weight:100 900}
html,body{margin:0;width:1200px;height:675px;overflow:hidden;background:#111}
.bg{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;filter:saturate(1.15) contrast(1.05)}
.scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(12,12,12,.95) 0%,rgba(12,12,12,.72) 30%,rgba(12,12,12,.15) 62%,rgba(12,12,12,0) 80%),linear-gradient(to right,rgba(12,12,12,.55),rgba(12,12,12,0) 55%)}
.t{position:absolute;left:60px;right:60px;bottom:56px;color:#f4f4f0}
.by{font:600 20px M;letter-spacing:.12em;text-transform:uppercase;color:#ffd60a;margin:0 0 14px}
h1{margin:0;font:900 ${size}px/.9 A;font-stretch:112%;text-transform:uppercase;letter-spacing:-.005em;word-spacing:.14em;max-width:1000px;text-shadow:0 2px 30px rgba(0,0,0,.45)}
.bar{width:120px;height:12px;background:#ffd60a;margin-top:26px}
</style></head><body><img class="bg" src="data:image/png;base64,${Buffer.from(shot).toString("base64")}">
<div class="scrim"></div><div class="t">${o.author ? `<p class="by">by ${esc(o.author)}</p>` : ""}<h1>${esc(title)}</h1><div class="bar"></div></div></body></html>`;
  try {
    await writeFile(join(dir, "art.html"), html);
    return await screenshot(pathToFileURL(join(dir, "art.html")).href, { width: 1200, height: 675, waitMs: 2500 });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
