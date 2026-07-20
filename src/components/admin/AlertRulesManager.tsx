import { useState } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import type { AlertRuleRow } from '@/lib/types';

interface AlertRulesManagerProps {
  initialRules: AlertRuleRow[];
  links: { id: string; title: string }[];
}

const COMPANY_WIDE = '__company__';

export function AlertRulesManager({ initialRules, links }: AlertRulesManagerProps) {
  const [rules, setRules] = useState<AlertRuleRow[]>(initialRules);
  const [linkId, setLinkId] = useState(COMPANY_WIDE);
  const [thresholdCount, setThresholdCount] = useState('100');
  const [windowHours, setWindowHours] = useState('24');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const linkItems: Record<string, string> = {
    [COMPANY_WIDE]: 'Toda la empresa',
    ...Object.fromEntries(links.map((l) => [l.id, l.title])),
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const res = await fetch('/api/admin/alert-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: linkId === COMPANY_WIDE ? null : linkId,
        thresholdCount: Number(thresholdCount),
        windowHours: Number(windowHours),
        notifyEmail,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; rule?: AlertRuleRow };

    if (!res.ok || !body.rule) {
      toast.error(body.error ?? 'No se pudo crear la alerta');
      setLoading(false);
      return;
    }

    setRules((prev) => [body.rule as AlertRuleRow, ...prev]);
    setNotifyEmail('');
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const previous = rules;
    setRules((prev) => prev.filter((r) => r.id !== id));
    const res = await fetch('/api/admin/alert-rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setRules(previous);
      toast.error('No se pudo eliminar la alerta');
    }
  };

  const linkTitle = (id: string | null) =>
    id ? (links.find((l) => l.id === id)?.title ?? 'Link eliminado') : 'Toda la empresa';

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <span className="bg-accent-yellow text-accent-yellow-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={Notification01Icon} size={15} />
          </span>
          <CardTitle className="text-base">Nueva alerta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1">
              <Label>Alcance</Label>
              <Select value={linkId} items={linkItems} onValueChange={(v) => setLinkId(v as string)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COMPANY_WIDE}>Toda la empresa</SelectItem>
                  {links.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="alert-threshold">Umbral de clics</Label>
              <Input
                id="alert-threshold"
                type="number"
                min={1}
                required
                value={thresholdCount}
                onChange={(e) => setThresholdCount(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="alert-window">Ventana (horas)</Label>
              <Input
                id="alert-window"
                type="number"
                min={1}
                required
                value={windowHours}
                onChange={(e) => setWindowHours(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="alert-email">Notificar a</Label>
              <Input
                id="alert-email"
                type="email"
                required
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-56"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear alerta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {rules.length === 0 ? (
        <EmptyState
          icon={Notification01Icon}
          title="Sin alertas configuradas"
          description="Crea una arriba para que te avisemos por correo cuando un link supere un umbral de clics."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="bg-card border-border/60 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{linkTitle(rule.link_id)}</span>
                <span className="text-muted-foreground">
                  Más de {rule.threshold_count} clics en {rule.window_hours}h → {rule.notify_email}
                </span>
                {rule.last_triggered_at && (
                  <span className="text-muted-foreground text-xs">
                    Última alerta: {new Date(rule.last_triggered_at).toLocaleString()}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
