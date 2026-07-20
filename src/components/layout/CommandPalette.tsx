import { useEffect, useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Chart01Icon,
  DashboardSquare01Icon,
  Link04Icon,
  QrCode01Icon,
  Search01Icon,
  ShieldUserIcon,
  UserIcon,
  Key01Icon,
} from '@hugeicons/core-free-icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CommandPaletteProps {
  isSuperadmin: boolean;
}

interface ResultItem {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: IconSvgElement;
}

interface LinkSearchResult {
  id: string;
  title: string;
  short_code: string;
}

const NAV_ITEMS: Omit<ResultItem, 'key'>[] = [
  { label: 'Resumen', href: '/admin/summary', icon: DashboardSquare01Icon },
  { label: 'Mis links', href: '/admin/dashboard', icon: Link04Icon },
  { label: 'Comparar links', href: '/admin/analytics/compare', icon: Chart01Icon },
  { label: 'Exportar QR en lote', href: '/admin/qr-bulk-export', icon: QrCode01Icon },
  { label: 'Mi perfil', href: '/admin/profile', icon: UserIcon },
  { label: 'Tokens de API', href: '/admin/api-tokens', icon: Key01Icon },
];

export function CommandPalette({ isSuperadmin }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [linkResults, setLinkResults] = useState<LinkSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = isSuperadmin
    ? [...NAV_ITEMS, { label: 'Superadmin', href: '/superadmin/dashboard', icon: ShieldUserIcon }]
    : NAV_ITEMS;

  const filteredNav = navItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  const results: ResultItem[] = [
    ...filteredNav.map((item) => ({ key: `nav-${item.href}`, ...item })),
    ...linkResults.map((link) => ({
      key: `link-${link.id}`,
      label: link.title,
      subtitle: `/${link.short_code}`,
      href: `/admin/analytics/${link.id}`,
      icon: Link04Icon,
    })),
  ];

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setLinkResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    const trimmed = query.trim();
    if (!trimmed) {
      setLinkResults([]);
      return;
    }
    const debounce = setTimeout(() => {
      fetch(`/api/links/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((body) => setLinkResults((body as { links?: LinkSearchResult[] }).links ?? []));
    }, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const navigate = (href: string) => {
    setOpen(false);
    window.location.assign(href);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = results[activeIndex];
      if (active) navigate(active.href);
    }
  };

  return (
    <>
      {/* No visible "Buscar" text on purpose — the Fase 1 filter bar has a
          literal "Buscar" button and page.click('button:has-text("Buscar")')
          would otherwise match both. Accessible name comes from aria-label. */}
      <Button
        variant="outline"
        aria-label="Buscar (Ctrl+K)"
        onClick={() => setOpen(true)}
        className="text-muted-foreground bg-card h-9 gap-2 rounded-full px-3 shadow-[var(--shadow-card)]"
      >
        <HugeiconsIcon icon={Search01Icon} size={16} />
        <kbd className="bg-muted hidden rounded-full px-2 py-0.5 text-[10px] sm:inline">Ctrl+K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-24 max-w-lg -translate-y-0 sm:max-w-lg"
          contentClassName="gap-0 p-0"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <HugeiconsIcon icon={Search01Icon} size={16} className="text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar links o páginas..."
              className="h-8 border-none px-0 shadow-none focus-visible:ring-0"
            />
            <kbd className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 text-xs">Esc</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-sm">Sin resultados.</p>
            ) : (
              results.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                    index === activeIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <HugeiconsIcon icon={item.icon} size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.subtitle && (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">{item.subtitle}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
