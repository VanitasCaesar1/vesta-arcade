// Creator alerts: new player comments and new crashes, posted to a Discord or Slack webhook.
// Only those two hosts are accepted, so a game key can't make the Worker call arbitrary URLs.

const ALLOWED = [/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/, /^https:\/\/hooks\.slack\.com\/services\/[\w/]+$/];

export function validWebhook(url: string): boolean {
  return url.length < 300 && ALLOWED.some((re) => re.test(url));
}

export async function notify(url: string | null | undefined, text: string): Promise<void> {
  if (!url || !validWebhook(url)) return;
  const body = url.includes("hooks.slack.com") ? { text } : { content: text.slice(0, 1900), allowed_mentions: { parse: [] } };
  try {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    console.error("webhook failed", e);
  }
}
