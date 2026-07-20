import { Link04Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import type { GlobalLinkRow } from '@/lib/types';

interface GlobalLinksTableProps {
  links: GlobalLinkRow[];
}

export function GlobalLinksTable({ links }: GlobalLinksTableProps) {
  if (links.length === 0) {
    return (
      <EmptyState
        icon={Link04Icon}
        title="Sin links todavía"
        description="En cuanto alguien de la empresa cree un link, aparecerá aquí."
      />
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {links.map((link) => (
          <Card key={link.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{link.title}</p>
                  <p className="text-muted-foreground font-mono text-sm">{link.short_code}</p>
                </div>
                <span className="text-muted-foreground shrink-0 text-sm">{link.clicks} clics</span>
              </div>
              <p className="text-muted-foreground truncate text-sm">{link.destination_url}</p>
              <p className="text-sm">{link.owner_email}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="bg-card border-border/60 hidden overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Dueño</TableHead>
              <TableHead>Clics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell>{link.title}</TableCell>
                <TableCell className="font-mono text-sm">{link.short_code}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{link.destination_url}</TableCell>
                <TableCell>{link.owner_email}</TableCell>
                <TableCell>{link.clicks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
