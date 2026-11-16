import type { Page } from "@playwright/test";

import { Paso2Page, type CostStepOptions } from "./paso-2.page";

// The period expenses screen (#243) renders the same editable cost line table
// as paso 2, so it reuses that page object with its own labels.
const PERIOD_COSTS_STEP: CostStepOptions = {
  listName: "Gastos del período",
  path: "/period-costs",
  amountLabel: "Importe del mes",
  subtotalLabel: "Total de gastos del período",
  addLabel: "Agregar gasto",
};

export class PeriodCostsPage extends Paso2Page {
  constructor(page: Page) {
    super(page, PERIOD_COSTS_STEP);
  }
}
