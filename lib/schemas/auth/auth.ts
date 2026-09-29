import { z } from "zod";

// Input validation at the edge: strict contract before touching auth.
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});