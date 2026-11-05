// The script the play Worker injects at the top of every game's HTML.
// It is plain ES2017 so it runs before, and alongside, whatever the game ships.
//
// What it does, in order:
// 1. Namespaces localStorage, sessionStorage and IndexedDB per game. Every
//    game shares the play origin, so without this one game's saves could
//    overwrite another's.
// 2. Counts a play, and how long the tab stays visible.
// 3. Catches uncaught errors, unhandled rejections, console.error calls and
//    failed asset loads, which is what a coding agent needs to fix the game.
// 4. Shows the arcade's high-score box (window.vesta.submitScore), and turns
//    each saved score into a challenge link the player can send to a friend.
// 5. Exposes window.vesta.milestone(name) so games can report progress
//    ("reached-level-3") and the creator can see where players stop.
// No cookies, no fingerprinting, nothing about the player is sent.

export const CLIENT_SCRIPT = String.raw`(function () {
  "use strict";
  if (window.vesta) return;
  var me = document.currentScript;
  var game = me && me.getAttribute("data-game");
  var version = Number(me && me.getAttribute("data-version")) || 0;
  if (!game) return;
  var prefix = "vesta:" + game + ":";
  // Cover screenshots and link-preview bots aren't players.
  var quiet = /[?&]vesta-preview=1/.test(location.search) || /HeadlessChrome|bot|crawler|spider/i.test(navigator.userAgent);

  function namespaced(store) {
    function keys() {
      var out = [];
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i);
        if (k && k.indexOf(prefix) === 0) out.push(k.slice(prefix.length));
      }
      return out;
    }
    var api = {
      getItem: function (k) { return store.getItem(prefix + k); },
      setItem: function (k, v) { store.setItem(prefix + k, String(v)); },
      removeItem: function (k) { store.removeItem(prefix + k); },
      clear: function () { keys().forEach(function (k) { store.removeItem(prefix + k); }); },
      key: function (i) { var k = keys()[i]; return k === undefined ? null : k; }
    };
    Object.defineProperty(api, "length", { get: function () { return keys().length; } });
    return new Proxy(api, {
      get: function (t, p) {
        if (p in t || typeof p === "symbol") return t[p];
        var v = store.getItem(prefix + p);
        return v === null ? undefined : v;
      },
      set: function (t, p, v) { store.setItem(prefix + String(p), String(v)); return true; },
      deleteProperty: function (t, p) { store.removeItem(prefix + String(p)); return true; },
      has: function (t, p) { return p in t || store.getItem(prefix + String(p)) !== null; },
      ownKeys: function () { return keys(); },
      getOwnPropertyDescriptor: function (t, p) {
        var v = store.getItem(prefix + String(p));
        return v === null ? undefined : { value: v, enumerable: true, configurable: true, writable: true };
      }
    });
  }
  ["localStorage", "sessionStorage"].forEach(function (name) {
    try {
      var wrapped = namespaced(window[name]);
      Object.defineProperty(window, name, { configurable: true, get: function () { return wrapped; } });
    } catch (e) {}
  });
  try {
    var idb = window.indexedDB, open = idb.open, del = idb.deleteDatabase;
    idb.open = function (n, v) { return v === undefined ? open.call(idb, prefix + n) : open.call(idb, prefix + n, v); };
    idb.deleteDatabase = function (n) { return del.call(idb, prefix + n); };
  } catch (e) {}

  var sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var queue = [], timer = 0, sentErrors = 0, seen = {}, milestones = {}, milestoneCount = 0;

  function send(events) {
    if (quiet) return;
    var body = JSON.stringify({ g: game, v: version, sid: sid, ev: events });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/__vesta/e", new Blob([body], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch("/__vesta/e", { method: "POST", body: body, keepalive: true, headers: { "content-type": "text/plain" } }); } catch (e) {}
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (queue.length) { send(queue.splice(0, 20)); if (queue.length) flush(); }
  }
  function push(ev) {
    queue.push(ev);
    if (!timer) timer = setTimeout(flush, 2000);
  }
  function clip(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) : s; }
  function strip(url) {
    url = String(url || "");
    var marker = "/" + game + "/" + version + "/";
    var i = url.indexOf(marker);
    return i >= 0 ? url.slice(i + marker.length) : url;
  }
  function report(kind, message, source, line, col, stack) {
    var key = kind + "|" + message + "|" + source + "|" + line;
    if (seen[key] || sentErrors >= 25) return;
    seen[key] = 1; sentErrors++;
    push({ t: "err", k: kind, m: clip(message, 500), src: clip(strip(source), 300), l: line | 0, c: col | 0, st: clip(stack, 4000) });
  }

  window.addEventListener("error", function (e) {
    var el = e.target;
    if (el && el !== window && (el.src || el.href)) {
      report("resource", "Failed to load " + (el.tagName || "").toLowerCase() + ": " + strip(el.src || el.href), strip(el.src || el.href), 0, 0, "");
      return;
    }
    var err = e.error;
    report("error", (err && err.message) || e.message || "Script error", e.filename || "", e.lineno, e.colno, err && err.stack ? strip(err.stack) : "");
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    report("rejection", (r && r.message) || String(r), "", 0, 0, r && r.stack ? strip(r.stack) : "");
  });
  var consoleError = console.error;
  console.error = function () {
    try {
      var parts = [];
      for (var i = 0; i < arguments.length && i < 4; i++) {
        var a = arguments[i];
        parts.push(a instanceof Error ? a.message : typeof a === "object" ? (function () { try { return JSON.stringify(a); } catch (x) { return String(a); } })() : String(a));
      }
      var first = arguments[0];
      report("console", parts.join(" "), "", 0, 0, first instanceof Error && first.stack ? strip(first.stack) : "");
    } catch (x) {}
    return consoleError.apply(console, arguments);
  };

  // Active time: counted only while the tab is visible.
  var active = 0, reported = 0, since = document.visibilityState === "visible" ? Date.now() : 0;
  function reportTime() {
    if (since) { active += (Date.now() - since) / 1000; since = 0; }
    var total = Math.round(active);
    if (total > reported) { queue.push({ t: "time", s: total - reported, prev: reported, total: total }); reported = total; }
    flush();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") reportTime();
    else since = Date.now();
  });
  window.addEventListener("pagehide", reportTime);

  // The arcade passes its own page URL in the hash, for share buttons, and the
  // score to beat when the player arrived through a challenge link.
  var shareUrl = location.href.replace(/[?#].*$/, "");
  var arcadeUrl = "", challenge = null, title = "";
  try {
    var h = location.hash.replace(/^#/, "");
    var keep = [];
    h.split("&").forEach(function (part) {
      var eq = part.indexOf("=");
      var k = eq < 0 ? part : part.slice(0, eq);
      var v = eq < 0 ? "" : decodeURIComponent(part.slice(eq + 1));
      if (k === "vesta-share") { if (/^https?:\/\//.test(v)) shareUrl = arcadeUrl = v; }
      else if (k === "vesta-c") {
        var cm = /^([A-Z0-9]{1,3}):(-?[0-9.e+]+)$/.exec(v);
        if (cm && isFinite(Number(cm[2]))) challenge = { name: cm[1], score: Number(cm[2]) };
      }
      else if (k === "vesta-t") title = clip(v, 60);
      else if (part) keep.push(part);
    });
    if (h) history.replaceState(history.state, "", location.pathname + location.search + (keep.length ? "#" + keep.join("&") : ""));
  } catch (e) {}

  function shareLink(url, text) {
    var data = { text: text, url: url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) return navigator.share(data).then(function () { return "shared"; });
    if (navigator.clipboard) return navigator.clipboard.writeText(text + " " + url).then(function () { return "copied"; });
    return Promise.reject(new Error("no share"));
  }

  // High scores: an arcade-style "enter your initials" box, isolated in a shadow root
  // so it can't clash with the game's CSS, and swallowing keys so typing a name
  // doesn't trigger the game's controls.
  var lastName = "";
  try { lastName = (localStorage.getItem("name") || "").slice(0, 3); } catch (e) {}
  function submitScore(score, opts) {
    score = Number(score);
    if (!isFinite(score)) return Promise.resolve(null);
    opts = opts || {};
    return new Promise(function (resolve) {
      var host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
      var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
      var label = String(opts.label || "Score").slice(0, 24);
      var shown = opts.format ? String(opts.format(score)) : Math.round(score).toLocaleString();
      root.innerHTML =
        "<style>" +
        ":host,*{box-sizing:border-box}" +
        ".s{position:fixed;inset:0;background:rgba(10,10,10,.72);display:grid;place-items:center;font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;animation:f .2s}" +
        "@keyframes f{from{opacity:0}}" +
        ".b{background:#1d1d1d;color:#f2f2ee;border:3px solid #f2f2ee;box-shadow:8px 8px 0 #ffd60a;padding:26px 28px;width:min(360px,calc(100vw - 32px));text-align:center}" +
        ".k{font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#b9b9b6;text-transform:uppercase}" +
        ".n{font-size:46px;font-weight:900;line-height:1;margin:8px 0 18px;color:#ffd60a}" +
        "input{all:unset;display:block;width:100%;font:900 40px/1 'Arial Black',Arial,sans-serif;letter-spacing:.5em;text-indent:.5em;text-align:center;text-transform:uppercase;border-bottom:3px solid #f2f2ee;padding:8px 0;margin:8px 0 18px;caret-color:#ffd60a}" +
        ".r{display:flex;gap:10px}" +
        "button{all:unset;flex:1;cursor:pointer;font:900 13px 'Arial Black',Arial,sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:12px 0;border:2px solid #f2f2ee;text-align:center}" +
        "button.y{background:#ffd60a;color:#161616;border-color:#ffd60a}" +
        ".rank{font-size:30px;font-weight:900;margin:6px 0 4px}" +
        ".m{font:12px ui-monospace,Menlo,monospace;color:#b9b9b6;margin-bottom:18px}" +
        ".v{font-size:18px;font-weight:900;color:#ffd60a;margin:10px 0 2px}" +
        ".r{flex-wrap:wrap}button.c{flex-basis:100%;background:#f2f2ee;color:#161616}" +
        "</style>" +
        "<div class=s><form class=b><div class=k></div><div class=n></div>" +
        "<div class=k>Enter your initials</div><input maxlength=3 autocomplete=off spellcheck=false aria-label='Your initials'>" +
        "<div class=r><button type=button class=skip>Skip</button><button class=y>Save</button></div></form></div>";
      root.querySelector(".k").textContent = label;
      root.querySelector(".n").textContent = shown;
      var input = root.querySelector("input");
      var form = root.querySelector("form");
      input.value = lastName;
      ["keydown", "keyup", "keypress"].forEach(function (t) {
        host.addEventListener(t, function (e) { e.stopPropagation(); }, false);
      });
      input.addEventListener("input", function () { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); });
      function close(result) {
        if (host.parentNode) host.parentNode.removeChild(host);
        resolve(result);
      }
      root.querySelector(".skip").addEventListener("click", function () { close(null); });
      host.addEventListener("keydown", function (e) { if (e.key === "Escape") close(null); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = input.value;
        if (!name) { input.focus(); return; }
        lastName = name;
        try { localStorage.setItem("name", name); } catch (x) {}
        var btn = root.querySelector(".y"); btn.textContent = "...";
        fetch("/__vesta/score", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ g: game, v: version, score: score, name: name }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j || !j.rank) throw new Error((j && j.error) || "failed");
            var fmt = function (x) { return opts.format ? String(opts.format(x)) : Math.round(x).toLocaleString(); };
            var link = arcadeUrl && j.id ? arcadeUrl + "?c=" + j.id : "";
            // From now on the game's own share button sends this player's challenge link.
            if (link && window.vesta) window.vesta.shareUrl = link;
            var verdict = "";
            if (challenge) verdict = score > challenge.score ? "You beat " + challenge.name + "'s " + fmt(challenge.score) + "!" : score === challenge.score ? "Tied with " + challenge.name + "." : challenge.name + " still leads with " + fmt(challenge.score) + ".";
            form.innerHTML = "<div class=k></div>" + (verdict ? "<div class=v></div>" : "") + "<div class=rank></div><div class=m></div><div class=r>" + (link ? "<button class=c type=button>Challenge a friend</button>" : "") + "<button class=y type=button>Continue</button></div>";
            form.querySelector(".k").textContent = name;
            if (verdict) form.querySelector(".v").textContent = verdict;
            form.querySelector(".rank").textContent = "#" + j.rank + " all time";
            form.querySelector(".m").textContent = "#" + j.rankToday + " today, of " + j.total + (j.total === 1 ? " player" : " players");
            var share = form.querySelector(".c");
            if (share) share.addEventListener("click", function () {
              shareLink(link, (challenge && score > challenge.score ? "I just beat " + challenge.name + ". " : "") + "I scored " + fmt(score) + (title ? " on " + title : "") + ". Beat it:").then(
                function (how) { share.textContent = how === "copied" ? "Link copied" : "Sent"; },
                function (e) { if (!e || e.name !== "AbortError") { try { window.prompt("Send this link to a friend:", link); } catch (x) {} } }
              );
            });
            var go = form.querySelector(".y");
            go.addEventListener("click", function () { close(j); });
            go.focus();
          })
          .catch(function () { btn.textContent = "Retry"; });
      });
      (document.body || document.documentElement).appendChild(host);
      setTimeout(function () { input.focus(); input.select(); }, 30);
    });
  }

  window.vesta = {
    submitScore: submitScore,
    game: game,
    version: version,
    shareUrl: shareUrl,
    challenge: challenge,
    milestone: function (name) {
      name = clip(String(name).trim(), 48);
      if (!name || milestones[name] || milestoneCount >= 40) return;
      milestones[name] = 1; milestoneCount++;
      push({ t: "ms", n: name });
    },
    error: function (message) { report("game", String(message), "", 0, 0, new Error().stack || ""); }
  };

  send([{ t: "start", ref: clip(document.referrer ? "embed" : "direct", 16) }]);
})();`;
