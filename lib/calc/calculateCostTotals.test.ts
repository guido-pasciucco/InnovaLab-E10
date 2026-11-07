import { describe, expect, it } from "vitest";

import { calculateCostTotals, type CostLine } from "./calculateCostTotals";

// CA1 uses a hand-built snapshot of 1000 units. The historia
// `.atl/shared/historias/H4-costo-total-unitario-panaderia.md` and the
// reference spreadsheet it points at are not in the repo, so this fixture
// proves the formula only. It is not a cent-level match against that
// planilla, and no test here claims CA4.

function line(overrides: Partial<CostLine> & Pick<CostLine, "id" | "amount">): CostLine {
  return {
    behavior: "fixed",
    traceability: "direct",
    isOwnLabor: false,
    yieldQuantity: "1",
    ...overrides,
  };
}

// Out-of-set and non-canonical strings still arrive at runtime (legacy rows,
// case, surrounding spaces). The cast lets those cases test the check.
function rawLine(overrides: {
  id: string;
  amount: string;
  behavior?: string;
  traceability?: string;
  isOwnLabor?: boolean;
  yieldQuantity?: string;
}): CostLine {
  return {
    behavior: "fixed",
    traceability: "direct",
    isOwnLabor: false,
    yieldQuantity: "1",
    ...overrides,
  } as unknown as CostLine;
}

describe("calculateCostTotals", () => {
  // The variable lines yield the whole volume: the shape the migration
  // backfills for period totals, so the results match the old model.
  it("returns period and per-unit totals when 1000 units are produced", () => {
    const input = {
      volume: 1000,
      lines: [
        line({
          id: "rent",
          behavior: "fixed",
          traceability: "indirect",
          amount: "300000.00",
        }),
        line({
          id: "internet",
          behavior: "fixed",
          traceability: "indirect",
          amount: "30000.00",
        }),
        line({
          id: "flour",
          behavior: "variable",
          traceability: "direct",
          amount: "500000.00",
          yieldQuantity: "1000",
        }),
        line({
          id: "gas",
          behavior: "variable",
          traceability: "direct",
          amount: "100000.00",
          yieldQuantity: "1000",
        }),
        line({
          id: "kneading",
          behavior: "variable",
          traceability: "direct",
          isOwnLabor: true,
          amount: "80000.00",
          yieldQuantity: "1000",
        }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "330000.00",
      subtotalVariable: "680000.00",
      subtotalTrabajoPropio: "80000.00",
      subtotalIndirecto: "330000.00",
      totalPeriodo: "1010000.00",
      variableUnitario: "680.00",
      unitario: "1010.00",
      volume: 1000,
      lineCount: 5,
    });
  });

  it("accepts a fixed + direct line in the shape the database stores", () => {
    const result = calculateCostTotals({
      volume: 10,
      lines: [
        line({
          id: "rent",
          behavior: "fixed",
          traceability: "direct",
          amount: "100.00",
        }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "100.00",
      subtotalVariable: "0.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "100.00",
      variableUnitario: "0.00",
      unitario: "10.00",
      volume: 10,
      lineCount: 1,
    });
  });

  it("adds a variable + indirect line to the indirect subtotal", () => {
    const result = calculateCostTotals({
      volume: 4,
      lines: [
        line({
          id: "power",
          behavior: "variable",
          traceability: "indirect",
          amount: "40.00",
          yieldQuantity: "4",
        }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "40.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "40.00",
      totalPeriodo: "40.00",
      variableUnitario: "10.00",
      unitario: "10.00",
      volume: 4,
      lineCount: 1,
    });
  });

  it("sums both lines when the same cost sits in fixed and variable under different ids", () => {
    const input = {
      volume: 5,
      lines: [
        line({ id: "flour-stock", behavior: "fixed", amount: "10.00" }),
        line({
          id: "flour-batch",
          behavior: "variable",
          amount: "25.00",
          yieldQuantity: "5",
        }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "10.00",
      subtotalVariable: "25.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "35.00",
      variableUnitario: "5.00",
      unitario: "7.00",
      volume: 5,
      lineCount: 2,
    });
  });

  it("returns DUPLICATE_LINE_ID when the same id arrives twice", () => {
    const input = {
      volume: 10,
      lines: [
        line({ id: "rent", amount: "10.00" }),
        rawLine({ id: "rent", amount: "nope", behavior: "banana" }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: false,
      code: "DUPLICATE_LINE_ID",
      details: { lineId: "rent" },
    });
  });

  it("returns zero fixed and a variable total when no line is fixed", () => {
    const input = {
      volume: 1000,
      lines: [line({
          id: "flour",
          behavior: "variable",
          amount: "250000.00",
          yieldQuantity: "1000",
        })],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "250000.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "250000.00",
      variableUnitario: "250.00",
      unitario: "250.00",
      volume: 1000,
      lineCount: 1,
    });
  });

  it("keeps the fixed subtotal at zero when every fixed amount is zero", () => {
    const input = {
      volume: 1000,
      lines: [
        line({ id: "rent", behavior: "fixed", amount: "0.00" }),
        line({
          id: "flour",
          behavior: "variable",
          amount: "250000.00",
          yieldQuantity: "1000",
        }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "250000.00",
      totalPeriodo: "250000.00",
      variableUnitario: "250.00",
      unitario: "250.00",
    });
  });

  it("adds Fixed, FIXED and fixed to subtotalFijo when the labels differ only by case and space", () => {
    const input = {
      volume: 10,
      lines: [
        rawLine({ id: "a", behavior: "Fixed", amount: "10.00" }),
        rawLine({ id: "b", behavior: "FIXED ", amount: "20.00" }),
        rawLine({ id: "c", behavior: "fixed", amount: "30.00" }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "60.00",
      subtotalVariable: "0.00",
      totalPeriodo: "60.00",
    });
  });

  it("adds indirect labels to subtotalIndirecto when they differ only by case and space", () => {
    const input = {
      volume: 2,
      lines: [
        rawLine({ id: "a", traceability: "INDIRECT", amount: "10.00" }),
        rawLine({ id: "b", traceability: " INDIRECT ", amount: "5.50" }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "15.50",
      subtotalIndirecto: "15.50",
      totalPeriodo: "15.50",
    });
  });

  it.each(["semi-fijo", ""])(
    "returns INVALID_BEHAVIOR when behavior is %j",
    (behavior) => {
      const result = calculateCostTotals({
        volume: 10,
        lines: [rawLine({ id: "rent", behavior, amount: "10.00" })],
      });

      expect(result).toEqual({
        ok: false,
        code: "INVALID_BEHAVIOR",
        details: { lineId: "rent" },
      });
    },
  );

  it.each(["trabajo-propio", " Trabajo-Propio ", "directo"])(
    "returns INVALID_TRACEABILITY when traceability is %j",
    (traceability) => {
      const result = calculateCostTotals({
        volume: 10,
        lines: [rawLine({ id: "hours", traceability, amount: "10.00" })],
      });

      expect(result).toEqual({
        ok: false,
        code: "INVALID_TRACEABILITY",
        details: { lineId: "hours" },
      });
    },
  );

  it("counts own labor inside its behavior bucket and again only in the cross-cut", () => {
    const input = {
      volume: 10,
      lines: [
        line({
          id: "kneading",
          behavior: "variable",
          traceability: "direct",
          isOwnLabor: true,
          amount: "80.00",
          yieldQuantity: "10",
        }),
        line({
          id: "rent",
          behavior: "fixed",
          traceability: "indirect",
          amount: "20.00",
        }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "20.00",
      subtotalVariable: "80.00",
      subtotalTrabajoPropio: "80.00",
      subtotalIndirecto: "20.00",
      totalPeriodo: "100.00",
      variableUnitario: "8.00",
      unitario: "10.00",
      volume: 10,
      lineCount: 2,
    });
  });

  it("keeps totalPeriodo equal to fixed plus variable when a line is both indirect and own labor", () => {
    const input = {
      volume: 4,
      lines: [
        line({
          id: "workshop",
          behavior: "fixed",
          traceability: "indirect",
          isOwnLabor: true,
          amount: "40.00",
        }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "40.00",
      subtotalVariable: "0.00",
      subtotalTrabajoPropio: "40.00",
      subtotalIndirecto: "40.00",
      totalPeriodo: "40.00",
      variableUnitario: "0.00",
      unitario: "10.00",
      volume: 4,
      lineCount: 1,
    });
  });

  it("returns zeros when the snapshot has no lines", () => {
    const result = calculateCostTotals({ lines: [], volume: 1000 });

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "0.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "0.00",
      variableUnitario: "0.00",
      unitario: "0.00",
      volume: 1000,
      lineCount: 0,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns INVALID_VOLUME when volume is %s",
    (volume) => {
      const result = calculateCostTotals({
        lines: [line({ id: "rent", amount: "10.00" })],
        volume,
      });

      expect(result).toEqual({ ok: false, code: "INVALID_VOLUME" });
    },
  );

  it("returns INVALID_VOLUME when the snapshot is empty and the volume is not a positive integer", () => {
    const result = calculateCostTotals({ lines: [], volume: 0 });

    expect(result).toEqual({ ok: false, code: "INVALID_VOLUME" });
  });

  it("returns INVALID_AMOUNT with the line id when the amount is not a decimal", () => {
    const result = calculateCostTotals({
      volume: 10,
      lines: [line({ id: "flour", amount: "12,50" })],
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_AMOUNT",
      details: { lineId: "flour" },
    });
  });

  it("rounds 1/8 up to the cent when the third decimal is exactly 5", () => {
    const result = calculateCostTotals({
      volume: 8,
      lines: [
        line({
          id: "flour",
          behavior: "variable",
          amount: "1.00",
          yieldQuantity: "8",
        }),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      totalPeriodo: "1.00",
      variableUnitario: "0.13",
      unitario: "0.13",
    });
  });

  it("rounds the period total from the full-precision sum when each bucket is under half a cent", () => {
    const result = calculateCostTotals({
      volume: 1,
      lines: [
        line({ id: "rent", behavior: "fixed", amount: "1.004" }),
        line({ id: "flour", behavior: "variable", amount: "1.004" }),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "1.00",
      subtotalVariable: "1.00",
      totalPeriodo: "2.01",
      variableUnitario: "1.00",
      unitario: "2.01",
    });
  });

  // A roll of $30.000 that yields 20 units costs $1.500 per unit. Producing
  // 100 units uses 5 rolls: $150.000 in the period.
  it("divides a variable amount by its yield and multiplies by the volume", () => {
    const result = calculateCostTotals({
      volume: 100,
      lines: [
        line({ id: "rent", behavior: "fixed", amount: "10000.00" }),
        line({
          id: "roll",
          behavior: "variable",
          amount: "30000.00",
          yieldQuantity: "20",
        }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "10000.00",
      subtotalVariable: "150000.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "160000.00",
      variableUnitario: "1500.00",
      unitario: "1600.00",
      volume: 100,
      lineCount: 2,
    });
  });

  it("adds the per-unit share of every variable line", () => {
    const result = calculateCostTotals({
      volume: 10,
      lines: [
        line({ id: "box", behavior: "variable", amount: "100.00", yieldQuantity: "4" }),
        line({ id: "ribbon", behavior: "variable", amount: "30.00", yieldQuantity: "0.5" }),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      subtotalVariable: "850.00",
      variableUnitario: "85.00",
      unitario: "85.00",
    });
  });

  it("ignores the yield of a fixed line, even an invalid one", () => {
    const result = calculateCostTotals({
      volume: 10,
      lines: [line({ id: "rent", behavior: "fixed", amount: "100.00", yieldQuantity: "0" })],
    });

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "100.00",
      totalPeriodo: "100.00",
      unitario: "10.00",
    });
  });

  it.each(["0", "-2", "abc", "Infinity", ""])(
    "returns INVALID_YIELD when a variable line yields %j",
    (yieldQuantity) => {
      const result = calculateCostTotals({
        volume: 10,
        lines: [line({ id: "box", behavior: "variable", amount: "10.00", yieldQuantity })],
      });

      expect(result).toEqual({
        ok: false,
        code: "INVALID_YIELD",
        details: { lineId: "box" },
      });
    },
  );

  it("counts each line's period contribution in the cross-cuts", () => {
    const result = calculateCostTotals({
      volume: 10,
      lines: [
        line({
          id: "packing",
          behavior: "variable",
          traceability: "indirect",
          isOwnLabor: true,
          amount: "60.00",
          yieldQuantity: "3",
        }),
        line({ id: "rent", behavior: "fixed", traceability: "indirect", amount: "50.00" }),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "50.00",
      subtotalVariable: "200.00",
      subtotalTrabajoPropio: "200.00",
      subtotalIndirecto: "250.00",
      totalPeriodo: "250.00",
      variableUnitario: "20.00",
      unitario: "25.00",
    });
  });

  // 1 / 3 per unit is 0.333...; three units cost exactly 1.00. Rounding the
  // per-unit amount before multiplying would report 0.99.
  it("rounds the variable total once, from the full-precision per-unit amount", () => {
    const result = calculateCostTotals({
      volume: 3,
      lines: [line({ id: "glue", behavior: "variable", amount: "1.00", yieldQuantity: "3" })],
    });

    expect(result).toMatchObject({
      ok: true,
      subtotalVariable: "1.00",
      totalPeriodo: "1.00",
      variableUnitario: "0.33",
      unitario: "0.33",
    });
  });
});
