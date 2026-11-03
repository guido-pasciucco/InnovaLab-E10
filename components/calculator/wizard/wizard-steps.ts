// Wizard step -> route.
export const STEP_HREFS: Readonly<Record<number, string>> = {
  1: "/paso-1",
  2: "/paso-2",
  3: "/paso-3",
  4: "/paso-4",
  5: "/paso-5",
  6: "/paso-6",
  7: "/paso-7",
  8: "/paso-8",
};

export const TOTAL_STEPS = 8;

// The viewed step comes from the route, not from the persisted progress, so
// going back to edit an earlier step shows that step as the current one.
export function stepFromPathname(pathname: string): number | null {
  const match = /^\/paso-(\d+)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  const step = Number(match[1]);
  return step >= 1 && step <= TOTAL_STEPS ? step : null;
}

// Where "Empezar cálculo" sends the user: the furthest step they may open, as
// persisted on the server. Anything out of range falls back to the first or
// last step instead of building a route that does not exist.
export function resumeHref(furthestStep: number): string {
  const step = Math.min(Math.max(Math.trunc(furthestStep) || 1, 1), TOTAL_STEPS);
  return `/paso-${step}`;
}
