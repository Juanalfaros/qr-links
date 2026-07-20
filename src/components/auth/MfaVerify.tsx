import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface MfaVerifyProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo: string;
}

export function MfaVerify({ supabaseUrl, supabaseAnonKey, redirectTo }: MfaVerifyProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey));
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const verifiedTotp = data?.totp[0];
      if (factorsError || !verifiedTotp) {
        setError(factorsError?.message ?? 'No se encontró un factor de 2FA configurado');
        return;
      }
      setFactorId(verifiedTotp.id);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    // Full page navigation so the middleware re-reads the now-aal2 session cookie.
    window.location.assign(redirectTo);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>Ingresa el código de tu app de autenticación.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
          {!ready && !error ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading || !ready}>
            {loading ? 'Verificando...' : 'Continuar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
