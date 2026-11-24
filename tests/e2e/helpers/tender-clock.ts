import postgres from "postgres";
import { assertLocalUrl, loadTestEnv } from "../../support/test-env";

// Tender rounds and the close are derived from the server clock
// (docs/flujos/09-licitaciones.md RN-03, RN-12), so a test cannot wait 12 hours for a
// tender to close. This back door moves a tender's window into the past,
// keeping its length, which is what the clock would show once it ended.
// Refuses to run unless DATABASE_URL is local.
export async function moveTenderToThePast(tenderId: string): Promise<void> {
  const env = loadTestEnv();
  assertLocalUrl("DATABASE_URL", env.DATABASE_URL);

  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql`
      update tenders
      set ends_at = now() - interval '1 minute',
          starts_at = now() - interval '1 minute' - make_interval(hours => round_hours * round_count)
      where id = ${tenderId}
      returning id
    `;
    if (rows.length !== 1) throw new Error(`[e2e] Tender ${tenderId} not found.`);
  } finally {
    await sql.end();
  }
}
