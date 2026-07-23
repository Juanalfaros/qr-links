import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { getPasswordStrength, STRENGTH_BAR_COLORS, STRENGTH_TEXT_COLORS } from '@/lib/password-strength';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword: string;
}

export function PasswordStrengthMeter({ password, confirmPassword }: PasswordStrengthMeterProps) {
  if (password.length === 0 && confirmPassword.length === 0) return null;

  const strength = getPasswordStrength(password);
  const matchOk = password.length > 0 && password === confirmPassword;

  return (
    <div className="-mt-2 flex flex-col gap-1.5">
      {password.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= strength.tier ? STRENGTH_BAR_COLORS[strength.tier] : 'bg-muted',
                )}
              />
            ))}
          </div>
          <span className={cn('text-xs', STRENGTH_TEXT_COLORS[strength.tier])}>{strength.label}</span>
        </div>
      )}
      {confirmPassword.length > 0 && (
        <p
          className={cn(
            'flex items-center gap-1.5 text-xs',
            matchOk ? 'text-accent-green-foreground' : 'text-destructive',
          )}
        >
          <HugeiconsIcon icon={matchOk ? Tick02Icon : Cancel01Icon} size={13} />
          {matchOk ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
        </p>
      )}
    </div>
  );
}
