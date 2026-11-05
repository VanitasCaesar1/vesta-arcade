import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "../lib/env.ts";
import { hmac, safeEqual } from "../lib/util.ts";

const COOKIE = "vesta_session";
const SESSION_DAYS = 30;

export function bearer(c: Context<AppEnv>): string | null {
  const h = c.req.header("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

export function tokenConfigured(c: Context<AppEnv>): boolean {
  return typeof c.env.ADMIN_TOKEN === "string" && c.env.ADMIN_TOKEN.length >= 16;
}

async function sessionValid(c: Context<AppEnv>): Promise<boolean> {
  const value = getCookie(c, COOKIE);
  if (!value || !tokenConfigured(c)) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(c.env.ADMIN_TOKEN, `session:${exp}`));
}

export async function isAdmin(c: Context<AppEnv>): Promise<boolean> {
  if (!tokenConfigured(c)) return false;
  const token = bearer(c);
  if (token) return safeEqual(token, c.env.ADMIN_TOKEN);
  return sessionValid(c);
}

/**
 * Admin access: a Bearer token (CLI, MCP) or the dashboard's session cookie.
 * Cookie requests that change something must also send x-vesta-csrf, which a
 * cross-site form can't do. The cookie is SameSite=Strict as a second guard.
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!tokenConfigured(c)) return c.json({ error: "ADMIN_TOKEN is not set (16+ characters). Run `npx vesta-arcade setup`." }, 503);
  const token = bearer(c);
  if (token) {
    if (!safeEqual(token, c.env.ADMIN_TOKEN)) return c.json({ error: "invalid token" }, 401);
    return next();
  }
  if (!(await sessionValid(c))) return c.json({ error: "not signed in" }, 401);
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.header("x-vesta-csrf") !== "1") {
    return c.json({ error: "missing x-vesta-csrf header" }, 403);
  }
  return next();
};

export async function startSession(c: Context<AppEnv>): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  setCookie(c, COOKIE, `${exp}.${await hmac(c.env.ADMIN_TOKEN, `session:${exp}`)}`, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function endSession(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIE, { path: "/" });
}
