# Hug of Death

Your side project just hit #1 on the front page, and you are the load balancer.

- **Tap a server** (or press 1–6) to send traffic there. Each server has a queue; overfill it and requests get dropped, keep it overfull and it crashes.
- **Tap red bots** to block them before they eat your CPU.
- **Spend what you earn** (Q W E R T): more servers, bigger boxes, a CDN for static files, a rate limiter, or an SRE who routes for you.
- Keep uptime above 90% for 3:10, until the post falls off the front page. Then it's endless.

One HTML file, no dependencies, about 700 lines of canvas code. Written with Claude Code and published with [Vesta](../../README.md).

It reports `started`, `front-page`, `rank-1`, `survived`, `game-over`, `first-crash` and `bought-*` milestones through `window.vesta`, so the creator dashboard shows how far players get.

Add `?demo` to the URL to watch it play itself, or `?demo=fast` at triple speed (handy for recording a trailer).

```sh
npx vesta-cli publish games/hug-of-death
```
