import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreVerticalIcon,
  QrCode01Icon,
  Edit02Icon,
  Delete02Icon,
  Copy01Icon,
  RestoreBinIcon,
} from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QrCodeDisplay } from '@/components/qr/QrCodeDisplay';
import { EditLinkDialog } from '@/components/links/EditLinkDialog';
import { DeleteLinkAlert } from '@/components/links/DeleteLinkAlert';
import type { LinkRow } from '@/lib/types';

interface LinkRowActionsProps {
  siteUrl: string;
  logoUrl: string | null;
  qrDarkColor?: string | null;
  link: LinkRow;
  isArchived: boolean;
  onUpdated: (link: LinkRow) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (link: LinkRow) => void;
  onRestored: (id: string) => void;
}

export function LinkRowActions({
  siteUrl,
  logoUrl,
  qrDarkColor,
  link,
  isArchived,
  onUpdated,
  onDeleted,
  onDuplicated,
  onRestored,
}: LinkRowActionsProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDuplicate = async () => {
    const res = await fetch('/api/links/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: link.title, destination_url: link.destination_url }),
    });
    const body = (await res.json()) as { link?: Omit<LinkRow, 'clicks' | 'tags' | 'is_pinned'> };
    if (res.ok && body.link) {
      onDuplicated({ ...body.link, clicks: 0, tags: [], is_pinned: false });
    }
  };

  const handleRestore = async () => {
    const res = await fetch(`/api/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleted_at: null }),
    });
    if (res.ok) onRestored(link.id);
  };

  if (isArchived) {
    return (
      <Button variant="outline" size="sm" onClick={handleRestore}>
        <HugeiconsIcon icon={RestoreBinIcon} size={16} />
        Restaurar
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label="Acciones" />}>
          <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setQrOpen(true)}>
            <HugeiconsIcon icon={QrCode01Icon} size={16} />
            Ver QR
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <HugeiconsIcon icon={Edit02Icon} size={16} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <HugeiconsIcon icon={Copy01Icon} size={16} />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <HugeiconsIcon icon={Delete02Icon} size={16} />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR</DialogTitle>
          </DialogHeader>
          <QrCodeDisplay value={`${siteUrl}/${link.short_code}`} logoUrl={logoUrl} defaultDarkColor={qrDarkColor} />
        </DialogContent>
      </Dialog>

      <EditLinkDialog link={link} open={editOpen} onOpenChange={setEditOpen} onUpdated={onUpdated} />
      <DeleteLinkAlert
        linkId={link.id}
        linkTitle={link.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}
