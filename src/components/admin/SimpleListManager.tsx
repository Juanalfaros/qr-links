import { useState } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ListItem {
  id: string;
  value: string;
}

interface SimpleListManagerProps {
  title: string;
  placeholder: string;
  apiPath: string;
  fieldName: string;
  responseKey: string;
  initialItems: ListItem[];
  emptyHint: string;
  icon: IconSvgElement;
  tone: 'green' | 'pink';
}

const TONE_CLASSES = {
  green: 'bg-accent-green text-accent-green-foreground',
  pink: 'bg-accent-pink text-accent-pink-foreground',
};

// Shared by the allowed-domains and blocked-url-patterns managers in the
// superadmin "Seguridad" tab — same add/list/remove shape, just a different
// endpoint, field name, and colour (green=allow, pink=block — matching the
// opposite intent of the two lists).
export function SimpleListManager({
  title,
  placeholder,
  apiPath,
  fieldName,
  responseKey,
  initialItems,
  emptyHint,
  icon,
  tone,
}: SimpleListManagerProps) {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName]: value }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, { id: string } & Record<string, string>> & {
      error?: string;
    };

    if (!res.ok || !body[responseKey]) {
      toast.error(body.error ?? 'No se pudo agregar');
      setLoading(false);
      return;
    }

    setItems((prev) => [...prev, { id: body[responseKey].id, value: body[responseKey][fieldName] }]);
    setValue('');
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    const res = await fetch(apiPath, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      setItems(previous);
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
          <HugeiconsIcon icon={icon} size={15} />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            required
            className="h-9"
          />
          <Button type="submit" disabled={loading}>
            Agregar
          </Button>
        </form>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyHint}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono">{item.value}</span>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
