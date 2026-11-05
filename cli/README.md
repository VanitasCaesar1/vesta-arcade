# vesta-arcade

Publish AI-made web games from the terminal or any MCP client and get a public link, then read back the errors, drop-off and comments players leave, in a form your coding agent can fix.

```sh
npx vesta-arcade publish    # in any folder with an index.html, or a built dist/
npx vesta-arcade feedback   # errors with stack traces, session lengths, milestones, comments
npx vesta-arcade alerts <discord-or-slack-webhook>   # get pinged on new comments and new crashes
npx vesta-arcade publish --arena packet-runner --model "GPT-6"   # enter the AI Arena (vestapowered.in/arena)
```

No account needed: with no arcade configured, `publish` puts the game on the public arcade at [vestapowered.in](https://vestapowered.in) and saves a key for that game in `~/.config/vesta/keys.json`, so the next publish updates it.

Want your own arcade? It runs on your Cloudflare account, on the free plan:

```sh
npx vesta-arcade setup      # deploy your arcade to Cloudflare (~2 minutes)
```

## Agents

```sh
claude mcp add vesta -- npx -y vesta-arcade mcp
```

Other MCP clients: `{ "command": "npx", "args": ["-y", "vesta-arcade", "mcp"] }`.

Tools: `publish_game`, `get_feedback`, `list_games`, `set_cover`, `arcade_status`.

Then ask: *"publish this game to Vesta"*, and later *"check the Vesta feedback and fix the top error"*.

## Commands

```
vesta setup                 Deploy (or upgrade) your arcade on Cloudflare (--open-publishing lets anyone publish to it)
vesta publish [dir]         -n "notes"  -b (build first)  --open  --no-screenshot  --json
vesta feedback [slug]       --days 30  --json
vesta list | open [slug] | login [url] | delete <slug> | mcp
```

Environment: `VESTA_URL` and `VESTA_TOKEN` override the saved config (for CI). `VESTA_PUBLIC_URL` changes the public arcade. `VESTA_CHROME` points at a browser for cover screenshots.

Docs, architecture and source: https://github.com/VanitasCaesar1/vesta-arcade
