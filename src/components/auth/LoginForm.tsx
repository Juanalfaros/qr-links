import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, LockKeyIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Turnstile, type TurnstileHandle } from '@/components/auth/Turnstile';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface LoginFormProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo: string;
  turnstileSiteKey: string;
  name: string;
  logoUrl: string | null;
}

export function LoginForm({
  supabaseUrl,
  supabaseAnonKey,
  redirectTo,
  turnstileSiteKey,
  name,
  logoUrl,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      // Turnstile tokens are single-use — reset so a second attempt can solve fresh.
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    // Full page navigation (not client-side) so the next request re-runs the
    // middleware with the session cookies that were just written.
    window.location.assign(redirectTo);
  };

  return (
    <Card className="w-full max-w-sm shadow-[var(--shadow-card-lg)]">
      <CardHeader className="gap-3 pb-4">
        {/* White chip regardless of theme — the logo's own fixed colors
            aren't guaranteed to read well on the card's background in dark
            mode. */}
        {logoUrl && (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
            <img src={logoUrl} alt="" className="size-full object-contain" />
          </div>
        )}
        <div>
          <CardTitle className="font-heading text-xl">Iniciar sesión</CardTitle>
          <CardDescription>{name}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <div className="relative">
              <HugeiconsIcon
                icon={Mail01Icon}
                size={16}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <a href="/forgot-password" className="text-muted-foreground text-xs underline underline-offset-2">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <HugeiconsIcon
                icon={LockKeyIcon}
                size={16}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pl-8"
              />
            </div>
          </div>
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setError('No se pudo verificar el captcha. Intenta de nuevo.')}
            ref={turnstileRef}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || !captchaToken} className="mt-2">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
