import "server-only";

// Resolves the public origin of this site on the server, never from
// client-sent data. Used to build links that leave the app (e.g. the
// password reset email), where a spoofed origin would send users to an
// attacker's domain.
// SITE_URL wins when configured; otherwise the request's own host is
// used, the same trust level as `request.nextUrl.origin`.
export function getSiteOrigin(
  requestHeaders: Headers,
  siteUrl: string | undefined = process.env.SITE_URL,
): string {
  if (siteUrl) return new URL(siteUrl).origin;

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    throw new Error("Cannot resolve site origin: SITE_URL is unset and the request has no host");
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}
