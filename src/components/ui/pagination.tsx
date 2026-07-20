import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="flex items-center justify-center gap-3">
      {prevDisabled ? (
        <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'pointer-events-none opacity-50')}>
          Anterior
        </span>
      ) : (
        <a href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Anterior
        </a>
      )}
      <span className="text-muted-foreground text-sm">
        Página {page} de {totalPages}
      </span>
      {nextDisabled ? (
        <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'pointer-events-none opacity-50')}>
          Siguiente
        </span>
      ) : (
        <a href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Siguiente
        </a>
      )}
    </nav>
  );
}
