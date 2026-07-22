import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, Building01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Turnstile, type TurnstileHandle } from '@/components/auth/Turnstile';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from '@/lib/password-strength';

interface SetupFormProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  turnstileSiteKey: string;
}

type Step = 'account' | 'branding';

export function SetupForm({ supabaseUrl, supabaseAnonKey, turnstileSiteKey }: SetupFormProps) {
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const lengthOk = password.length >= MIN_PASSWORD_LENGTH;
  const matchOk = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Step 1 only validates and advances — the actual account isn't created
    // until the final submit on step 2, so there's nothing to send yet.
    if (step === 'account') {
      if (!lengthOk || !matchOk) return;
      setStep('branding');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('companyName', companyName);
    if (logo) formData.append('logo', logo);
    if (favicon) formData.append('favicon', favicon);

    const res = await fetch('/api/setup', { method: 'POST', body: formData });
    const body = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(body.error ?? 'No se pudo completar la configuración inicial');
      setLoading(false);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    // The account now exists, but /api/setup (service-role) never
    // established a browser session — sign in the same way LoginForm does,
    // then do a full page navigation so the next request re-runs the
    // middleware with the session cookies that were just written.
    const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.assign('/admin/dashboard');
  };

  return (
    <Card className="w-full max-w-lg shadow-[var(--shadow-card-lg)]">
      <CardHeader className="gap-3 pb-4">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-2xl">
          <HugeiconsIcon icon={Building01Icon} size={20} />
        </div>
        <div>
          <CardTitle className="font-heading text-xl">Configuración inicial</CardTitle>
          <CardDescription>
            {step === 'account'
              ? 'Crea la cuenta de administrador — paso 1 de 2'
              : 'Configura el nombre y logo de tu empresa — paso 2 de 2'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {step === 'account' ? (
            <>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <PasswordInput
                    id="confirm-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <PasswordStrengthMeter password={password} confirmPassword={confirmPassword} />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-name">Nombre de la empresa</Label>
                <Input
                  id="company-name"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mi Empresa"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="setup-logo">Logo (opcional)</Label>
                  <FileDropzone
                    id="setup-logo"
                    accept="image/svg+xml,image/png,image/jpeg"
                    file={logo}
                    onFileChange={setLogo}
                    hint="Se usa un logo genérico si se deja vacío"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="setup-favicon">Favicon (opcional)</Label>
                  <FileDropzone
                    id="setup-favicon"
                    accept="image/svg+xml,image/png,image/x-icon"
                    file={favicon}
                    onFileChange={setFavicon}
                    hint="Se usa un ícono genérico si se deja vacío"
                  />
                </div>
              </div>
              <Turnstile siteKey={turnstileSiteKey} onVerify={setCaptchaToken} ref={turnstileRef} />
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="mt-2 flex gap-2">
            {step === 'branding' && (
              <Button type="button" variant="outline" onClick={() => setStep('account')} disabled={loading}>
                Atrás
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || (step === 'account' ? !lengthOk || !matchOk : !captchaToken)}
              className="flex-1"
            >
              {step === 'account' ? 'Continuar' : loading ? 'Configurando...' : 'Completar configuración'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
