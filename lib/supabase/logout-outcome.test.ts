import { describe, expect, it } from "vitest";

import { createLogoutOutcomeTracker } from "./logout-outcome";

describe("createLogoutOutcomeTracker", () => {
  it("registra un fallo remoto aun si el SDK entrega una Request de otro runtime", async () => {
    const tracker = createLogoutOutcomeTracker(async () => new Response(null, { status: 500 }));
    const request = {
      method: "POST",
      url: "http://127.0.0.1:54321/auth/v1/logout?scope=global",
    } as unknown as Request;

    await tracker.fetch(request);

    expect(tracker.getOutcome()).toBe("failed");
  });
});
