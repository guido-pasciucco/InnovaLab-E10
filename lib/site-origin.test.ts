import { describe, expect, it } from "vitest";
import { getSiteOrigin } from "./site-origin";

describe("getSiteOrigin", () => {
  it("prefers the configured SITE_URL over any request header", () => {
    const headers = new Headers({ host: "evil.example" });
    expect(getSiteOrigin(headers, "https://app.example.com/some/path")).toBe("https://app.example.com");
  });

  it("falls back to the forwarded host and protocol", () => {
    const headers = new Headers({ "x-forwarded-host": "app.example.com", "x-forwarded-proto": "https", host: "internal:3000" });
    expect(getSiteOrigin(headers, undefined)).toBe("https://app.example.com");
  });

  it("uses http for a plain localhost host", () => {
    expect(getSiteOrigin(new Headers({ host: "localhost:3000" }), undefined)).toBe("http://localhost:3000");
  });

  it("defaults to https for other hosts without a forwarded protocol", () => {
    expect(getSiteOrigin(new Headers({ host: "app.example.com" }), undefined)).toBe("https://app.example.com");
  });

  it("throws when nothing identifies the site", () => {
    expect(() => getSiteOrigin(new Headers(), undefined)).toThrow();
  });
});
