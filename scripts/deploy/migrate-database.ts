import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// A private pool with one persistent connection. No caller can borrow it while
// the session lock covers Drizzle's high-water read and entire transaction.
// postgres.reserve() lacks begin/options at runtime in the installed version.
export async function migrateDatabase(url: string, migrationsFolder: string) {
  let stopping = false;
  const client = postgres(url, {
    max: 1, idle_timeout: 0, max_lifetime: 0, onnotice: () => {},
    // Do not transparently reconnect and continue after losing the session lock.
    // Closing the private pool makes subsequent operations fail; rerun the CLI.
    onclose: () => {
      if (!stopping) {
        stopping = true;
        void client.end({ timeout: 0 });
      }
    },
  });
  try {
    await client`select pg_advisory_lock(259, 20261124)`;
    try {
      await migrate(drizzle(client), { migrationsFolder });
    } finally {
      await client`select pg_advisory_unlock(259, 20261124)`;
    }
  } finally {
    stopping = true;
    await client.end();
  }
}
