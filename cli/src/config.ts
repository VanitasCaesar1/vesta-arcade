// Where the CLI keeps the arcade's address and token: ~/.config/vesta/config.json
// (or $XDG_CONFIG_HOME/vesta). VESTA_URL and VESTA_TOKEN override it, for CI.
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ArcadeConfig {
  url: string;
  token: string;
  playUrl?: string;
  /** Names used by `vesta setup`, so re-running it upgrades the same Workers. */
  /** True when publishing to the public arcade with a per-game key instead of an arcade of your own. */
  public?: boolean;
  deploy?: { prefix: string; name: string; databaseId?: string; bucket: string; domain?: string; open?: boolean };
}

export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "vesta");
}

export const configPath = () => join(configDir(), "config.json");

export async function loadConfig(): Promise<ArcadeConfig | null> {
  let saved: Partial<ArcadeConfig> = {};
  try {
    saved = JSON.parse(await readFile(configPath(), "utf8"));
  } catch {}
  const url = process.env.VESTA_URL || saved.url;
  const token = process.env.VESTA_TOKEN || saved.token;
  if (!url || !token) return null;
  return { ...saved, url: url.replace(/\/+$/, ""), token } as ArcadeConfig;
}

export async function saveConfig(cfg: ArcadeConfig): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(configPath(), JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  await chmod(configPath(), 0o600).catch(() => {});
}

export class NotConfiguredError extends Error {
  constructor() {
    super(
      "No arcade configured yet.\n" +
        `  • Publish to the public arcade (${PUBLIC_ARCADE.replace(/^https:\/\//, "")}), no account:  npx vesta-arcade publish\n` +
        "  • Deploy your own (free, about 2 minutes):  npx vesta-arcade setup\n" +
        "  • Or connect to an existing one:            npx vesta-arcade login <arcade-url>",
    );
  }
}

/** Where games go when there's no arcade of your own: anyone can publish there. */
export const PUBLIC_ARCADE = (process.env.VESTA_PUBLIC_URL || "https://vestapowered.in").replace(/\/+$/, "");

// Keys for games published to an open arcade, one per game: ~/.config/vesta/keys.json
// { "<arcade url>": { "<slug>": "<key>" } }. A key can update or delete that game, nothing else.
export const keysPath = () => join(configDir(), "keys.json");

async function loadKeys(): Promise<Record<string, Record<string, string>>> {
  try {
    return JSON.parse(await readFile(keysPath(), "utf8"));
  } catch {
    return {};
  }
}

export async function gameKey(url: string, slug: string): Promise<string | null> {
  return (await loadKeys())[url]?.[slug] ?? null;
}

export async function saveGameKey(url: string, slug: string, key: string): Promise<void> {
  const keys = await loadKeys();
  (keys[url] ??= {})[slug] = key;
  await mkdir(configDir(), { recursive: true });
  await writeFile(keysPath(), JSON.stringify(keys, null, 2) + "\n", { mode: 0o600 });
  await chmod(keysPath(), 0o600).catch(() => {});
}

/** Your own arcade if one is configured; otherwise the public arcade, using this game's key. */
export async function configFor(slug?: string): Promise<ArcadeConfig> {
  const cfg = await loadConfig();
  if (cfg) return cfg;
  const key = slug ? await gameKey(PUBLIC_ARCADE, slug) : null;
  if (key) return { url: PUBLIC_ARCADE, token: key, public: true };
  throw new NotConfiguredError();
}

export async function requireConfig(): Promise<ArcadeConfig> {
  const cfg = await loadConfig();
  if (!cfg) throw new NotConfiguredError();
  return cfg;
}
