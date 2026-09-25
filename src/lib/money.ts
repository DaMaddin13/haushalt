/** Format cents as EUR string, e.g. 1234 → "12,34 €" */
export function formatEur(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}${euros.toLocaleString("de-AT")},${rest.toString().padStart(2, "0")} €`;
}

/** Parse user input like "12,34" or "12.34" or "12" to cents */
export function parseEurToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace("€", "").replace(/\./g, "").replace(",", ".");
  if (!cleaned || !/^-?\d+(\.\d{1,2})?$/.test(cleaned.replace(/\./, "."))) {
    // allow "12.34" style too if no thousands sep
    const alt = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
    if (!/^-?\d+(\.\d{1,2})?$/.test(alt)) return null;
    const n = Math.round(parseFloat(alt) * 100);
    return Number.isFinite(n) ? n : null;
  }
  const n = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(n) ? n : null;
}

export function parseEurToCentsSimple(input: string): number | null {
  const alt = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(alt)) return null;
  const n = Math.round(parseFloat(alt) * 100);
  return Number.isFinite(n) ? n : null;
}
