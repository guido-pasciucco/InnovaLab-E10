import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import {
  getCalculatorSetupService,
  getDraftCalculationId,
  saveCalculatorSetupService,
} from "./calculator";

const operations = [
  ["saveCalculatorSetupService", (client: SupabaseClient, db?: Db) => saveCalculatorSetupService(client, {}, db)],
  ["getCalculatorSetupService", (client: SupabaseClient, db?: Db) => getCalculatorSetupService(client, db)],
  ["getDraftCalculationId", (client: SupabaseClient, db?: Db) => getDraftCalculationId(client, db)],
] as const;

for (const [name, operation] of operations) {
  describe(name, () => {
    it.each([
      ["the session is missing", { data: { user: null }, error: null }],
      ["the session is expired", { data: { user: null }, error: { code: "session_expired", status: 401 } }],
      ["authentication fails despite a returned user", { data: { user: { id: "untrusted" } }, error: { status: 503 } }],
    ])("rejects without accessing the database when %s", async (_scenario, response) => {
      const client = { auth: { getUser: vi.fn().mockResolvedValue(response) } } as unknown as SupabaseClient;
      const select = vi.fn();
      const transaction = vi.fn();
      const db = { select, transaction } as unknown as Db;

      await expect(operation(client, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));

      expect(select).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });

    it("propagates authentication transport errors before resolving a database", async () => {
      const failure = new Error("Authentication unavailable");
      const client = { auth: { getUser: vi.fn().mockRejectedValue(failure) } } as unknown as SupabaseClient;

      await expect(operation(client)).rejects.toBe(failure);
    });
  });
}
