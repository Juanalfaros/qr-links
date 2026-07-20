import { useEffect, useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Notification01Icon, Shield01Icon, UserBlock01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NotificationRow } from '@/lib/types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

// The only real sources of notifications today (see migration 0024): the
// audit_profiles_changes trigger's role-change and suspend/unsuspend rows.
// A generic fallback covers any future notification type.
function notificationVisual(title: string): { icon: IconSvgElement; toneClass: string } {
  if (title.includes('rol')) return { icon: Shield01Icon, toneClass: 'bg-accent-blue text-accent-blue-foreground' };
  if (title.includes('suspendida')) return { icon: UserBlock01Icon, toneClass: 'bg-destructive/10 text-destructive' };
  if (title.includes('reactivada'))
    return { icon: Tick02Icon, toneClass: 'bg-accent-green text-accent-green-foreground' };
  return { icon: Notification01Icon, toneClass: 'bg-accent-lilac text-accent-lilac-foreground' };
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const body = (await res.json()) as { notifications: NotificationRow[]; unreadCount: number };
    setNotifications(body.notifications);
    setUnreadCount(body.unreadCount);
  };

  useEffect(() => {
    load();
    // Polling (not realtime) keeps this on Supabase/Cloudflare's free tier —
    // good enough for a notification bell, not a chat app.
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Notificaciones" />}
        className="relative rounded-full"
      >
        <HugeiconsIcon icon={Notification01Icon} size={18} />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm font-medium">Notificaciones</span>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="text-muted-foreground text-xs hover:underline">
              Marcar todas como leídas
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">Sin notificaciones.</p>
        ) : (
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {notifications.map((n) => {
              const { icon, toneClass } = notificationVisual(n.title);
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className="items-start gap-2.5"
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
                    <HugeiconsIcon icon={icon} size={14} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex w-full items-center gap-1.5">
                      {!n.read_at && <span className="bg-primary size-1.5 shrink-0 rounded-full" />}
                      <span className="truncate font-medium">{n.title}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{n.body}</span>
                    <span className="text-muted-foreground text-xs">{timeAgo(n.created_at)}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
