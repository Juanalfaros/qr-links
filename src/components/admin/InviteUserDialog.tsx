import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserAdd01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfileRow } from '@/lib/types';

interface InviteUserDialogProps {
  onInvited: (user: ProfileRow) => void;
}

export function InviteUserDialog({ onInvited }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json()) as { error?: string; user?: { id: string; email: string } };

    if (!res.ok || !body.user) {
      setError(body.error ?? 'No se pudo invitar al usuario');
      setLoading(false);
      return;
    }

    onInvited({
      id: body.user.id,
      email: body.user.email,
      role: 'user',
      created_at: new Date().toISOString(),
      full_name: null,
      avatar_url: null,
      department_id: null,
      suspended_at: null,
    });
    setEmail('');
    setLoading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <HugeiconsIcon icon={UserAdd01Icon} size={16} />
        Invitar usuario
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Correo</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trabajador@tuempresa.com"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar invitación'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
