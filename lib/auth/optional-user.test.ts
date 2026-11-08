import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const getSessionUserService = vi.fn();
const createRscSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/rsc", () => ({ createRscSupabaseClient: () => createRscSupabaseClient() }));
vi.mock("@/lib/services/auth", () => ({
  getSessionUserService: (...args: unknown[]) => getSessionUserService(...args),
}));

const { getOptionalUser } = await import("./optional-user");

describe("getOptionalUser", () => {
  beforeEach(() => {
    getSessionUserService.mockReset();
    createRscSupabaseClient.mockReset().mockResolvedValue({ tag: "client" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the session user", async () => {
    getSessionUserService.mockResolvedValue({ id: "u1", email: "a@b.com" });
    await expect(getOptionalUser()).resolves.toEqual({ id: "u1", email: "a@b.com" });
    expect(getSessionUserService).toHaveBeenCalledWith({ tag: "client" });
  });

  it("returns null without logging when there is no session", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    getSessionUserService.mockRejectedValue(new AppError("UNAUTHORIZED"));
    await expect(getOptionalUser()).resolves.toBeNull();
    expect(error).not.toHaveBeenCalled();
  });

  it("lets Next.js control-flow errors through (dynamic rendering bailout)", async () => {
    const bailout = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
    createRscSupabaseClient.mockRejectedValue(bailout);
    await expect(getOptionalUser()).rejects.toBe(bailout);
  });

  it("returns null and logs when the client cannot be created", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    createRscSupabaseClient.mockRejectedValue(new Error("Missing Supabase environment variables"));
    await expect(getOptionalUser()).resolves.toBeNull();
    expect(error).toHaveBeenCalled();
  });
});
