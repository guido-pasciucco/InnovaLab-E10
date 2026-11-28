import type { ClosureChange, ClosureChangeKind, ClosureSnapshot } from "@/lib/types/closure";

// Audit of a monthly closure (#322, D6). A correction is a new version of the
// same month, so the audit is just the field-by-field difference between two
// consecutive snapshots. This is pure: no persistence, no formatting of money
// (the values are the exact strings the services produced), no clock reads.
//
// Keys are stable ids from the snapshot, not positions, so adding or removing a
// supply or a product does not shift every other row. A key present only in the
// older snapshot is a removal; one present only in the newer snapshot is an
// addition. Both are reported with an em dash on the missing side. Each field
// carries its value kind so the view never has to guess from a display label.

type Field = { label: string; value: string; kind: ClosureChangeKind };

const MISSING = "—";

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return MISSING;
  return String(value);
}

function collect(
  fields: Map<string, Field>,
  key: string,
  label: string,
  value: string | number | null,
  kind: ClosureChangeKind,
) {
  fields.set(key, { label, value: text(value), kind });
}

export function flattenClosureSnapshot(snapshot: ClosureSnapshot): Map<string, Field> {
  const fields = new Map<string, Field>();
  const { inputs, results } = snapshot;

  collect(
    fields,
    "business:defaultMarkup",
    "Recargo por defecto del negocio",
    inputs.defaultMarkupPercent,
    "percent",
  );

  for (const supply of inputs.supplies) {
    const key = `supply:${supply.id}`;
    collect(fields, `${key}:name`, `${supply.name} · nombre`, supply.name, "text");
    collect(fields, `${key}:unit`, `${supply.name} · unidad`, supply.unit, "text");
    collect(fields, `${key}:price`, `${supply.name} · precio`, supply.price, "money");
  }

  for (const line of inputs.periodCostLines) {
    collect(
      fields,
      `cost:${line.id}:amount`,
      `${line.concept} · importe`,
      line.amountPeriod,
      "money",
    );
  }

  for (const product of inputs.products) {
    const key = `product:${product.id}`;
    collect(fields, `${key}:capacity`, `${product.name} · capacidad`, product.monthlyCapacity, "count");
    collect(fields, `${key}:yield`, `${product.name} · rendimiento`, product.yieldQuantity, "count");
    collect(fields, `${key}:markup`, `${product.name} · recargo propio`, product.ownMarkupPercent, "percent");

    for (const presentation of product.presentations) {
      const presentationKey = `${key}:presentation:${presentation.id}`;
      collect(
        fields,
        `${presentationKey}:units`,
        `${product.name} · ${presentation.name} · unidades por presentación`,
        presentation.unitsPerPresentation,
        "count",
      );
      collect(
        fields,
        `${presentationKey}:markup`,
        `${product.name} · ${presentation.name} · recargo propio`,
        presentation.ownMarkupPercent ?? null,
        "percent",
      );
      for (const packaging of presentation.packaging) {
        collect(
          fields,
          `${presentationKey}:packaging:${packaging.supplyId}`,
          `${product.name} · ${presentation.name} · ${packaging.supplyName}`,
          packaging.quantity,
          "count",
        );
      }
    }
  }

  // Result rows are keyed by their own rowId, not by product: after #321 a
  // product can have one row per presentation and all of them must be audited.
  for (const cost of results.costDistribution.rows) {
    const key = `result:cost:${cost.rowId}`;
    collect(fields, `${key}:variableUnit`, `${cost.name} · costo variable`, cost.variableUnit, "money");
    collect(fields, `${key}:indirectUnit`, `${cost.name} · gasto indirecto por unidad`, cost.indirectUnit, "money");
    collect(fields, `${key}:unitCost`, `${cost.name} · costo total`, cost.unitCost, "money");
  }

  for (const price of results.pricing.rows) {
    const key = `result:pricing:${price.rowId}`;
    collect(fields, `${key}:price`, `${price.name} · precio`, price.price, "money");
    collect(fields, `${key}:profit`, `${price.name} · ganancia`, price.profitUnit, "money");
    collect(fields, `${key}:realMargin`, `${price.name} · margen real`, price.realMarginPct, "percent");
  }

  for (const row of results.breakEven.rows) {
    collect(
      fields,
      `result:breakEven:${row.id}:units`,
      `${row.name} · unidades de equilibrio`,
      row.breakEvenUnitsWhole,
      "count",
    );
  }

  collect(fields, "result:totalExpenses", "Gastos del mes", results.costDistribution.totalExpenses, "money");
  collect(
    fields,
    "result:breakEvenUnits",
    "Unidades de equilibrio",
    results.breakEven.totals?.breakEvenUnitsWhole ?? null,
    "count",
  );
  collect(
    fields,
    "result:breakEvenSales",
    "Ventas de equilibrio",
    results.breakEven.totals?.breakEvenSales ?? null,
    "money",
  );

  return fields;
}

/**
 * Differences between two consecutive versions of the same month.
 *
 * @param before older snapshot
 * @param after newer snapshot
 * @param changedAt ISO date of the newer closure, used on every line
 */
export function diffClosureSnapshots(
  before: ClosureSnapshot,
  after: ClosureSnapshot,
  changedAt: string,
): ClosureChange[] {
  const older = flattenClosureSnapshot(before);
  const newer = flattenClosureSnapshot(after);
  const changes: ClosureChange[] = [];

  for (const [key, previous] of older) {
    const current = newer.get(key);
    if (current && current.value === previous.value) continue;
    changes.push({
      key,
      label: (current ?? previous).label,
      before: previous.value,
      after: current?.value ?? MISSING,
      kind: (current ?? previous).kind,
      changedAt,
    });
  }

  for (const [key, current] of newer) {
    if (older.has(key)) continue;
    changes.push({
      key,
      label: current.label,
      before: MISSING,
      after: current.value,
      kind: current.kind,
      changedAt,
    });
  }

  return changes;
}
