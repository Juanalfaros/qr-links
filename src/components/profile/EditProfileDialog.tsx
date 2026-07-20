import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfileRow } from '@/lib/types';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow;
  onUpdated: (profile: ProfileRow) => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onUpdated }: EditProfileDialogProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(profile.full_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [open, profile]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName.trim() || null, avatar_url: avatarUrl.trim() || null }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? 'No se pudo guardar el perfil');
      setLoading(false);
      return;
    }

    const { profile: updated } = (await res.json()) as { profile: ProfileRow };
    onUpdated(updated);
    toast.success('Perfil actualizado');
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="avatar_url">URL de avatar</Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
