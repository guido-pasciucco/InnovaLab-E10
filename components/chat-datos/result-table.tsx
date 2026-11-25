import type { ChartRow, ResolvedChart } from "@/lib/chat-datos/chart-spec";

import { formatChartValue } from "./format";

type ResultTableProps = {
  caption: string;
  columns: readonly string[];
  rows: readonly Record<string, unknown>[];
  format: ResolvedChart["format"];
};

// Plain HTML table of query rows. Scrolls sideways on a narrow screen instead
// of squeezing the columns.
export function ResultTable({ caption, columns, rows, format }: ResultTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-tint text-fg">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border-default">
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-fg">
                  {formatChartValue(row[column] as ChartRow[string], format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
