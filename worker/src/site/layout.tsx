import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { FLAME_SVG } from "./assets.ts";

export const REPO_URL = "https://github.com/VanitasCaesar1/vesta-arcade";

export const icon = {
  play: raw(`<svg viewBox="0 0 24 24" width="22" height="22" fill="#160800"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>`),
  playBig: raw(`<svg viewBox="0 0 24 24" width="38" height="38" fill="#160800"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>`),
  heart: raw(`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 5.4 3.2C13.8 6.2 15.3 5 17.4 5 21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21Z"/></svg>`),
  share: raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>`),
  expand: raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`),
  code: raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>`),
  keyboard: raw(`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>`),
  flame: raw(FLAME_SVG),
};

export interface Meta {
  title: string;
  description: string;
  url: string;
  image?: string;
  arcade: string;
  noindex?: boolean;
}

export function Layout(props: { meta: Meta; children: Child; bare?: boolean }) {
  const { meta } = props;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="theme-color" content="#0e0c0a" />
        {meta.noindex ? <meta name="robots" content="noindex" /> : null}
        <link rel="canonical" href={meta.url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={meta.arcade} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.url} />
        {meta.image ? <meta property="og:image" content={meta.image} /> : null}
        <meta name="twitter:card" content={meta.image ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        {meta.image ? <meta name="twitter:image" content={meta.image} /> : null}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate" type="application/rss+xml" title={meta.arcade} href="/feed.xml" />
        <link rel="stylesheet" href="/static/style.css?v=2" />
        <script src="/static/app.js?v=2" defer></script>
      </head>
      <body>
        {props.bare ? (
          props.children
        ) : (
          <>
            <div class="wrap">
              <nav class="nav">
                <a class="brand" href="/">
                  {icon.flame}
                  {meta.arcade}
                </a>
                <span class="sp" />
                <a class="link" href="/llms.txt">For agents</a>
                <a class="link" href={REPO_URL}>Run your own</a>
              </nav>
            </div>
            {props.children}
            <div class="wrap">
              <footer class="foot">
                <span>
                  {meta.arcade} runs on <a href={REPO_URL}>Vesta</a>, open source and free to host on Cloudflare.
                </span>
                <span>
                  <a href="/admin">Dashboard</a> · <a href="/feed.xml">RSS</a>
                </span>
              </footer>
            </div>
          </>
        )}
      </body>
    </html>
  );
}
