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
// 4. Exposes window.vesta.milestone(name) so games can report progress
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

  // The arcade passes its own page URL in the hash, for share buttons.
  var shareUrl = location.href.replace(/[?#].*$/, "");
  try {
    var m = location.hash.match(/vesta-share=([^&]+)/);
    if (m) {
      shareUrl = decodeURIComponent(m[1]);
      var rest = location.hash.replace(/&?vesta-share=[^&]+/, "").replace(/^#&/, "#");
      history.replaceState(history.state, "", location.pathname + location.search + (rest === "#" ? "" : rest));
    }
  } catch (e) {}

  window.vesta = {
    game: game,
    version: version,
    shareUrl: shareUrl,
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
