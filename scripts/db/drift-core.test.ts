import { describe, expect, it } from "vitest";
import { diffMigrationHashes } from "./drift-core";

// The detector compares sets, not timestamps: drizzle-kit migrate only applies
// entries newer than the database watermark, so an applied migration from
// another branch stays in the database and is never rolled back. These cases
// pin the only reliable check: sha256 of each local file against the stored
// hash, counted as a multiset so duplicate content is not collapsed.

describe("diffMigrationHashes", () => {
  it("reports no drift when every file hash is applied", () => {
    const result = diffMigrationHashes(
      ["hash-a", "hash-b"],
      [
        { name: "001_a.sql", hash: "hash-a" },
        { name: "002_b.sql", hash: "hash-b" },
      ],
    );

    expect(result).toEqual({ pending: [], orphan: [], aligned: true });
  });

  it("reports a pending file with its name and hash when it was never applied", () => {
    const result = diffMigrationHashes(
      ["hash-a"],
      [
        { name: "001_a.sql", hash: "hash-a" },
        { name: "002_b.sql", hash: "hash-b" },
      ],
    );

    expect(result.pending).toEqual([{ name: "002_b.sql", hash: "hash-b" }]);
    expect(result.orphan).toEqual([]);
    expect(result.aligned).toBe(false);
  });

  it("reports an orphan hash when the database applied it but the branch has no file", () => {
    const result = diffMigrationHashes(
      ["hash-a", "hash-orphan"],
      [{ name: "001_a.sql", hash: "hash-a" }],
    );

    expect(result.pending).toEqual([]);
    expect(result.orphan).toEqual(["hash-orphan"]);
    expect(result.aligned).toBe(false);
  });

  it("reports pending and orphan hashes together", () => {
    const result = diffMigrationHashes(
      ["hash-a", "hash-orphan"],
      [
        { name: "001_a.sql", hash: "hash-a" },
        { name: "002_b.sql", hash: "hash-b" },
      ],
    );

    expect(result.pending).toEqual([{ name: "002_b.sql", hash: "hash-b" }]);
    expect(result.orphan).toEqual(["hash-orphan"]);
    expect(result.aligned).toBe(false);
  });

  it("counts duplicate file hashes instead of collapsing them into one", () => {
    const result = diffMigrationHashes(
      ["hash-a"],
      [
        { name: "001_a.sql", hash: "hash-a" },
        { name: "002_a_copy.sql", hash: "hash-a" },
      ],
    );

    expect(result.pending).toEqual([{ name: "002_a_copy.sql", hash: "hash-a" }]);
    expect(result.orphan).toEqual([]);
  });

  it("counts duplicate applied hashes instead of collapsing them into one", () => {
    const result = diffMigrationHashes(
      ["hash-a", "hash-a"],
      [{ name: "001_a.sql", hash: "hash-a" }],
    );

    expect(result.pending).toEqual([]);
    expect(result.orphan).toEqual(["hash-a"]);
  });

  it("keeps file order for pending entries and applied order for orphans", () => {
    const result = diffMigrationHashes(
      ["orphan-2", "hash-b", "orphan-1"],
      [
        { name: "001_a.sql", hash: "hash-a" },
        { name: "002_b.sql", hash: "hash-b" },
        { name: "003_c.sql", hash: "hash-c" },
      ],
    );

    expect(result.pending.map((file) => file.name)).toEqual(["001_a.sql", "003_c.sql"]);
    expect(result.orphan).toEqual(["orphan-2", "orphan-1"]);
  });

  it("treats an empty database history as every file pending", () => {
    const result = diffMigrationHashes(
      [],
      [{ name: "001_a.sql", hash: "hash-a" }],
    );

    expect(result.pending).toEqual([{ name: "001_a.sql", hash: "hash-a" }]);
    expect(result.orphan).toEqual([]);
    expect(result.aligned).toBe(false);
  });
});
