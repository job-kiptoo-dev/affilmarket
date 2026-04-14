export function isValidHttpUrl(str: string) {
  try {
    return /^https?:\/\/.+/.test(new URL(str).href);
  } catch {
    return false;
  }
}

export function commissionToDecimal(pct: string) {
  const n = parseFloat(pct);
  return isNaN(n) ? 0.1 : Math.min(Math.max(n / 100, 0), 1);
}
