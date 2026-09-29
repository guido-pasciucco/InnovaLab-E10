// Minimal client for the Mailpit REST API bundled with the Supabase CLI
// (web UI + API on the [local_smtp] port of supabase/config.toml).
// Docs: https://mailpit.axllent.org/docs/api-v1/

type MailpitSummary = { ID: string; Subject: string; Created: string };
type MailpitSearch = { messages: MailpitSummary[] };
type MailpitMessage = { ID: string; Subject: string; HTML: string; Text: string };

const POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 15_000;

function mailpitUrl(): string {
  const url = process.env.MAILPIT_URL;
  if (!url) throw new Error("[e2e] MAILPIT_URL is not set (see .env.test).");
  return url.replace(/\/$/, "");
}

async function getJson<T>(pathAndQuery: string): Promise<T> {
  const response = await fetch(`${mailpitUrl()}${pathAndQuery}`);
  if (!response.ok) {
    throw new Error(`[e2e] Mailpit ${pathAndQuery} answered HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

// Messages sent to `email`, newest first (Mailpit's default order).
async function searchByRecipient(email: string): Promise<MailpitSummary[]> {
  const query = encodeURIComponent(`to:"${email}"`);
  const result = await getJson<MailpitSearch>(`/api/v1/search?query=${query}`);
  return result.messages ?? [];
}

async function getMessage(id: string): Promise<MailpitMessage> {
  return getJson<MailpitMessage>(`/api/v1/message/${id}`);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x3D;|&#61;/g, "=")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Every Supabase auth link goes through GoTrue's /auth/v1/verify endpoint.
function extractVerifyLinks(message: MailpitMessage): string[] {
  const links = new Set<string>();
  for (const match of message.HTML.matchAll(/href="([^"]+)"/g)) {
    links.add(decodeHtmlEntities(match[1]));
  }
  for (const match of message.Text.matchAll(/https?:\/\/\S+/g)) {
    links.add(match[0].replace(/[)\]>.,]+$/, ""));
  }
  return [...links].filter((link) => link.includes("/auth/v1/verify"));
}

export type AuthLinkType = "signup" | "recovery";

// Polls Mailpit until the latest mail for `email` carries a GoTrue verify
// link of the given type, and returns that link.
export async function waitForAuthLink(
  email: string,
  type: AuthLinkType,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const summary of await searchByRecipient(email)) {
      const message = await getMessage(summary.ID);
      const link = extractVerifyLinks(message).find(
        (candidate) => new URL(candidate).searchParams.get("type") === type,
      );
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`[e2e] No "${type}" email for ${email} reached Mailpit within ${timeoutMs}ms.`);
}
