import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod/v4";

import { calcClosures } from "./table";

// Persisted rows. There is no public input schema on purpose: a closure is
// built entirely by the server from the user's own catalog and the current
// period, so the client cannot choose its contents or its version.
export const calcClosureRowSchema = createSelectSchema(calcClosures);

export type CalcClosureRow = z.infer<typeof calcClosureRowSchema>;
