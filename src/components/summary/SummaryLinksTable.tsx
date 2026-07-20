import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SummaryLinkItem {
  id: string;
  title: string;
  short_code: string;
  clicks: number;
  status: 'active' | 'protected' | 'expiring';
  created_at: string;
}

interface SummaryLinksTableProps {
  links: SummaryLinkItem[];
}

const STATUS_LABEL: Record<SummaryLinkItem['status'], string> = {
  active: 'Activo',
  protected: 'Protegido',
  expiring: 'Por vencer',
};

const STATUS_VARIANT: Record<SummaryLinkItem['status'], 'success' | 'info' | 'warning'> = {
  active: 'success',
  protected: 'info',
  expiring: 'warning',
};

const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'protected', label: 'Protegidos' },
  { value: 'expiring', label: 'Por vencer' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

export function SummaryLinksTable({ links }: SummaryLinksTableProps) {
  const [tab, setTab] = useState<TabValue>('all');
  const filtered = tab === 'all' ? links : links.filter((l) => l.status === tab);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Tus links</CardTitle>
        <a href="/admin/dashboard" className="text-muted-foreground text-sm underline underline-offset-2">
          Ver todos
        </a>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <TabsList className="mb-3">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {filtered.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">Sin links en esta categoría.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Clics</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Creado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <a href={`/admin/analytics/${link.id}`} className="hover:underline">
                              {link.title}
                            </a>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">{link.short_code}</TableCell>
                          <TableCell>{link.clicks}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[link.status]}>{STATUS_LABEL[link.status]}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(link.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
