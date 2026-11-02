import type { CommentRow, Game, Sort, VersionRow } from "./db.ts";
import { compactNumber, timeAgo } from "../lib/util.ts";
import { icon, Layout, REPO_URL } from "./layout.tsx";

const SORTS: { id: Sort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Most played" },
];

function GameCard({ g }: { g: Game }) {
  const hot = (g.recentPlays ?? 0) >= 25;
  return (
    <a class="card" href={`/g/${g.slug}`}>
      <div class="art">
        <img src={`/cover/${g.slug}?v=${g.updatedAt}`} alt="" loading="lazy" width={640} height={360} />
        <div class="play">
          <span>{icon.play}</span>
        </div>
        <span class="badge">▶ {compactNumber(g.plays)}</span>
        {hot ? <span class="badge hot">🔥 {compactNumber(g.recentPlays ?? 0)} in 48h</span> : null}
      </div>
      <h3>{g.title}</h3>
      <div class="meta">
        {g.author ? <b>{g.author}</b> : null}
        {g.madeWith.length ? <span>{g.madeWith.join(" + ")}</span> : null}
        <span>v{g.version}</span>
      </div>
    </a>
  );
}

export function HomePage(p: { arcade: string; siteUrl: string; games: Game[]; sort: Sort; tool?: string; tools: { tool: string; n: number }[] }) {
  const qs = (sort: Sort, tool?: string) => {
    const q = new URLSearchParams();
    if (sort !== "trending") q.set("sort", sort);
    if (tool) q.set("made_with", tool);
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };
  return (
    <Layout
      meta={{
        title: p.arcade,
        description: "Browser games made with AI coding agents. Play one, then tell the creator what broke.",
        url: p.siteUrl,
        arcade: p.arcade,
      }}
    >
      <main class="wrap">
        <section class="hero">
          <h1>
            Games made with <em>AI</em>, fixed by players.
          </h1>
          <p>Every game here was published straight from a coding agent. Play one, then tell the creator what broke. It goes right back to their AI.</p>
        </section>
        <div class="bar">
          {SORTS.map((s) => (
            <a class={`tab${p.sort === s.id ? " on" : ""}`} href={qs(s.id, p.tool)}>
              {s.label}
            </a>
          ))}
          {p.tools.length ? <span class="gap" /> : null}
          {p.tools.map((t) => (
            <a class={`chip${p.tool?.toLowerCase() === t.tool.toLowerCase() ? " on" : ""}`} href={p.tool?.toLowerCase() === t.tool.toLowerCase() ? qs(p.sort) : qs(p.sort, t.tool)}>
              {t.tool} <small>{t.n}</small>
            </a>
          ))}
        </div>
        {p.games.length ? (
          <div class="grid">
            {p.games.map((g) => (
              <GameCard g={g} />
            ))}
          </div>
        ) : (
          <div class="empty">
            <h2>{p.tool ? `Nothing made with ${p.tool} yet` : "The arcade is empty"}</h2>
            <p>Publish your first game from any folder with an index.html:</p>
            <pre class="cmd">npx vesta-cli publish</pre>
            <p>
              Or let your agent do it: <code>claude mcp add vesta -- npx -y vesta-cli mcp</code>
            </p>
          </div>
        )}
      </main>
    </Layout>
  );
}

export function GamePage(p: {
  arcade: string;
  siteUrl: string;
  game: Game;
  playSrc: string;
  versions: VersionRow[];
  comments: CommentRow[];
  feedback?: string;
}) {
  const g = p.game;
  const url = `${p.siteUrl}/g/${g.slug}`;
  const embed = `<iframe src="${p.siteUrl}/embed/${g.slug}" width="960" height="540" style="border:0;border-radius:12px;max-width:100%" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>`;
  const badge = `[![Play ${g.title}](${p.siteUrl}/badge/${g.slug})](${url})`;
  const description = g.description || `Play ${g.title} in your browser.${g.madeWith.length ? ` Made with ${g.madeWith.join(" + ")}.` : ""}`;
  return (
    <Layout
      meta={{
        title: `${g.title}${g.author ? ` by ${g.author}` : ""} · ${p.arcade}`,
        description: description.slice(0, 200),
        url,
        image: g.hasCover ? `${p.siteUrl}/cover/${g.slug}?v=${g.updatedAt}` : undefined,
        arcade: p.arcade,
        noindex: g.hidden,
      }}
    >
      <main class="wrap">
        <div class="stage" style={`aspect-ratio:${g.aspect}`} data-src={p.playSrc} data-title={g.title} data-share-url={url}>
          <img class="cover" src={`/cover/${g.slug}?v=${g.updatedAt}`} alt="" />
          <button class="start" data-start type="button" aria-label={`Play ${g.title}`}>
            <span class="btn-play">{icon.playBig}</span>
            <span class="hint">{g.keyboardRequired ? "Click to play · keyboard needed" : "Click to play"}</span>
          </button>
        </div>

        <div class="gamehead">
          <div>
            <h1>{g.title}</h1>
            <div class="byline">
              {g.author ? <span>by {g.author}</span> : null}
              {g.author ? <span class="dot">·</span> : null}
              <span>
                {compactNumber(g.plays)} plays
              </span>
              <span class="dot">·</span>
              <span>
                v{g.version}, updated {timeAgo(g.updatedAt)}
              </span>
              {g.madeWith.map((t) => (
                <a class="tool" href={`/?made_with=${encodeURIComponent(t)}`}>
                  Made with {t}
                </a>
              ))}
              {g.keyboardRequired ? <span class="kbd">{icon.keyboard} Keyboard</span> : null}
            </div>
          </div>
          <div class="actions">
            <button class="btn primary" data-start data-fullscreen type="button">
              {icon.expand} Fullscreen
            </button>
            <button class="btn" data-like={g.slug} type="button">
              {icon.heart} <span data-likes>{g.likes}</span>
            </button>
            <button class="btn" data-share={url} type="button">
              {icon.share} Share
            </button>
            <button class="btn" data-toggle="#embed" type="button">
              {icon.code} Embed
            </button>
          </div>
        </div>

        <div class="panel" id="embed" hidden style="margin-top:16px">
          <h3>Embed this game</h3>
          <textarea class="code" id="embed-code" rows={3} readonly>
            {embed}
          </textarea>
          <p style="margin:10px 0 6px">
            <button class="btn small" data-copy="#embed-code" data-msg="Embed code copied" type="button">
              Copy embed
            </button>{" "}
            <button class="btn small" data-copy="#badge-code" data-msg="Badge copied" type="button">
              Copy README badge
            </button>
          </p>
          <textarea class="code" id="badge-code" rows={2} readonly>
            {badge}
          </textarea>
        </div>

        <div class="cols">
          <div>
            {g.description ? <p class="desc">{g.description}</p> : null}
            <section id="feedback">
              <h2 class="sec">Tell the creator</h2>
              <p class="sub">What broke? What was fun? It goes straight to the creator, and to the AI that wrote the game.</p>
              {p.feedback === "sent" ? <div class="notice">Thanks. The creator will see it.</div> : p.feedback ? <div class="notice err">{p.feedback}</div> : null}
              <form class="fb" method="post" action={`/api/games/${g.slug}/comments`}>
                <textarea name="body" maxlength={1000} required placeholder="The jump feels floaty after level 2, and I got stuck behind the blue door…" />
                <div class="hp" aria-hidden="true">
                  <input name="website" tabindex={-1} autocomplete="off" />
                </div>
                <div class="row">
                  <input name="name" maxlength={40} placeholder="Your name (optional)" autocomplete="nickname" />
                  <button class="btn primary" type="submit">
                    Send
                  </button>
                </div>
              </form>
              <ul class="comments">
                {p.comments.map((c) => (
                  <li>
                    <p>{c.body}</p>
                    <small>
                      {c.name || "Anonymous"} · v{c.version} · {timeAgo(c.created_at)}
                    </small>
                  </li>
                ))}
              </ul>
              {p.comments.length ? null : <p class="sub no-comments">No feedback yet. Be the first.</p>}
            </section>
          </div>
          <aside class="side">
            <div class="panel">
              <div class="stats">
                <div>
                  <b>{compactNumber(g.plays)}</b>
                  <small>plays</small>
                </div>
                <div>
                  <b>{compactNumber(g.likes)}</b>
                  <small>likes</small>
                </div>
                <div>
                  <b>{p.versions.length}</b>
                  <small>versions</small>
                </div>
              </div>
            </div>
            <div class="panel">
              <h3>Changelog</h3>
              <ul class="log">
                {p.versions.map((v) => (
                  <li>
                    <b>v{v.n}</b>
                    <span>
                      {v.notes || "Update"}
                      <small>{timeAgo(v.live_at ?? v.created_at)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {g.sourceUrl ? (
              <div class="panel">
                <h3>Source</h3>
                <a href={g.sourceUrl} rel="noopener nofollow">
                  {g.sourceUrl.replace(/^https:\/\//, "")}
                </a>
              </div>
            ) : null}
            <div class="panel">
              <h3>Make your own</h3>
              <p class="muted" style="margin:0 0 10px;font-size:14px">
                Built with an AI coding agent? Publish it in one command, on your own free arcade.
              </p>
              <a class="btn small" href={REPO_URL}>
                Get Vesta →
              </a>
            </div>
          </aside>
        </div>
      </main>
    </Layout>
  );
}

export function EmbedPage(p: { arcade: string; siteUrl: string; game: Game; playSrc: string }) {
  const g = p.game;
  return (
    <Layout meta={{ title: `${g.title} · ${p.arcade}`, description: g.description, url: `${p.siteUrl}/g/${g.slug}`, arcade: p.arcade, noindex: true }} bare>
      <div class="stage" style="position:fixed;inset:0;max-height:none;border:0;border-radius:0;margin:0" data-src={p.playSrc} data-title={g.title} data-share-url={`${p.siteUrl}/g/${g.slug}`}>
        <img class="cover" src={`/cover/${g.slug}?v=${g.updatedAt}`} alt="" />
        <button class="start" data-start type="button" aria-label={`Play ${g.title}`}>
          <span class="btn-play">{icon.playBig}</span>
          <span class="hint">
            {g.title} · on {p.arcade}
          </span>
        </button>
      </div>
    </Layout>
  );
}

export function NotFoundPage(p: { arcade: string; siteUrl: string }) {
  return (
    <Layout meta={{ title: `Not found · ${p.arcade}`, description: "", url: p.siteUrl, arcade: p.arcade, noindex: true }}>
      <main class="wrap">
        <section class="hero">
          <h1>
            Game <em>over</em>.
          </h1>
          <p>
            That page doesn't exist, or the game was taken down. <a href="/">Back to the arcade</a>
          </p>
        </section>
      </main>
    </Layout>
  );
}
