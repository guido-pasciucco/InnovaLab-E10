// Display formats for the tender and supplier screens. Times always show in
// Buenos Aires time, whatever the browser's zone (RN-12: "Los horarios los
// fija el reloj del servidor (hora de Buenos Aires)"). Pure: no React.

export const TENDER_TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: TENDER_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: TENDER_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const moneyFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

const percentFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// "21/11/2026 15:30 hs"
export function formatDateTime(value: Date | string): string {
  return `${dateTimeFormat.format(new Date(value))} hs`;
}

export function formatDate(value: Date | string): string {
  return dateFormat.format(new Date(value));
}

// Decimal strings from the database ("1234.50"). Display only: Number() is
// fine here because nothing is computed with the result.
export function formatMoney(value: string): string {
  return moneyFormat.format(Number(value));
}

export function formatQuantity(value: string): string {
  return quantityFormat.format(Number(value));
}

export function formatPercent(value: string): string {
  return `${percentFormat.format(Number(value))} %`;
}
