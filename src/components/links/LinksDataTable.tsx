import { useState } from 'react';
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Link04Icon, Archive01Icon } from '@hugeicons/core-free-icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreateLinkDialog } from '@/components/links/CreateLinkDialog';
import { BitlyImportDialog } from '@/components/links/BitlyImportDialog';
import { LinkRowActions } from '@/components/links/LinkRowActions';
import { LinkCard } from '@/components/links/LinkCard';
import { PinToggle } from '@/components/links/PinToggle';
import { LinkBadges } from '@/components/links/LinkBadges';
import { EmptyState } from '@/components/shared/EmptyState';
import type { LinkRow } from '@/lib/types';

interface LinksDataTableProps {
  initialLinks: LinkRow[];
  siteUrl: string;
  isArchived: boolean;
}

export function LinksDataTable({ initialLinks, siteUrl, isArchived }: LinksDataTableProps) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);

  const handleUpdated = (updated: LinkRow) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const handleRemoved = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDuplicated = (link: LinkRow) => {
    setLinks((prev) => [link, ...prev]);
  };

  const columns: ColumnDef<LinkRow>[] = [
    {
      id: 'pin',
      header: '',
      cell: ({ row }) =>
        isArchived ? null : (
          <PinToggle
            linkId={row.original.id}
            isPinned={row.original.is_pinned}
            onToggled={(isPinned) => handleUpdated({ ...row.original, is_pinned: isPinned })}
          />
        ),
    },
    {
      accessorKey: 'title',
      header: 'Título',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span>{row.original.title}</span>
            <LinkBadges link={row.original} />
          </div>
          {row.original.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'short_code',
      header: 'Código',
      cell: ({ row }) => (
        <a
          href={`/admin/analytics/${row.original.id}`}
          className="font-mono text-sm underline-offset-2 hover:underline"
        >
          {row.original.short_code}
        </a>
      ),
    },
    {
      accessorKey: 'destination_url',
      header: 'Destino',
      cell: ({ row }) => (
        <span className="text-muted-foreground block max-w-xs truncate">{row.original.destination_url}</span>
      ),
    },
    { accessorKey: 'clicks', header: 'Clics' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <LinkRowActions
          siteUrl={siteUrl}
          link={row.original}
          isArchived={isArchived}
          onUpdated={handleUpdated}
          onDeleted={handleRemoved}
          onDuplicated={handleDuplicated}
          onRestored={handleRemoved}
        />
      ),
    },
  ];

  const table = useReactTable({ data: links, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="flex flex-col gap-4">
      {!isArchived && (
        <div className="flex justify-end gap-2">
          <BitlyImportDialog onImported={(imported) => setLinks((prev) => [...imported, ...prev])} />
          <CreateLinkDialog siteUrl={siteUrl} onCreated={(link) => setLinks((prev) => [link, ...prev])} />
        </div>
      )}

      {links.length === 0 ? (
        <EmptyState
          icon={isArchived ? Archive01Icon : Link04Icon}
          title={isArchived ? 'No hay links archivados' : 'Aún no tienes links'}
          description={
            isArchived
              ? 'Los links que archives aparecerán aquí.'
              : 'Crea tu primer link para empezar a compartirlo y ver sus analíticas.'
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {links.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                siteUrl={siteUrl}
                isArchived={isArchived}
                onUpdated={handleUpdated}
                onDeleted={handleRemoved}
                onDuplicated={handleDuplicated}
                onRestored={handleRemoved}
              />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="bg-card border-border/60 hidden overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
