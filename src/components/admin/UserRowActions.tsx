import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, MoreVerticalIcon, UserBlock01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProfileRow } from '@/lib/types';

interface UserRowActionsProps {
  user: ProfileRow;
  disabled?: boolean;
  onSuspendToggled: (userId: string, suspendedAt: string | null) => void;
}

export function UserRowActions({ user, disabled, onSuspendToggled }: UserRowActionsProps) {
  const isSuspended = user.suspended_at !== null;

  const handleResetPassword = async () => {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    if (res.ok) {
      toast.success(`Correo de restablecimiento enviado a ${user.email}`);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? 'No se pudo enviar el correo');
    }
  };

  const handleToggleSuspend = async () => {
    const suspend = !isSuspended;
    const res = await fetch('/api/admin/suspend-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, suspend }),
    });
    if (res.ok) {
      onSuspendToggled(user.id, suspend ? new Date().toISOString() : null);
      toast.success(suspend ? 'Usuario suspendido' : 'Usuario reactivado');
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? 'No se pudo actualizar el estado del usuario');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label="Acciones" disabled={disabled} />}>
        <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleResetPassword}>
          <HugeiconsIcon icon={LockPasswordIcon} size={16} />
          Restablecer contraseña
        </DropdownMenuItem>
        <DropdownMenuItem variant={isSuspended ? undefined : 'destructive'} onClick={handleToggleSuspend}>
          <HugeiconsIcon icon={UserBlock01Icon} size={16} />
          {isSuspended ? 'Reactivar' : 'Suspender'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
