// Publishes the arena's own SVG entries (arena/svg/<prompt>/<model>.svg) to the arcade
// configured for the CLI. Usage: node arena/publish-svg.mjs
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "vesta", "config.json"), "utf8"));
const url = (process.env.VESTA_URL || cfg.url).replace(/\/+$/, "");
const token = process.env.VESTA_TOKEN || cfg.token;
const MODELS = {
  claude: { model: "Claude Opus 5.5", lab: "Anthropic" },
  gpt: { model: "GPT-6 Luna", lab: "OpenAI" },
  gemini: { model: "Gemini 3.8 Flash", lab: "Google" },
};
const md = readFileSync(join(here, "SVG_PROMPTS.md"), "utf8");
const PROMPTS = [...md.matchAll(/^## Prompt \d+: ([a-z0-9-]+)\n\n([^\n]+)/gm)].map(([, id, text]) => ({ id, text, title: id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") }));

async function api(method, path, body) {
  const res = await fetch(url + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

for (const p of PROMPTS) {
  await api("PUT", `/api/arena/prompts/${p.id}`, { title: p.title, prompt: p.text, kind: "svg" });
  for (const [key, m] of Object.entries(MODELS)) {
    const file = join(here, "svg", p.id, `${key}.svg`);
    if (!existsSync(file)) continue;
    const slug = "svg-" + createHash("sha256").update(`${p.id}:${key}`).digest("hex").slice(0, 10);
    try {
      await api("POST", "/api/arena/svg", { prompt: p.id, model: m.model, lab: m.lab, svg: readFileSync(file, "utf8"), slug });
      console.log(`${p.id} / ${m.model} → ${slug}`);
    } catch (e) {
      console.log(`${p.id} / ${m.model} ✗ ${e.message}`);
    }
  }
}
