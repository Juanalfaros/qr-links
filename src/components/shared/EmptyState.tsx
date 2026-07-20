import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

interface EmptyStateProps {
  icon: IconSvgElement;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
      <div className="bg-accent-lilac text-accent-lilac-foreground flex size-11 items-center justify-center rounded-2xl">
        <HugeiconsIcon icon={icon} size={20} />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
