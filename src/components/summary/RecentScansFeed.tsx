import { HugeiconsIcon } from '@hugeicons/react';
import { QrCode01Icon, Link04Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ScanItem {
  id: string;
  linkTitle: string;
  device: string | null;
  country: string | null;
  channel: string;
  scannedAt: string;
}

interface RecentScansFeedProps {
  scans: ScanItem[];
}

const CHANNEL_TONE_CLASSES: Record<string, string> = {
  qr: 'bg-accent-blue text-accent-blue-foreground',
  link: 'bg-accent-pink text-accent-pink-foreground',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function RecentScansFeed({ scans }: RecentScansFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimos clics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {scans.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin clics todavía.</p>
        ) : (
          scans.map((scan) => (
            <div key={scan.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  CHANNEL_TONE_CLASSES[scan.channel] ?? CHANNEL_TONE_CLASSES.link
                }`}
              >
                <HugeiconsIcon icon={scan.channel === 'qr' ? QrCode01Icon : Link04Icon} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{scan.linkTitle}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {scan.device ?? 'Desconocido'} · {scan.country ?? '—'}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(scan.scannedAt)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
