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
// Prompt text comes from PROMPTS.md, so the arena page shows exactly what the models got.
const md = readFileSync(join(here, "PROMPTS.md"), "utf8");
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
  await api("PUT", `/api/arena/prompts/${id}`, { title: p.title, prompt: p.text });
  for (const key of Object.keys(MODELS)) {
    const dir = join(here, id, key);
    if (!existsSync(join(dir, "index.html"))) continue;
    const m = MODELS[key];
    const slug = "arena-" + createHash("sha256").update(`${id}:${key}`).digest("hex").slice(0, 8);
    execFileSync("node", [cli, "publish", dir, "--slug", slug, "--title", p.title, "--made-with", m.model, "--notes", `AI Arena entry: one attempt from the shared prompt, no human edits.`, "--json"], {
      stdio: ["ignore", "ignore", "inherit"],
      env: process.env,
    });
    await api("PUT", `/api/arena/entries/${slug}`, { prompt: id, model: m.model, lab: m.lab });
    await api("POST", `/api/games/${slug}/hide`, { hidden: true });
    console.log(`${id} / ${m.model} → ${url}/g/${slug}`);
  }
}
