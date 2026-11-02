// Takes a cover screenshot of the live game with whatever Chromium-based
// browser is installed, so shared links get a real preview image.
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

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
