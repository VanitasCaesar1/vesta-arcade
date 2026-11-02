export interface Env {
  /**
   * "site" serves the arcade, API and admin; "play" serves game files on a separate origin.
   * "auto" (local dev only) picks by hostname: play.* is the play role.
   */
  ROLE: "site" | "play" | "auto";
  ARCADE_NAME: string;
  /** Origin of the play Worker, e.g. https://vesta-play.you.workers.dev */
  PLAY_URL: string;
  /** "1" when the arcade was routed onto a domain that already served a site: unknown paths go to that site. */
  ORIGIN_FALLBACK?: string;
  /** Secret. Publishes games and opens the dashboard. */
  ADMIN_TOKEN: string;
  DB: D1Database;
  FILES: R2Bucket;
}

export type AppEnv = { Bindings: Env };
