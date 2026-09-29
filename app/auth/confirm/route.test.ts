import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";

const confirmAuthLinkService = vi.fn();
const client = { tag: "rsc-client" };

vi.mock("@/lib/supabase/rsc", () => ({ createRscSupabaseClient: async () => client }));
vi.mock("@/lib/services/auth", () => ({
  confirmAuthLinkService: (...args: unknown[]) => confirmAuthLinkService(...args),
}));

const { GET } = await import("./route");

// redirect() works by throwing; its digest carries the target URL.
async function redirectTarget(url: string): Promise<string> {
  try {
    await GET(new NextRequest(url));
  } catch (err) {
    const digest = (err as { digest?: string }).digest ?? "";
    const [kind, , target] = digest.split(";");
    if (kind === "NEXT_REDIRECT") return target;
    throw err;
  }
  throw new Error("GET did not redirect");
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    confirmAuthLinkService.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the link params to the service", async () => {
    confirmAuthLinkService.mockResolvedValue({});
    await redirectTarget("http://localhost:3000/auth/confirm?code=abc&token_hash=h&type=recovery");
    expect(confirmAuthLinkService).toHaveBeenCalledWith(client, { code: "abc", tokenHash: "h", type: "recovery" });
  });

  it("redirects to the safe next path after confirming", async () => {
    confirmAuthLinkService.mockResolvedValue({});
    await expect(redirectTarget("http://localhost:3000/auth/confirm?code=abc&next=/dashboard")).resolves.toBe(
      "/dashboard",
    );
  });

  it("defaults to /update-password when next is missing", async () => {
    confirmAuthLinkService.mockResolvedValue({});
    await expect(redirectTarget("http://localhost:3000/auth/confirm?code=abc")).resolves.toBe("/update-password");
  });

  it("never redirects off-site through next", async () => {
    confirmAuthLinkService.mockResolvedValue({});
    await expect(
      redirectTarget("http://localhost:3000/auth/confirm?code=abc&next=//evil.example"),
    ).resolves.toBe("/update-password");
  });

  it("sends the user back to /reset-password with the error code on failure", async () => {
    confirmAuthLinkService.mockRejectedValue(new AppError("AUTH_LINK_INVALID"));
    await expect(redirectTarget("http://localhost:3000/auth/confirm?code=bad")).resolves.toBe(
      "/reset-password?error=AUTH_LINK_INVALID",
    );
  });

  it("lets Next.js control-flow errors through", async () => {
    const bailout = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
    confirmAuthLinkService.mockRejectedValue(bailout);
    await expect(GET(new NextRequest("http://localhost:3000/auth/confirm?code=abc"))).rejects.toBe(bailout);
  });

  it("reports unexpected failures as AUTH_UNAVAILABLE", async () => {
    confirmAuthLinkService.mockRejectedValue(new Error("Missing Supabase environment variables"));
    await expect(redirectTarget("http://localhost:3000/auth/confirm?code=abc")).resolves.toBe(
      "/reset-password?error=AUTH_UNAVAILABLE",
    );
  });
});
