import { ChartView } from "./chart-view";
import { EMPTY_ANSWER_TEXT, type AnswerView, type QueryView } from "./messages";
import { ResultTable } from "./result-table";

type AnswerProps = {
  view: AnswerView;
  // The stream for this answer is over. Without text by then, there is
  // nothing to wait for, so a fallback replaces the empty card.
  finished: boolean;
};

const detailsClass = "rounded-2xl bg-surface-tint px-4 py-2 text-sm text-fg";
const summaryClass =
  "min-h-11 cursor-pointer py-2.5 font-semibold text-brand-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// One answer of the assistant: the text, the charts and tables of the queries
// it ran, and the documents it read. The SQL only shows when the server sent
// it (CHAT_DATOS_SHOW_SQL).
export function Answer({ view, finished }: AnswerProps) {
  const hasText = view.text !== "";
  const showFallback = finished && !hasText && view.queries.length === 0;

  return (
    <div className="space-y-4 rounded-3xl bg-surface p-5 text-base text-fg shadow-sm">
      {hasText &&
        view.text.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap">
            {paragraph}
          </p>
        ))}

      {showFallback && <p className="text-fg-muted">{EMPTY_ANSWER_TEXT}</p>}

      {view.queries.map((query, index) => (
        <QueryBlock key={index} query={query} />
      ))}

      {!finished && view.working && (
        <p role="status" className="text-sm text-fg-muted">
          Consultando tus datos…
        </p>
      )}

      {view.sources.length > 0 && (
        <p className="text-sm text-fg-muted">
          Fuentes: {view.sources.map((source) => source.heading).join(" · ")}
        </p>
      )}
    </div>
  );
}

function QueryBlock({ query }: { query: QueryView }) {
  const { chart } = query;

  return (
    <div className="space-y-3">
      {chart && (
        <figure className="m-0 space-y-2">
          <figcaption className="text-sm font-semibold text-fg">{chart.title}</figcaption>
          <ChartView chart={chart} />
        </figure>
      )}

      {/* A table chart already is the data; no second copy under it. */}
      {query.rows.length > 0 && chart?.type !== "table" && (
        <details className={detailsClass}>
          <summary className={summaryClass}>Ver los datos</summary>
          <div className="space-y-2 pb-2">
            <ResultTable caption="Datos de la consulta" columns={query.columns} rows={query.rows} format="number" />
            {query.truncated && (
              <p className="text-fg-muted">Hay más filas que las que se muestran.</p>
            )}
          </div>
        </details>
      )}

      {query.sql && (
        <details className={detailsClass}>
          <summary className={summaryClass}>Ver la consulta SQL</summary>
          <pre className="overflow-x-auto pb-2 text-xs whitespace-pre-wrap">{query.sql}</pre>
        </details>
      )}
    </div>
  );
}
