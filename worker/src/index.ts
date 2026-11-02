// Vesta: one script, deployed twice.
//   ROLE=site  the arcade, creator dashboard and API
//   ROLE=play  game files, on an origin of their own so games can't touch the arcade
import type { Env } from "./lib/env.ts";
import { handlePlay } from "./play/index.ts";
import { site } from "./site/index.tsx";

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const play = env.ROLE === "play" || (env.ROLE === "auto" && new URL(req.url).hostname.startsWith("play."));
    if (play) return handlePlay(req, env, ctx);
    return site.fetch(req, env, ctx);
  },
} satisfies ExportedHandler<Env>;
