// Views of the `analyst` schema the chat agent may query. Single source for the
// SQL validator and for lib/db/analyst-views.int.test.ts, which fails if the
// database and this list drift apart. Adding a view means a migration plus an
// entry here.
export const ANALYST_VIEWS = [
  "products",
  "supplies",
  "recipe_lines",
  "business_expenses",
  "presentations",
  "presentation_packaging",
] as const;

export type AnalystView = (typeof ANALYST_VIEWS)[number];

export const ANALYST_SCHEMA = "analyst";
