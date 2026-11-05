import { duration, type AchievementRow, type Challenge, type CommentRow, type Game, type LoopData, type ScoreRow, type Sort, type VersionRow } from "./db.ts";
import { compactNumber, timeAgo } from "../lib/util.ts";
import { reviewLabel, type ReviewRow } from "./reviews.ts";
import { Icon, Layout, Mascot, REPO_URL } from "./layout.tsx";

const SORTS: { id: Sort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Most played" },
  { id: "rated", label: "Top rated" },
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
      {g.reviewsTotal ? <ReviewBadge up={g.reviewsUp} total={g.reviewsTotal} /> : null}
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

export function ReviewBadge({ up, total, long }: { up: number; total: number; long?: boolean }) {
  const r = reviewLabel(up, total);
  return (
    <span class={`review-label ${r.tone}`} title={total ? `${Math.round((up / total) * 100)}% of ${total} reviews recommend it` : ""}>
      {r.label}
      {long && total ? <small> ({Math.round((up / total) * 100)}% of {total.toLocaleString("en-US")})</small> : null}
    </span>
  );
}

function Reviews(p: { g: Game; reviews: ReviewRow[]; notice?: string }) {
  const g = p.g;
  return (
    <section class="reviews" id="reviews">
      <h2 class="display">Reviews</h2>
      <p class="sub">
        <ReviewBadge up={g.reviewsUp} total={g.reviewsTotal} long />
      </p>
      {p.notice ? <div class="notice">{p.notice}</div> : null}
      <form class="fb review-form" method="post" action={`/api/games/${g.slug}/review`}>
        <div class="vote-row">
          <label class="vote up">
            <input type="radio" name="vote" value="up" required /> <span>👍 Recommended</span>
          </label>
          <label class="vote down">
            <input type="radio" name="vote" value="down" /> <span>👎 Not recommended</span>
          </label>
        </div>
        <label class="field">
          Your review (optional)
          <textarea name="body" maxlength={1000} rows={3} placeholder="What made it fun, or what would make it better?" />
        </label>
        <div class="hp" aria-hidden="true">
          <input name="website" tabindex={-1} autocomplete="off" />
        </div>
        <button class="btn" type="submit">
          Post review
        </button>
      </form>
      <ul class="review-list">
        {p.reviews.map((r) => (
          <li class={r.up ? "up" : "down"}>
            <b>{r.up ? "👍 Recommended" : "👎 Not recommended"}</b>
            <p>{r.body}</p>
            <small>
              v{r.version ?? "?"}, {timeAgo(r.created_at)}
            </small>
          </li>
        ))}
      </ul>
    </section>
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
      <Cmd text="npx vesta-arcade publish" />
    </div>
  );
}

function Loop({ d, siteUrl }: { d: LoopData; siteUrl: string }) {
  const g = d.game;
  const host = new URL(siteUrl).host;
  const errors = d.errorKinds.length ? d.errorKinds.map((e) => `${e.kind} x${e.count}`).join(", ") : "none reported";
  return (
    <section class="loop">
      <h2 class="display">
        Players break it.
        <br />
        Your agent fixes it.
      </h2>
      <p class="lead">Vesta records every crash, how long people play and what they say, and hands it back as a report your coding agent can act on.</p>
      <div class="bento">
        <div class="term">
          <span class="live">
            <i /> Live from {host}
          </span>
          <pre>
            <span class="p">$ </span>npx vesta-arcade publish{"\n"}
            <span class="y">▲</span> {g.title} v{g.version} is live{"\n"}
            {"  "}
            {siteUrl}/g/{g.slug}
            {"\n\n"}
            <span class="p">$ </span>npx vesta-arcade feedback {g.slug}
            {"\n"}
            <span class="h"># Player feedback: {g.title}</span>
            {"\n"}- {compactNumber(d.plays)} {d.plays === 1 ? "play" : "plays"} in 14 days, average {duration(d.avgSeconds)} of active play{"\n"}- Errors on v{g.version}: <span class={d.errorKinds.length ? "r" : "g"}>{errors}</span>
            {"\n"}
            {d.milestone ? (
              <>
                - Milestone "{d.milestone.name}": {Math.round(d.milestone.share * 100)}% of plays{"\n"}
              </>
            ) : null}
            {"\n"}
            <span class="p">&gt; </span>
            <span class="a">
              {d.errorKinds.length
                ? `fix the ${d.errorKinds[0]!.kind} and publish again`
                : d.milestone
                  ? `only ${Math.round(d.milestone.share * 100)}% reach "${d.milestone.name}". make that part easier`
                  : "read the feedback and improve the game"}
            </span>
          </pre>
        </div>
        <div class="stat">
          <b>{compactNumber(d.weekPlays)}</b>
          <span>
            {d.weekPlays === 1 ? "play" : "plays"} this week across {d.weekGames} {d.weekGames === 1 ? "game" : "games"}
          </span>
        </div>
        <a class="quote" href={d.comment ? `/g/${d.comment.slug}#feedback` : `/g/${g.slug}#feedback`}>
          {d.comment ? (
            <>
              <p>“{d.comment.body.length > 140 ? `${d.comment.body.slice(0, 137)}...` : d.comment.body}”</p>
              <span>
                {d.comment.name || "A player"} on {d.comment.title}, {timeAgo(d.comment.created_at)}
              </span>
            </>
          ) : (
            <>
              <p>No player feedback yet.</p>
              <span>Play something and leave the first note.</span>
            </>
          )}
        </a>
      </div>
    </section>
  );
}

export function HomePage(p: { arcade: string; siteUrl: string; games: Game[]; sort: Sort; tool?: string; tools: { tool: string; n: number }[]; loop: LoopData | null; open?: boolean; q?: string; arena?: string; featured?: { id: string; prompt: string; n: number; community: number; author: string; top: { slug: string; model: string; file_key: string }[] } | null; playOrigin?: string }) {
  const qs = (sort: Sort, tool?: string) => {
    const q = new URLSearchParams();
    if (sort !== "trending") q.set("sort", sort);
    if (tool) q.set("made_with", tool);
    const s = q.toString();
    return s ? `/?${s}#games` : "/#games";
  };
  const featured = p.games[0];
  const lede = "Everything here was made by AI: games, drawings, whatever people push it to make next. Play it, judge models blind in the arena, and tell the AI what broke. The crash and your comment go back to the agent that made it.";
  return (
    <Layout meta={{ title: `${p.arcade}: games made by AI, broken by you`, description: lede, url: p.siteUrl, arcade: p.arcade }}>
      <section class="cab">
        <div class="wrap hero">
          <div class="rise">
            <h1 class="display">
              <span class="l">Games made</span>
              <span class="l">by AI.</span>
              <span class="l">
                <span class="mark">Broken</span> by you.
              </span>
            </h1>
            <p class="lede">{lede}</p>
            <div class="cta">
              <a class="btn pop lg" data-react href={p.games.length > 1 ? "/random" : featured ? `/g/${featured.slug}?play=1` : "#publish"}>
                <Icon name="play" /> {featured ? "Play something" : "Publish the first game"}
              </a>
              {p.arena ? (
                <a class="btn lg" href="/arena/svg">
                  Judge AIs blind
                </a>
              ) : null}
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

      {p.featured ? (
        <div class="wrap">
          <section class="featured">
            <div class="featured-text">
              <span class="k">Challenge of the week</span>
              <h2 class="display">"{p.featured.prompt}"</h2>
              <p class="sub">
                {p.featured.n} AI drawings so far{p.featured.community ? `, started by ${p.featured.author || "the community"}` : ""}. Which one's best? Judge them blind, or add your model's.
              </p>
              <div class="row">
                <a class="btn pop" href={`/arena/svg?p=${p.featured.id}`}>
                  Judge them
                </a>
                <a class="btn" href={`/arena/svg/p/${p.featured.id}`}>
                  See all {p.featured.n}
                </a>
              </div>
            </div>
            <a class="featured-pics" href={`/arena/svg?p=${p.featured.id}`} aria-label="Judge this challenge">
              {p.featured.top.map((e, i) => (
                <span class="arena-svg">
                  <img src={`${p.playOrigin}/${e.file_key}`} alt={`Drawing ${i === 0 ? "A" : "B"}`} loading="lazy" width={800} height={600} />
                  <i>{i === 0 ? "A" : "B"}</i>
                </span>
              ))}
            </a>
          </section>
        </div>
      ) : null}
      {p.arena ? (
        <div class="wrap">
          <a class="arena-strip" href="/arena">
            <span class="k">New</span>
            <b class="display">AI Arena</b>
            <span>Same prompt, different AIs: {p.arena} games and SVG drawings, judged blind by you. Bring your own model's entry.</span>
            <span class="go">Judge them</span>
          </a>
        </div>
      ) : null}

      <div class="wrap">
        <section class="floor" id="games">
          <div class="head">
            <h2 class="display">{p.q ? `Results for "${p.q}"` : p.tool ? `Made with ${p.tool}` : "On the floor"}</h2>
            <form class="search" method="get" action="/#games" role="search">
              <input type="search" name="q" value={p.q ?? ""} placeholder="Search games, makers, tools…" aria-label="Search games" maxlength={60} />
              {p.sort !== "trending" ? <input type="hidden" name="sort" value={p.sort} /> : null}
            </form>
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

        {p.loop ? <Loop d={p.loop} siteUrl={p.siteUrl} /> : null}

        <section class="make" id="publish">
          <div>
            <h2 class="display">
              Your agent can build a game.
              <br />
              <span class="mark">It can't watch anyone play it.</span>
            </h2>
            <p>Vesta can. Publish with one command, or let Claude Code, Cursor or Codex do it with one tool call. Your agent gets back the crashes, where players quit and what they said. Open source, on your own Cloudflare account, on the free plan.</p>
            <a class="btn" href={REPO_URL}>
              <Icon name="github" /> Get Vesta
            </a>
          </div>
          {p.open ? (
            <div class="steps">
              <div>
                <span>Publish your game here. No account, one command</span>
                <Cmd text="npx vesta-arcade publish" />
              </div>
              <div>
                <span>Or hand it to Claude Code</span>
                <Cmd text="claude mcp add vesta -- npx -y vesta-arcade mcp" />
              </div>
              <div>
                <span>Want your own arcade? Free on Cloudflare</span>
                <Cmd text="npx vesta-arcade setup" />
              </div>
            </div>
          ) : (
            <div class="steps">
              <div>
                <span>Deploy your own arcade</span>
                <Cmd text="npx vesta-arcade setup" />
              </div>
              <div>
                <span>Publish a game</span>
                <Cmd text="npx vesta-arcade publish" />
              </div>
              <div>
                <span>Or hand it to Claude Code</span>
                <Cmd text="claude mcp add vesta -- npx -y vesta-arcade mcp" />
              </div>
            </div>
          )}
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
  scores: ScoreRow[];
  challenge?: Challenge | null;
  more?: Game[];
  reviews?: ReviewRow[];
  reviewNotice?: string;
  achievements?: AchievementRow[];
  feedback?: string;
}) {
  const g = p.game;
  const url = `${p.siteUrl}/g/${g.slug}`;
  const ch = p.challenge;
  const chScore = ch ? Math.round(ch.score).toLocaleString("en-US") : "";
  const embed = `<iframe src="${p.siteUrl}/embed/${g.slug}" width="960" height="540" style="border:0;border-radius:12px;max-width:100%" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>`;
  const badge = `[![Play ${g.title}](${p.siteUrl}/badge/${g.slug})](${url})`;
  const description = g.description || `Play ${g.title} in your browser.${g.madeWith.length ? ` Made with ${g.madeWith.join(" + ")}.` : ""}`;
  return (
    <Layout
      meta={{
        title: ch ? `${ch.name} scored ${chScore} on ${g.title}. Beat it.` : `${g.title}${g.author ? ` by ${g.author}` : ""} | ${p.arcade}`,
        description: ch ? `${ch.name} challenged you to ${g.title}. Free in your browser, no sign-up. ${description}`.slice(0, 200) : description.slice(0, 200),
        url: ch ? `${url}?c=${ch.id}` : url,
        image: g.hasCover ? `${p.siteUrl}${cover(g)}` : undefined,
        arcade: p.arcade,
        noindex: g.hidden,
      }}
    >
      <div class="wrap">
        {ch ? (
          <div class="challenge">
            <span class="k">Challenge</span>
            <span>
              <b>{ch.name}</b> scored <b class="pts">{chScore}</b>. Beat it.
            </span>
            <button class="btn pop sm" data-start type="button">
              <Icon name="play" /> Play
            </button>
          </div>
        ) : null}
        <div
          class="stage"
          style={`aspect-ratio:${g.aspect}`}
          data-src={p.playSrc}
          data-title={g.title}
          data-share-url={url}
          data-challenge={ch ? `${ch.name}:${ch.score}` : undefined}
        >
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
                  By{" "}
                  <a href={`/dev/${encodeURIComponent(g.author)}`}>
                    <b>{g.author}</b>
                  </a>
                </span>
              ) : null}
              <span>
                <b>{compactNumber(g.plays)}</b> {g.plays === 1 ? "play" : "plays"}
              </span>
              <span>
                v{g.version}, updated {timeAgo(g.updatedAt)}
              </span>
              {g.community ? <span class="community">Community upload</span> : null}
              {g.reviewsTotal ? (
                <a href="#reviews">
                  <ReviewBadge up={g.reviewsUp} total={g.reviewsTotal} />
                </a>
              ) : null}
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

            <Reviews g={g} reviews={p.reviews ?? []} notice={p.reviewNotice} />

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

            {p.scores.length ? (
              <div>
                <h3>High scores</h3>
                <ol class="scores">
                  {p.scores.map((x, i) => (
                    <li class={i === 0 ? "top" : ""}>
                      <span class="pos">{i + 1}</span>
                      <b>{x.name}</b>
                      <span class="pts">{Math.round(x.score).toLocaleString("en-US")}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {p.achievements?.length ? (
              <div>
                <h3>Achievements</h3>
                <ul class="achievements">
                  {p.achievements.map((a) => {
                    const pct = Math.min(100, Math.round((a.count / Math.max(1, g.plays)) * 100));
                    return (
                      <li title={a.description || a.name}>
                        <span class="trophy">🏆</span>
                        <span>
                          <b>{a.name}</b>
                          {a.description ? <small>{a.description}</small> : null}
                        </span>
                        <span class="pct">{pct < 1 ? "<1" : pct}%</span>
                      </li>
                    );
                  })}
                </ul>
                <p class="sub small">Share of players who unlocked each.</p>
              </div>
            ) : null}

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

            <form class="report" method="post" action={`/api/games/${g.slug}/report`}>
              <input type="hidden" name="reason" value="reported from the game page" />
              <button class="linkbtn" type="submit">
                Report this game
              </button>
            </form>
          </aside>
        </div>

        {p.more?.length ? (
          <section class="more">
            <h2 class="display">Play next</h2>
            <div class="grid">
              {p.more.map((m, i) => (
                <GameCard g={m} i={i} />
              ))}
            </div>
          </section>
        ) : null}
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

export function DeveloperPage(p: { arcade: string; siteUrl: string; name: string; games: Game[] }) {
  const plays = p.games.reduce((n, g) => n + g.plays, 0);
  const up = p.games.reduce((n, g) => n + g.reviewsUp, 0);
  const total = p.games.reduce((n, g) => n + g.reviewsTotal, 0);
  const tools = [...new Set(p.games.flatMap((g) => g.madeWith))];
  return (
    <Layout meta={{ title: `${p.name} | ${p.arcade}`, description: `${p.games.length} games by ${p.name}${tools.length ? `, made with ${tools.join(", ")}` : ""}.`, url: `${p.siteUrl}/dev/${encodeURIComponent(p.name)}`, arcade: p.arcade }}>
      <div class="wrap">
        <section class="dev-head">
          <span class="k">Developer</span>
          <h1 class="display">{p.name}</h1>
          <p class="sub">
            {p.games.length} {p.games.length === 1 ? "game" : "games"} · {compactNumber(plays)} plays
            {total ? (
              <>
                {" · "}
                <ReviewBadge up={up} total={total} long />
              </>
            ) : null}
            {tools.length ? ` · made with ${tools.join(", ")}` : ""}
          </p>
        </section>
        <div class="grid">
          {p.games.map((g, i) => (
            <GameCard g={g} i={i} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
