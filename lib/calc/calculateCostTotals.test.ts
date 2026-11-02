import { describe, expect, it } from "vitest";

import { calculateCostTotals, type CostLine } from "./calculateCostTotals";

// CA1 uses a hand-built snapshot of 1000 dozens. The historia
// `.atl/shared/historias/H4-costo-total-unitario-panaderia.md` and the
// reference spreadsheet it points at are not in the repo, so this fixture
// proves the formula only. It is not a cent-level match against that
// planilla, and no test here claims CA4.

function line(overrides: Partial<CostLine> & Pick<CostLine, "id" | "amount">): CostLine {
  return {
    behavior: "fixed",
    traceability: "direct",
    isOwnLabor: false,
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
}): CostLine {
  return {
    behavior: "fixed",
    traceability: "direct",
    isOwnLabor: false,
    ...overrides,
  } as unknown as CostLine;
}

describe("calculateCostTotals", () => {
  it("returns period and per-dozen totals when 1000 dozens are produced", () => {
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
        }),
        line({
          id: "gas",
          behavior: "variable",
          traceability: "direct",
          amount: "100000.00",
        }),
        line({
          id: "kneading",
          behavior: "variable",
          traceability: "direct",
          isOwnLabor: true,
          amount: "80000.00",
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
      unitarioPorDocena: "1010.00",
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
      unitarioPorDocena: "10.00",
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
      unitarioPorDocena: "10.00",
      volume: 4,
      lineCount: 1,
    });
  });

  it("sums both lines when the same cost sits in fixed and variable under different ids", () => {
    const input = {
      volume: 5,
      lines: [
        line({ id: "flour-stock", behavior: "fixed", amount: "10.00" }),
        line({ id: "flour-batch", behavior: "variable", amount: "25.00" }),
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
      unitarioPorDocena: "7.00",
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
      lines: [line({ id: "flour", behavior: "variable", amount: "250000.00" })],
    };

    const result = calculateCostTotals(input);

    expect(result).toEqual({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "250000.00",
      subtotalTrabajoPropio: "0.00",
      subtotalIndirecto: "0.00",
      totalPeriodo: "250000.00",
      unitarioPorDocena: "250.00",
      volume: 1000,
      lineCount: 1,
    });
  });

  it("keeps the fixed subtotal at zero when every fixed amount is zero", () => {
    const input = {
      volume: 1000,
      lines: [
        line({ id: "rent", behavior: "fixed", amount: "0.00" }),
        line({ id: "flour", behavior: "variable", amount: "250000.00" }),
      ],
    };

    const result = calculateCostTotals(input);

    expect(result).toMatchObject({
      ok: true,
      subtotalFijo: "0.00",
      subtotalVariable: "250000.00",
      totalPeriodo: "250000.00",
      unitarioPorDocena: "250.00",
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
      unitarioPorDocena: "10.00",
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
      unitarioPorDocena: "10.00",
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
      unitarioPorDocena: "0.00",
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
      lines: [line({ id: "flour", behavior: "variable", amount: "1.00" })],
    });

    expect(result).toMatchObject({
      ok: true,
      totalPeriodo: "1.00",
      unitarioPorDocena: "0.13",
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
      unitarioPorDocena: "2.01",
    });
  });
});
