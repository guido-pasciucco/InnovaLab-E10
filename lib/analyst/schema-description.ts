import { ANALYST_VIEWS } from "./views";

// One column of an `analyst` view, as the database describes it. The comments
// come from the migration: they are what the model reads to interpret the data.
export type AnalystColumnInfo = {
  view: string;
  viewComment: string | null;
  column: string;
  type: string;
  comment: string | null;
};

// Text for the agent's prompt: every view, with its columns, types and
// comments. Only views in ANALYST_VIEWS are listed, in that order, so the
// prompt cannot offer something the SQL validator would reject.
export function formatAnalystSchema(columns: AnalystColumnInfo[]): string {
  const blocks: string[] = [];

  for (const view of ANALYST_VIEWS) {
    const viewColumns = columns.filter((column) => column.view === view);
    if (viewColumns.length === 0) continue;

    const lines = viewColumns.map(
      ({ column, type, comment }) => `  - ${column} (${type})${comment ? `: ${comment}` : ""}`,
    );
    const description = viewColumns[0].viewComment ? `: ${viewColumns[0].viewComment}` : "";
    blocks.push(`Vista ${view}${description}\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}
