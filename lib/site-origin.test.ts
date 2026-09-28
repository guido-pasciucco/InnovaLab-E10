import { describe, expect, it } from "vitest";
import { getSiteOrigin } from "./site-origin";

const dev = { SITE_URL: undefined, NODE_ENV: "development" };

describe("getSiteOrigin", () => {
  it("prefers the configured SITE_URL over any request header", () => {
    const headers = new Headers({ host: "evil.example", "x-forwarded-host": "evil.example" });
    expect(getSiteOrigin(headers, { SITE_URL: "https://app.example.com/some/path", NODE_ENV: "production" })).toBe(
      "https://app.example.com",
    );
  });

  it("throws in production when SITE_URL is unset, instead of trusting request headers", () => {
    const headers = new Headers({ "x-forwarded-host": "evil.example", host: "evil.example" });
    expect(() => getSiteOrigin(headers, { SITE_URL: undefined, NODE_ENV: "production" })).toThrow(/SITE_URL/);
  });

  it("treats an empty SITE_URL in production as unset", () => {
    expect(() => getSiteOrigin(new Headers({ host: "app.example.com" }), { SITE_URL: "", NODE_ENV: "production" })).toThrow(
      /SITE_URL/,
    );
  });

  it("falls back to the forwarded host and protocol outside production", () => {
    const headers = new Headers({ "x-forwarded-host": "app.example.com", "x-forwarded-proto": "https", host: "internal:3000" });
    expect(getSiteOrigin(headers, dev)).toBe("https://app.example.com");
  });

  it("uses http for a plain localhost host outside production", () => {
    expect(getSiteOrigin(new Headers({ host: "localhost:3000" }), dev)).toBe("http://localhost:3000");
  });

  it("defaults to https for other hosts without a forwarded protocol outside production", () => {
    expect(getSiteOrigin(new Headers({ host: "app.example.com" }), dev)).toBe("https://app.example.com");
  });

  it("throws outside production when nothing identifies the site", () => {
    expect(() => getSiteOrigin(new Headers(), dev)).toThrow();
  });
});
