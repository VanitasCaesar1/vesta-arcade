# vesta-cli

Publish AI-made web games to **your own arcade** from the terminal or any MCP client, then read back the errors, drop-off and comments players leave, in a form your coding agent can fix. The arcade runs on your Cloudflare account, on the free plan.

```sh
npx vesta-cli setup      # deploy your arcade to Cloudflare (~2 minutes)
npx vesta-cli publish    # in any folder with an index.html, or a built dist/
npx vesta-cli feedback   # errors with stack traces, session lengths, milestones, comments
```

## Agents

```sh
claude mcp add vesta -- npx -y vesta-cli mcp
```

Other MCP clients: `{ "command": "npx", "args": ["-y", "vesta-cli", "mcp"] }`.

Tools: `publish_game`, `get_feedback`, `list_games`, `set_cover`, `arcade_status`.

Then ask: *"publish this game to Vesta"*, and later *"check the Vesta feedback and fix the top error"*.

## Commands

```
vesta setup                 Deploy (or upgrade) your arcade on Cloudflare
vesta publish [dir]         -n "notes"  -b (build first)  --open  --no-screenshot  --json
vesta feedback [slug]       --days 30  --json
vesta list | open [slug] | login [url] | delete <slug> | mcp
```

Environment: `VESTA_URL` and `VESTA_TOKEN` override the saved config (for CI). `VESTA_CHROME` points at a browser for cover screenshots.

Docs, architecture and source: https://github.com/VanitasCaesar1/vesta-arcade
