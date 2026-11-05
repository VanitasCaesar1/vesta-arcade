import { Icon, Layout } from "./layout.tsx";
import type { ArenaEntry, ArenaKind, ArenaModel, ArenaPrompt, Matchup, Side } from "./arena.ts";
import type { Game } from "./db.ts";

const cover = (g: Game) => `/cover/${g.slug}?v=${g.updatedAt}`;
const KIND_LABEL: Record<ArenaKind, string> = { game: "Games", svg: "SVG drawings" };

function Tabs({ kind }: { kind: ArenaKind | "board" }) {
  return (
    <nav class="arena-tabs">
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
          <Tabs kind={p.kind} />
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
                </select>
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
