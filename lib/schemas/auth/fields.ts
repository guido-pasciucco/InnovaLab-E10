import { z } from "zod";

// Field rules: the single origin of every auth validation rule and its
// message. ./auth.ts composes them into the contracts, and form-only fields
// (the password confirmation) reuse them instead of copying the rule.
// Pure and client-safe: no db, no window.

export const emailField = z.email({ error: "Enter a valid email address" });

export const passwordField = z.string().min(8, { error: "Password must be at least 8 characters" });
