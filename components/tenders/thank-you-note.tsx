// RN-16: the thank-you note, identical for every supplier not chosen. It
// reveals no prices and no results.
export const THANK_YOU_NOTE =
  "¡Gracias por participar! En esta oportunidad elegimos otra propuesta. Vamos a tenerte en cuenta en las próximas licitaciones.";

export function ThankYouNote({ ownerName }: { ownerName: string }) {
  return (
    <div className="space-y-1 rounded-2xl bg-brand-green-50 p-4 text-sm text-fg">
      <p className="font-semibold">Nota de {ownerName}</p>
      <p>{THANK_YOU_NOTE}</p>
    </div>
  );
}
