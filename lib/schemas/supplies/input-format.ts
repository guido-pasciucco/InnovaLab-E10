// Input-only formatting helpers. They keep the form state as canonical decimal
// strings while the user sees the Argentine money format (20.000,50).

export function capitalizeFirstWord(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  return trimmed.charAt(0).toLocaleUpperCase("es") + trimmed.slice(1);
}

// The dot is display-only for thousands. A dot followed by one or two digits is
// treated as a decimal separator, so a phone keyboard in English cannot turn
// 20000.50 into 2000050.
function normalizeDecimalSeparator(raw: string): string {
  if (raw.includes(",")) return raw;

  const lastDot = raw.lastIndexOf(".");
  if (lastDot === -1) return raw;

  const tail = raw.slice(lastDot + 1);
  if (tail.length > 2) return raw;

  const integerDigits = raw.slice(0, lastDot).replace(/\D/g, "");
  const decimalDigits = tail.replace(/\D/g, "");

  return `${integerDigits || "0"},${decimalDigits}`;
}

// Formats what the user is typing: groups the integer part with dots and keeps
// up to two decimal places after a comma.
export function formatMoneyTyping(raw: string): string {
  const cleaned = normalizeDecimalSeparator(raw).replace(/[^\d,]/g, "");
  const commaIndex = cleaned.lastIndexOf(",");
  const integerPart = (commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned).replace(/\D/g, "");
  const decimalPart =
    commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/\D/g, "").slice(0, 2) : "";
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return commaIndex >= 0 ? `${grouped},${decimalPart}` : grouped;
}

// Converts the displayed value to the canonical decimal string the schema and
// the database expect (20.000,50 → 20000.50). The visual thousands dots are
// discarded; the canonical value always uses a dot as its decimal separator.
export function parseMoneyInput(raw: string): string {
  const cleaned = normalizeDecimalSeparator(raw).replace(/[^\d,]/g, "");
  if (cleaned === "") return "";

  const commaIndex = cleaned.lastIndexOf(",");
  const integerPart = (commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned).replace(/\D/g, "");
  const decimalPart =
    commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/\D/g, "").slice(0, 2) : "";

  return decimalPart === "" ? integerPart : `${integerPart}.${decimalPart}`;
}

export function formatMoneyInput(canonical: string): string {
  if (canonical === "") return "";

  const [integerPart, decimalPart = ""] = canonical.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return decimalPart === "" ? grouped : `${grouped},${decimalPart}`;
}
