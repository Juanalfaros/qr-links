import { Label } from '@/components/ui/label';

interface ColorFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Hex shown (and used as the picker's starting point) while `value` is
   * null — the actual color this field currently resolves to, so an unset
   * field never shows a misleading plain black square. */
  defaultHex: string;
}

// Native <input type="color"> can't represent "unset" — it always needs a
// hex value to display — so while `value` is null (= "use the hardcoded
// default"), it shows `defaultHex` instead, with an explicit reset link to
// clear back to null once customized.
export function ColorField({ id, label, value, onChange, defaultHex }: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="border-input flex items-center gap-2.5 rounded-lg border bg-transparent py-1 pr-2.5 pl-1">
        <input
          id={id}
          type="color"
          value={value ?? defaultHex}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <span className="text-muted-foreground flex-1 font-mono text-xs uppercase">{value ?? defaultHex}</span>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Restablecer
          </button>
        )}
      </div>
    </div>
  );
}
