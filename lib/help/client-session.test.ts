import { describe, expect, it } from "vitest";
import {
  createHelpRequestGuard,
  helpThreadStorageKey,
  readHelpThread,
  writeHelpThread,
} from "./client-session";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("help client session", () => {
  it("keeps refreshed history isolated by authenticated user", () => {
    const storage = memoryStorage();
    writeHelpThread(storage, "user-a", [{ role: "user", content: "Mensaje A" }]);
    writeHelpThread(storage, "user-b", [{ role: "user", content: "Mensaje B" }]);

    expect(readHelpThread(storage, "user-a")).toEqual([{ role: "user", content: "Mensaje A" }]);
    expect(readHelpThread(storage, "user-b")).toEqual([{ role: "user", content: "Mensaje B" }]);
    expect(helpThreadStorageKey("user-a")).not.toBe(helpThreadStorageKey("user-b"));
  });

  it("invalidates a pending stream on logout or account change", () => {
    const guard = createHelpRequestGuard();
    const request = guard.start();

    guard.invalidate();

    expect(request.controller.signal.aborted).toBe(true);
    expect(request.isCurrent()).toBe(false);
  });

  it("prevents an older response from updating a newer conversation", () => {
    const guard = createHelpRequestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(first.controller.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });
});
