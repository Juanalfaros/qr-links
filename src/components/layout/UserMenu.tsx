import { HugeiconsIcon } from '@hugeicons/react';
import { UserCircleIcon, Logout03Icon, ArrowUpDownIcon } from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole } from '@/lib/types';

interface UserMenuProps {
  email: string;
  role: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuario',
  manager: 'Manager',
  superadmin: 'Superadmin',
};

// Lives in the sidebar footer (see SidebarNav.astro) — the classic "account
// switcher" slot in most dashboard shells (Linear, Notion, Vercel), rather
// than a bare icon in the top header, so identity/role stays visible at a
// glance without opening anything.
export function UserMenu({ email, role }: UserMenuProps) {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" aria-label="Cuenta" />}
        className="hover:bg-sidebar-accent group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors"
      >
        <span className="bg-sidebar-accent text-sidebar-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          <HugeiconsIcon icon={UserCircleIcon} size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sidebar-foreground truncate text-sm font-medium">{email}</span>
          <span className="text-sidebar-foreground/55 truncate text-xs">{ROLE_LABELS[role]}</span>
        </span>
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70 shrink-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="text-muted-foreground truncate px-2 py-1.5 text-xs">{email}</div>
        <DropdownMenuItem onClick={handleLogout}>
          <HugeiconsIcon icon={Logout03Icon} size={16} />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
