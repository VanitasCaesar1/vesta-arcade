import type { ArcadeConfig } from "./config.ts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

export interface Game {
  slug: string;
  title: string;
  description: string;
  author: string;
  madeWith: string[];
  hasCover: boolean;
  version: number | null;
  plays: number;
  likes: number;
  hidden: boolean;
  url?: string;
  updatedAt: number;
}

export class Client {
  constructor(readonly cfg: ArcadeConfig) {}

  async request<T>(method: string, path: string, body?: BodyInit | object, headers: Record<string, string> = {}): Promise<T> {
    const isRaw = body instanceof Uint8Array || body instanceof ArrayBuffer || typeof body === "string" || body instanceof Blob;
    let res: Response;
    try {
      res = await fetch(this.cfg.url + path, {
        method,
        headers: {
          authorization: `Bearer ${this.cfg.token}`,
          ...(body !== undefined && !isRaw ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : isRaw ? (body as BodyInit) : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError(`Can't reach ${this.cfg.url} (${(e as Error).message})`, 0);
    }
    const text = await res.text();
    let data: unknown = text;
    if ((res.headers.get("content-type") ?? "").includes("json")) {
      try {
        data = JSON.parse(text);
      } catch {}
    }
    if (!res.ok) {
      const msg = (data as { error?: string })?.error ?? (text.slice(0, 200) || res.statusText);
      throw new ApiError(res.status === 401 ? `The arcade rejected the token (${msg}). Run: npx vesta-cli login` : msg, res.status, data);
    }
    return data as T;
  }

  me() {
    return this.request<{ ok: boolean; arcade: string; siteUrl: string; playUrl: string; version: string }>("GET", "/api/me");
  }
  games() {
    return this.request<{ games: Game[] }>("GET", "/api/games?sort=new").then((r) => r.games);
  }
  async game(slug: string): Promise<Game | null> {
    try {
      return await this.request<Game>("GET", `/api/games/${slug}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }
  feedback(slug: string, days = 14): Promise<string> {
    return this.request<string>("GET", `/api/games/${slug}/feedback?format=md&days=${days}`);
  }
  deleteGame(slug: string) {
    return this.request("DELETE", `/api/games/${slug}`);
  }
}
