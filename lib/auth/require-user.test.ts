import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const getSessionUserService = vi.fn();
const createRscSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/rsc", () => ({ createRscSupabaseClient: () => createRscSupabaseClient() }));
vi.mock("@/lib/services/auth", () => ({
  getSessionUserService: (...args: unknown[]) => getSessionUserService(...args),
}));

const { requireUser } = await import("./require-user");

async function redirectTarget(): Promise<string> {
  try {
    await requireUser();
  } catch (err) {
    const [kind, , target] = ((err as { digest?: string }).digest ?? "").split(";");
    if (kind === "NEXT_REDIRECT") return target;
    throw err;
  }
  throw new Error("requireUser did not redirect");
}

describe("requireUser", () => {
  beforeEach(() => {
    getSessionUserService.mockReset();
    createRscSupabaseClient.mockReset().mockResolvedValue({ tag: "client" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the session user", async () => {
    getSessionUserService.mockResolvedValue({ id: "u1", email: "a@b.com" });
    await expect(requireUser()).resolves.toEqual({ id: "u1", email: "a@b.com" });
    expect(getSessionUserService).toHaveBeenCalledWith({ tag: "client" });
  });

  it("redirects to /login when there is no session", async () => {
    getSessionUserService.mockRejectedValue(new AppError("UNAUTHORIZED"));
    await expect(redirectTarget()).resolves.toBe("/login");
  });

  it("lets Next.js control-flow errors through (dynamic rendering bailout)", async () => {
    const bailout = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
    createRscSupabaseClient.mockRejectedValue(bailout);
    await expect(requireUser()).rejects.toBe(bailout);
  });

  it("redirects to /login and logs when the client cannot be created", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    createRscSupabaseClient.mockRejectedValue(new Error("Missing Supabase environment variables"));
    await expect(redirectTarget()).resolves.toBe("/login");
    expect(error).toHaveBeenCalled();
  });
});
