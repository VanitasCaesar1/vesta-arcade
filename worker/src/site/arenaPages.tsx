import { Icon, Layout } from "./layout.tsx";
import type { ArenaEntry, ArenaModel, ArenaPrompt, Matchup } from "./arena.ts";
import type { Game } from "./db.ts";

const cover = (g: Game) => `/cover/${g.slug}?v=${g.updatedAt}`;

function Stage({ g, label, playSrc }: { g: Game; label: string; playSrc: string }) {
  return (
    <div class="arena-side">
      <div class="arena-label display">{label}</div>
      <div class="stage" style={`aspect-ratio:${g.aspect}`} data-src={playSrc} data-title={label} data-arena={label}>
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

export function ArenaPage(p: { arcade: string; siteUrl: string; m: Matchup | null; playSrc: (g: Game) => string; votes: number; names: string }) {
  const m = p.m;
  return (
    <Layout
      meta={{
        title: `AI Arena: which AI makes better games? | ${p.arcade}`,
        description: `${p.names || "AI models"} each built a game from the same prompt, in one attempt. Play two blind, vote for the more fun one, then see who made which.`,
        url: `${p.siteUrl}/arena`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">AI Arena</span>
          <h1 class="display">Which AI makes the better game?</h1>
          <p class="sub">Same prompt, one attempt each, no human edits. Play both, vote for the more fun one, then see which model made it.</p>
        </header>
        {m ? (
          <>
            <blockquote class="arena-prompt">
              <span class="k">The prompt</span>
              <span>{m.prompt.prompt}</span>
            </blockquote>
            <div class="arena-pair">
              <Stage g={m.a} label="Game A" playSrc={p.playSrc(m.a)} />
              <Stage g={m.b} label="Game B" playSrc={p.playSrc(m.b)} />
            </div>
            <div class="arena-vote" data-matchup={m.token}>
              <p class="sub" data-vote-hint>
                Play both, then vote.
              </p>
              <div class="row">
                <button class="btn pop" data-vote="a" type="button" disabled>
                  A is more fun
                </button>
                <button class="btn" data-vote="tie" type="button" disabled>
                  Tie
                </button>
                <button class="btn pop" data-vote="b" type="button" disabled>
                  B is more fun
                </button>
              </div>
              <div class="arena-reveal" hidden>
                <div class="pair">
                  <div>
                    <span class="k">Game A</span>
                    <b data-reveal="a" />
                    <a data-link="a" href="#">
                      Open game
                    </a>
                  </div>
                  <div>
                    <span class="k">Game B</span>
                    <b data-reveal="b" />
                    <a data-link="b" href="#">
                      Open game
                    </a>
                  </div>
                </div>
                <div class="row">
                  <a class="btn pop" href="/arena">
                    Next matchup
                  </a>
                  <button class="btn" data-share={`${p.siteUrl}/arena`} type="button">
                    <Icon name="share" /> Share the arena
                  </button>
                  <a class="btn" href="/arena/leaderboard">
                    Leaderboard
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p class="sub">The first matchups are being built. Check back soon.</p>
        )}
        <p class="arena-foot">
          <a href="/arena/leaderboard">Leaderboard</a> · {p.votes.toLocaleString("en-US")} votes so far · Every game was made from{" "}
          <a href="https://github.com/VanitasCaesar1/vesta-arcade/blob/main/arena/PROMPTS.md">this prompt file</a>.
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
}) {
  const record = (x: { wins: number; losses: number; ties: number }) => {
    const n = x.wins + x.losses + x.ties;
    return { n, pct: n ? Math.round(((x.wins + x.ties / 2) / n) * 100) : 0 };
  };
  return (
    <Layout
      meta={{
        title: `AI Arena leaderboard: which AI makes the best games? | ${p.arcade}`,
        description: `Blind votes from players on games built by ${p.names || "AI models"} from the same prompts.`,
        url: `${p.siteUrl}/arena/leaderboard`,
        arcade: p.arcade,
      }}
    >
      <div class="wrap arena">
        <header class="arena-head">
          <span class="k">AI Arena</span>
          <h1 class="display">Leaderboard</h1>
          <p class="sub">
            {p.votes.toLocaleString("en-US")} blind votes. Elo ratings, updated on every vote. <a href="/arena">Vote now</a>
          </p>
        </header>
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
            {p.models.map((m, i) => {
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
        {p.models.length ? null : <p class="sub">No votes yet. Be the first.</p>}

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
                      <b>{e.model}</b>
                      <span>
                        {Math.round(e.rating)} · {r.n ? `${r.pct}% of ${r.n} votes` : "no votes yet"}
                      </span>
                      <a href={`/g/${e.slug}`}>Play</a>
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
