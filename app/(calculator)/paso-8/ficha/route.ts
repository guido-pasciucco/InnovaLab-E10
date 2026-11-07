import { renderToBuffer } from "@react-pdf/renderer";
import { redirect } from "next/navigation";

import { summaryPdfDocument } from "@/components/calculator/summary-pdf";
import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { getCalculatorSummaryService } from "@/lib/services/summary";

// "Descargar ficha en PDF" on step 8. The summary service only resolves the
// caller's own draft, so the PDF never carries another user's figures.
// @react-pdf/renderer needs Node APIs (Buffer, zlib), not the Edge runtime.
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);
  if (currentStep < 8) redirect(`/paso-${currentStep}`);

  // An engine error on the persisted costs propagates as a 500: there is no
  // summary to print, and step 8 already explains why without the button.
  const summary = await getCalculatorSummaryService(user.id);
  if (summary.status !== "ready") redirect("/paso-8");

  const pdf = await renderToBuffer(summaryPdfDocument(summary));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ficha-costos.pdf"',
      // Per-user figures: never cached by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
