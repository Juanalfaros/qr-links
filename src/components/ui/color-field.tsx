import { Label } from '@/components/ui/label';

interface ColorFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

// Native <input type="color"> can't represent "unset" — it always needs a
// hex value to display — so a null (= "use the hardcoded default") shows a
// neutral placeholder here instead, with an explicit reset link to clear
// back to null.
export function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded border"
        />
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Restablecer a predeterminado
          </button>
        )}
      </div>
    </div>
  );
}
