import "server-only";

type SiteOriginEnv = { SITE_URL?: string; NODE_ENV?: string };

// Resolves the public origin of this site on the server, never from
// client-sent data. Used to build links that leave the app (e.g. the
// password reset email), where a spoofed origin would send users to an
// attacker's domain.
// SITE_URL is required in production: Host and X-Forwarded-Host are
// request headers any client can set, so they are only trusted as a
// local-development convenience when SITE_URL is unset.
export function getSiteOrigin(
  requestHeaders: Headers,
  env: SiteOriginEnv = { SITE_URL: process.env.SITE_URL, NODE_ENV: process.env.NODE_ENV },
): string {
  if (env.SITE_URL) return new URL(env.SITE_URL).origin;

  if (env.NODE_ENV === "production") {
    throw new Error("Cannot resolve site origin: SITE_URL must be set in production");
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    throw new Error("Cannot resolve site origin: SITE_URL is unset and the request has no host");
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}
