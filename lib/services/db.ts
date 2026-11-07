import { closeDrizzleClient } from "@/lib/db/client";

// lib/db solo se importa desde lib/services/ (ver eslint.config.mjs), así que
// los scripts que no son request (seeds) cierran el pool por este helper.
export function closeDb(): Promise<void> {
  return closeDrizzleClient();
}
