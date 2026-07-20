import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SparkleShape } from '@/components/ui/decorative-shapes';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { toneForString, initialsFor } from '@/lib/avatar-tone';
import type { ProfileRow, UserRole } from '@/lib/types';

interface ProfileHeaderCardProps {
  profile: ProfileRow;
  departmentName: string | null;
}

const AVATAR_TONE_CLASSES: Record<string, string> = {
  yellow: 'bg-accent-yellow text-accent-yellow-foreground',
  pink: 'bg-accent-pink text-accent-pink-foreground',
  green: 'bg-accent-green text-accent-green-foreground',
  blue: 'bg-accent-blue text-accent-blue-foreground',
  lilac: 'bg-accent-lilac text-accent-lilac-foreground',
};

const ROLE_BADGE_VARIANT: Record<UserRole, 'outline' | 'info' | 'warning'> = {
  user: 'outline',
  manager: 'info',
  superadmin: 'warning',
};

export function ProfileHeaderCard({ profile, departmentName }: ProfileHeaderCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState(profile);
  const tone = toneForString(current.email);

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          {current.avatar_url ? (
            <img src={current.avatar_url} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <div
              className={`flex size-16 items-center justify-center rounded-2xl text-xl font-semibold ${AVATAR_TONE_CLASSES[tone]}`}
            >
              {initialsFor(current.full_name, current.email)}
            </div>
          )}
          <span className="bg-accent-pink text-accent-pink-foreground ring-card absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full ring-2">
            <SparkleShape className="size-3.5" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h2 className="font-heading truncate text-2xl font-semibold">{current.full_name || current.email}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Editar perfil"
              onClick={() => setEditOpen(true)}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">{current.email}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={ROLE_BADGE_VARIANT[current.role]}>{current.role}</Badge>
            {departmentName && <Badge variant="secondary">{departmentName}</Badge>}
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <HugeiconsIcon icon={Calendar01Icon} size={13} />
              Miembro desde {new Date(current.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={current} onUpdated={setCurrent} />
    </Card>
  );
}
