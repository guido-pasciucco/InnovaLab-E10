"use client";import { Button } from "@/components/ui/button";


// Opens the browser's print dialog, where the order can also be saved as PDF
// (RN-15).
export function PrintButton() {
  return (
    <Button variant="primary" size="md"
      type="button"
      onClick={() => window.print()}
      className="min-h-11! rounded-[14px]! bg-action-primary! px-5! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! print:hidden!"
    >
      Imprimir o guardar como PDF
    </Button>
  );
}
