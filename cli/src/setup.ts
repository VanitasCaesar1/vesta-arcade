// `vesta setup`: deploys an arcade to the user's own Cloudflare account with
// wrangler. Everything fits the free plan: two Workers, one R2 bucket, one D1
// database. Running it again upgrades the same arcade in place.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { configDir, loadConfig, saveConfig, type ArcadeConfig } from "./config.ts";
import { c, qr, type Out } from "./ui.ts";

const WRANGLER = ["--yes", "wrangler@4"];
const COMPAT_DATE = "2026-10-01";

interface RunResult {
  code: number;
  output: string;
}

/** Runs wrangler with the user's terminal attached (it may open a browser or ask a question). */
function wrangler(args: string[], opts: { cwd: string; input?: string; quiet?: boolean }): Promise<RunResult> {
  return new Promise((resolve) => {
    const p = spawn("npx", [...WRANGLER, ...args], {
      cwd: opts.cwd,
      shell: process.platform === "win32",
      stdio: [opts.input !== undefined ? "pipe" : "inherit", "pipe", "pipe"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    let output = "";
    const onData = (stream: NodeJS.WriteStream) => (d: Buffer) => {
      output += d.toString();
      if (!opts.quiet) stream.write(c.dim(d.toString()));
    };
    p.stdout!.on("data", onData(process.stdout));
    p.stderr!.on("data", onData(process.stderr));
    if (opts.input !== undefined) {
      p.stdin!.write(opts.input);
      p.stdin!.end();
    }
    p.on("exit", (code) => resolve({ code: code ?? 1, output }));
    p.on("error", (e) => resolve({ code: 1, output: String(e) }));
  });
}

type Route = { pattern: string; zone_name?: string; custom_domain?: boolean };

function workerConfig(o: {
  name: string;
  role: "site" | "play";
  arcade: string;
  playUrl: string;
  bucket: string;
  databaseId: string;
  main: string;
  routes?: Route[];
  originFallback?: boolean;
  vars?: Record<string, string>;
}) {
  return JSON.stringify(
    {
      name: o.name,
      main: o.main,
      compatibility_date: COMPAT_DATE,
      workers_dev: true,
      observability: { enabled: true },
      ...(o.routes?.length ? { routes: o.routes } : {}),
      vars: { ROLE: o.role, ARCADE_NAME: o.arcade, PLAY_URL: o.playUrl, ...(o.originFallback ? { ORIGIN_FALLBACK: "1" } : {}), ...o.vars },
      r2_buckets: [{ binding: "FILES", bucket_name: o.bucket }],
      d1_databases: [{ binding: "DB", database_name: o.bucket, database_id: o.databaseId, migrations_dir: "migrations" }],
    },
    null,
    2,
  );
}

const workersDevUrl = (out: string, name: string) => out.match(new RegExp(`https://${name}\\.[a-z0-9-]+\\.workers\\.dev`))?.[0];

function parseJSON<T>(text: string): T | null {
  const start = text.search(/[[{]/);
  if (start < 0) return null;
  try {
    return JSON.parse(text.slice(start)) as T;
  } catch {
    return null;
  }
}

/**
 * Workers on a fresh Cloudflare account can't be reached until the account has
 * a workers.dev subdomain. Wrangler only asks for one interactively, so setup
 * registers it through the API with wrangler's own credentials.
 */
async function ensureWorkersDevSubdomain(work: string, candidates: string[], out: Out): Promise<{ accountId: string; token: string; subdomain: string; created: boolean }> {
  const who = parseJSON<{ accounts?: { id: string; name: string }[] }>((await wrangler(["whoami", "--json"], { cwd: work, quiet: true })).output);
  const accounts = who?.accounts ?? [];
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? accounts[0]?.id;
  if (!accountId) throw new Error("Couldn't find your Cloudflare account ID. Set CLOUDFLARE_ACCOUNT_ID and run setup again.");
  if (accounts.length > 1 && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    out.log(c.gold(`! You have ${accounts.length} Cloudflare accounts; using "${accounts[0]!.name}". Set CLOUDFLARE_ACCOUNT_ID to pick another.`));
  }
  const token = parseJSON<{ token?: string }>((await wrangler(["auth", "token", "--json"], { cwd: work, quiet: true })).output)?.token;
  if (!token) throw new Error("Couldn't read your Cloudflare credentials from wrangler. Run `npx wrangler login` and try again.");

  const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const current = (await fetch(api, { headers }).then((r) => r.json()).catch(() => null)) as { success?: boolean; result?: { subdomain?: string } } | null;
  if (current?.success && current.result?.subdomain) return { accountId, token, subdomain: current.result.subdomain, created: false };

  const tried: string[] = [];
  for (const raw of candidates) {
    const name = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
    if (!name || tried.includes(name)) continue;
    tried.push(name);
    const res = (await fetch(api, { method: "PUT", headers, body: JSON.stringify({ subdomain: name }) }).then((r) => r.json()).catch(() => null)) as {
      success?: boolean;
      result?: { subdomain?: string };
      errors?: { message: string }[];
    } | null;
    if (res?.success) return { accountId, token, subdomain: res.result?.subdomain ?? name, created: true };
  }
  throw new Error(`Couldn't register a workers.dev subdomain (tried ${tried.join(", ")}). Pick one with --subdomain <name>, or register one at https://dash.cloudflare.com/${accountId}/workers/onboarding`);
}

/**
 * Routes that put the arcade on a domain in this Cloudflare account. A host that
 * already serves a site gets a Worker route (DNS untouched, and pages the arcade
 * doesn't have pass through to the old site); a new host gets a custom domain.
 */
async function domainRoutes(host: string, accountId: string, token: string): Promise<{ routes: Route[]; originFallback: boolean; zone: string }> {
  const labels = host.split(".");
  let zone: string | undefined;
  for (let i = 0; i < labels.length - 1 && !zone; i++) {
    const name = labels.slice(i).join(".");
    const res = (await fetch(`https://api.cloudflare.com/client/v4/zones?name=${name}&account.id=${accountId}`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .catch(() => null)) as { result?: { name: string; status: string }[] } | null;
    if (res?.result?.[0]) zone = res.result[0].name;
  }
  if (!zone) throw new Error(`${host} isn't a domain in this Cloudflare account. Add it at https://dash.cloudflare.com first, or leave out --domain.`);
  const resolves = async (h: string) => (await lookup(h).catch(() => null)) !== null;
  const routes: Route[] = [];
  let originFallback = false;
  if (await resolves(host)) {
    routes.push({ pattern: `${host}/*`, zone_name: zone });
    originFallback = true;
  } else {
    routes.push({ pattern: host, custom_domain: true });
  }
  if (host === zone && (await resolves(`www.${host}`))) routes.push({ pattern: `www.${host}/*`, zone_name: zone });
  return { routes, originFallback, zone };
}

export interface SetupOptions {
  /** Serve the arcade on this domain (it must be a zone in the same Cloudflare account). */
  domain?: string;
  name?: string;
  /** workers.dev subdomain to register if the account has none yet. */
  subdomain?: string;
  prefix?: string;
  rotateToken?: boolean;
  /** Let anyone publish games to this arcade without an arcade of their own. */
  openPublishing?: boolean;
  out: Out;
}

export async function setup(opts: SetupOptions): Promise<ArcadeConfig> {
  const { out } = opts;
  const previous = await loadConfig();
  const prefix = opts.prefix ?? previous?.deploy?.prefix ?? "vesta";
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(prefix)) throw new Error("--prefix must be lowercase letters, numbers and hyphens");
  const bucket = previous?.deploy?.bucket ?? `${prefix}-games`;

  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "worker");
  if (!existsSync(join(bundled, "index.js"))) throw new Error(`The arcade bundle is missing from ${bundled}. Reinstall vesta-arcade.`);
  const work = join(configDir(), "deploy");
  await mkdir(work, { recursive: true });
  await cp(join(bundled, "index.js"), join(work, "index.js"));
  await cp(join(bundled, "migrations"), join(work, "migrations"), { recursive: true });

  out.log(`\n${c.ember("▲")} ${c.bold("Setting up your Vesta arcade on Cloudflare")} ${c.dim("(free plan: 2 Workers, 1 R2 bucket, 1 D1 database)")}\n`);

  // 1. Signed in?
  let who = await wrangler(["whoami"], { cwd: work, quiet: true });
  if (/not authenticated|You are not logged in/i.test(who.output) || who.code !== 0) {
    out.log(c.dim("Opening your browser to sign in to Cloudflare…"));
    const login = await wrangler(["login"], { cwd: work });
    if (login.code !== 0) throw new Error("Cloudflare sign-in failed. Run `npx wrangler login`, then try again.");
    who = await wrangler(["whoami"], { cwd: work, quiet: true });
  }
  const email = who.output.match(/associated with the email ([^\s.]+@[^\s]+?)\.?\s/)?.[1];
  out.log(`${c.green("✓")} Signed in to Cloudflare${email ? ` as ${email}` : ""}`);

  // 2. Arcade name
  let arcade = opts.name ?? previous?.deploy?.name;
  if (!arcade) {
    const suggestion = email ? `${email.split("@")[0]!.replace(/[^a-z0-9]+/gi, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase())}'s Arcade` : "Vesta Arcade";
    if (process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      arcade = (await rl.question(`${c.bold("Name your arcade")} ${c.dim(`(${suggestion})`)}: `)).trim() || suggestion;
      rl.close();
    } else arcade = suggestion;
  }
  arcade = arcade.slice(0, 60);

  // 3. Storage
  const r2 = await wrangler(["r2", "bucket", "create", bucket], { cwd: work, quiet: true });
  if (r2.code !== 0 && !/already exists|already own/i.test(r2.output)) {
    if (/enable R2|R2 is not enabled|10042/i.test(r2.output)) {
      throw new Error("R2 isn't turned on for this Cloudflare account yet. Open https://dash.cloudflare.com/?to=/:account/r2 , turn it on (free tier, may ask for a card), then run setup again.");
    }
    throw new Error(`Couldn't create the R2 bucket:\n${r2.output.slice(-1500)}`);
  }
  out.log(`${c.green("✓")} R2 bucket ${c.bold(bucket)}`);

  let databaseId = previous?.deploy?.databaseId;
  if (!databaseId) {
    const list = await wrangler(["d1", "list", "--json"], { cwd: work, quiet: true });
    try {
      const dbs = JSON.parse(list.output.slice(list.output.indexOf("["))) as { uuid: string; name: string }[];
      databaseId = dbs.find((d) => d.name === bucket)?.uuid;
    } catch {}
  }
  if (!databaseId) {
    const created = await wrangler(["d1", "create", bucket], { cwd: work, quiet: true });
    databaseId = created.output.match(/database_id"?\s*[:=]\s*"([0-9a-f-]{36})"/)?.[1];
    if (!databaseId) throw new Error(`Couldn't create the D1 database:\n${created.output.slice(-1500)}`);
  }
  out.log(`${c.green("✓")} D1 database ${c.bold(bucket)}`);

  // 4. A workers.dev subdomain, so the Workers get public addresses.
  let wanted = opts.subdomain;
  const base = (email?.split("@")[0] ?? "my").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  if (!wanted && process.stdin.isTTY) {
    const check = await ensureWorkersDevSubdomain(work, [], out).catch(() => null);
    if (!check) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      wanted = (await rl.question(`${c.bold("Pick a workers.dev subdomain")} ${c.dim(`(your arcade will be ${prefix}.<name>.workers.dev; default ${base})`)}: `)).trim() || undefined;
      rl.close();
    }
  }
  const sub = await ensureWorkersDevSubdomain(work, [wanted ?? base, `${wanted ?? base}-games`, `${base}-${randomBytes(2).toString("hex")}`], out);
  process.env.CLOUDFLARE_ACCOUNT_ID ??= sub.accountId;
  out.log(`${c.green("✓")} workers.dev subdomain ${c.bold(`${sub.subdomain}.workers.dev`)}${sub.created ? c.dim(" (registered just now; new addresses can take a few minutes to start answering)") : ""}`);

  // 5. Play Worker first: the site needs its address.
  const playName = `${prefix}-play`;
  const siteName = prefix;
  const main = "./index.js";
  const domain = (opts.domain ?? previous?.deploy?.domain)?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const expectedSiteUrl = domain ? `https://${domain}` : `https://${siteName}.${sub.subdomain}.workers.dev`;
  const open = opts.openPublishing ?? previous?.deploy?.open ?? false;
  const vars: Record<string, string> = { SITE_URL: expectedSiteUrl, ...(open ? { OPEN_PUBLISHING: "1" } : {}) };
  await writeFile(join(work, "play.jsonc"), workerConfig({ name: playName, role: "play", arcade, playUrl: "", bucket, databaseId, main, vars }));
  out.log(c.dim("\nDeploying the game server…"));
  const playDeploy = await wrangler(["deploy", "-c", "play.jsonc"], { cwd: work });
  const playUrl = workersDevUrl(playDeploy.output, playName) ?? previous?.playUrl;
  if (playDeploy.code !== 0 || !playUrl) throw new Error("Deploying the game server failed (see above). If wrangler asked you to register a workers.dev subdomain, do that in the dashboard and run setup again.");
  out.log(`${c.green("✓")} Game server ${c.bold(playUrl)}`);

  const site = domain ? await domainRoutes(domain, sub.accountId, sub.token) : null;
  if (site) out.log(`${c.green("✓")} ${domain} ${c.dim(site.originFallback ? "(route over the existing site; pages the arcade doesn't serve still reach it)" : "(custom domain)")}`);
  await writeFile(
    join(work, "site.jsonc"),
    workerConfig({ name: siteName, role: "site", arcade, playUrl, bucket, databaseId, main, routes: site?.routes, originFallback: site?.originFallback, vars }),
  );
  const migrate = await wrangler(["d1", "migrations", "apply", bucket, "--remote", "-c", "site.jsonc"], { cwd: work, quiet: true, input: "y\n" });
  if (migrate.code !== 0) throw new Error(`Database migration failed:\n${migrate.output.slice(-1500)}`);
  out.log(`${c.green("✓")} Database is up to date`);

  out.log(c.dim("\nDeploying the arcade…"));
  const siteDeploy = await wrangler(["deploy", "-c", "site.jsonc"], { cwd: work });
  const siteUrl = domain ? `https://${domain}` : (workersDevUrl(siteDeploy.output, siteName) ?? previous?.url);
  if (siteDeploy.code !== 0 || !siteUrl) throw new Error("Deploying the arcade failed (see above).");

  // 6. Token
  const token = !opts.rotateToken && previous?.token && previous.deploy?.prefix === prefix ? previous.token : randomBytes(32).toString("base64url");
  if (token !== previous?.token) {
    const secret = await wrangler(["secret", "put", "ADMIN_TOKEN", "-c", "site.jsonc"], { cwd: work, quiet: true, input: token });
    if (secret.code !== 0) throw new Error(`Couldn't set the arcade token:\n${secret.output.slice(-1500)}`);
  }
  out.log(`${c.green("✓")} Arcade ${c.bold(siteUrl)}`);

  const cfg: ArcadeConfig = { url: siteUrl, token, playUrl, deploy: { prefix, name: arcade, databaseId, bucket, domain, open } };
  await saveConfig(cfg);

  out.log(`
${c.ember("▲")} ${c.bold(`${arcade} is live.`)}

${qr(siteUrl)}
  ${c.bold(siteUrl)}

  ${c.bold("Publish a game")}        npx vesta-arcade publish        ${c.dim("(from a folder with index.html, or a built dist/)")}
  ${c.bold("Let your agent do it")}  claude mcp add vesta -- npx -y vesta-arcade mcp
  ${c.bold("Dashboard")}             ${siteUrl}/admin ${c.dim("(your token is in ~/.config/vesta/config.json)")}

  ${c.dim("Your token was saved to")} ${c.dim(join(configDir(), "config.json"))}${c.dim(". Keep it secret: it can publish and delete games.")}
`);
  return cfg;
}
