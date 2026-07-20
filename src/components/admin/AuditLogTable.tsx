import { Clock01Icon } from '@hugeicons/core-free-icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import type { AuditLogRow } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  role_changed: 'Cambio de rol',
  user_suspended: 'Usuario suspendido',
  user_unsuspended: 'Usuario reactivado',
  link_deleted: 'Link eliminado',
};

interface AuditLogTableProps {
  entries: AuditLogRow[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock01Icon}
        title="Sin actividad todavía"
        description="Cambios de rol, suspensiones y eliminación de links aparecerán aquí."
      />
    );
  }

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acción</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
              <TableCell className="text-muted-foreground">{entry.actor_email ?? 'N/A'}</TableCell>
              <TableCell className="text-muted-foreground">{JSON.stringify(entry.metadata)}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
