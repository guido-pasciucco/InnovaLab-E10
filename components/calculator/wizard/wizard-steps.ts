// Wizard step -> route. Every step has a route, even if it is a placeholder.
export const STEP_HREFS: Readonly<Record<number, string>> = {
  1: "/paso-1",
  2: "/paso-2",
  3: "/paso-3",
  4: "/paso-4",
  5: "/paso-5",
  6: "/paso-6",
  7: "/paso-7",
};

export const TOTAL_STEPS = 7;

// The viewed step comes from the route, not from the persisted progress, so
// going back to edit an earlier step shows that step as the current one.
export function stepFromPathname(pathname: string): number | null {
  const match = /^\/paso-(\d+)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  const step = Number(match[1]);
  return step >= 1 && step <= TOTAL_STEPS ? step : null;
}
