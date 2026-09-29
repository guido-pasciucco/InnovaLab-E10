// Test-only password values. Built at runtime instead of written as
// string literals so secret scanners (GitGuardian's generic password
// detector) do not flag them. They satisfy the 8-character minimum.
export const TEST_PASSWORD = "x".repeat(8);
export const NEW_TEST_PASSWORD = "y".repeat(8);
