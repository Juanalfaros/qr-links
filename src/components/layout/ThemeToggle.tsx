import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun03Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  // Starts false for SSR/first paint safety (no `document` on the server); the
  // blocking inline script in BaseLayout already set the real class on <html>
  // before this hydrates, so this effect just syncs the icon to match it.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Cambiar tema" className="rounded-full">
      <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} size={18} />
    </Button>
  );
}
