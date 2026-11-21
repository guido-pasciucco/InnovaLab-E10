const HIDDEN_VALUE = "[valor oculto]";

/**
 * Picks the line of a failed CLI run that explains the failure.
 *
 * The Vercel CLI and `bunx` print a banner and progress lines before the
 * actual error, so the first line of the output never says what went wrong.
 * The value being uploaded is replaced in case the CLI echoes it back.
 */
export function failureDetail(output: string, value: string): string | undefined {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const line = lines.find((candidate) => /^error\b/i.test(candidate)) ?? lines.at(-1);
  if (!line) return undefined;

  return value ? line.replaceAll(value, HIDDEN_VALUE) : line;
}
