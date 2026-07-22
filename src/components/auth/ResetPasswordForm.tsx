import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from '@/lib/password-strength';

interface ResetPasswordFormProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  name: string;
  logoUrl: string | null;
}

// How long to wait for Supabase's PASSWORD_RECOVERY event before assuming the
// link is invalid/expired/already used, rather than just "still loading".
const RECOVERY_TIMEOUT_MS = 8000;

type Status = 'waiting' | 'ready' | 'expired';

export function ResetPasswordForm({ supabaseUrl, supabaseAnonKey, name, logoUrl }: ResetPasswordFormProps) {
  const [status, setStatus] = useState<Status>('waiting');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey));

  useEffect(() => {
    const supabase = supabaseRef.current;
    const timeout = window.setTimeout(() => setStatus((s) => (s === 'waiting' ? 'expired' : s)), RECOVERY_TIMEOUT_MS);

    // Supabase establishes the recovery session from the URL (hash or PKCE
    // `code` param, handled internally by the client) and fires this event
    // once it's ready — the documented way to detect "safe to show a
    // set-new-password form" rather than parsing the URL ourselves.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.clearTimeout(timeout);
        setStatus('ready');
      }
    });

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const lengthOk = newPassword.length >= MIN_PASSWORD_LENGTH;
  const matchOk = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: updateError } = await supabaseRef.current.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    window.location.assign('/login');
  };

  return (
    <Card className="w-full max-w-sm shadow-[var(--shadow-card-lg)]">
      <CardHeader className="gap-3 pb-4">
        {logoUrl && (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
            <img src={logoUrl} alt="" className="size-full object-contain" />
          </div>
        )}
        <div>
          <CardTitle className="font-heading text-xl">Nueva contraseña</CardTitle>
          <CardDescription>{name}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {status === 'waiting' && <p className="text-muted-foreground text-sm">Verificando enlace...</p>}
        {status === 'expired' && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-destructive flex items-start gap-2 text-sm">
              <HugeiconsIcon icon={Cancel01Icon} size={16} className="mt-0.5 shrink-0" />
              Este enlace no es válido o ya venció.
            </p>
            <a href="/forgot-password" className="text-primary text-sm underline underline-offset-2">
              Solicitar uno nuevo
            </a>
          </div>
        )}
        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Button type="submit" disabled={loading || !lengthOk || !matchOk} className="mt-2">
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
