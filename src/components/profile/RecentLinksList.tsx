import { HugeiconsIcon } from '@hugeicons/react';
import { Link04Icon, MouseLeftClick01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';

interface RecentLinksListProps {
  links: { id: string; title: string; short_code: string; created_at: string; click_count: number }[];
}

const ICON_TONE_CLASSES = [
  'bg-accent-yellow text-accent-yellow-foreground',
  'bg-accent-pink text-accent-pink-foreground',
  'bg-accent-green text-accent-green-foreground',
  'bg-accent-blue text-accent-blue-foreground',
  'bg-accent-lilac text-accent-lilac-foreground',
];

export function RecentLinksList({ links }: RecentLinksListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tus links recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <EmptyState
            icon={Link04Icon}
            title="Aún no tienes links"
            description="Crea tu primer link desde el panel principal para verlo aquí."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((link, i) => (
              <li key={link.id}>
                <a
                  href={`/admin/analytics/${link.id}`}
                  className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${ICON_TONE_CLASSES[i % ICON_TONE_CLASSES.length]}`}
                  >
                    <HugeiconsIcon icon={Link04Icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{link.title}</p>
                    <p className="text-muted-foreground font-mono text-xs">/{link.short_code}</p>
                  </div>
                  <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={MouseLeftClick01Icon} size={12} />
                      {link.click_count}
                    </span>
                    <span className="hidden sm:inline">{new Date(link.created_at).toLocaleDateString()}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
