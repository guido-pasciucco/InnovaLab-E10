export type MigrationFile = {
  name: string;
  hash: string;
};

export type DriftReport = {
  pending: MigrationFile[];
  orphan: string[];
  aligned: boolean;
};

// Compare the local migration files against the hashes stored in
// drizzle.__drizzle_migrations. Drizzle-kit migrate decides by `created_at`
// watermark, not by hash, so an applied migration from another branch stays in
// the database and is never rolled back. The comparison is a multiset: two
// files with the same content must match two applied rows.
export function diffMigrationHashes(
  appliedHashes: string[],
  files: MigrationFile[],
): DriftReport {
  const remainingApplied = new Map<string, number>();

  for (const hash of appliedHashes) {
    remainingApplied.set(hash, (remainingApplied.get(hash) ?? 0) + 1);
  }

  const pending: MigrationFile[] = [];

  for (const file of files) {
    const remaining = remainingApplied.get(file.hash) ?? 0;

    if (remaining > 0) {
      remainingApplied.set(file.hash, remaining - 1);
    } else {
      pending.push(file);
    }
  }

  const orphan = appliedHashes.filter((hash) => {
    const remaining = remainingApplied.get(hash) ?? 0;

    if (remaining === 0) {
      return false;
    }

    remainingApplied.set(hash, remaining - 1);
    return true;
  });

  return {
    pending,
    orphan,
    aligned: pending.length === 0 && orphan.length === 0,
  };
}
