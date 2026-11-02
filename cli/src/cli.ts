#!/usr/bin/env node
import { exec } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { Client } from "./client.ts";
import { configPath, loadConfig, requireConfig, saveConfig } from "./config.ts";
import { findProjectRoot, loadProject } from "./project.ts";
import { publish } from "./publish.ts";
import { bytes, c, qr, terminalOut } from "./ui.ts";
import { VERSION } from "./version.ts";

const HELP = `
${c.ember("▲")} ${c.bold("vesta")} ${c.dim(VERSION)}: your own arcade for AI-made games

${c.bold("Usage")}
  vesta setup                 Deploy your arcade to Cloudflare (free plan, ~2 minutes)
                              --name "My Arcade"  --domain games.example.com  --subdomain <workers.dev name>
  vesta publish [dir]         Publish the game in dir (or ./dist, ./build, ./) and print its link
  vesta feedback [slug]       Errors, session lengths and comments, as Markdown for your agent
  vesta list                  Your games
  vesta open [slug]           Open a game (or the arcade) in your browser
  vesta login [url]           Connect to an arcade that already exists
  vesta delete <slug>         Delete a game and all its data
  vesta mcp                   Run as an MCP server for Claude Code, Cursor, Codex…

${c.bold("Publish options")}
  -n, --notes <text>          What changed (shown in the changelog)
  -t, --title <text>          Title (first publish only; saved to vesta.json)
  -d, --description <text>    Description for the game page
      --slug <slug>           URL name, e.g. my-game
  -b, --build                 Run the project's build script first
      --made-with <a,b>       AI tools used, e.g. "Claude Code"
      --no-screenshot         Don't take a cover screenshot
  -o, --open                  Open the game when it's live

${c.bold("Agents")}
  claude mcp add vesta -- npx -y vesta-cli mcp
`;

async function main() {
  const { values: v, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      notes: { type: "string", short: "n" },
      title: { type: "string", short: "t" },
      description: { type: "string", short: "d" },
      slug: { type: "string" },
      build: { type: "boolean", short: "b" },
      "made-with": { type: "string" },
      "no-screenshot": { type: "boolean" },
      open: { type: "boolean", short: "o" },
      token: { type: "string" },
      name: { type: "string" },
      subdomain: { type: "string" },
      domain: { type: "string" },
      prefix: { type: "string" },
      "rotate-token": { type: "boolean" },
      days: { type: "string" },
      json: { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  const [cmd = "help", ...args] = positionals;
  const out = terminalOut();

  if (v.version) return console.log(VERSION);
  if (v.help || cmd === "help") return console.log(HELP);

  switch (cmd) {
    case "mcp": {
      const { runMcp } = await import("./mcp.ts");
      return runMcp();
    }

    case "setup":
    case "deploy":
    case "upgrade": {
      const { setup } = await import("./setup.ts");
      await setup({ name: v.name, subdomain: v.subdomain, domain: v.domain, prefix: v.prefix, rotateToken: v["rotate-token"], out });
      return;
    }

    case "login": {
      let url = args[0] ?? (await loadConfig())?.url;
      let token = v.token ?? process.env.VESTA_TOKEN;
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      if (!url) url = (await rl.question("Arcade URL: ")).trim();
      if (!token) token = (await rl.question("Arcade token: ")).trim();
      rl.close();
      if (!/^https?:\/\//.test(url)) url = `https://${url}`;
      const cfg = { ...(await loadConfig()), url: url.replace(/\/+$/, ""), token };
      const me = await new Client(cfg).me();
      await saveConfig({ ...cfg, playUrl: me.playUrl });
      out.log(`${c.green("✓")} Connected to ${c.bold(me.arcade)} at ${me.siteUrl}`);
      return;
    }

    case "whoami": {
      const cfg = await requireConfig();
      const me = await new Client(cfg).me();
      out.log(`${me.arcade} · ${me.siteUrl} · games served from ${me.playUrl} · Vesta ${me.version}\n${c.dim(configPath())}`);
      return;
    }

    case "publish":
    case "deploy-game":
    case "p": {
      const r = await publish({
        path: args[0],
        notes: v.notes,
        title: v.title,
        description: v.description,
        slug: v.slug,
        build: v.build,
        madeWith: v["made-with"]?.split(",").map((s) => s.trim()).filter(Boolean),
        screenshot: !v["no-screenshot"],
        out,
      });
      if (v.json) return console.log(JSON.stringify(r, null, 2));
      out.log(`
${c.ember("▲")} ${c.bold(`${r.title} v${r.version} is live`)}${r.created ? c.dim(" (new game)") : ""}

${qr(r.url)}
  ${c.bold(c.ember(r.url))}

  ${c.dim(`${r.files} files · ${bytes(r.bytes)} · cover: ${r.cover}${r.skipped.length ? ` · skipped ${r.skipped.length} (${r.skipped.slice(0, 3).join(", ")}${r.skipped.length > 3 ? "…" : ""})` : ""}`)}
  ${c.dim("Feedback later:")} vesta feedback ${r.slug}
`);
      if (v.open) openUrl(r.url);
      return;
    }

    case "feedback":
    case "fb": {
      const client = new Client(await requireConfig());
      const slug = args[0] ?? (await loadProject(findProjectRoot(process.cwd()))).config.slug;
      if (!slug) throw new Error("Which game? Run this in the game's folder, or pass its slug: vesta feedback <slug>");
      const days = Number(v.days ?? 14);
      if (v.json) return console.log(JSON.stringify(await client.request("GET", `/api/games/${slug}/feedback?days=${days}`), null, 2));
      console.log(await client.feedback(slug, days));
      return;
    }

    case "list":
    case "ls": {
      const cfg = await requireConfig();
      const games = await new Client(cfg).games();
      if (v.json) return console.log(JSON.stringify(games, null, 2));
      if (!games.length) return out.log(`No games yet. ${c.bold("vesta publish")} in a game's folder.`);
      const w = Math.max(...games.map((g) => g.slug.length));
      for (const g of games) {
        out.log(`${g.slug.padEnd(w)}  ${c.dim(`v${g.version}`.padEnd(4))}  ${String(g.plays).padStart(6)} plays  ${String(g.likes).padStart(4)} ♥  ${c.dim(g.url ?? "")}${g.hidden ? c.gold(" hidden") : ""}`);
      }
      return;
    }

    case "open": {
      const cfg = await requireConfig();
      const slug = args[0] ?? (await loadProject(findProjectRoot(process.cwd()))).config.slug;
      openUrl(slug ? `${cfg.url}/g/${slug}` : cfg.url);
      return;
    }

    case "delete":
    case "rm": {
      const slug = args[0];
      if (!slug) throw new Error("Usage: vesta delete <slug>");
      const client = new Client(await requireConfig());
      if (!v.yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(`Delete ${c.bold(slug)}, every version, its stats and comments? Type the slug to confirm: `);
        rl.close();
        if (answer.trim() !== slug) return out.log("Cancelled.");
      }
      await client.deleteGame(slug);
      out.log(`${c.green("✓")} Deleted ${slug}`);
      return;
    }

    default:
      console.log(HELP);
      process.exitCode = 1;
  }
}

function openUrl(url: string) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? 'start ""' : "xdg-open";
  exec(`${cmd} "${url.replace(/"/g, "")}"`);
}

main().catch((e: Error) => {
  process.stderr.write(`\n${c.red("✗")} ${e.message}\n`);
  process.exit(1);
});
