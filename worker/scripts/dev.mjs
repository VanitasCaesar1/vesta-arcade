// Local development: one wrangler process serves both roles.
//   http://localhost:8787       the arcade, dashboard and API
//   http://play.localhost:8787  game files (a separate origin, like production)
import { spawn, spawnSync } from "node:child_process";

const state = ["--persist-to", "../.wrangler/state"];
const migrate = spawnSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", ...state], { stdio: "inherit", env: { ...process.env, CI: "1" } });
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

console.log("\n  Arcade:  http://localhost:8787\n  Games:   http://play.localhost:8787\n  Token:   see worker/.dev.vars\n");
const p = spawn("npx", ["wrangler", "dev", "--port", "8787", "--ip", "127.0.0.1", ...state], { stdio: "inherit" });
p.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => p.kill("SIGINT"));
