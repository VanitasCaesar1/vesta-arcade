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
  deploy?: { prefix: string; name: string; databaseId?: string; bucket: string };
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
        "  • Deploy your own (free, about 2 minutes):  npx vesta-cli setup\n" +
        "  • Or connect to an existing one:            npx vesta-cli login <arcade-url>",
    );
  }
}

export async function requireConfig(): Promise<ArcadeConfig> {
  const cfg = await loadConfig();
  if (!cfg) throw new NotConfiguredError();
  return cfg;
}
