import { getDrizzleClient } from "@/lib/db/client";
import { createCalculationService } from "@/lib/services/calculations";
import {
  advanceCalculatorProgressService,
  saveCalculatorSetupService,
} from "@/lib/services/calculator";
import { addCalcCostLineService, addVariableCalcCostLineService } from "@/lib/services/cost";
import { addIndirectCalcCostLineService, saveOwnLaborService } from "@/lib/services/own-labor";
import { saveExpectedMarginService } from "@/lib/services/pricing";

import { createUser, deleteUser, findUserIdByEmail } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";

// Local seed: one confirmed user with a few finished cost calculations.
// It goes through the same services the wizard uses, so every row passes the
// app's own validation and lands where the UI expects it. The env comes from
// `.env.test`, which loadTestEnv only accepts when every URL is local: this
// script cannot write to the hosted project.
//
// Re-running it deletes the user (cascading its calculations) and recreates it.
//
//   bun run db:seed:local

const SEED_USER = {
  email: "demo@example.test",
  password: "User@1234",
  displayName: "Usuario Demo",
};

// Wizard step the seeded calculations are left on (margin and price).
const SEED_STEP = 5;

type SeedCalculation = {
  setup: { name: string; unit: string; volume: number; currency: string; period: string };
  fixed: { concept: string; amount: string }[];
  variable: { concept: string; amount: string; yieldQuantity: string }[];
  ownLabor: { hours: string; hourlyRate: string };
  indirect: { concept: string; amount: string }[];
  expectedMarginPct: string;
};

const CALCULATIONS: SeedCalculation[] = [
  {
    setup: { name: "Medias de algodón", unit: "docena", volume: 100, currency: "ARS", period: "Mensual" },
    fixed: [{ concept: "Alquiler del taller", amount: "50000" }],
    variable: [
      { concept: "Hilado de algodón", amount: "30000", yieldQuantity: "10" },
      { concept: "Etiquetas y bolsas", amount: "5000", yieldQuantity: "50" },
    ],
    ownLabor: { hours: "80", hourlyRate: "2500" },
    indirect: [{ concept: "Luz y gas", amount: "18000" }],
    expectedMarginPct: "25",
  },
  {
    setup: { name: "Velas de soja", unit: "caja", volume: 40, currency: "ARS", period: "Mensual" },
    fixed: [
      { concept: "Monotributo", amount: "32000" },
      { concept: "Publicidad en redes", amount: "15000" },
    ],
    variable: [
      { concept: "Cera de soja 5 kg", amount: "42000", yieldQuantity: "8" },
      { concept: "Esencias", amount: "12000", yieldQuantity: "20" },
      { concept: "Packaging", amount: "9000", yieldQuantity: "30" },
    ],
    ownLabor: { hours: "40", hourlyRate: "3000" },
    indirect: [{ concept: "Internet", amount: "12000" }],
    expectedMarginPct: "35",
  },
  {
    setup: { name: "Budines artesanales", unit: "unidad", volume: 250, currency: "ARS", period: "Mensual" },
    fixed: [{ concept: "Habilitación bromatológica", amount: "20000" }],
    variable: [
      { concept: "Harina 25 kg", amount: "28000", yieldQuantity: "60" },
      { concept: "Huevos (maple de 30)", amount: "7500", yieldQuantity: "10" },
      { concept: "Manteca y azúcar", amount: "16000", yieldQuantity: "25" },
    ],
    ownLabor: { hours: "60", hourlyRate: "2800" },
    indirect: [{ concept: "Gas del horno", amount: "22000" }],
    expectedMarginPct: "30",
  },
];

async function seed(): Promise<void> {
  loadTestEnv();
  globalThis.__drizzleClient = undefined;
  const db = getDrizzleClient();

  try {
    const existingId = await findUserIdByEmail(SEED_USER.email);
    if (existingId) await deleteUser(existingId);

    const user = await createUser(SEED_USER);

    for (const calc of CALCULATIONS) {
      await createCalculationService(user.id, db);
      await saveCalculatorSetupService(user.id, calc.setup, db);
      for (const line of calc.fixed) await addCalcCostLineService(user.id, line, db);
      for (const line of calc.variable) await addVariableCalcCostLineService(user.id, line, db);
      await saveOwnLaborService(user.id, calc.ownLabor, db);
      for (const line of calc.indirect) await addIndirectCalcCostLineService(user.id, line, db);
      await saveExpectedMarginService(user.id, { expectedMarginPct: calc.expectedMarginPct }, db);
      await advanceCalculatorProgressService(user.id, SEED_STEP, db);
    }

    console.log(`Seeded ${SEED_USER.email} with ${CALCULATIONS.length} calculations.`);
  } finally {
    await db.$client.end();
  }
}

await seed();
