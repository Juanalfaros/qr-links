import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LinkRowActions } from '@/components/links/LinkRowActions';
import { PinToggle } from '@/components/links/PinToggle';
import { LinkBadges } from '@/components/links/LinkBadges';
import type { LinkRow } from '@/lib/types';

interface LinkCardProps {
  link: LinkRow;
  siteUrl: string;
  isArchived: boolean;
  onUpdated: (link: LinkRow) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (link: LinkRow) => void;
  onRestored: (id: string) => void;
}

export function LinkCard({ link, siteUrl, isArchived, onUpdated, onDeleted, onDuplicated, onRestored }: LinkCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              {!isArchived && (
                <PinToggle
                  linkId={link.id}
                  isPinned={link.is_pinned}
                  onToggled={(isPinned) => onUpdated({ ...link, is_pinned: isPinned })}
                />
              )}
              <p className="truncate font-medium">{link.title}</p>
              <LinkBadges link={link} />
            </div>
            <a
              href={`/admin/analytics/${link.id}`}
              className="text-muted-foreground font-mono text-sm underline-offset-2 hover:underline"
            >
              {link.short_code}
            </a>
            {link.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {link.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 text-sm">{link.clicks} clics</span>
        </div>
        <p className="text-muted-foreground truncate text-sm">{link.destination_url}</p>
        <div>
          <LinkRowActions
            siteUrl={siteUrl}
            link={link}
            isArchived={isArchived}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onDuplicated={onDuplicated}
            onRestored={onRestored}
          />
        </div>
      </CardContent>
    </Card>
  );
}
