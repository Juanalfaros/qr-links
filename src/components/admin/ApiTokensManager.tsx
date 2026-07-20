import { useState } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Copy01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ApiTokenRow } from '@/lib/types';

interface ApiTokensManagerProps {
  initialTokens: ApiTokenRow[];
}

export function ApiTokensManager({ initialTokens }: ApiTokensManagerProps) {
  const [tokens, setTokens] = useState<ApiTokenRow[]>(initialTokens);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiTokenRow | null>(null);

  const handleCreate = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json()) as { error?: string; token?: ApiTokenRow; plaintext?: string };
    setLoading(false);

    if (!res.ok || !body.token || !body.plaintext) {
      toast.error(body.error ?? 'No se pudo crear el token');
      return;
    }

    setTokens((prev) => [body.token!, ...prev]);
    setPlaintext(body.plaintext);
    setName('');
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const res = await fetch(`/api/tokens/${revokeTarget.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo revocar el token');
      return;
    }
    setTokens((prev) =>
      prev.map((t) => (t.id === revokeTarget.id ? { ...t, revoked_at: new Date().toISOString() } : t)),
    );
    setRevokeTarget(null);
    toast.success('Token revocado');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog
          open={createOpen}
          onOpenChange={(next) => {
            setCreateOpen(next);
            if (!next) setPlaintext(null);
          }}
        >
          <DialogTrigger render={<Button />}>
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            Nuevo token
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{plaintext ? 'Token creado' : 'Nuevo token de API'}</DialogTitle>
            </DialogHeader>
            {plaintext ? (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">
                  Copia este token ahora — no se va a mostrar de nuevo. Úsalo en el header{' '}
                  <code className="bg-muted rounded px-1">Authorization: Bearer &lt;token&gt;</code>.
                </p>
                <div className="bg-muted flex items-center gap-2 rounded-md p-2 font-mono text-xs break-all">
                  {plaintext}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(plaintext);
                      toast.success('Copiado');
                    }}
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={14} />
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={() => setCreateOpen(false)}>Listo</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="token-name">Nombre</Label>
                  <Input
                    id="token-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Integración con..."
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear token'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {tokens.length === 0 ? (
        <EmptyState
          icon={PlusSignIcon}
          title="Sin tokens todavía"
          description="Crea uno para usar la API pública de links desde un script o integración externa."
        />
      ) : (
        <div className="bg-card border-border/60 flex flex-col divide-y overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    token.revoked_at ? 'bg-muted text-muted-foreground' : 'bg-accent-blue text-accent-blue-foreground'
                  }`}
                >
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{token.name}</span>
                    {token.revoked_at && <Badge variant="outline">Revocado</Badge>}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    Creado {new Date(token.created_at).toLocaleDateString()}
                    {token.last_used_at && ` · último uso ${new Date(token.last_used_at).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
              {!token.revoked_at && (
                <Button variant="outline" size="sm" onClick={() => setRevokeTarget(token)}>
                  Revocar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar "{revokeTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Cualquier integración que use este token dejará de funcionar de inmediato. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevoke}>
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
