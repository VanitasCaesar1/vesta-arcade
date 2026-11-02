import { duration, type FeedbackReport, type Game } from "./db.ts";
import { compactNumber, timeAgo } from "../lib/util.ts";
import { Layout } from "./layout.tsx";

export function LoginPage(p: { arcade: string; siteUrl: string; error?: boolean; configured: boolean }) {
  return (
    <Layout meta={{ title: `Dashboard · ${p.arcade}`, description: "", url: `${p.siteUrl}/admin`, arcade: p.arcade, noindex: true }}>
      <div class="wrap">
        <div class="login">
          <h1 class="display">Dashboard</h1>
          {p.configured ? (
            <>
              <p>Paste your arcade token. It's in ~/.config/vesta/config.json on the machine that ran setup.</p>
              {p.error ? <div class="notice err">That token didn't match.</div> : null}
              <form class="login" method="post" action="/api/session" style="margin:0">
                <label class="field">
                  Arcade token
                  <input name="token" type="password" autocomplete="current-password" required autofocus />
                </label>
                <button class="btn pop" type="submit">
                  Sign in
                </button>
              </form>
            </>
          ) : (
            <div class="notice err">
              This arcade has no ADMIN_TOKEN yet. Run <code>npx vesta-cli setup</code>, or set the secret with <code>wrangler secret put ADMIN_TOKEN</code>.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export interface GameSummary extends Game {
  spark: number[];
  avgSeconds: number;
  errorCount: number;
  commentCount: number;
}

function Spark({ values, w = 120, h = 28 }: { values: number[]; w?: number; h?: number }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg class="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="currentColor" fill-opacity=".14" stroke="none" />
      <polyline points={pts} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
  );
}

export function DashboardPage(p: { arcade: string; siteUrl: string; games: GameSummary[] }) {
  const plays14 = p.games.reduce((s, g) => s + g.spark.reduce((a, b) => a + b, 0), 0);
  const errors = p.games.reduce((s, g) => s + g.errorCount, 0);
  const comments = p.games.reduce((s, g) => s + g.commentCount, 0);
  return (
    <Layout meta={{ title: `Dashboard · ${p.arcade}`, description: "", url: `${p.siteUrl}/admin`, arcade: p.arcade, noindex: true }}>
      <div class="wrap">
        <div class="dash-head">
          <div>
            <h1 class="display">Dashboard</h1>
            <div class="byline">Last 14 days across your arcade</div>
          </div>
          <form method="post" action="/api/session/end">
            <button class="btn sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
        <div class="kpis">
          <div class="kpi">
            <b>{p.games.length}</b>
            <small>games</small>
          </div>
          <div class="kpi">
            <b>{compactNumber(plays14)}</b>
            <small>plays</small>
          </div>
          <div class="kpi">
            <b class={errors ? "bad" : ""}>{compactNumber(errors)}</b>
            <small>distinct errors on live versions</small>
          </div>
          <div class="kpi">
            <b>{compactNumber(comments)}</b>
            <small>player comments</small>
          </div>
        </div>
        <div class="ai">
          <p>
            Close the loop from your editor: <code>claude mcp add vesta -- npx -y vesta-cli mcp</code>, then ask
            <em> "read the Vesta feedback for my game and fix the top error."</em>
          </p>
        </div>
        {p.games.length ? (
          <table class="games">
            <thead>
              <tr>
                <th>Game</th>
                <th>14 days</th>
                <th style="text-align:right">Plays</th>
                <th style="text-align:right">Avg session</th>
                <th style="text-align:right">Errors</th>
                <th style="text-align:right">Comments</th>
                <th style="text-align:right">Live</th>
              </tr>
            </thead>
            <tbody>
              {p.games.map((g) => (
                <tr>
                  <td>
                    <a href={`/admin/g/${g.slug}`}>{g.title}</a>
                    {g.hidden ? <small class="muted"> · hidden</small> : null}
                  </td>
                  <td>
                    <Spark values={g.spark} />
                  </td>
                  <td class="n">{compactNumber(g.plays)}</td>
                  <td class="n">{g.avgSeconds ? duration(g.avgSeconds) : "–"}</td>
                  <td class={`n${g.errorCount ? " bad" : ""}`}>{g.errorCount}</td>
                  <td class="n">{g.commentCount}</td>
                  <td class="n">
                    v{g.version} · {timeAgo(g.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div class="empty">
            <h2 class="display" style="margin:0 0 8px">No games yet</h2>
            <p class="muted">Run <code class="mono">npx vesta-cli publish</code> in a game's folder.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function PlaysChart({ daily }: { daily: FeedbackReport["daily"] }) {
  const w = 720;
  const h = 160;
  const max = Math.max(1, ...daily.map((d) => d.plays));
  const bw = w / daily.length;
  return (
    <svg class="chart" viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label="Plays per day">
      {daily.map((d, i) => {
        const bh = Math.max(d.plays ? 3 : 1, (d.plays / max) * h);
        return (
          <g>
            <rect x={i * bw + 3} y={h - bh} width={bw - 6} height={bh} rx="3" fill="currentColor" fill-opacity={d.plays ? 1 : 0.15} style="color:var(--accent)">
              <title>
                {d.day}: {d.plays} plays, {d.errors} errors
              </title>
            </rect>
            {i % Math.ceil(daily.length / 7) === 0 ? (
              <text x={i * bw + bw / 2} y={h + 16} fill="currentColor" style="color:var(--dim)" font-size="11" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace">
                {d.day.slice(5)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div class="bars">
      {rows.map((r) => (
        <div class="r">
          <span title={r.label}>{r.label}</span>
          <div class="fill" style={`width:${Math.max(2, (r.value / max) * 100).toFixed(1)}%`} />
          <span>{r.display}</span>
        </div>
      ))}
    </div>
  );
}

export function GameDashboardPage(p: { arcade: string; siteUrl: string; report: FeedbackReport }) {
  const r = p.report;
  const g = r.game;
  const sessions = r.dropoff.reduce((s, b) => s + b.count, 0);
  return (
    <Layout meta={{ title: `${g.title} · Dashboard`, description: "", url: `${p.siteUrl}/admin/g/${g.slug}`, arcade: p.arcade, noindex: true }}>
      <div class="wrap">
        <div class="dash-head">
          <div>
            <a class="muted" href="/admin" style="font-size:14px">Dashboard</a>
            <h1 class="display">{g.title}</h1>
            <div class="byline">
              <a href={`/g/${g.slug}`}>/g/{g.slug}</a>
              <span class="dot">·</span>
              <span>live v{g.version}</span>
              {g.hidden ? <span class="tool">Hidden from the arcade</span> : null}
            </div>
          </div>
          <div class="actions">
            <button class="btn pop" data-admin="report" data-slug={g.slug} type="button">
              Copy report for your AI
            </button>
            <button class="btn" data-admin={g.hidden ? "show" : "hide"} data-slug={g.slug} type="button">
              {g.hidden ? "Show in arcade" : "Hide from arcade"}
            </button>
            <button class="btn danger" data-admin="delete" data-slug={g.slug} type="button">
              Delete
            </button>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <b>{compactNumber(r.totals.plays)}</b>
            <small>plays, {r.days} days</small>
          </div>
          <div class="kpi">
            <b>{duration(r.totals.avgSeconds)}</b>
            <small>average active play</small>
          </div>
          <div class="kpi">
            <b class={r.errors.length ? "bad" : ""}>{r.errors.length}</b>
            <small>distinct errors on v{g.version}</small>
          </div>
          <div class="kpi">
            <b>{compactNumber(g.likes)}</b>
            <small>likes</small>
          </div>
        </div>

        <div class="panel" style="margin-bottom:16px">
          <h3>Plays per day</h3>
          <PlaysChart daily={r.daily} />
        </div>

        <div class="grid2">
          <div class="panel">
            <h3>How long sessions last (v{g.version})</h3>
            {sessions ? (
              <Bars rows={r.dropoff.map((b) => ({ label: b.bucket, value: b.count, display: `${Math.round((b.count / sessions) * 100)}%` }))} />
            ) : (
              <p class="muted">No finished sessions yet.</p>
            )}
          </div>
          <div class="panel">
            <h3>Milestones (v{g.version})</h3>
            {r.milestones.length ? (
              <Bars rows={r.milestones.map((m) => ({ label: m.name, value: m.count, display: `${Math.round(m.share * 100)}%` }))} />
            ) : (
              <p class="muted" style="font-size:14px">
                Call <code>window.vesta?.milestone("level-2")</code> in your game to see how far players get.
              </p>
            )}
          </div>
        </div>

        <section class="dash-section">
          <h2 class="display">Errors on v{g.version}</h2>
          <p class="sub">Grouped by message and location. Click one to see the stack.</p>
          {r.errors.length ? (
            r.errors.map((e) => (
              <details class="err">
                <summary>
                  <b>{e.count}×</b>
                  <span>
                    {e.kind}: {e.message}
                    {e.source ? ` (${e.source}${e.line ? `:${e.line}` : ""})` : ""}
                  </span>
                  <small>{timeAgo(e.last_seen)}</small>
                </summary>
                <pre>{[e.stack || "(no stack)", "", e.user_agent].join("\n")}</pre>
              </details>
            ))
          ) : (
            <p class="muted">None reported.</p>
          )}
          {r.olderErrors.length ? (
            <>
              <h3 class="muted" style="font-size:14px;margin:20px 0 10px">
                From older versions
              </h3>
              {r.olderErrors.map((e) => (
                <details class="err">
                  <summary>
                    <b>v{e.version}</b>
                    <span>
                      {e.kind}: {e.message}
                    </span>
                    <small>{e.count}×</small>
                  </summary>
                  <pre>{e.stack || "(no stack)"}</pre>
                </details>
              ))}
            </>
          ) : null}
        </section>

        <section class="dash-section">
          <h2 class="display">What players said</h2>
          <ul class="comments">
            {r.comments.map((c) => (
              <li>
                <p>{c.body}</p>
                <small>
                  {c.name || "Anonymous"} · v{c.version} · {timeAgo(c.created_at)} ·{" "}
                  <a href="#" data-admin="comment" data-id={String(c.id)} data-hidden={String(c.hidden)}>
                    {c.hidden ? "unhide" : "hide"}
                  </a>
                </small>
              </li>
            ))}
          </ul>
          {r.comments.length ? null : <p class="muted">No comments yet.</p>}
        </section>
      </div>
    </Layout>
  );
}
