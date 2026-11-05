// Publishes every arena entry (arena/<prompt>/<model>/index.html) to the arcade
// configured for the CLI, registers it with its model, and hides it from the
// home page so matchups stay blind. Usage: node arena/publish.mjs [--only <prompt>]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "cli", "dist", "cli.js");
const cfgPath = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "vesta", "config.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const url = (process.env.VESTA_URL || cfg.url).replace(/\/+$/, "");
const token = process.env.VESTA_TOKEN || cfg.token;

const MODELS = {
  claude: { model: "Claude Opus 5.5", lab: "Anthropic" },
  gpt: { model: "GPT-6 Luna", lab: "OpenAI" },
  gemini: { model: "Gemini 3.8 Flash", lab: "Google" },
};
// Prompt text comes from PROMPTS.md (games) or 3D_PROMPTS.md (--kind 3d), so the arena page shows exactly what the models got.
const kind = process.argv.includes("--kind") ? process.argv[process.argv.indexOf("--kind") + 1] : "game";
const md = readFileSync(join(here, kind === "3d" ? "3D_PROMPTS.md" : "PROMPTS.md"), "utf8");
const base = kind === "3d" ? join(here, "3d") : here;
const PROMPTS = Object.fromEntries(
  [...md.matchAll(/^## Prompt \d+: ([a-z0-9-]+)\n\n([^\n]+)/gm)].map(([, id, text]) => [id, { text, title: id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") }]),
);

async function api(method, path, body) {
  const res = await fetch(url + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
for (const [id, p] of Object.entries(PROMPTS)) {
  if (only && id !== only) continue;
  await api("PUT", `/api/arena/prompts/${id}`, { title: p.title, prompt: p.text, kind });
  for (const key of Object.keys(MODELS)) {
    const dir = join(base, id, key);
    if (!existsSync(join(dir, "index.html"))) continue;
    const m = MODELS[key];
    const slug = "arena-" + createHash("sha256").update(`${kind === "3d" ? "3d:" : ""}${id}:${key}`).digest("hex").slice(0, 8);
    execFileSync("node", [cli, "publish", dir, "--slug", slug, "--title", p.title, "--made-with", m.model, "--notes", `AI Arena entry: one attempt from the shared prompt, no human edits.`, "--json", ...(kind === "3d" ? ["--no-screenshot"] : [])], {
      stdio: ["ignore", "ignore", "inherit"],
      env: process.env,
    });
    await api("PUT", `/api/arena/entries/${slug}`, { prompt: id, model: m.model, lab: m.lab });
    if (kind === "3d") await api("PUT", `/api/games/${slug}`, { tags: ["3d", "three.js", "arena"] });
    await api("POST", `/api/games/${slug}/hide`, { hidden: true });
    console.log(`${id} / ${m.model} → ${url}/g/${slug}`);
  }
}
