import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Turnstile, type TurnstileHandle } from '@/components/auth/Turnstile';

interface ForgotPasswordFormProps {
  turnstileSiteKey: string;
  name: string;
  logoUrl: string | null;
}

export function ForgotPasswordForm({ turnstileSiteKey, name, logoUrl }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, captchaToken }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'No se pudo procesar la solicitud');
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    // Always show the same neutral confirmation, whether or not that email is
    // actually registered — the API itself never reveals which case occurred.
    setSent(true);
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
          <CardTitle className="font-heading text-xl">Recuperar contraseña</CardTitle>
          <CardDescription>{name}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <HugeiconsIcon icon={Tick02Icon} size={16} className="text-accent-green-foreground mt-0.5 shrink-0" />
              Si {email} está registrado, te enviamos un enlace para restablecer tu contraseña.
            </p>
            <a href="/login" className="text-primary text-sm underline underline-offset-2">
              Volver a iniciar sesión
            </a>
          </div>
        ) : (
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
            <Turnstile siteKey={turnstileSiteKey} onVerify={setCaptchaToken} ref={turnstileRef} />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading || !captchaToken} className="mt-2">
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>
            <a href="/login" className="text-muted-foreground text-center text-xs underline underline-offset-2">
              Volver a iniciar sesión
            </a>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
