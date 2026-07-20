import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PinToggleProps {
  linkId: string;
  isPinned: boolean;
  onToggled: (isPinned: boolean) => void;
}

export function PinToggle({ linkId, isPinned, onToggled }: PinToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const next = !isPinned;
    const res = await fetch(`/api/links/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: next }),
    });
    setLoading(false);
    if (res.ok) onToggled(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleClick}
      disabled={loading}
      aria-label={isPinned ? 'Quitar de favoritos' : 'Marcar como favorito'}
    >
      <HugeiconsIcon icon={StarIcon} size={16} className={cn(isPinned ? 'text-amber-500' : 'text-muted-foreground')} />
    </Button>
  );
}
