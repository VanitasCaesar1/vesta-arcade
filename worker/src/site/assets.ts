// Static assets served by the site Worker. Inlined so a deploy is one script
// with no build step and no asset bucket.
import { ARCHIVO, GEIST, GEIST_MONO } from "./fonts.ts";

const decode = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
let fonts: { sans: Uint8Array<ArrayBuffer>; mono: Uint8Array<ArrayBuffer>; display: Uint8Array<ArrayBuffer> } | null = null;
export function fontFiles() {
  return (fonts ??= { sans: decode(GEIST), mono: decode(GEIST_MONO), display: decode(ARCHIVO) });
}

// Brand: the Vesta mascot. Monochrome charcoal and paper, one signal-yellow
// pop for anything you can play. Shape rule: square corners everywhere; circles
// are reserved for the mascot and play buttons. Archivo (expanded, black) for
// display, Geist for text, Geist Mono for numbers.
export const STYLE = String.raw`
@font-face { font-family: "Archivo"; src: url(/static/archivo.woff2) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; font-display: swap; }
@font-face { font-family: "Geist"; src: url(/static/geist.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Geist Mono"; src: url(/static/geist-mono.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }

:root {
  color-scheme: light dark;
  --bg: #f2f2ee; --surface: #ffffff; --fg: #1b1b1b; --muted: #57575a; --dim: #8a8a8c; --line: #1b1b1b; --hair: #d6d6d0;
  --pop: #ffd60a; --pop-ink: #161616; --cab: #212121; --cab-fg: #f2f2ee; --cab-muted: #b9b9b6; --cab-line: #3b3b3b;
  --ok: #157a3c; --bad: #c4231c;
  --display: "Archivo", "Arial Black", ui-sans-serif, system-ui, sans-serif;
  --sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #131313; --surface: #1b1b1b; --fg: #f2f2ee; --muted: #a9a9a6; --dim: #6f6f6f; --line: #3d3d3d; --hair: #272727;
    --cab: #1d1d1d; --cab-line: #333;
    --ok: #4ade80; --bad: #ff6b5e;
  }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--sans); -webkit-font-smoothing: antialiased; }
body { margin: 0; min-height: 100dvh; display: flex; flex-direction: column; }
main { flex: 1; }
a { color: inherit; text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
::selection { background: var(--pop); color: var(--pop-ink); }
:focus-visible { outline: 3px solid var(--pop); outline-offset: 2px; }
.i { width: 18px; height: 18px; display: inline-block; vertical-align: -3px; flex: none; }
.i svg { width: 100%; height: 100%; display: block; }
.mono { font-family: var(--mono); font-feature-settings: "zero"; }
.muted { color: var(--muted); }
.wrap { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 640px) { .wrap { padding: 0 16px; } }
.display { font-family: var(--display); font-stretch: 112%; font-weight: 900; text-transform: uppercase; letter-spacing: -.005em; word-spacing: .14em; line-height: .95; }

/* mascot */
.mascot { display: inline-block; line-height: 0; --m-face: var(--fg); --m-ink: var(--bg); }
.cab .mascot { --m-face: #ffffff; --m-ink: #262626; }
.mascot svg { width: 100%; height: auto; display: block; }
.mascot .mouth { display: none; }
.mascot[data-mouth=dash] .mouth-dash, .mascot[data-mouth=o] .mouth-o, .mascot[data-mouth=smile] .mouth-smile, .mascot[data-mouth=flat] .mouth-flat { display: inline; }
.mascot .pupil { transform-box: fill-box; transform-origin: center; transition: scale .18s cubic-bezier(.3,1.6,.6,1); }
.mascot[data-mood=excited] .pupil { scale: 1.3; }
@media (prefers-reduced-motion: no-preference) {
  .mascot[data-live] .eyes { transform-box: fill-box; transform-origin: center; animation: blink 7s infinite; }
  @keyframes blink { 0%, 95%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.08); } }
}

/* nav */
.nav { height: 64px; display: flex; align-items: center; gap: 22px; }
.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.brand .mascot { width: 30px; }
.brand b { font-family: var(--display); font-stretch: 125%; font-weight: 900; font-size: 17px; letter-spacing: .02em; text-transform: uppercase; white-space: nowrap; }
@media (max-width: 420px) { .brand b { font-size: 14px; font-stretch: 105%; } }
.nav .sp { flex: 1; }
.nav a.link { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; }
.nav a.link:hover { color: var(--fg); }
.nav .gh { display: inline-flex; color: var(--muted); }
.nav .gh:hover { color: var(--fg); }
@media (max-width: 640px) { .nav a.link { display: none; } .nav { gap: 14px; } }

/* buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; height: 42px; padding: 0 16px; border: 2px solid var(--fg); border-radius: 0;
  background: transparent; color: var(--fg); font: 800 13px/1 var(--display); font-stretch: 112%; text-transform: uppercase; letter-spacing: .03em;
  cursor: pointer; text-decoration: none; white-space: nowrap; transition: transform .08s, box-shadow .08s, background .15s; }
.btn:hover { background: var(--fg); color: var(--bg); }
.btn .i { width: 16px; height: 16px; }
.btn.pop { background: var(--pop); color: var(--pop-ink); border-color: var(--pop-ink); box-shadow: 4px 4px 0 var(--pop-ink); }
.btn.pop:hover { background: var(--pop); color: var(--pop-ink); transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--pop-ink); }
.btn.pop:active { transform: translate(4px, 4px); box-shadow: 0 0 0 var(--pop-ink); }
.btn.sm { height: 34px; padding: 0 12px; font-size: 12px; }
.btn.lg { height: 52px; padding: 0 22px; font-size: 15px; }
.btn.block { width: 100%; }
.btn.liked { background: var(--pop); color: var(--pop-ink); border-color: var(--pop-ink); }
.btn .on { display: none; } .btn.liked .on { display: inline-block; } .btn.liked .off { display: none; }
.btn.danger:hover { background: var(--bad); border-color: var(--bad); color: #fff; }
.btn[disabled] { opacity: .6; cursor: default; }
.cab .btn:not(.pop) { color: var(--cab-fg); border-color: var(--cab-fg); }
.cab .btn.pop { box-shadow: 4px 4px 0 #000; }
.cab .btn.pop:hover { box-shadow: 5px 5px 0 #000; }

/* home: the cabinet (hero) */
.cab { background: var(--cab); color: var(--cab-fg); }
.hero { display: grid; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr); gap: 40px; align-items: center; padding-top: 56px; padding-bottom: 64px; }
.hero h1 { font-size: clamp(34px, 5vw, 66px); margin: 0 0 24px; }
.hero h1 span.l { display: block; }
.hero h1 .mark { background: var(--pop); color: var(--pop-ink); padding: 0 .1em; margin-left: -.05em; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.hero .lede { font-size: 18px; color: var(--cab-muted); margin: 0 0 32px; max-width: 40ch; }
.hero .cta { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
.hero .cta a.text { color: var(--cab-fg); font-weight: 600; font-size: 15px; }
.hero .host { justify-self: center; width: min(400px, 100%); }
@media (max-width: 900px) {
  .hero { grid-template-columns: minmax(0, 1fr); padding-top: 28px; padding-bottom: 40px; gap: 8px; }
  .hero .host { grid-row: 1; width: 132px; justify-self: start; margin-bottom: 18px; }
}

/* home: the floor */
.floor { padding: 48px 0 72px; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.head h2 { font-size: clamp(26px, 3vw, 36px); margin: 0; }
.tabs { display: flex; gap: 18px; flex-wrap: wrap; }
.tabs a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 550; padding: 4px 0; border-bottom: 2px solid transparent; }
.tabs a:hover { color: var(--fg); }
.tabs a.on { color: var(--fg); border-bottom-color: var(--fg); }
.tabs small { font-family: var(--mono); font-size: 11px; color: var(--dim); margin-left: 3px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 36px 26px; }
.card { display: block; text-decoration: none; }
.card .art { aspect-ratio: 16/9; border: 2px solid var(--line); background: var(--cab); overflow: hidden; transition: transform .12s, box-shadow .12s; }
.card .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card:hover .art { transform: translate(-4px, -4px); box-shadow: 6px 6px 0 var(--pop); }
.card h3 { font-size: 16px; font-weight: 650; letter-spacing: -.01em; margin: 14px 0 3px; }
.card .meta { font: 500 12px var(--mono); color: var(--dim); text-transform: uppercase; letter-spacing: .02em; display: flex; gap: 8px; flex-wrap: wrap; }
.card .meta span + span::before { content: "/"; margin-right: 8px; color: var(--hair); }
.card .meta b { color: var(--fg); font-weight: 600; }
.slot { border: 2px dashed var(--line); aspect-ratio: 16/9; padding: 18px; display: grid; grid-template-columns: 64px 1fr; grid-template-rows: 1fr auto; gap: 12px 16px; align-items: start; }
.slot .mascot { width: 64px; filter: drop-shadow(0 0 0 transparent); }
.slot b { font-family: var(--display); font-stretch: 112%; font-weight: 900; text-transform: uppercase; font-size: 17px; display: block; margin-top: 4px; }
.slot p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
.slot .cmd { grid-column: 1 / -1; }
.cmd { min-width: 0; display: flex; align-items: center; gap: 10px; justify-content: space-between; background: var(--cab); color: var(--cab-fg); padding: 10px 10px 10px 14px; font: 500 13px var(--mono); }
.cmd code { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd code::before { content: "$ "; color: var(--pop); }
.cmd button { border: 0; background: transparent; color: var(--cab-muted); cursor: pointer; padding: 4px; display: inline-flex; }
.cmd button:hover { color: var(--pop); }
.cmd button .i { width: 15px; height: 15px; }

/* home: the loop */
.loop { border-top: 2px solid var(--line); padding: 64px 0 72px; }
.loop h2 { font-size: clamp(30px, 4vw, 54px); margin: 0 0 16px; }
.loop .lead { color: var(--muted); font-size: 17px; max-width: 54ch; margin: 0 0 32px; }
.bento { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); grid-template-rows: auto auto; gap: 16px; }
.term { grid-row: 1 / 3; background: var(--cab); color: #e8e8e4; padding: 22px 24px; min-width: 0; border: 2px solid var(--line); }
.term .live { display: inline-flex; gap: 8px; align-items: center; font: 600 11.5px var(--mono); text-transform: uppercase; letter-spacing: .08em; color: #b9b9b6; margin-bottom: 14px; }
.term .live i { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 0 rgba(74,222,128,.6); }
@media (prefers-reduced-motion: no-preference) { .term .live i { animation: ping 2s infinite; } @keyframes ping { 70% { box-shadow: 0 0 0 7px rgba(74,222,128,0); } } }
.term pre { margin: 0; font: 13.5px/1.65 var(--mono); white-space: pre-wrap; word-break: break-word; }
.term .p { color: #8a8a8c; } .term .y { color: var(--pop); } .term .h { color: #fff; font-weight: 700; } .term .r { color: #ff8a80; } .term .g { color: #4ade80; } .term .a { color: var(--pop); }
.stat { background: var(--pop); color: var(--pop-ink); padding: 24px; display: flex; flex-direction: column; justify-content: flex-end; min-height: 170px; border: 2px solid var(--pop-ink); }
.stat b { font: 900 clamp(56px, 7vw, 92px)/.9 var(--display); font-stretch: 112%; letter-spacing: -.02em; }
.stat span { font: 600 13px var(--mono); text-transform: uppercase; letter-spacing: .04em; margin-top: 10px; }
.quote { border: 2px solid var(--line); padding: 22px 24px; text-decoration: none; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; background: var(--surface); }
.quote:hover { box-shadow: 6px 6px 0 var(--pop); transform: translate(-3px, -3px); }
.quote { transition: transform .12s, box-shadow .12s; }
.quote p { margin: 0; font-size: 19px; line-height: 1.4; font-weight: 550; letter-spacing: -.01em; }
.quote span { font: 500 12px var(--mono); color: var(--dim); text-transform: uppercase; letter-spacing: .03em; }
@media (max-width: 900px) { .bento { grid-template-columns: minmax(0, 1fr); } .term { grid-row: auto; } }

.make { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: start; border-top: 2px solid var(--line); padding: 64px 0 80px; }
.make h2 { font-size: clamp(30px, 3.6vw, 48px); margin: 0 0 18px; }
.make p { color: var(--muted); margin: 0 0 26px; max-width: 44ch; font-size: 16px; }
.make .steps { display: grid; gap: 18px; }
.make .steps span { display: block; font: 600 12px var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 7px; }
@media (max-width: 900px) { .make { grid-template-columns: minmax(0, 1fr); gap: 32px; padding: 48px 0; } }

/* game page */
.stage { position: relative; width: 100%; max-height: 76vh; margin: 8px auto 0; overflow: hidden; background: var(--cab); border: 2px solid var(--line); isolation: isolate; }
.stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: #000; }
.stage .cover { position: absolute; inset: -40px; width: calc(100% + 80px); height: calc(100% + 80px); object-fit: cover; filter: blur(14px) saturate(1.15) brightness(.5); z-index: -1; }
.stage .start { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 18px; cursor: pointer; border: 0; background: transparent; color: #f2f2ee; font: inherit; width: 100%; }
.stage .start .btn-play { width: 92px; height: 92px; border-radius: 50%; background: var(--pop); color: var(--pop-ink); border: 2px solid var(--pop-ink); display: grid; place-items: center; box-shadow: 5px 5px 0 var(--pop-ink); transition: transform .08s, box-shadow .08s; }
.stage .start .btn-play .i { width: 36px; height: 36px; margin-left: 5px; }
.stage .start:hover .btn-play { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--pop-ink); }
.stage .start:active .btn-play { transform: translate(5px, 5px); box-shadow: 0 0 0 var(--pop-ink); }
.stage .start .title { font-family: var(--display); font-stretch: 112%; font-weight: 900; text-transform: uppercase; font-size: clamp(22px, 3.4vw, 40px); text-shadow: 0 2px 20px rgba(0,0,0,.5); }
.stage .start .hint { font: 500 12px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: rgba(242,242,238,.75); display: inline-flex; gap: 8px; align-items: center; }
.stage .start .hint .i { width: 15px; height: 15px; }
.stage:fullscreen { max-height: none; border: 0; }

.game { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 56px; margin: 32px 0 80px; }
@media (max-width: 900px) { .game { grid-template-columns: minmax(0, 1fr); gap: 32px; } .game .side { display: contents; } .game .side > :first-child { order: -1; } }
.game h1 { font-size: clamp(32px, 4.2vw, 56px); margin: 0 0 14px; }
.byline { font: 500 12px var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--muted); display: flex; gap: 6px 18px; flex-wrap: wrap; }
.byline b { color: var(--fg); font-weight: 600; }
.tools { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.tool { display: inline-flex; align-items: center; height: 26px; padding: 0 9px; border: 1.5px solid var(--fg); font: 600 12px var(--mono); text-transform: uppercase; letter-spacing: .03em; text-decoration: none; }
.tool:hover { background: var(--pop); color: var(--pop-ink); border-color: var(--pop-ink); }
.desc { font-size: 16.5px; white-space: pre-wrap; margin: 24px 0 0; max-width: 66ch; }
.feedback { margin-top: 48px; padding-top: 36px; border-top: 2px solid var(--line); }
.feedback h2 { font-size: 26px; margin: 0 0 8px; }
.feedback .sub { color: var(--muted); font-size: 14.5px; margin: 0 0 20px; max-width: 56ch; }
label.field { display: grid; gap: 7px; font: 600 12px var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
textarea, input[type=text], input[type=password], input:not([type]) { width: 100%; background: var(--surface); border: 2px solid var(--line); border-radius: 0; color: var(--fg); font: 15px/1.5 var(--sans); padding: 10px 12px; text-transform: none; letter-spacing: 0; }
textarea { min-height: 104px; resize: vertical; }
textarea::placeholder, input::placeholder { color: var(--dim); }
textarea:focus, input:focus { outline: none; box-shadow: 4px 4px 0 var(--pop); }
form.fb { display: grid; gap: 14px; }
form.fb .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: end; }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.more { margin: 56px 0 24px; }
.arena-strip { display: grid; grid-template-columns: auto auto 1fr auto; gap: 14px; align-items: center; margin: 22px 0 0; padding: 14px 18px; border: 2px solid var(--line); box-shadow: 5px 5px 0 var(--pop); text-decoration: none; color: inherit; }
.arena-strip:hover { transform: translate(-1px, -1px); box-shadow: 6px 6px 0 var(--pop); }
.arena-strip .k { font: 600 11px var(--mono); letter-spacing: .14em; text-transform: uppercase; background: var(--pop); color: var(--pop-ink); padding: 3px 7px; }
.arena-strip b { font-size: 24px; }
.arena-strip .go { font-weight: 700; text-decoration: underline; }
@media (max-width: 700px) { .arena-strip { grid-template-columns: auto 1fr; } .arena-strip span:nth-of-type(2) { grid-column: 1 / -1; } }
.arena-head { margin: 24px 0 18px; }
.gallery-q { font-size: clamp(26px, 4vw, 46px) !important; line-height: 1.05; }
.gallery-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 6px; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; margin: 18px 0 40px; }
.gallery-item { margin: 0; display: grid; gap: 8px; }
.gallery-item figcaption { display: grid; gap: 2px; font-size: 13px; }
.gallery-item figcaption b { font-size: 15px; }
.gallery-item figcaption span { opacity: .75; }
.gallery-item .linkbtn { justify-self: start; font-size: 11px; opacity: .5; }
.challenges { margin: 40px 0 10px; }
.hot { margin: 10px 0 0; font-weight: 800; }
.embed-arena { padding: 10px; }
.embed-arena .arena-pair { gap: 8px; }
.embed-arena .arena-label { font-size: 14px; margin: 0 0 4px; }
.embed-arena .arena-vote { margin: 10px 0 0; padding: 10px; gap: 8px; }
.embed-q { margin: 0 0 8px; font-weight: 700; font-size: 14px; }
.daily { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin: 12px 0 0; padding: 10px 14px; border: 2px solid var(--pop); }
.daily b { font-family: var(--mono); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.daily [data-streak] { font-weight: 800; }
.daily .tomorrow { opacity: .7; font-size: 14px; }
.entry-big { max-width: 900px; margin: 10px 0 16px; }
.featured { display: grid; grid-template-columns: 1fr 1.1fr; gap: 24px; align-items: center; margin: 22px 0 0; padding: 20px; border: 2px solid var(--line); box-shadow: 6px 6px 0 var(--pop); }
@media (max-width: 800px) { .featured { grid-template-columns: 1fr; } }
.featured .k { font: 600 11px var(--mono); letter-spacing: .14em; text-transform: uppercase; background: var(--pop); color: var(--pop-ink); padding: 3px 7px; }
.featured h2 { margin: 10px 0 6px; font-size: clamp(22px, 3vw, 34px); line-height: 1.05; }
.featured .row { display: flex; gap: 10px; flex-wrap: wrap; }
.featured-pics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-decoration: none; }
.featured-pics .arena-svg { position: relative; }
.featured-pics i { position: absolute; top: 0; left: 0; background: var(--pop); color: var(--pop-ink); font: 900 16px var(--display); font-style: normal; padding: 4px 10px; }
.enter-list { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 6px; }
.enter-list li { display: grid; grid-template-columns: 140px 1fr; gap: 12px; }
.enter-list b { font-family: var(--mono); font-size: 13px; }
#enter-cmd { width: 100%; margin: 6px 0; }
.challenge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
.challenge-card { display: grid; gap: 8px; padding: 14px; border: 2px solid var(--line); text-decoration: none; color: inherit; }
.challenge-card:hover { box-shadow: 4px 4px 0 var(--pop); transform: translate(-1px, -1px); }
.challenge-card .q { font-weight: 700; }
.challenge-card .meta { font: 500 12px var(--mono); opacity: .7; }
.arena-tabs { display: flex; gap: 6px; margin-top: 14px; flex-wrap: wrap; }
.arena-tabs a { padding: 7px 14px; border: 2px solid var(--line); text-decoration: none; color: inherit; font-weight: 700; font-size: 14px; }
.arena-tabs a.on { background: var(--pop); color: var(--pop-ink); border-color: var(--pop-ink); }
.arena-svg { aspect-ratio: 4/3; background: #fff; border: 2px solid var(--line); display: grid; place-items: center; overflow: hidden; }
.arena-svg img { width: 100%; height: 100%; object-fit: contain; display: block; }
.arena-reveal small { opacity: .75; font-size: 12px; }
.arena-submit { margin: 40px 0 20px; padding: 20px; border: 2px dashed var(--line); }
.arena-submit h2 { margin: 0 0 8px; }
.arena-submit select { width: 100%; font: inherit; padding: 10px; border: 2px solid var(--line); background: transparent; color: inherit; }
.arena-submit .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.arena-submit textarea { font-family: var(--mono); font-size: 12px; }
.board-kind { margin: 18px 0 8px; }
.board-kind h2 { margin: 0 0 6px; }
small.community { font-weight: 400; opacity: .7; }
.arena-head .k, .arena-prompt .k, .arena-reveal .k { font: 600 11px var(--mono); letter-spacing: .14em; text-transform: uppercase; background: var(--pop); color: var(--pop-ink); padding: 3px 7px; display: inline-block; }
.arena-head h1 { margin: 10px 0 8px; font-size: clamp(32px, 5vw, 60px); line-height: 1; }
.arena-prompt { margin: 0 0 18px; padding: 14px 16px; border: 2px solid var(--line); display: grid; gap: 8px; font-size: 18px; }
.arena-prompt .k { justify-self: start; }
.arena-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 800px) { .arena-pair { grid-template-columns: 1fr; } }
.arena-side .stage { margin: 0; max-height: 70vh; }
.arena-label { font-size: 22px; margin: 0 0 8px; }
.arena-vote { margin: 22px 0; padding: 18px; border: 2px solid var(--line); display: grid; gap: 12px; text-align: center; }
.arena-vote .row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.arena-vote .btn[disabled] { opacity: .45; cursor: not-allowed; }
.arena-reveal { display: grid; gap: 16px; }
.arena-vote .keys { font: 500 11px var(--mono); opacity: .55; margin: 0; }
.crowd { display: grid; gap: 8px; }
.crowd .bar { display: flex; height: 34px; border: 2px solid var(--line); overflow: hidden; background: var(--hair); }
.crowd .bar span { width: 0; transition: width .9s cubic-bezier(.2,.8,.2,1); display: grid; place-items: center; font: 700 12px var(--mono); white-space: nowrap; overflow: hidden; }
.crowd .bar [data-bar=a] { background: var(--pop); color: var(--pop-ink); }
.crowd .bar [data-bar=tie] { background: #8a8a86; color: #111; }
.crowd .bar [data-bar=b] { background: #5ac8fa; color: #0b2230; }
.crowd p { margin: 0; font-weight: 700; font-size: 17px; }
.taste { display: grid; gap: 8px; justify-items: center; }
.taste p { margin: 0; }
.badge { font-weight: 800; padding: 6px 12px; background: var(--pop); color: var(--pop-ink); border: 2px solid var(--pop-ink); animation: pop .5s cubic-bezier(.2,1.6,.4,1); }
.badge.next { background: transparent; color: inherit; border: 2px dashed var(--line); font-weight: 600; animation: none; }
@keyframes pop { from { transform: scale(.4); opacity: 0; } }
.arena-reveal .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.arena-reveal .pair > div { display: grid; gap: 6px; justify-items: center; padding: 12px; border: 2px solid var(--pop); }
.arena-reveal b { font-family: var(--display); font-stretch: 112%; font-weight: 900; font-size: 22px; }
.arena-foot { font-size: 13px; opacity: .75; margin: 24px 0; }
.board { width: 100%; border-collapse: collapse; margin: 8px 0 28px; font-size: 16px; }
.board th, .board td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--hair); }
.board th { font: 600 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
.board tr.top td { background: var(--pop); color: var(--pop-ink); }
.board small { opacity: .7; }
.board-prompt { margin: 28px 0; }
.board-prompt ul { list-style: none; padding: 0; margin: 10px 0 0; border: 2px solid var(--line); }
.board-prompt li { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; padding: 10px 12px; border-top: 1px solid var(--hair); align-items: center; }
.board-prompt li:first-child { border-top: 0; }
.byline .community { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; border: 1px solid currentColor; padding: 2px 6px; }
.report .linkbtn { font-size: 12px; opacity: .6; }
.more h2 { margin: 0 0 18px; }
.challenge { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: 0 0 14px; padding: 12px 16px; border: 2px solid var(--pop); font-size: 17px; }
.challenge .k { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; background: var(--pop); color: var(--pop-ink); padding: 3px 7px; }
.challenge b { font-family: var(--display); font-stretch: 125%; font-weight: 900; letter-spacing: .04em; }
.challenge .btn { margin-left: auto; }
.notice { padding: 10px 14px; border: 2px solid var(--ok); color: var(--ok); font-size: 14px; }
.notice.err { border-color: var(--bad); color: var(--bad); }
.comments { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 20px; }
.comments li { border-left: 3px solid var(--pop); padding-left: 14px; }
.comments p { margin: 0 0 4px; white-space: pre-wrap; }
.comments small { font: 500 12px var(--mono); color: var(--dim); text-transform: uppercase; letter-spacing: .03em; }

.side { display: grid; gap: 32px; align-content: start; }
@media (min-width: 901px) { .side { position: sticky; top: 20px; } }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.actions .btn.pop { grid-column: 1 / -1; margin-bottom: 4px; }
.side h3 { font: 700 12px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 14px; }
.log { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.log li { display: grid; grid-template-columns: 42px 1fr; gap: 10px; font-size: 14px; }
.log b { font: 700 13px var(--mono); }
.log small { display: block; font: 500 11.5px var(--mono); color: var(--dim); text-transform: uppercase; margin-top: 2px; }
.scores { list-style: none; padding: 0; margin: 0; border: 2px solid var(--line); }
.scores li { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 8px 12px; border-top: 1px solid var(--hair); font-family: var(--mono); font-size: 14px; }
.scores li:first-child { border-top: 0; }
.scores li.top { background: var(--pop); color: var(--pop-ink); }
.scores .pos { color: var(--dim); font-size: 12px; }
.scores li.top .pos { color: var(--pop-ink); }
.scores b { font-family: var(--display); font-stretch: 125%; font-weight: 900; letter-spacing: .08em; }
.scores .pts { font-weight: 600; }
.side .source { font-size: 14px; font-weight: 550; display: inline-flex; gap: 8px; align-items: center; }
.linkbtn { background: none; border: 0; padding: 0; color: var(--muted); font: 600 13px var(--sans); cursor: pointer; display: inline-flex; gap: 7px; align-items: center; margin-top: 14px; }
.linkbtn:hover { color: var(--fg); }
.embed { margin-top: 12px; display: grid; gap: 8px; }
textarea.code { min-height: 0; font: 12px/1.5 var(--mono); background: var(--cab); color: var(--cab-muted); border-color: var(--cab); resize: none; }

/* footer */
.foot { border-top: 2px solid var(--line); padding: 20px 0 28px; color: var(--muted); font-size: 13px; display: flex; gap: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; }
.foot .who { display: inline-flex; gap: 10px; align-items: center; }
.foot .mascot { width: 22px; }

.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(16px); opacity: 0; background: var(--pop); color: var(--pop-ink); border: 2px solid var(--pop-ink); box-shadow: 4px 4px 0 var(--pop-ink); padding: 10px 16px; font: 800 13px var(--display); font-stretch: 112%; text-transform: uppercase; transition: all .18s; pointer-events: none; z-index: 10; }
.toast.on { opacity: 1; transform: translateX(-50%); }

/* not found */
.lost { padding: 72px 0 96px; display: grid; grid-template-columns: 180px 1fr; gap: 40px; align-items: center; max-width: 760px; }
.lost h1 { font-size: clamp(44px, 6vw, 72px); margin: 0 0 12px; }
.lost p { color: var(--muted); font-size: 16px; margin: 0; }
@media (max-width: 640px) { .lost { grid-template-columns: 1fr; } .lost .mascot { width: 120px; } }

/* dashboard */
.login { max-width: 400px; margin: 64px auto; display: grid; gap: 16px; }
.login h1 { font-size: 40px; margin: 0; }
.login p { color: var(--muted); margin: 0; }
.dash-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 28px 0 24px; }
.dash-head h1 { font-size: clamp(32px, 4vw, 48px); margin: 6px 0 10px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0; margin: 0 0 24px; border: 2px solid var(--line); }
.kpi { padding: 18px 20px; border-right: 2px solid var(--line); }
.kpi:last-child { border-right: 0; }
.kpi b { display: block; font: 700 30px var(--mono); letter-spacing: -.03em; }
.kpi small { font: 500 12px var(--mono); color: var(--dim); text-transform: uppercase; }
.panel { border: 2px solid var(--line); padding: 18px 20px; background: var(--surface); }
.panel h3 { font: 700 12px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 16px; }
table.games { width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 48px; }
table.games th { text-align: left; font: 600 11.5px var(--mono); text-transform: uppercase; color: var(--dim); padding: 8px 10px; border-bottom: 2px solid var(--line); }
table.games td { padding: 12px 10px; border-bottom: 1px solid var(--hair); vertical-align: middle; }
table.games td.n { font-family: var(--mono); text-align: right; }
table.games a { font-weight: 600; text-decoration: none; }
.spark { display: block; color: var(--fg); }
.bad { color: var(--bad); }
.chart { width: 100%; height: auto; display: block; color: var(--fg); }
.bars { display: grid; gap: 10px; }
.bars .r { display: grid; grid-template-columns: 140px 1fr 48px; gap: 12px; align-items: center; font-size: 13px; }
.bars .r span:first-child { color: var(--muted); font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bars .fill { height: 12px; background: var(--fg); }
.bars .r span:last-child { text-align: right; font-family: var(--mono); color: var(--muted); }
details.err { border: 2px solid var(--line); margin-bottom: 10px; background: var(--surface); }
details.err summary { padding: 11px 14px; cursor: pointer; list-style: none; display: flex; gap: 12px; align-items: baseline; }
details.err summary::-webkit-details-marker { display: none; }
details.err summary b { color: var(--bad); font: 700 13px var(--mono); flex: none; }
details.err summary span { flex: 1; font-family: var(--mono); font-size: 13px; word-break: break-word; }
details.err summary small { color: var(--dim); flex: none; font-family: var(--mono); }
details.err pre { margin: 0; padding: 12px 14px; border-top: 2px solid var(--line); color: var(--muted); overflow-x: auto; font: 12px/1.5 var(--mono); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
.ai { background: var(--cab); color: var(--cab-fg); padding: 16px 20px; margin: 0 0 28px; font-size: 14px; }
.ai code { color: var(--pop); font-family: var(--mono); }
.dash-section { margin: 40px 0; }
.dash-section h2 { font-size: 26px; margin: 0 0 8px; }
.empty { padding: 40px 0 80px; }

@media (prefers-reduced-motion: no-preference) {
  .rise { animation: rise .55s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(var(--i, 0) * 50ms); }
  @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
}
`;

export const APP_JS = String.raw`(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function toast(msg) {
    var t = $(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast", role: "status" }));
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 1800);
  }
  function copy(text, msg) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
      function () { toast(msg || "Copied"); },
      function () { window.prompt("Copy this:", text); }
    );
  }
  function api(method, url, body) {
    return fetch(url, {
      method: method, credentials: "same-origin",
      headers: { "content-type": "application/json", "x-vesta-csrf": "1" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); });
  }

  // Load the game only when someone presses play: no autoplay surprises, and
  // a play is counted only when a person asked for one.
  var stages = $$(".stage");
  var stage = stages[0] || null;
  function start(target) {
    var st = target && target.nodeType === 1 ? target : stage;
    if (!st || $("iframe", st)) return;
    var f = document.createElement("iframe");
    var share = st.getAttribute("data-share-url");
    var challenge = st.getAttribute("data-challenge");
    var hash = [];
    if (share) hash.push("vesta-share=" + encodeURIComponent(share));
    if (challenge) hash.push("vesta-c=" + encodeURIComponent(challenge));
    if (st.getAttribute("data-title") && !st.hasAttribute("data-arena")) hash.push("vesta-t=" + encodeURIComponent(st.getAttribute("data-title")));
    f.src = st.getAttribute("data-src") + (hash.length ? "#" + hash.join("&") : "");
    f.title = st.getAttribute("data-title") || "Game";
    f.allow = "autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write; web-share; xr-spatial-tracking";
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads");
    st.innerHTML = "";
    st.appendChild(f);
    st.setAttribute("data-started", "1");
    f.addEventListener("load", function () { try { f.focus(); } catch (e) {} });
    setTimeout(function () { try { f.focus(); } catch (e) {} }, 300);
    if (!st.hasAttribute("data-arena") && window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 700) fullscreen();
    arenaReady();
  }
  function fullscreen() {
    if (!stage) return;
    start(stage);
    var el = stage, fn = el.requestFullscreen || el.webkitRequestFullscreen;
    var p = fn && fn.call(el);
    if (p && p.catch) p.catch(function () {});
  }
  stages.forEach(function (st) {
    $$("[data-start]", st).forEach(function (b) { b.addEventListener("click", function () { start(st); }); });
  });
  $$("[data-start]").forEach(function (b) { if (!b.closest(".stage")) b.addEventListener("click", function () { start(stage); }); });
  $$("[data-fullscreen]").forEach(function (b) { b.addEventListener("click", fullscreen); });
  if (stage && /[?&]play=1/.test(location.search)) start(stage);

  // AI Arena: voting unlocks once both games have been started; the vote reveals the models.
  var vote = $(".arena-vote");
  function arenaReady() {
    if (!vote) return;
    var all = $$(".stage[data-arena]");
    var played = all.filter(function (x) { return x.hasAttribute("data-started"); }).length;
    var ready = played === all.length;
    $$("[data-vote]", vote).forEach(function (b) { b.disabled = !ready; });
    var hint = $("[data-vote-hint]", vote);
    if (hint && all.length) hint.textContent = ready ? "Which one was more fun?" : played ? "Now play the other one." : "Play both, then vote.";
  }
  // After a vote: how everyone else voted on this pair.
  function showCrowd(j, mine) {
    var cr = j.crowd; if (!cr || !vote) return;
    var pa = cr.picks[j.a.slug] || 0, pb = cr.picks[j.b.slug] || 0, tot = cr.total || 0;
    var pct = function (n) { return tot ? Math.round((n * 100) / tot) : 0; };
    var bars = { a: pct(pa), tie: pct(cr.ties || 0), b: pct(pb) };
    Object.keys(bars).forEach(function (k) {
      var el = $("[data-bar=" + k + "]", vote); if (!el) return;
      el.textContent = bars[k] >= 14 ? (k === "tie" ? "Tie " : k.toUpperCase() + " ") + bars[k] + "%" : "";
      setTimeout(function () { el.style.width = bars[k] + "%"; }, 80);
    });
    var t = $("[data-crowd-text]", vote); if (!t) return;
    if (tot < 3) { t.textContent = (tot <= 1 ? "You're the first to judge this pair." : "Only " + tot + " people have judged this pair so far.") + " Send it to a friend and see if they agree."; return; }
    var majority = pa === pb ? "" : pa > pb ? "a" : "b";
    var same = mine === "a" ? pa : mine === "b" ? pb : cr.ties || 0;
    t.textContent = mine === "tie" ? pct(same) + "% of " + tot + " players also called it a tie." : !majority ? "Dead even: the crowd is split 50/50 on this one." : mine === majority ? "You're with the crowd: " + pct(same) + "% of " + tot + " players picked the same." : "Hot take: only " + pct(same) + "% of " + tot + " players agree with you.";
  }

  // The judge's own record, kept in this browser: how many votes, and which models they keep picking.
  var BADGES = [[3, "Warming up"], [10, "Critic"], [25, "Curator"], [50, "Arena regular"], [100, "Taste maker"]];
  function showTaste(j) {
    var st; try { st = JSON.parse(localStorage.getItem("vesta:judge") || "{}"); } catch (e) { st = {}; }
    st.n = st.n || 0; st.picks = st.picks || {};
    if (j.counted) {
      st.n++;
      if (j.winner !== "tie") { var m = j[j.winner].model.split(" ")[0]; st.picks[m] = (st.picks[m] || 0) + 1; }
      try { localStorage.setItem("vesta:judge", JSON.stringify(st)); } catch (e) {}
    }
    var tally = Object.keys(st.picks).sort(function (x, y) { return st.picks[y] - st.picks[x]; }).map(function (k) { return k + " " + st.picks[k]; }).join(" · ");
    var el = $("[data-taste]", vote);
    if (el) el.textContent = "You've judged " + st.n + (st.n === 1 ? " matchup" : " matchups") + (tally ? ". Your picks: " + tally + "." : ".");
    var next = BADGES.filter(function (x) { return x[0] > st.n; })[0];
    var hit = BADGES.filter(function (x) { return x[0] === st.n; })[0];
    var badge = $("[data-badge]", vote);
    if (badge && hit && j.counted) { badge.hidden = false; badge.textContent = "🏅 " + hit[1] + ": " + hit[0] + " blind votes"; toast("🏅 New badge: " + hit[1]); }
    else if (badge && next) { badge.hidden = false; badge.className = "badge next"; badge.textContent = (next[0] - st.n) + " more to " + next[1]; }
    var ts = $("[data-taste-share]", vote);
    if (ts) ts.setAttribute("data-share-text", "My AI taste after " + st.n + " blind " + (st.n === 1 ? "vote" : "votes") + (tally ? ": " + tally : "") + ". Judge them yourself:");
  }

  $$("[data-report-entry]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!confirm("Report this drawing as offensive or spam?")) return;
      fetch("/api/arena/entries/" + b.getAttribute("data-report-entry") + "/report", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
        .then(function () { b.textContent = "Reported"; b.disabled = true; toast("Thanks. It'll be reviewed."); });
    });
  });

  // Daily challenge streak, kept in this browser: voting on consecutive days' prompts.
  var dailyEl = $("[data-daily]");
  function dayBefore(d) { var t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); }
  function streakText(st, today) {
    if (!st.last) return "Vote today to start a streak.";
    var alive = st.last === today || st.last === dayBefore(today);
    if (!alive) return "Your streak ended. Vote today to start a new one.";
    return "🔥 " + st.n + "-day streak" + (st.last === today ? ". Come back tomorrow." : ". Vote today to keep it.");
  }
  function readStreak() { try { return JSON.parse(localStorage.getItem("vesta:streak") || "{}"); } catch (e) { return {}; } }
  if (dailyEl) { var sEl = $("[data-streak]", dailyEl); if (sEl) sEl.textContent = streakText(readStreak(), dailyEl.getAttribute("data-daily")); }
  function bumpStreak() {
    if (!dailyEl) return;
    var today = dailyEl.getAttribute("data-daily"), st = readStreak();
    if (st.last !== today) { st.n = st.last === dayBefore(today) ? (st.n || 0) + 1 : 1; st.last = today; }
    try { localStorage.setItem("vesta:streak", JSON.stringify(st)); } catch (e) {}
    var sEl = $("[data-streak]", dailyEl); if (sEl) sEl.textContent = streakText(st, today);
    if (st.n > 1) toast("🔥 " + st.n + "-day streak");
  }

  // Keyboard: 1/A, 2/B, T to vote; N or Enter for the next matchup.
  if (vote) document.addEventListener("keydown", function (e) {
    var tg = e.target && e.target.tagName; if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = (e.key || "").toLowerCase();
    var revealed = !$(".arena-reveal", vote).hidden;
    if (revealed && (k === "n" || k === "enter")) { var nx = $("[data-next]", vote); if (nx) { e.preventDefault(); location.href = nx.href; } return; }
    var map = { "1": "a", a: "a", "2": "b", b: "b", t: "tie" };
    if (!revealed && map[k]) { var btn = $("[data-vote=" + map[k] + "]", vote); if (btn && !btn.disabled) { e.preventDefault(); btn.click(); } }
  });

  if (vote) {
    arenaReady();
    $$("[data-vote]", vote).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-vote]", vote).forEach(function (x) { x.disabled = true; });
        fetch("/api/arena/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ m: vote.getAttribute("data-matchup"), winner: b.getAttribute("data-vote") }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j.a || !j.b) throw new Error(j.error || "failed");
            ["a", "b"].forEach(function (k) {
              var who = $("[data-reveal=" + k + "]", vote); who.textContent = j[k].model + (j[k].lab ? " (" + j[k].lab + ")" : "");
              var by = $("[data-by=" + k + "]", vote); if (by) by.textContent = j[k].community ? "Community entry" + (j[k].author ? " by " + j[k].author : "") + ", model self-reported" : "Made by the arena, one attempt";
              var link = $("[data-link=" + k + "]", vote); if (link) link.href = "/g/" + j[k].slug;
            });
            var row = b.parentNode; if (row) row.hidden = true;
            var hint = $("[data-vote-hint]", vote);
            if (hint) hint.textContent = (j.winner === "tie" ? "You called it a tie." : "You picked " + j[j.winner].model + ".") + (j.counted ? "" : " (You already voted on this pair today, so this one wasn't counted.)");
            $(".arena-reveal", vote).hidden = false;
            showCrowd(j, b.getAttribute("data-vote"));
            bumpStreak();
            showTaste(j);
            var rv = $(".arena-reveal", vote); if (rv && rv.scrollIntoView) rv.scrollIntoView({ behavior: "smooth", block: "center" });
            var sb = $("[data-arena-share]", vote);
            if (sb) {
              var lab = function (k) { return j[k].model.split(" ")[0]; };
              sb.setAttribute("data-share-text", j.winner === "tie" ? "I played " + lab("a") + " vs " + lab("b") + " blind: same game prompt, one attempt each. Called it a tie. Which would you pick?" : "I played " + lab("a") + " vs " + lab("b") + " blind: same game prompt, one attempt each. I picked " + lab(j.winner) + ". Which would you pick?");
            }
          })
          .catch(function (e) { toast(e.message || "Vote failed"); arenaReady(); });
      });
    });
  }

  $$("[data-like]").forEach(function (b) {
    var key = "liked:" + b.getAttribute("data-like");
    if (localStorage.getItem(key)) b.classList.add("liked");
    b.addEventListener("click", function () {
      if (b.classList.contains("liked")) return;
      b.classList.add("liked");
      fetch("/api/games/" + b.getAttribute("data-like") + "/like", { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (j) { localStorage.setItem(key, "1"); var n = $("[data-likes]", b); if (n && j.likes != null) n.textContent = j.likes; })
        .catch(function () { b.classList.remove("liked"); });
    });
  });

  $$("[data-share]").forEach(function (b) {
    b.addEventListener("click", function () {
      var url = b.getAttribute("data-share"), title = document.title, text = b.getAttribute("data-share-text");
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) { navigator.share(text ? { title: title, text: text, url: url } : { title: title, url: url }).catch(function () {}); return; }
      if (text) { copy(text + " " + url, "Copied. Paste it anywhere"); return; }
      else copy(url, "Link copied");
    });
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var src = b.getAttribute("data-copy");
      var el = src.charAt(0) === "#" ? $(src) : null;
      copy(el ? (el.value || el.textContent) : src, b.getAttribute("data-msg") || "Copied");
    });
  });
  $$("[data-toggle]").forEach(function (b) {
    b.addEventListener("click", function () { var el = $(b.getAttribute("data-toggle")); if (el) el.hidden = !el.hidden; });
  });

  var form = $("form.fb");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = { body: form.body.value, name: form.name.value, website: form.website.value };
    var btn = $("button", form); btn.disabled = true;
    fetch(form.action, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); })
      .then(function (j) {
        var li = document.createElement("li");
        var p = document.createElement("p"); p.textContent = j.comment.body;
        var s = document.createElement("small"); s.textContent = (j.comment.name || "Anonymous") + ", just now";
        li.appendChild(p); li.appendChild(s);
        var list = $(".comments"); list.insertBefore(li, list.firstChild);
        var none = $(".no-comments"); if (none) none.remove();
        form.body.value = ""; toast("Sent to the creator");
      })
      .catch(function (err) { toast(err.message || "Couldn't send that"); })
      .then(function () { btn.disabled = false; });
  });

  // The host: eyes follow the pointer, and it perks up when you go for a play button.
  var hosts = $$(".mascot[data-live]");
  if (hosts.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && window.matchMedia("(pointer: fine)").matches) {
    var raf = 0, px = 0, py = 0;
    var look = function () {
      raf = 0;
      hosts.forEach(function (m) {
        var r = m.getBoundingClientRect();
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * 0.59);
        var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 420) * 46;
        $$(".pupil", m).forEach(function (p) { p.style.translate = (dx / d * k).toFixed(1) + "px " + (dy / d * k).toFixed(1) + "px"; });
      });
    };
    window.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(look); }, { passive: true });
  }
  $$("[data-react]").forEach(function (b) {
    var set = function (on) {
      hosts.forEach(function (m) {
        if (on) { m.setAttribute("data-mood", "excited"); m.setAttribute("data-mouth", "o"); }
        else { m.removeAttribute("data-mood"); m.setAttribute("data-mouth", "dash"); }
      });
    };
    b.addEventListener("pointerenter", function () { set(true); });
    b.addEventListener("pointerleave", function () { set(false); });
    b.addEventListener("focus", function () { set(true); });
    b.addEventListener("blur", function () { set(false); });
  });

  // Dashboard actions
  $$("[data-admin]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var action = b.getAttribute("data-admin"), slug = b.getAttribute("data-slug");
      if (action === "report") {
        fetch("/api/games/" + slug + "/feedback?format=md", { credentials: "same-origin" })
          .then(function (r) { return r.text(); })
          .then(function (md) { copy(md, "Report copied. Paste it into your agent."); });
      } else if (action === "hide" || action === "show") {
        api("POST", "/api/games/" + slug + "/hide", { hidden: action === "hide" }).then(function () { location.reload(); }, function (e) { toast(e.message); });
      } else if (action === "delete") {
        if (prompt("Type " + slug + " to delete it and all its data for good.") !== slug) return;
        api("DELETE", "/api/games/" + slug).then(function () { location.href = "/admin"; }, function (e) { toast(e.message); });
      } else if (action === "comment") {
        var id = b.getAttribute("data-id"), hide = b.getAttribute("data-hidden") !== "1";
        api("POST", "/api/comments/" + id + "/hide", { hidden: hide }).then(function () { location.reload(); }, function (e) { toast(e.message); });
      }
    });
  });
})();`;

// Favicon: the mascot on a charcoal tile, so it reads on light and dark tabs.
export const FAVICON_SVG = (face: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#212121"/><svg x="6" y="6" width="52" height="52">${face}</svg></svg>`;
