import { AppError } from "@/lib/errors/app-error";
import { handleRouteErrors, ok } from "@/lib/errors/handle-route-errors";

// DEMO ONLY — remove this file with the /demo-errores section.
// Route Handler door: AppError -> catalog status + ErrorEnvelope.
export const GET = handleRouteErrors(async (request: Request) => {
  const shouldFail = new URL(request.url).searchParams.get("fail") === "1";

  if (shouldFail) {
    throw new AppError("CALC_UNAVAILABLE");
  }

  return ok({ rows: ["Fila A", "Fila B"] });
});
