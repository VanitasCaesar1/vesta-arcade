export const now = () => Math.floor(Date.now() / 1000);

export const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export function daysAgo(n: number): string {
  return today(Date.now() - n * 86_400_000);
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison, so token checks don't leak timing. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export async function hmac(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A per-arcade hash of the visitor's IP, for likes and spam limits. The raw IP is never stored. */
export function ipHash(req: Request, pepper: string): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "local";
  return sha256(`${pepper}:${ip}`).then((h) => h.slice(0, 32));
}

export function parseJSONArray(s: string | null | undefined): string[] {
  try {
    const v = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // Drop control characters except newlines and tabs, collapse runaway whitespace.
  return v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

export function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = cleanText(item, maxLen);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function timeAgo(unix: number): string {
  const s = Math.max(0, now() - unix);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86_400 * 30) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export const SESSION_BUCKETS = ["<10s", "10-30s", "30-60s", "1-3m", "3-10m", "10m+"] as const;

export function sessionBucket(seconds: number): number {
  if (seconds < 10) return 0;
  if (seconds < 30) return 1;
  if (seconds < 60) return 2;
  if (seconds < 180) return 3;
  if (seconds < 600) return 4;
  return 5;
}
