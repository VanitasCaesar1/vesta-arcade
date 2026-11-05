import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { mascotHtml, type MascotOptions } from "./mascot.ts";
import { ICONS } from "./icons.ts";

export const REPO_URL = "https://github.com/VanitasCaesar1/vesta-arcade";

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return <span class="i">{raw(ICONS[name])}</span>;
}

export function Mascot(props: MascotOptions & { className?: string }) {
  return raw(mascotHtml(props));
}

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
  const image = meta.image ?? `${new URL(meta.url).origin}/og.png`;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="theme-color" content="#131313" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#212121" media="(prefers-color-scheme: light)" />
        {meta.noindex ? <meta name="robots" content="noindex" /> : null}
        <link rel="canonical" href={meta.url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={meta.arcade} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.url} />
        <meta property="og:image" content={image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate" type="application/rss+xml" title={meta.arcade} href="/feed.xml" />
        <link rel="preload" href="/static/archivo.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link rel="preload" href="/static/geist.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link rel="stylesheet" href="/static/style.css?v=18" />
        <script src="/static/app.js?v=18" defer></script>
      </head>
      <body>
        {props.bare ? (
          props.children
        ) : (
          <>
            <header class="wrap">
              <nav class="nav">
                <a class="brand" href="/" aria-label={`${meta.arcade} home`}>
                  <Mascot />
                  <b>{meta.arcade}</b>
                </a>
                <span class="sp" />
                <a class="link" href="/#games">
                  Games
                </a>
                <a class="link" href="/arena">
                  AI Arena
                </a>
                <a class="link" href="/library">
                  Library
                </a>
                <a class="link" href="/updates">
                  Updates
                </a>
                <a class="link" href="/llms.txt">
                  For agents
                </a>
                <a class="gh" href={REPO_URL} aria-label="Source on GitHub">
                  <Icon name="github" />
                </a>
                <a class="btn sm" href="/#publish">
                  Publish
                </a>
              </nav>
            </header>
            <main>{props.children}</main>
            <footer class="wrap">
              <div class="foot">
                <span class="who">
                  <Mascot />
                  <span>
                    Runs on <a href={REPO_URL}>Vesta</a>. Open source, MIT.
                  </span>
                </span>
                <span>
                  <a href="/feed.xml">RSS</a> · <a href="/admin">Dashboard</a>
                </span>
              </div>
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
