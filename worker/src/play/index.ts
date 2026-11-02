// The play Worker: serves game files from R2 on an origin of their own,
// injects the feedback script into HTML, and records what that script sends.
import type { Env } from "../lib/env.ts";
import { contentType } from "../lib/mime.ts";
import { validateSlug } from "../lib/manifest.ts";
import { CLIENT_SCRIPT } from "./client.ts";
import { ingest } from "./telemetry.ts";

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  // Games may only be framed by the arcade itself, or opened directly.
  "cross-origin-resource-policy": "cross-origin",
};

export async function handlePlay(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/__vesta/t.js") {
    return new Response(CLIENT_SCRIPT, {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600", ...SECURITY_HEADERS },
    });
  }
  if (url.pathname === "/__vesta/e") {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    return ingest(req, env, ctx);
  }
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });

  // /<slug>/<version>/<path>
  const m = url.pathname.match(/^\/([^/]+)\/(\d{1,6})(\/.*)?$/);
  if (!m) {
    return new Response(`This address serves games for ${env.ARCADE_NAME}. Nothing to see here.`, {
      status: url.pathname === "/" ? 200 : 404,
      headers: { "content-type": "text/plain; charset=utf-8", ...SECURITY_HEADERS },
    });
  }
  let slug: string;
  try {
    slug = validateSlug(decodeURIComponent(m[1]!));
  } catch {
    return notFound();
  }
  const version = Number(m[2]);
  if (!m[3]) return Response.redirect(`${url.origin}/${slug}/${version}/${url.search}`, 301);

  let path: string;
  try {
    path = decodeURIComponent(m[3].slice(1));
  } catch {
    return notFound();
  }
  if (path === "" || path.endsWith("/")) path += "index.html";
  if (path.split("/").some((s) => s === ".." || s.startsWith("."))) return notFound();

  const prefix = `g/${slug}/${version}/`;
  // HTML is rewritten on the way out, so it's always served whole and fresh.
  const htmlPath = (p: string) => /\.html?$/i.test(p);
  const opts = (p: string): R2GetOptions => (htmlPath(p) ? {} : { range: req.headers, onlyIf: req.headers });
  let obj = await env.FILES.get(prefix + path, opts(path));
  // "/level-2" → "/level-2/index.html", for games built as multi-page sites.
  if (!obj && !/\.[a-z0-9]+$/i.test(path)) {
    const index = `${path}/index.html`;
    obj = await env.FILES.get(prefix + index, opts(index));
    if (obj) path = index;
  }
  if (!obj) return notFound();

  const headers = new Headers(SECURITY_HEADERS);
  obj.writeHttpMetadata(headers);
  headers.set("content-type", contentType(path));
  headers.set("etag", obj.httpEtag);
  headers.set("access-control-allow-origin", "*");
  const isHtml = htmlPath(path);
  // Paths include the version number, so everything but HTML can be cached forever.
  headers.set("cache-control", isHtml ? "public, max-age=60" : "public, max-age=31536000, immutable");

  // onlyIf matched: the client's copy is current.
  if (!("body" in obj)) return new Response(null, { status: 304, headers });

  if (isHtml && req.method === "GET") {
    headers.delete("content-length");
    headers.delete("etag");
    return injectFeedbackScript(new Response(obj.body, { headers }), slug, version);
  }

  let status = 200;
  if (obj.range && req.headers.has("range")) {
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const offset = r.suffix !== undefined ? obj.size - r.suffix : r.offset ?? 0;
    const length = r.suffix !== undefined ? r.suffix : r.length ?? obj.size - offset;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    status = 206;
  } else {
    headers.set("content-length", String(obj.size));
  }
  headers.set("accept-ranges", "bytes");
  return new Response(req.method === "HEAD" ? null : obj.body, { status, headers });
}

function injectFeedbackScript(res: Response, slug: string, version: number): Response {
  const tag = `<script src="/__vesta/t.js" data-game="${slug}" data-version="${version}"></script>`;
  let injected = false;
  return new HTMLRewriter()
    .on("head", {
      element(el) {
        if (!injected) {
          el.prepend(tag, { html: true });
          injected = true;
        }
      },
    })
    .onDocument({
      end(end) {
        // No <head> at all (it happens with hand-written games): append instead.
        if (!injected) end.append(tag, { html: true });
      },
    })
    .transform(res);
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...SECURITY_HEADERS } });
}
