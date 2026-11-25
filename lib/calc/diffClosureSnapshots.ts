import type { ClosureChange, ClosureSnapshot } from "@/lib/types/closure";

// Audit of a monthly closure (#322, D6). A correction is a new version of the
// same month, so the audit is just the field-by-field difference between two
// consecutive snapshots. This is pure: no persistence, no formatting of money
// (the values are the exact strings the services produced), no clock reads.
//
// Keys are stable ids from the snapshot, not positions, so adding or removing a
// supply or a product does not shift every other row. A key present only in the
// older snapshot is a removal; one present only in the newer snapshot is an
// addition. Both are reported with an em dash on the missing side.

type Field = { label: string; value: string };

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
) {
  fields.set(key, { label, value: text(value) });
}

export function flattenClosureSnapshot(snapshot: ClosureSnapshot): Map<string, Field> {
  const fields = new Map<string, Field>();
  const { inputs, results } = snapshot;

  collect(fields, "business:defaultMarkup", "Recargo por defecto del negocio", inputs.defaultMarkupPercent);

  for (const supply of inputs.supplies) {
    const key = `supply:${supply.id}`;
    collect(fields, `${key}:name`, `${supply.name} · nombre`, supply.name);
    collect(fields, `${key}:unit`, `${supply.name} · unidad`, supply.unit);
    collect(fields, `${key}:price`, `${supply.name} · precio`, supply.price);
  }

  for (const line of inputs.periodCostLines) {
    collect(fields, `cost:${line.id}:amount`, `${line.concept} · importe`, line.amountPeriod);
  }

  for (const product of inputs.products) {
    const key = `product:${product.id}`;
    collect(fields, `${key}:capacity`, `${product.name} · capacidad`, product.monthlyCapacity);
    collect(fields, `${key}:yield`, `${product.name} · rendimiento`, product.yieldQuantity);
    collect(fields, `${key}:markup`, `${product.name} · recargo propio`, product.ownMarkupPercent);

    for (const presentation of product.presentations) {
      const presentationKey = `${key}:presentation:${presentation.id}`;
      collect(
        fields,
        `${presentationKey}:units`,
        `${product.name} · ${presentation.name} · unidades por presentación`,
        presentation.unitsPerPresentation,
      );
      for (const packaging of presentation.packaging) {
        collect(
          fields,
          `${presentationKey}:packaging:${packaging.supplyId}`,
          `${product.name} · ${presentation.name} · ${packaging.supplyName}`,
          packaging.quantity,
        );
      }
    }

  }

  // Result rows are keyed by their own id, not by product: after #321 a
  // product can have one row per presentation and all of them must be audited.
  for (const cost of results.costDistribution.rows) {
    const key = `result:cost:${cost.productId}`;
    collect(fields, `${key}:variableUnit`, `${cost.name} · costo variable`, cost.variableUnit);
    collect(fields, `${key}:indirectUnit`, `${cost.name} · gasto indirecto por unidad`, cost.indirectUnit);
    collect(fields, `${key}:unitCost`, `${cost.name} · costo total`, cost.unitCost);
  }

  for (const price of results.pricing.rows) {
    const key = `result:pricing:${price.productId}`;
    collect(fields, `${key}:price`, `${price.name} · precio`, price.price);
    collect(fields, `${key}:profit`, `${price.name} · ganancia`, price.profitUnit);
    collect(fields, `${key}:realMargin`, `${price.name} · margen real`, price.realMarginPct);
  }

  for (const row of results.breakEven.rows) {
    collect(
      fields,
      `result:breakEven:${row.id}:units`,
      `${row.name} · unidades de equilibrio`,
      row.breakEvenUnitsWhole,
    );
  }

  collect(fields, "result:totalExpenses", "Gastos del mes", results.costDistribution.totalExpenses);
  collect(fields, "result:breakEvenUnits", "Unidades de equilibrio", results.breakEven.totals?.breakEvenUnitsWhole ?? null);
  collect(fields, "result:breakEvenSales", "Ventas de equilibrio", results.breakEven.totals?.breakEvenSales ?? null);

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
      label: (current ?? previous).label,
      before: previous.value,
      after: current?.value ?? MISSING,
      changedAt,
    });
  }

  for (const [key, current] of newer) {
    if (older.has(key)) continue;
    changes.push({ label: current.label, before: MISSING, after: current.value, changedAt });
  }

  return changes;
}
