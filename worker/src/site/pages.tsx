import type { CommentRow, Game, Sort, VersionRow } from "./db.ts";
import { compactNumber, timeAgo } from "../lib/util.ts";
import { Icon, Layout, Mascot, REPO_URL } from "./layout.tsx";

const SORTS: { id: Sort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Most played" },
];

const cover = (g: Game) => `/cover/${g.slug}?v=${g.updatedAt}`;

function Cmd({ text }: { text: string }) {
  return (
    <div class="cmd">
      <code>{text}</code>
      <button type="button" data-copy={text} data-msg="Copied" aria-label={`Copy ${text}`}>
        <Icon name="copy" />
      </button>
    </div>
  );
}

function GameCard({ g, i }: { g: Game; i: number }) {
  return (
    <a class="card rise" style={`--i:${i}`} href={`/g/${g.slug}`}>
      <div class="art">
        <img src={cover(g)} alt="" loading="lazy" width={640} height={360} />
      </div>
      <h3>{g.title}</h3>
      <div class="meta">
        <span>
          <b>{compactNumber(g.plays)}</b> {g.plays === 1 ? "play" : "plays"}
        </span>
        {g.madeWith[0] ? <span>{g.madeWith.join(" + ")}</span> : null}
        {g.author ? <span>{g.author}</span> : null}
      </div>
    </a>
  );
}

function Slot({ i }: { i: number }) {
  return (
    <div class="slot rise" style={`--i:${i}`}>
      <Mascot eyes="wide" mouth="o" />
      <div>
        <b>Your game here</b>
        <p>Run this in your game's folder, or ask your coding agent to publish it.</p>
      </div>
      <Cmd text="npx vesta-cli publish" />
    </div>
  );
}

export function HomePage(p: { arcade: string; siteUrl: string; games: Game[]; sort: Sort; tool?: string; tools: { tool: string; n: number }[] }) {
  const qs = (sort: Sort, tool?: string) => {
    const q = new URLSearchParams();
    if (sort !== "trending") q.set("sort", sort);
    if (tool) q.set("made_with", tool);
    const s = q.toString();
    return s ? `/?${s}#games` : "/#games";
  };
  const featured = p.games[0];
  const lede = "Every game here was shipped by a coding agent. Play one, then tell its AI what broke.";
  return (
    <Layout meta={{ title: `${p.arcade}: games made by AI, judged by you`, description: lede, url: p.siteUrl, arcade: p.arcade }}>
      <section class="cab">
        <div class="wrap hero">
          <div class="rise">
            <h1 class="display">
              <span class="l">Games made</span>
              <span class="l">by AI.</span>
              <span class="l">
                <span class="mark">Judged</span> by you.
              </span>
            </h1>
            <p class="lede">{lede}</p>
            <div class="cta">
              <a class="btn pop lg" data-react href={p.games.length > 1 ? "/random" : featured ? `/g/${featured.slug}?play=1` : "#publish"}>
                <Icon name="play" /> {featured ? "Play something" : "Publish the first game"}
              </a>
              <a class="text" href="#publish">
                Or make one
              </a>
            </div>
          </div>
          <div class="host rise" style="--i:2">
            <Mascot live label="Vesta, the arcade's host" />
          </div>
        </div>
      </section>

      <div class="wrap">
        <section class="floor" id="games">
          <div class="head">
            <h2 class="display">{p.tool ? `Made with ${p.tool}` : "On the floor"}</h2>
            <nav class="tabs" aria-label="Sort and filter">
              {SORTS.map((s) => (
                <a class={p.sort === s.id ? "on" : ""} href={qs(s.id, p.tool)}>
                  {s.label}
                </a>
              ))}
              {p.tools.map((t) => {
                const on = p.tool?.toLowerCase() === t.tool.toLowerCase();
                return (
                  <a class={on ? "on" : ""} href={on ? qs(p.sort) : qs(p.sort, t.tool)}>
                    {t.tool}
                    <small>{t.n}</small>
                  </a>
                );
              })}
            </nav>
          </div>
          <div class="grid">
            {p.games.map((g, i) => (
              <GameCard g={g} i={i} />
            ))}
            <Slot i={p.games.length} />
          </div>
        </section>

        <section class="make" id="publish">
          <div>
            <h2 class="display">
              Your agent makes it.
              <br />
              Vesta ships it.
            </h2>
            <p>Vesta is open source and runs on your own Cloudflare account for free. Publish from the terminal, or let Claude Code, Cursor or Codex do it, and read back every crash players hit.</p>
            <a class="btn" href={REPO_URL}>
              <Icon name="github" /> Get Vesta
            </a>
          </div>
          <div class="steps">
            <div>
              <span>Deploy your own arcade</span>
              <Cmd text="npx vesta-cli setup" />
            </div>
            <div>
              <span>Publish a game</span>
              <Cmd text="npx vesta-cli publish" />
            </div>
            <div>
              <span>Or hand it to Claude Code</span>
              <Cmd text="claude mcp add vesta -- npx -y vesta-cli mcp" />
            </div>
          </div>
        </section>
      </div>
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
        title: `${g.title}${g.author ? ` by ${g.author}` : ""} | ${p.arcade}`,
        description: description.slice(0, 200),
        url,
        image: g.hasCover ? `${p.siteUrl}${cover(g)}` : undefined,
        arcade: p.arcade,
        noindex: g.hidden,
      }}
    >
      <div class="wrap">
        <div class="stage" style={`aspect-ratio:${g.aspect}`} data-src={p.playSrc} data-title={g.title} data-share-url={url}>
          <img class="cover" src={cover(g)} alt="" />
          <button class="start" data-start type="button" aria-label={`Play ${g.title}`}>
            <span class="btn-play">
              <Icon name="play" />
            </span>
            <span class="title">{g.title}</span>
            <span class="hint">
              {g.keyboardRequired ? (
                <>
                  <Icon name="keyboard" /> Keyboard needed
                </>
              ) : (
                "Press to play"
              )}
            </span>
          </button>
        </div>

        <div class="game">
          <div>
            <h1 class="display">{g.title}</h1>
            <div class="byline">
              {g.author ? (
                <span>
                  By <b>{g.author}</b>
                </span>
              ) : null}
              <span>
                <b>{compactNumber(g.plays)}</b> {g.plays === 1 ? "play" : "plays"}
              </span>
              <span>
                v{g.version}, updated {timeAgo(g.updatedAt)}
              </span>
            </div>
            {g.madeWith.length ? (
              <div class="tools">
                {g.madeWith.map((t) => (
                  <a class="tool" href={`/?made_with=${encodeURIComponent(t)}#games`}>
                    Made with {t}
                  </a>
                ))}
              </div>
            ) : null}
            {g.description ? <p class="desc">{g.description}</p> : null}

            <section class="feedback" id="feedback">
              <h2 class="display">Tell the creator</h2>
              <p class="sub">What broke, and what was fun? It goes to the creator and to the AI that wrote the game.</p>
              {p.feedback === "sent" ? <div class="notice">Thanks. The creator will see it.</div> : p.feedback ? <div class="notice err">{p.feedback}</div> : null}
              <form class="fb" method="post" action={`/api/games/${g.slug}/comments`}>
                <label class="field">
                  Your feedback
                  <textarea name="body" maxlength={1000} required placeholder="The jump feels floaty after level 2, and I got stuck behind the blue door." />
                </label>
                <div class="hp" aria-hidden="true">
                  <input name="website" tabindex={-1} autocomplete="off" />
                </div>
                <div class="row">
                  <label class="field">
                    Name (optional)
                    <input name="name" maxlength={40} autocomplete="nickname" />
                  </label>
                  <button class="btn" type="submit" style="height:47px">
                    Send
                  </button>
                </div>
              </form>
              <ul class="comments">
                {p.comments.map((c) => (
                  <li>
                    <p>{c.body}</p>
                    <small>
                      {c.name || "Anonymous"}, v{c.version}, {timeAgo(c.created_at)}
                    </small>
                  </li>
                ))}
              </ul>
              {p.comments.length ? null : <p class="sub no-comments">No feedback yet.</p>}
            </section>
          </div>

          <aside class="side">
            <div>
              <div class="actions">
                <button class="btn pop lg" data-start data-fullscreen type="button">
                  <Icon name="expand" /> Play fullscreen
                </button>
                <button class="btn" data-like={g.slug} type="button" aria-label="Like">
                  <span class="off">
                    <Icon name="heart" />
                  </span>
                  <span class="on">
                    <Icon name="heartFill" />
                  </span>
                  <span data-likes>{g.likes}</span>
                </button>
                <button class="btn" data-share={url} type="button">
                  <Icon name="share" /> Share
                </button>
              </div>
              <button class="linkbtn" data-toggle="#embed" type="button">
                <Icon name="code" /> Embed or README badge
              </button>
              <div class="embed" id="embed" hidden>
                <textarea class="code" id="embed-code" rows={4} readonly aria-label="Embed code">
                  {embed}
                </textarea>
                <button class="btn sm" data-copy="#embed-code" data-msg="Embed code copied" type="button">
                  Copy embed code
                </button>
                <textarea class="code" id="badge-code" rows={2} readonly aria-label="README badge">
                  {badge}
                </textarea>
                <button class="btn sm" data-copy="#badge-code" data-msg="Badge copied" type="button">
                  Copy README badge
                </button>
              </div>
            </div>

            <div>
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
              <a class="source" href={g.sourceUrl} rel="noopener nofollow">
                <Icon name="github" /> View source
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    </Layout>
  );
}

export function EmbedPage(p: { arcade: string; siteUrl: string; game: Game; playSrc: string }) {
  const g = p.game;
  return (
    <Layout meta={{ title: `${g.title} | ${p.arcade}`, description: g.description, url: `${p.siteUrl}/g/${g.slug}`, arcade: p.arcade, noindex: true }} bare>
      <div class="stage" style="position:fixed;inset:0;max-height:none;border:0;border-radius:0;margin:0" data-src={p.playSrc} data-title={g.title} data-share-url={`${p.siteUrl}/g/${g.slug}`}>
        <img class="cover" src={cover(g)} alt="" />
        <button class="start" data-start type="button" aria-label={`Play ${g.title}`}>
          <span class="btn-play">
            <Icon name="play" />
          </span>
          <span class="title">{g.title}</span>
          <span class="hint">on {p.arcade}</span>
        </button>
      </div>
    </Layout>
  );
}

export function NotFoundPage(p: { arcade: string; siteUrl: string }) {
  return (
    <Layout meta={{ title: `Not found | ${p.arcade}`, description: "", url: p.siteUrl, arcade: p.arcade, noindex: true }}>
      <div class="wrap">
        <section class="lost">
          <Mascot eyes="x" mouth="flat" />
          <div>
            <h1 class="display">Game over.</h1>
            <p>
              That page doesn't exist, or the game was taken down. <a href="/">Back to the arcade</a>
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
