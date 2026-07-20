import { HugeiconsIcon } from '@hugeicons/react';
import { UserCircleIcon, Logout03Icon } from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Cuenta" />}
        className="rounded-full"
      >
        <HugeiconsIcon icon={UserCircleIcon} size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="text-muted-foreground truncate px-2 py-1.5 text-xs">{email}</div>
        <DropdownMenuItem onClick={handleLogout}>
          <HugeiconsIcon icon={Logout03Icon} size={16} />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
