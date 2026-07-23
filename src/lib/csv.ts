// Prefix values that spreadsheet software (Excel, Google Sheets) would
// otherwise interpret as a formula — the leading quote forces text and is
// the standard OWASP-recommended mitigation for CSV formula injection.
function neutralizeFormula(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

function escapeCsvValue(value: string | number | null): string {
  const str = neutralizeFormula(String(value ?? ''));
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return lines.join('\r\n');
}
