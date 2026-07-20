import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, HourglassIcon } from '@hugeicons/core-free-icons';
import type { LinkRow } from '@/lib/types';

interface LinkBadgesProps {
  link: Pick<LinkRow, 'has_password' | 'expires_at' | 'max_clicks'>;
}

export function LinkBadges({ link }: LinkBadgesProps) {
  const hasExpiry = Boolean(link.expires_at || link.max_clicks);
  if (!link.has_password && !hasExpiry) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      {link.has_password && (
        <span title="Protegido con contraseña" className="text-accent-blue-foreground">
          <HugeiconsIcon icon={LockIcon} size={14} />
        </span>
      )}
      {hasExpiry && (
        <span title="Tiene expiración o límite de clics" className="text-accent-yellow-foreground">
          <HugeiconsIcon icon={HourglassIcon} size={14} />
        </span>
      )}
    </span>
  );
}
