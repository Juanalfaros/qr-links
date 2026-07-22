import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, ShieldKeyIcon, Key01Icon, Building01Icon, LockKeyIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { cn } from '@/lib/utils';
import type { ProfileRow } from '@/lib/types';

interface AccountSecurityCardProps {
  profile: ProfileRow;
  departmentName: string | null;
  mfaEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function AccountSecurityCard({
  profile,
  departmentName,
  mfaEnabled,
  supabaseUrl,
  supabaseAnonKey,
}: AccountSecurityCardProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cuenta y seguridad</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-sm">
          <HugeiconsIcon icon={Mail01Icon} size={16} className="text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1 truncate">{profile.email}</span>
        </div>
        {departmentName && (
          <div className="flex items-center gap-2.5 text-sm">
            <HugeiconsIcon icon={Building01Icon} size={16} className="text-muted-foreground shrink-0" />
            <span className="min-w-0 flex-1 truncate">{departmentName}</span>
          </div>
        )}
        {profile.role === 'superadmin' && (
          <div className="flex items-center gap-2.5 text-sm">
            <HugeiconsIcon icon={ShieldKeyIcon} size={16} className="text-muted-foreground shrink-0" />
            <span className="flex-1">Verificación en dos pasos</span>
            <Badge variant={mfaEnabled ? 'success' : 'warning'}>{mfaEnabled ? 'Activa' : 'Pendiente'}</Badge>
          </div>
        )}
        <a
          href="/admin/api-tokens"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'justify-start gap-2')}
        >
          <HugeiconsIcon icon={Key01Icon} size={16} />
          Tokens de API
        </a>
        <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setChangePasswordOpen(true)}>
          <HugeiconsIcon icon={LockKeyIcon} size={16} />
          Cambiar contraseña
        </Button>
      </CardContent>
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        email={profile.email}
        supabaseUrl={supabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
      />
    </Card>
  );
}
