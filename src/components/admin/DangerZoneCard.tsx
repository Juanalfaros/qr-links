import { useState } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { wipeConfirmationPhrase } from '@/lib/branding';
import type { Branding } from '@/lib/branding';

interface DangerZoneCardProps {
  branding: Branding;
}

type Step = 'warning' | 'confirm';

export function DangerZoneCard({ branding }: DangerZoneCardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('warning');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedPhrase = wipeConfirmationPhrase(branding.name);

  const reset = () => {
    setStep('warning');
    setConfirmationPhrase('');
    setPassword('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/admin/wipe-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationPhrase, password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'No se pudo completar el borrado');
      setLoading(false);
      return;
    }

    toast.success('Todos los datos fueron eliminados');
    // Virtually every tab (links, analíticas, alertas, auditoría, etc.) is
    // now stale — a full reload is simpler and safer than trying to patch
    // every piece of local state this action just invalidated.
    window.location.reload();
  };

  return (
    <Card className="ring-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2 text-base">
          <HugeiconsIcon icon={Alert02Icon} size={18} />
          Zona de peligro
        </CardTitle>
        <CardDescription>
          Borra el contenido de todas las tablas de la aplicación (links, analíticas, tags, alertas, notificaciones,
          tokens de API, dominios permitidos/bloqueados, departamentos y el historial de auditoría). Las cuentas de
          usuario y la configuración de branding no se ven afectadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleOpenChange(true)}>
          <HugeiconsIcon icon={Delete02Icon} size={16} />
          Borrar todos los datos
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {step === 'warning' ? 'Esto va a borrar todo el contenido' : 'Confirma el borrado'}
            </DialogTitle>
            <DialogDescription>
              {step === 'warning'
                ? 'Esta acción no se puede deshacer. Se eliminará permanentemente:'
                : 'Escribe la frase exacta y tu contraseña actual para confirmar.'}
            </DialogDescription>
          </DialogHeader>
          {step === 'warning' ? (
            <div className="flex flex-col gap-3">
              <ul className="text-muted-foreground list-inside list-disc text-sm">
                <li>Todos los links y sus analíticas</li>
                <li>Tags y reglas de alertas</li>
                <li>Notificaciones y tokens de API</li>
                <li>Dominios permitidos/bloqueados y departamentos</li>
                <li>El historial de auditoría completo</li>
              </ul>
              <p className="text-sm">
                <strong>No</strong> se eliminan las cuentas de usuario ni la configuración de branding.
              </p>
              <Button variant="destructive" onClick={() => setStep('confirm')}>
                Entiendo, continuar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmation-phrase">
                  Escribe <strong>{expectedPhrase}</strong> para confirmar
                </Label>
                <Input
                  id="confirmation-phrase"
                  required
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wipe-password">Tu contraseña actual</Label>
                <PasswordInput
                  id="wipe-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || confirmationPhrase !== expectedPhrase || !password}
              >
                {loading ? 'Borrando...' : 'Borrar todos los datos'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
