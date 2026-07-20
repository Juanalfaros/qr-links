import type { CardTone } from '@/components/ui/card';

const TONES: Exclude<CardTone, 'default'>[] = ['yellow', 'pink', 'green', 'blue', 'lilac'];

// Deterministic (not random) so the same user always gets the same colour —
// a simple char-code sum is enough entropy for a 5-bucket pick.
export function toneForString(value: string): Exclude<CardTone, 'default'> {
  const sum = [...value].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

export function initialsFor(fullName: string | null, email: string): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}
