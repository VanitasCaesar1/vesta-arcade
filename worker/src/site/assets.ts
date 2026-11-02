// Static assets served by the site Worker. Inlined so a deploy is one script
// with no build step and no asset bucket.

export const STYLE = String.raw`
:root {
  --bg: #0e0c0a; --bg2: #15120f; --card: #1b1714; --line: #2d2620; --line2: #3d342b;
  --text: #f5ede2; --muted: #a8998a; --dim: #6f6458;
  --ember: #ff5b1f; --ember2: #ff8a4c; --glow: rgba(255, 91, 31, .35); --gold: #f4c25b; --ok: #7bd389; --bad: #ff6b6b;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --r: 14px;
}
* { box-sizing: border-box; }
html { background: var(--bg); color: var(--text); font: 16px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
body { margin: 0; min-height: 100vh; background:
  radial-gradient(1200px 500px at 50% -200px, rgba(255, 91, 31, .13), transparent 70%),
  radial-gradient(800px 400px at 100% 0, rgba(244, 194, 91, .05), transparent 70%); }
a { color: inherit; }
::selection { background: var(--ember); color: #000; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
.nav { display: flex; align-items: center; gap: 16px; padding: 18px 0; }
.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font: 600 19px/1 var(--serif); letter-spacing: -.01em; }
.brand svg { width: 22px; height: 22px; filter: drop-shadow(0 0 10px var(--glow)); }
.nav .sp { flex: 1; }
.nav a.link { color: var(--muted); text-decoration: none; font-size: 14px; }
.nav a.link:hover { color: var(--text); }

.hero { padding: 56px 0 28px; }
.hero h1 { font: 500 clamp(40px, 7vw, 84px)/.95 var(--serif); letter-spacing: -.035em; margin: 0 0 18px; max-width: 19ch; text-wrap: balance; }
.hero h1 em { color: var(--ember); font-style: italic; }
.hero p { color: var(--muted); font-size: 18px; max-width: 56ch; margin: 0; }

.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 28px 0 18px; }
.tab, .chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 99px; border: 1px solid var(--line); color: var(--muted); text-decoration: none; font-size: 14px; background: transparent; }
.tab:hover, .chip:hover { border-color: var(--line2); color: var(--text); }
.tab.on { background: var(--text); color: var(--bg); border-color: var(--text); }
.chip.on { border-color: var(--ember); color: var(--ember2); }
.bar .gap { width: 1px; height: 22px; background: var(--line); margin: 0 6px; }
.chip small { color: var(--dim); font-family: var(--mono); font-size: 11px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 22px; padding-bottom: 40px; }
.card { display: block; text-decoration: none; border-radius: var(--r); transition: transform .25s cubic-bezier(.2,.8,.2,1); }
.card:hover { transform: translateY(-3px); }
.card .art { position: relative; aspect-ratio: 16/9; border-radius: var(--r); overflow: hidden; background: var(--card); border: 1px solid var(--line); }
.card .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card:hover .art { border-color: var(--ember); box-shadow: 0 10px 40px -10px var(--glow); }
.card .play { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; transition: opacity .2s; background: linear-gradient(transparent, rgba(0,0,0,.45)); }
.card:hover .play { opacity: 1; }
.card .play span { width: 54px; height: 54px; border-radius: 50%; background: var(--ember); display: grid; place-items: center; box-shadow: 0 0 30px var(--glow); }
.card .badge { position: absolute; left: 10px; bottom: 10px; font: 600 11px/1 var(--mono); padding: 5px 8px; border-radius: 6px; background: rgba(0,0,0,.65); backdrop-filter: blur(6px); color: var(--text); }
.card .badge.hot { left: auto; right: 10px; background: var(--ember); color: #160800; }
.card h3 { font: 500 21px/1.15 var(--serif); margin: 12px 2px 4px; letter-spacing: -.01em; }
.card .meta { color: var(--dim); font-size: 13px; margin: 0 2px; display: flex; gap: 8px; flex-wrap: wrap; }
.card .meta b { color: var(--muted); font-weight: 500; }

.empty { border: 1px dashed var(--line2); border-radius: var(--r); padding: 40px; text-align: center; color: var(--muted); }
.empty h2 { font: 500 30px/1.1 var(--serif); color: var(--text); margin: 0 0 10px; }
pre, code { font-family: var(--mono); font-size: 13.5px; }
pre.cmd { display: inline-block; text-align: left; background: #000; border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; color: var(--ember2); margin: 16px 0 0; white-space: pre-wrap; }

/* game page */
.stage { position: relative; width: 100%; max-height: 78vh; margin: 8px auto 0; border-radius: var(--r); overflow: hidden; background: #000; border: 1px solid var(--line); box-shadow: 0 30px 80px -30px var(--glow); }
.stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: #000; }
.stage .cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: saturate(1.1) brightness(.55); }
.stage .start { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 14px; cursor: pointer; border: 0; background: transparent; color: var(--text); font: inherit; width: 100%; }
.stage .start .btn-play { width: 92px; height: 92px; border-radius: 50%; background: var(--ember); display: grid; place-items: center; box-shadow: 0 0 0 10px rgba(255,91,31,.18), 0 0 60px var(--glow); transition: transform .2s; }
.stage .start:hover .btn-play { transform: scale(1.07); }
.stage .start .hint { font: 500 14px var(--mono); color: var(--text); text-shadow: 0 1px 8px #000; }
.stage:fullscreen { max-height: none; border-radius: 0; border: 0; }

.gamehead { display: flex; gap: 24px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; margin: 26px 0 8px; }
.gamehead h1 { font: 500 clamp(32px, 5vw, 54px)/1 var(--serif); letter-spacing: -.03em; margin: 0 0 10px; }
.byline { color: var(--muted); font-size: 15px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.byline .dot { color: var(--dim); }
.tool { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 99px; background: rgba(255,91,31,.1); color: var(--ember2); font-size: 13px; border: 1px solid rgba(255,91,31,.25); text-decoration: none; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--line2); background: var(--card); color: var(--text); font: 500 14px var(--sans); cursor: pointer; text-decoration: none; }
.btn:hover { border-color: var(--muted); }
.btn.primary { background: var(--ember); border-color: var(--ember); color: #160800; }
.btn.primary:hover { background: var(--ember2); }
.btn.liked { color: var(--ember2); border-color: var(--ember); }
.btn svg { width: 16px; height: 16px; }
.btn.small { padding: 6px 10px; font-size: 13px; }
.btn.danger:hover { border-color: var(--bad); color: var(--bad); }

.cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 40px; margin: 30px 0 60px; }
@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
.desc { color: #ddd2c4; font-size: 17px; white-space: pre-wrap; margin: 0 0 30px; }
h2.sec { font: 500 25px/1.1 var(--serif); margin: 0 0 6px; letter-spacing: -.01em; }
.sub { color: var(--dim); font-size: 14px; margin: 0 0 16px; }
form.fb textarea, form.fb input, form.login input { width: 100%; background: var(--bg2); border: 1px solid var(--line2); border-radius: 10px; color: var(--text); font: 15px/1.5 var(--sans); padding: 12px 14px; }
form.fb textarea { min-height: 96px; resize: vertical; }
form.fb textarea:focus, form.fb input:focus, form.login input:focus { outline: none; border-color: var(--ember); box-shadow: 0 0 0 3px rgba(255,91,31,.15); }
form.fb .row { display: flex; gap: 10px; margin-top: 10px; }
form.fb .row input { flex: 1; }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.notice { padding: 10px 14px; border-radius: 10px; background: rgba(123,211,137,.1); border: 1px solid rgba(123,211,137,.3); color: var(--ok); font-size: 14px; margin-bottom: 12px; }
.notice.err { background: rgba(255,107,107,.1); border-color: rgba(255,107,107,.3); color: var(--bad); }
.comments { list-style: none; padding: 0; margin: 22px 0 0; }
.comments li { padding: 14px 0; border-top: 1px solid var(--line); }
.comments p { margin: 0 0 4px; white-space: pre-wrap; }
.comments small { color: var(--dim); font-size: 13px; }
.side { display: grid; gap: 26px; align-content: start; }
.panel { border: 1px solid var(--line); border-radius: var(--r); padding: 18px; background: rgba(27,23,20,.5); }
.panel h3 { font: 600 12px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--dim); margin: 0 0 12px; }
.log { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.log li { display: grid; grid-template-columns: 44px 1fr; gap: 8px; font-size: 14px; }
.log b { font: 600 13px var(--mono); color: var(--ember2); }
.log span { color: #d8cdbf; }
.log small { display: block; color: var(--dim); font-size: 12px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stats div { text-align: left; }
.stats b { display: block; font: 600 22px var(--mono); }
.stats small { color: var(--dim); font-size: 12px; }
textarea.code { width: 100%; background: #000; color: var(--ember2); border: 1px solid var(--line); border-radius: 8px; font: 12px/1.5 var(--mono); padding: 10px; resize: none; }
.kbd { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; color: var(--gold); }

.foot { border-top: 1px solid var(--line); padding: 28px 0 40px; color: var(--dim); font-size: 14px; display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap; }
.foot a { color: var(--muted); }
.toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(20px); opacity: 0; background: var(--text); color: var(--bg); padding: 10px 18px; border-radius: 99px; font-weight: 500; font-size: 14px; transition: all .25s; pointer-events: none; z-index: 10; }
.toast.on { opacity: 1; transform: translateX(-50%); }

/* admin */
.login { max-width: 420px; margin: 80px auto; }
.login h1 { font: 500 40px/1 var(--serif); margin: 0 0 12px; }
.login p { color: var(--muted); }
form.login button { margin-top: 12px; width: 100%; justify-content: center; }
table.games { width: 100%; border-collapse: collapse; font-size: 14px; margin: 18px 0 40px; }
table.games th { text-align: left; color: var(--dim); font: 600 11px var(--mono); letter-spacing: .08em; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid var(--line); }
table.games td { padding: 12px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
table.games td.n { font-family: var(--mono); text-align: right; }
table.games a { text-decoration: none; font-weight: 500; }
table.games tr:hover td { background: rgba(255,255,255,.02); }
.spark { display: block; }
.bad { color: var(--bad); }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 18px 0 28px; }
.kpi { border: 1px solid var(--line); border-radius: var(--r); padding: 16px; background: var(--bg2); }
.kpi b { display: block; font: 600 28px var(--mono); letter-spacing: -.02em; }
.kpi small { color: var(--dim); }
.chart { width: 100%; height: auto; display: block; }
.bars { display: grid; gap: 8px; }
.bars .r { display: grid; grid-template-columns: 150px 1fr 60px; gap: 10px; align-items: center; font-size: 13px; }
.bars .r span:first-child { color: var(--muted); font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bars .track { height: 10px; background: var(--bg2); border-radius: 99px; overflow: hidden; }
.bars .fill { height: 100%; background: linear-gradient(90deg, var(--ember), var(--gold)); border-radius: 99px; }
.bars .r span:last-child { text-align: right; font-family: var(--mono); color: var(--muted); }
details.err { border: 1px solid var(--line); border-radius: 10px; margin-bottom: 8px; background: var(--bg2); }
details.err summary { padding: 12px 14px; cursor: pointer; list-style: none; display: flex; gap: 10px; align-items: baseline; }
details.err summary::-webkit-details-marker { display: none; }
details.err summary b { color: var(--bad); font: 600 13px var(--mono); flex: none; }
details.err summary span { flex: 1; font-family: var(--mono); font-size: 13px; word-break: break-word; }
details.err summary small { color: var(--dim); flex: none; }
details.err pre { margin: 0; padding: 12px 14px; border-top: 1px solid var(--line); color: var(--muted); overflow-x: auto; font-size: 12px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
@media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
.ai { border: 1px solid rgba(255,91,31,.35); background: linear-gradient(135deg, rgba(255,91,31,.08), transparent); border-radius: var(--r); padding: 18px 20px; margin: 0 0 28px; display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.ai p { margin: 0; color: #e5d8c8; }
.ai code { color: var(--ember2); }
.muted { color: var(--muted); }
`;

export const APP_JS = String.raw`(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function toast(msg) {
    var t = $(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast" }));
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
  var stage = $(".stage");
  function start() {
    if (!stage || $("iframe", stage)) return;
    var f = document.createElement("iframe");
    var share = stage.getAttribute("data-share-url");
    f.src = stage.getAttribute("data-src") + (share ? "#vesta-share=" + encodeURIComponent(share) : "");
    f.title = stage.getAttribute("data-title") || "Game";
    f.allow = "autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write; xr-spatial-tracking";
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads");
    stage.innerHTML = "";
    stage.appendChild(f);
    f.addEventListener("load", function () { try { f.focus(); } catch (e) {} });
    setTimeout(function () { try { f.focus(); } catch (e) {} }, 300);
    if (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 700) fullscreen();
  }
  function fullscreen() {
    if (!stage) return;
    start();
    var el = stage, fn = el.requestFullscreen || el.webkitRequestFullscreen;
    var p = fn && fn.call(el);
    if (p && p.catch) p.catch(function () {});
  }
  $$("[data-start]").forEach(function (b) { b.addEventListener("click", start); });
  $$("[data-fullscreen]").forEach(function (b) { b.addEventListener("click", fullscreen); });
  if (stage && /[?&]play=1/.test(location.search)) start();

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
      var url = b.getAttribute("data-share"), title = document.title;
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) navigator.share({ title: title, url: url }).catch(function () {});
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
        var s = document.createElement("small"); s.textContent = (j.comment.name || "Anonymous") + " · just now";
        li.appendChild(p); li.appendChild(s);
        var list = $(".comments"); list.insertBefore(li, list.firstChild);
        var none = $(".no-comments"); if (none) none.remove();
        form.body.value = ""; toast("Sent to the creator");
      })
      .catch(function (err) { toast(err.message || "Couldn't send that"); })
      .then(function () { btn.disabled = false; });
  });

  // Dashboard actions
  $$("[data-admin]").forEach(function (b) {
    b.addEventListener("click", function () {
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

export const FLAME_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2c.6 3.2-1.4 5-3 6.8C7.4 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.2-1-4-2.2-5.4.1 1.6-.5 2.9-1.6 3.4.3-3.8-.9-7.6-2.2-11Z" fill="#ff5b1f"/><path d="M12 13c.3 1.6-.8 2.4-1.5 3.3-.4.5-.7 1-.7 1.7a2.2 2.2 0 0 0 4.4 0c0-1.7-1-3.3-2.2-5Z" fill="#f4c25b"/></svg>`;
