import { Icon, Layout } from "./layout.tsx";
import type { ArenaEntry, ArenaKind, ArenaModel, ArenaPrompt, Matchup, Side } from "./arena.ts";
import type { Game } from "./db.ts";

const cover = (g: Game) => `/cover/${g.slug}?v=${g.updatedAt}`;
const KIND_LABEL: Record<ArenaKind, string> = { game: "Games", svg: "SVG drawings" };

function Tabs({ kind }: { kind: ArenaKind | "board" | "daily" }) {
  return (
    <nav class="arena-tabs">
      <a class={kind === "daily" ? "on" : ""} href="/arena/today">
        Daily
      </a>
      <a class={kind === "game" ? "on" : ""} href="/arena">
        Games
      </a>
      <a class={kind === "svg" ? "on" : ""} href="/arena/svg">
        SVG drawings
      </a>
      <a class={kind === "board" ? "on" : ""} href="/arena/leaderboard">
        Leaderboard
      </a>
    </nav>
  );
}

function GameStage({ g, label, playSrc }: { g: Game; label: string; playSrc: string }) {
  return (
    <div class="arena-side">
      <div class="arena-label display">{label}</div>
      <div class="stage" style="aspect-ratio:4/3" data-src={playSrc} data-title={label} data-arena={label}>
        <img class="cover" src={cover(g)} alt="" />
        <button class="start" data-start type="button" aria-label={`Play ${label}`}>
          <span class="btn-play">
            <Icon name="play" />
          </span>
          <span class="title">{label}</span>
          <span class="hint">Press to play</span>
        </button>
      </div>
    </div>
  );
}

function SvgSide({ side, label, playOrigin }: { side: Side; label: string; playOrigin: string }) {
  return (
    <div class="arena-side">
      <div class="arena-label display">{label}</div>
      <div class="arena-svg">
        <img src={`${playOrigin}${side.svg}`} alt={`Drawing ${label}`} width={800} height={600} />
      </div>
    </div>
  );
}

export function ArenaPage(p: {
  arcade: string;
  siteUrl: string;
  kind: ArenaKind;
  m: Matchup | null;
  playSrc: (g: Game) => string;
  playOrigin: string;
  votes: number;
  names: string;
  prompts: ArenaPrompt[];
  submitted?: string;
  promptId?: string;
  counts?: Record<string, number>;
  hot?: number;
  daily?: { date: string; tomorrow: string | null } | null;
}) {
  const m = p.m;
  const isSvg = p.kind === "svg";
  const url = `${p.siteUrl}/arena${isSvg ? "/svg" : ""}`;
  return (
    <Layout
      meta={{
        title: isSvg ? `SVG Arena: which AI draws better? | ${p.arcade}` : `AI Arena: which AI makes better games? | ${p.arcade}`,
        description: isSvg
          ? "Same drawing prompt, different AIs. Pick the better SVG blind, then see which model drew it. Add your own model's drawing."
          : `${p.names || "AI models"} each built a game from the same prompt, in one attempt. Play two blind, vote for the more fun one, then see who made which.`,
        url,
        image: `${p.siteUrl}/arena${isSvg ? "/svg" : ""}/og.jpg`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">AI Arena</span>
          <h1 class="display">{isSvg ? "Which AI draws it better?" : "Which AI makes the better game?"}</h1>
          <p class="sub">
            {isSvg
              ? "Same prompt, different models. Pick the better drawing, then see who made it. Anyone can add their model's drawing."
              : "Same prompt, one attempt each, no human edits. Play both, vote for the more fun one, then see which model made it."}
          </p>
          <Tabs kind={p.daily ? "daily" : p.kind} />
          {p.daily ? (
            <div class="daily" data-daily={p.daily.date}>
              <b>Daily challenge · {p.daily.date}</b>
              <span data-streak />
              {p.daily.tomorrow ? <span class="tomorrow">Tomorrow: "{p.daily.tomorrow}"</span> : null}
            </div>
          ) : null}
          {(p.hot ?? 0) >= 5 ? <p class="hot">🔥 {p.hot} votes in the last hour</p> : null}
        </header>
        {m ? (
          <>
            <blockquote class="arena-prompt">
              <span class="k">The prompt</span>
              <span>{m.prompt.prompt}</span>
            </blockquote>
            <div class="arena-pair">
              {isSvg ? (
                <>
                  <SvgSide side={m.a} label="A" playOrigin={p.playOrigin} />
                  <SvgSide side={m.b} label="B" playOrigin={p.playOrigin} />
                </>
              ) : (
                <>
                  <GameStage g={m.a.game!} label="Game A" playSrc={p.playSrc(m.a.game!)} />
                  <GameStage g={m.b.game!} label="Game B" playSrc={p.playSrc(m.b.game!)} />
                </>
              )}
            </div>
            <div class="arena-vote" data-matchup={m.token} data-kind={p.kind}>
              <p class="sub" data-vote-hint>
                {isSvg ? "Which one is better?" : "Play both, then vote."}
              </p>
              <div class="row">
                <button class="btn pop" data-vote="a" type="button" disabled={!isSvg}>
                  {isSvg ? "A is better" : "A is more fun"}
                </button>
                <button class="btn" data-vote="tie" type="button" disabled={!isSvg}>
                  Tie
                </button>
                <button class="btn pop" data-vote="b" type="button" disabled={!isSvg}>
                  {isSvg ? "B is better" : "B is more fun"}
                </button>
              </div>
              <p class="keys">Keys: 1 or A · 2 or B · T for a tie · N for the next matchup</p>
              <div class="arena-reveal" hidden>
                <div class="crowd">
                  <div class="bar">
                    <span data-bar="a" />
                    <span data-bar="tie" />
                    <span data-bar="b" />
                  </div>
                  <p data-crowd-text />
                </div>
                <div class="pair">
                  <div>
                    <span class="k">{isSvg ? "A" : "Game A"}</span>
                    <b data-reveal="a" />
                    <small data-by="a" />
                    {isSvg ? null : (
                      <a data-link="a" href="#">
                        Open game
                      </a>
                    )}
                  </div>
                  <div>
                    <span class="k">{isSvg ? "B" : "Game B"}</span>
                    <b data-reveal="b" />
                    <small data-by="b" />
                    {isSvg ? null : (
                      <a data-link="b" href="#">
                        Open game
                      </a>
                    )}
                  </div>
                </div>
                <div class="taste">
                  <p data-taste />
                  <div class="badge" data-badge hidden />
                </div>
                <div class="row">
                  <a class="btn pop" href={isSvg ? "/arena/svg" : "/arena"} data-next>
                    Next matchup
                  </a>
                  <button class="btn" data-share={`${p.siteUrl}/arena${isSvg ? "/svg" : ""}`} data-taste-share type="button">
                    <Icon name="share" /> Share my AI taste
                  </button>
                  <button class="btn" data-share={url} data-arena-share type="button">
                    <Icon name="share" /> Challenge a friend
                  </button>
                  <a class="btn" href="/arena/leaderboard">
                    Leaderboard
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p class="sub">The first matchups are being made. Check back soon{isSvg ? ", or add the first drawing below" : ""}.</p>
        )}

        {!isSvg && p.prompts.length ? (
          <section class="arena-submit" id="enter">
            <h2 class="display">Enter your model's game</h2>
            <p class="sub">
              Give your agent one of these prompts and{" "}
              <a href="https://github.com/VanitasCaesar1/vesta-arcade/blob/main/arena/PROMPTS.md">the rules</a> (one HTML file, works on phones, a score at the end), then publish it into the
              arena. No account needed. Community games get their own rating; the model leaderboard only counts the arena's own entries.
            </p>
            <ul class="enter-list">
              {p.prompts.map((pr) => (
                <li>
                  <b>{pr.id}</b>
                  <span>{pr.prompt}</span>
                </li>
              ))}
            </ul>
            <textarea class="code" id="enter-cmd" rows={1} readonly aria-label="Command">
              {`npx vesta-arcade publish --arena ${p.prompts[0]!.id} --model "Your model"`}
            </textarea>
            <button class="btn sm" data-copy="#enter-cmd" data-msg="Command copied" type="button">
              Copy command
            </button>
          </section>
        ) : null}

        {isSvg && p.prompts.length ? (
          <section class="challenges">
            <h2 class="display">All challenges</h2>
            <div class="challenge-grid">
              {p.prompts.map((pr) => (
                <a class="challenge-card" href={`/arena/svg/p/${pr.id}`}>
                  <span class="q">"{pr.prompt}"</span>
                  <span class="meta">
                    {p.counts?.[pr.id] ?? 0} {(p.counts?.[pr.id] ?? 0) === 1 ? "drawing" : "drawings"}
                    {pr.community ? ` · started by ${pr.author || "the community"}` : ""}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {isSvg ? (
          <section class="arena-submit" id="submit">
            <h2 class="display">Add your model's drawing</h2>
            <p class="sub">
              Give one of these prompts to any model, paste the SVG it returns, and it joins the matchups. Community entries get their own rating; the model leaderboard only counts
              drawings the arena made itself, so nobody can stuff it.
            </p>
            {p.submitted ? <div class="notice">{p.submitted}</div> : null}
            <form method="post" action="/api/arena/submit" class="fb">
              <label class="field">
                Prompt
                <select name="prompt" required>
                  {p.prompts.map((pr) => (
                    <option value={pr.id} selected={pr.id === (p.promptId ?? m?.prompt.id)}>
                      {pr.prompt}
                    </option>
                  ))}
                  <option value="__new">+ Start a new challenge with my own prompt…</option>
                </select>
              </label>
              <label class="field">
                New prompt (only if you picked "Start a new challenge")
                <input name="new_prompt" maxlength={140} placeholder="Generate an SVG of a capybara running a startup" />
              </label>
              <div class="row">
                <label class="field">
                  Model
                  <input name="model" maxlength={60} required placeholder="GPT-6 Luna, Llama 5, Qwen 4…" />
                </label>
                <label class="field">
                  Your name (optional)
                  <input name="author" maxlength={40} autocomplete="nickname" />
                </label>
              </div>
              <label class="field">
                SVG
                <textarea name="svg" required rows={6} placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">…</svg>' />
              </label>
              <div class="hp" aria-hidden="true">
                <input name="website" tabindex={-1} autocomplete="off" />
              </div>
              <button class="btn pop" type="submit">
                Add to the arena
              </button>
              <p class="sub">No scripts, external links or images: the SVG must be self-contained, under 100 KB.</p>
            </form>
          </section>
        ) : null}

        <p class="arena-foot">
          <a href="/arena/leaderboard">Leaderboard</a>
          {p.votes >= 10 ? ` · ${p.votes.toLocaleString("en-US")} votes so far` : ""} · The arena's own entries come from{" "}
          <a href={`https://github.com/VanitasCaesar1/vesta-arcade/blob/main/arena/${isSvg ? "SVG_PROMPTS" : "PROMPTS"}.md`}>this prompt file</a>, one attempt each.
        </p>
      </div>
    </Layout>
  );
}

export function ArenaBoardPage(p: {
  names?: string;
  arcade: string;
  siteUrl: string;
  models: ArenaModel[];
  entries: (ArenaEntry & { title: string })[];
  prompts: ArenaPrompt[];
  votes: number;
  playOrigin: string;
}) {
  const record = (x: { wins: number; losses: number; ties: number }) => {
    const n = x.wins + x.losses + x.ties;
    return { n, pct: n ? Math.round(((x.wins + x.ties / 2) / n) * 100) : 0 };
  };
  return (
    <Layout
      meta={{
        title: `AI Arena leaderboard: which AI makes the best games and drawings? | ${p.arcade}`,
        description: `Blind votes from players on games and SVG drawings built by ${p.names || "AI models"} from the same prompts.`,
        url: `${p.siteUrl}/arena/leaderboard`,
        image: `${p.siteUrl}/arena/og.jpg`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">AI Arena</span>
          <h1 class="display">Leaderboard</h1>
          <p class="sub">{p.votes >= 10 ? `${p.votes.toLocaleString("en-US")} blind votes. ` : "Blind votes from players. "}Elo ratings, updated on every vote. Model ratings count only the arena's own entries.</p>
          <Tabs kind="board" />
        </header>
        {(["game", "svg"] as ArenaKind[]).map((kind) => {
          const models = p.models.filter((m) => m.kind === kind);
          return (
            <section class="board-kind">
              <h2 class="display">{KIND_LABEL[kind]}</h2>
              {models.length ? (
                <table class="board">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Model</th>
                      <th>Rating</th>
                      <th>Win rate</th>
                      <th>Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m, i) => {
                      const r = record(m);
                      return (
                        <tr class={i === 0 ? "top" : ""}>
                          <td>{i + 1}</td>
                          <td>
                            <b>{m.model}</b> <small>{m.lab}</small>
                          </td>
                          <td>{Math.round(m.rating)}</td>
                          <td>{r.n ? `${r.pct}%` : "–"}</td>
                          <td>{r.n}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p class="sub">
                  No votes yet. <a href={kind === "svg" ? "/arena/svg" : "/arena"}>Be the first.</a>
                </p>
              )}
            </section>
          );
        })}

        {p.prompts.map((pr) => {
          const es = p.entries.filter((e) => e.prompt === pr.id);
          if (!es.length) return null;
          return (
            <section class="board-prompt">
              <h2 class="display">{pr.title}</h2>
              <p class="sub">"{pr.prompt}"</p>
              <ul>
                {es.map((e) => {
                  const r = record(e);
                  return (
                    <li>
                      <b>
                        {e.model}
                        {e.community ? <small class="community"> community{e.author ? `, by ${e.author}` : ""}</small> : null}
                      </b>
                      <span>
                        {Math.round(e.rating)} · {r.n ? `${r.pct}% of ${r.n} votes` : "no votes yet"}
                      </span>
                      {e.kind === "svg" ? (
                        <a href={`${p.playOrigin}/${e.file_key}`} rel="nofollow">
                          View
                        </a>
                      ) : (
                        <a href={`/g/${e.slug}`}>Play</a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Layout>
  );
}

export function PromptGalleryPage(p: {
  arcade: string;
  siteUrl: string;
  playOrigin: string;
  prompt: ArenaPrompt;
  entries: ArenaEntry[];
  submitted?: string;
}) {
  const url = `${p.siteUrl}/arena/svg/p/${p.prompt.id}`;
  const models = new Set(p.entries.map((e) => e.model.split(" ")[0])).size;
  return (
    <Layout
      meta={{
        title: `"${p.prompt.prompt}": ${p.entries.length} AI drawings | ${p.arcade}`,
        description: `${p.entries.length} drawings of the same prompt by ${models} AI ${models === 1 ? "model" : "models"}, rated by blind votes. Add yours.`,
        url,
        image: `${p.siteUrl}/arena/svg/og.jpg`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">{p.prompt.community ? `Community challenge${p.prompt.author ? ` by ${p.prompt.author}` : ""}` : "SVG challenge"}</span>
          <h1 class="display gallery-q">"{p.prompt.prompt}"</h1>
          <p class="sub">
            {p.entries.length} {p.entries.length === 1 ? "drawing" : "drawings"}, best rated first. Ratings come from blind votes.
          </p>
          <div class="row gallery-actions">
            <a class="btn pop" href={`/arena/svg?p=${p.prompt.id}`}>
              Judge them blind
            </a>
            <a class="btn" href={`/arena/svg?p=${p.prompt.id}#submit`}>
              Add your model's drawing
            </a>
            <button class="btn" data-share={url} data-share-text={`Can your AI draw this? "${p.prompt.prompt}" ${p.entries.length} tries so far:`} type="button">
              <Icon name="share" /> Share this challenge
            </button>
          </div>
          {p.submitted ? <div class="notice">{p.submitted}</div> : null}
          <button class="linkbtn" data-toggle="#embed" type="button">
            <Icon name="code" /> Embed a live matchup on your site
          </button>
          <div class="embed" id="embed" hidden>
            <textarea class="code" id="embed-code" rows={3} readonly aria-label="Embed code">
              {`<iframe src="${p.siteUrl}/embed/arena?p=${p.prompt.id}" width="720" height="520" style="border:0;max-width:100%" loading="lazy" title="AI Arena: ${p.prompt.prompt.replace(/"/g, "")}"></iframe>`}
            </textarea>
            <button class="btn sm" data-copy="#embed-code" data-msg="Embed code copied" type="button">
              Copy embed code
            </button>
          </div>
          <Tabs kind="svg" />
        </header>
        <div class="gallery">
          {p.entries.map((e, i) => {
            const n = e.wins + e.losses + e.ties;
            return (
              <figure class="gallery-item">
                <a class="arena-svg" href={`/arena/e/${e.slug}`}>
                  <img src={`${p.playOrigin}/${e.file_key}`} alt={`${e.model}'s drawing`} loading="lazy" width={800} height={600} />
                </a>
                <figcaption>
                  <b>
                    #{i + 1} {e.model}
                  </b>
                  <span>
                    {e.community ? `community${e.author ? `, by ${e.author}` : ""}` : "made by the arena, one attempt"} · {n ? `${Math.round(((e.wins + e.ties / 2) / n) * 100)}% of ${n} votes` : "no votes yet"}
                  </span>
                  <button class="linkbtn" data-report-entry={e.slug} type="button">
                    Report
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export function EntryPage(p: { arcade: string; siteUrl: string; playOrigin: string; entry: ArenaEntry; prompt: ArenaPrompt; rank: number; total: number; submitted?: string }) {
  const e = p.entry;
  const url = `${p.siteUrl}/arena/e/${e.slug}`;
  const n = e.wins + e.losses + e.ties;
  const by = e.community ? `${e.model}${e.author ? `, entered by ${e.author}` : ""}` : `${e.model} (${e.lab}), one attempt`;
  const shareText = `${e.model} drew this for "${p.prompt.prompt}" and it's ranked #${p.rank} of ${p.total} in blind votes. Think yours can beat it?`;
  return (
    <Layout
      meta={{
        title: `${e.model}: "${p.prompt.prompt}" (#${p.rank} of ${p.total}) | ${p.arcade}`,
        description: `Ranked #${p.rank} of ${p.total} drawings in blind votes. Judge the rest, or add your own model's drawing.`,
        url,
        image: `${p.siteUrl}/arena/svg/og.jpg`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">#{p.rank} of {p.total}</span>
          <h1 class="display gallery-q">"{p.prompt.prompt}"</h1>
          <p class="sub">
            By {by}. {n ? `Won ${Math.round(((e.wins + e.ties / 2) / n) * 100)}% of ${n} blind votes.` : "No votes yet: it's waiting for its first matchup."}
          </p>
          {p.submitted ? <div class="notice">{p.submitted}</div> : null}
        </header>
        <div class="entry-big arena-svg">
          <img src={`${p.playOrigin}/${e.file_key}`} alt={`${e.model}'s drawing`} width={800} height={600} />
        </div>
        <div class="row gallery-actions">
          <button class="btn pop" data-share={url} data-share-text={shareText} type="button">
            <Icon name="share" /> Share it
          </button>
          <a class="btn" href={`/arena/svg?p=${p.prompt.id}`}>
            Judge this challenge
          </a>
          <a class="btn" href={`/arena/svg/p/${p.prompt.id}`}>
            See all {p.total}
          </a>
          <a class="btn" href={`/arena/svg?p=${p.prompt.id}#submit`}>
            Add your model's
          </a>
        </div>
      </div>
    </Layout>
  );
}

/** A compact, votable SVG matchup for other sites to iframe. */
export function ArenaEmbedPage(p: { arcade: string; siteUrl: string; m: Matchup | null; playOrigin: string; promptId?: string }) {
  const m = p.m;
  const next = `/embed/arena${p.promptId ? `?p=${p.promptId}` : ""}`;
  return (
    <Layout meta={{ title: `AI Arena | ${p.arcade}`, description: "Which AI draws it better? Vote blind.", url: `${p.siteUrl}/arena/svg`, arcade: p.arcade, noindex: true }} bare>
      <div class="arena embed-arena">
        {m ? (
          <>
            <p class="embed-q">
              <a href={`${p.siteUrl}/arena/svg`} target="_blank" rel="noopener">
                AI Arena
              </a>{" "}
              · "{m.prompt.prompt}"
            </p>
            <div class="arena-pair">
              <SvgSide side={m.a} label="A" playOrigin={p.playOrigin} />
              <SvgSide side={m.b} label="B" playOrigin={p.playOrigin} />
            </div>
            <div class="arena-vote" data-matchup={m.token} data-kind="svg">
              <p class="sub" data-vote-hint>
                Which one is better?
              </p>
              <div class="row">
                <button class="btn pop sm" data-vote="a" type="button">
                  A
                </button>
                <button class="btn sm" data-vote="tie" type="button">
                  Tie
                </button>
                <button class="btn pop sm" data-vote="b" type="button">
                  B
                </button>
              </div>
              <div class="arena-reveal" hidden>
                <div class="crowd">
                  <div class="bar">
                    <span data-bar="a" />
                    <span data-bar="tie" />
                    <span data-bar="b" />
                  </div>
                  <p data-crowd-text />
                </div>
                <div class="pair">
                  <div>
                    <span class="k">A</span>
                    <b data-reveal="a" />
                  </div>
                  <div>
                    <span class="k">B</span>
                    <b data-reveal="b" />
                  </div>
                </div>
                <div class="row">
                  <a class="btn pop sm" href={next} data-next>
                    Next
                  </a>
                  <a class="btn sm" href={`${p.siteUrl}/arena/svg`} target="_blank" rel="noopener">
                    More on Vesta
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p class="sub">No matchups yet.</p>
        )}
      </div>
    </Layout>
  );
}
