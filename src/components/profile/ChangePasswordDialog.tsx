import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from '@/lib/password-strength';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  email,
  supabaseUrl,
  supabaseAnonKey,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lengthOk = newPassword.length >= MIN_PASSWORD_LENGTH;
  const matchOk = newPassword.length > 0 && newPassword === confirmPassword;

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);

    // Re-verify the current password before applying the change — an
    // already-open session alone isn't proof the person at the keyboard
    // right now is the account owner (shared/unattended device, hijacked
    // tab, etc). signInWithPassword against the same account doesn't
    // disturb the existing session either way.
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      setError('La contraseña actual no es correcta');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    toast.success('Contraseña actualizada');
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <PasswordInput
              id="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <PasswordInput
              id="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-new-password">Confirmar nueva contraseña</Label>
            <PasswordInput
              id="confirm-new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <PasswordStrengthMeter password={newPassword} confirmPassword={confirmPassword} />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading || !currentPassword || !lengthOk || !matchOk}>
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
