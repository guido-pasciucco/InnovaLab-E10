// Sanitizes a post-login/post-confirm `next` param so it can only point
// inside this app. Anything that could escape the origin (absolute URLs,
// "//host", backslash tricks, control characters) yields the fallback.
// Pure on purpose: no Next or Supabase imports, safe to use anywhere.
const PARSE_BASE = "http://same-origin.invalid";

export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Browsers treat "\" as "/", so "/\evil.example" is protocol-relative.
  if (next.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(next)) return fallback;

  const url = new URL(next, PARSE_BASE);
  if (url.origin !== PARSE_BASE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
