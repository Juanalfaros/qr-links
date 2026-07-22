export const MIN_PASSWORD_LENGTH = 12;

export interface PasswordStrength {
  tier: 0 | 1 | 2;
  label: string;
}

// Deliberately length-first, not composition rules (no forced uppercase/
// number/symbol) — per current NIST/OWASP guidance, mandatory character
// classes push people toward predictable patterns ("Password1!") without
// meaningfully raising real-world strength. Character variety only bumps
// the tier once length is already solid.
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) return { tier: 0, label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` };

  const varietyCount = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 16 && varietyCount >= 3) return { tier: 2, label: 'Fuerte' };
  return { tier: 1, label: 'Aceptable' };
}

export const STRENGTH_BAR_COLORS = ['bg-destructive', 'bg-accent-yellow-foreground', 'bg-accent-green-foreground'];
export const STRENGTH_TEXT_COLORS = [
  'text-destructive',
  'text-accent-yellow-foreground',
  'text-accent-green-foreground',
];
