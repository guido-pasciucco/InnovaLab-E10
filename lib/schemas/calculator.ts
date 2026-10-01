import { z } from "zod";

// Input validation at the edge: strict contract before touching the calculator.
// Field messages live here, once: RHF shows them in the client and the
// service's ZodError carries them to the server response (details.fieldErrors).
export const calculatorSetupSchema = z.object({
  productName: z.string().trim().min(1, { error: "Escribí el nombre de tu producto." }),
  unit: z
    .string()
    .trim()
    .min(1, { error: "Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)." }),
  volume: z
    .number({ error: "Completá el volumen con un número entero." })
    .int({ error: "Completá el volumen con un número entero." })
    .positive({ error: "El volumen tiene que ser mayor que 0." }),
  currency: z.literal("ARS", { error: "La moneda es ARS y no se puede cambiar." }),
  period: z.literal("Mensual", { error: "El período es mensual y no se puede cambiar." }),
});

export type CalculatorSetup = z.infer<typeof calculatorSetupSchema>;
