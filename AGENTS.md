# Working on Vesta

- `worker/`: one Worker script deployed twice. `src/index.ts` picks the role: `src/play` (game files, injected feedback script, telemetry) or `src/site` (arcade pages, dashboard, JSON API). Locally `ROLE=auto` picks by hostname (`play.localhost` = play).
- `cli/`: the `vesta-cli` npm package: CLI (`src/cli.ts`), publish pipeline (`src/publish.ts`), MCP server (`src/mcp.ts`), Cloudflare setup (`src/setup.ts`). `npm run build` also bundles the Worker into `cli/dist/worker` for `setup`.
- `games/hug-of-death/`: the demo game, a single HTML file.

Rules:
- Game JavaScript is untrusted. Nothing on the play origin may read site cookies or call the admin API; keep the site CSP and iframe sandbox strict.
- Store totals, not raw events. Any new telemetry must be an UPSERT into a bounded table.
- Upload rules live in `worker/src/lib/manifest.ts` and are mirrored loosely in `cli/src/project.ts`. Add tests in `worker/test/` when you change them.
- Keep the injected script (`worker/src/play/client.ts`) ES2017, dependency-free and silent on failure: it runs inside other people's games.

Check before you finish: `npm run typecheck && npm test && npm run build`. Run locally with `npm run dev`.
