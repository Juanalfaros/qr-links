import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface MfaSetupProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo: string;
}

type Status = 'loading' | 'enrolling' | 'already-enrolled' | 'error';

export function MfaSetup({ supabaseUrl, supabaseAnonKey, redirectTo }: MfaSetupProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey));
  const [status, setStatus] = useState<Status>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (factorsError) {
        setStatus('error');
        setError(factorsError.message);
        return;
      }

      if (factorsData.totp.length > 0) {
        setStatus('already-enrolled');
        return;
      }

      // Reuse-by-replacing: an abandoned unverified factor from a previous
      // visit to this page can't have its QR/secret re-fetched, so drop it
      // and enroll fresh rather than accumulating orphaned factors.
      const unverifiedTotp = factorsData.all.find((f) => f.factor_type === 'totp' && f.status === 'unverified');
      if (unverifiedTotp) {
        await supabase.auth.mfa.unenroll({ factorId: unverifiedTotp.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (cancelled) return;
      if (enrollError || !data) {
        setStatus('error');
        setError(enrollError?.message ?? 'No se pudo iniciar la configuración de 2FA');
        return;
      }

      setFactorId(data.id);
      // Supabase already returns this as a complete data: URI (an SVG data
      // URL) — wrapping it in another data:image/svg+xml;utf-8, prefix
      // double-encodes it into an invalid nested URI, which is why the QR
      // showed as a broken image.
      setQrDataUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStatus('enrolling');
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleVerify = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError(verifyError.message);
      setVerifying(false);
      return;
    }

    // Full page navigation so the middleware re-reads the now-aal2 session cookie.
    window.location.assign(redirectTo);
  };

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Skeleton className="h-5 w-2/3" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Skeleton className="size-48" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (status === 'already-enrolled') {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>2FA ya configurado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Tu cuenta ya tiene la verificación en dos pasos activa.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Configura la verificación en dos pasos</CardTitle>
        <CardDescription>Obligatoria para cuentas de superadmin.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Escanea este código con tu app de autenticación (Google Authenticator, 1Password, etc.).
        </p>
        {qrDataUri && <img src={qrDataUri} alt="Código QR de 2FA" className="mx-auto size-48" />}
        {secret && (
          <p className="text-muted-foreground text-center font-mono text-xs break-all">
            O ingresa manualmente: {secret}
          </p>
        )}
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={verifying}>
            {verifying ? 'Verificando...' : 'Activar 2FA'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
