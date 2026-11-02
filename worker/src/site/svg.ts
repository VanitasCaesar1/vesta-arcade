// Generated art: cover tiles for games without one, and README badges.
import { compactNumber } from "../lib/util.ts";

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function wrap(title: string, perLine: number, maxLines: number): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= perLine) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1]!.slice(0, perLine - 1) + "…";
    return kept;
  }
  return lines.map((l) => (l.length > perLine + 4 ? l.slice(0, perLine + 3) + "…" : l));
}

/** A 1200×675 tile: warm gradient, a pattern picked from the slug, and the title set large. */
export function coverSvg(slug: string, title: string): string {
  const h = hash(slug);
  const hue = [14, 24, 340, 200, 160, 45, 265, 0][h % 8]!;
  const hue2 = (hue + 30 + ((h >> 3) % 40)) % 360;
  const pattern = (h >> 7) % 3;
  const lines = wrap(title, 16, 3);
  const size = lines.length === 1 ? 128 : lines.length === 2 ? 108 : 90;
  const rng = (() => {
    let x = h || 1;
    return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296;
  })();

  let shapes = "";
  if (pattern === 0) {
    for (let i = 0; i < 9; i++) {
      const r = 40 + rng() * 220;
      shapes += `<circle cx="${(600 + rng() * 650).toFixed(0)}" cy="${(rng() * 500).toFixed(0)}" r="${r.toFixed(0)}" fill="none" stroke="hsl(${hue2} 90% 70% / ${(0.12 + rng() * 0.2).toFixed(2)})" stroke-width="${(2 + rng() * 10).toFixed(0)}"/>`;
    }
  } else if (pattern === 1) {
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 16; x++) {
        if (rng() < 0.42) continue;
        const o = (0.06 + rng() * 0.4).toFixed(2);
        shapes += `<rect x="${560 + x * 42}" y="${y * 42 - 20}" width="34" height="34" rx="4" fill="hsl(${rng() < 0.15 ? hue2 : hue} 95% 62% / ${o})"/>`;
      }
  } else {
    for (let i = 0; i < 7; i++) {
      const y = 60 + i * 70 + rng() * 30;
      shapes += `<path d="M 520 ${y.toFixed(0)} Q 860 ${(y - 160 + rng() * 320).toFixed(0)} 1240 ${(y + rng() * 80).toFixed(0)}" fill="none" stroke="hsl(${hue2} 95% 65% / ${(0.15 + rng() * 0.3).toFixed(2)})" stroke-width="${(3 + rng() * 14).toFixed(0)}" stroke-linecap="round"/>`;
    }
  }
  const text = lines
    .map((l, i) => `<text x="72" y="${675 - 90 - (lines.length - 1 - i) * size * 0.98}" font-size="${size}">${escapeXml(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 14%)"/><stop offset="1" stop-color="hsl(${hue2} 75% 30%)"/></linearGradient>
<radialGradient id="v" cx=".25" cy=".9" r=".9"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="675" fill="url(#g)"/>${shapes}<rect width="1200" height="675" fill="url(#v)"/>
<g font-family="Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" fill="#f5f5f3" letter-spacing="-4">${text}</g>
</svg>`;
}

export function badgeSvg(label: string, plays: number): string {
  const left = "▶ play";
  const right = `${label} · ${compactNumber(plays)} plays`;
  const lw = 52;
  const rw = Math.round(right.length * 6.6 + 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="22" role="img" aria-label="${escapeXml(`${left}: ${right}`)}">
<rect rx="5" width="${lw + rw}" height="22" fill="#141416"/><rect rx="5" x="${lw}" width="${rw}" height="22" fill="#ff5a1f"/><rect x="${lw}" width="6" height="22" fill="#ff5a1f"/>
<g font-family="Verdana, DejaVu Sans, sans-serif" font-size="11" font-weight="600">
<text x="10" y="15" fill="#ededeb">${escapeXml(left)}</text><text x="${lw + 9}" y="15" fill="#1a0800">${escapeXml(right)}</text></g></svg>`;
}
