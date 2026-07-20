import { Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersDataTable } from '@/components/admin/UsersDataTable';
import { GlobalLinksTable } from '@/components/admin/GlobalLinksTable';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { SimpleListManager } from '@/components/admin/SimpleListManager';
import { AlertRulesManager } from '@/components/admin/AlertRulesManager';
import { KpiCards } from '@/components/analytics/KpiCards';
import { ClicksOverTime } from '@/components/analytics/ClicksOverTime';
import { BreakdownCard } from '@/components/analytics/BreakdownCard';
import { WorldMap } from '@/components/analytics/WorldMap';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AllowedDomainRow,
  AlertRuleRow,
  AuditLogRow,
  BlockedPatternRow,
  DepartmentRow,
  GlobalLinkRow,
  ProfileRow,
} from '@/lib/types';
import type { LinkAnalyticsStats } from '@/lib/analytics';

interface SuperadminTabsProps {
  users: ProfileRow[];
  departments: DepartmentRow[];
  globalLinks: GlobalLinkRow[];
  auditLog: AuditLogRow[];
  allowedDomains: AllowedDomainRow[];
  blockedPatterns: BlockedPatternRow[];
  alertRules: AlertRuleRow[];
  companyStats: LinkAnalyticsStats;
  dateRange: { from: string; to: string };
  currentUserId: string;
  defaultTab: string;
  linksPage: number;
  linksTotalPages: number;
}

export function SuperadminTabs({
  users,
  departments,
  globalLinks,
  auditLog,
  allowedDomains,
  blockedPatterns,
  alertRules,
  companyStats,
  dateRange,
  currentUserId,
  defaultTab,
  linksPage,
  linksTotalPages,
}: SuperadminTabsProps) {
  const topCountry = companyStats.byCountry[0]?.label ?? 'N/A';
  const topDevice = companyStats.byDevice[0]?.label ?? 'N/A';

  return (
    <Tabs defaultValue={defaultTab}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="links">Links de la empresa</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="users">
        <UsersDataTable initialUsers={users} initialDepartments={departments} currentUserId={currentUserId} />
      </TabsContent>
      <TabsContent value="links">
        <div className="flex flex-col gap-4">
          <GlobalLinksTable links={globalLinks} />
          <Pagination page={linksPage} totalPages={linksTotalPages} buildHref={(p) => `?tab=links&page=${p}`} />
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <div className="flex flex-col gap-4">
          <form method="GET" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tab" value="analytics" />
            <Label htmlFor="analytics-from" className="text-muted-foreground flex flex-col items-start gap-1 text-xs">
              Desde
              <Input id="analytics-from" type="date" name="from" defaultValue={dateRange.from} className="h-8" />
            </Label>
            <Label htmlFor="analytics-to" className="text-muted-foreground flex flex-col items-start gap-1 text-xs">
              Hasta
              <Input id="analytics-to" type="date" name="to" defaultValue={dateRange.to} className="h-8" />
            </Label>
            <Button type="submit" size="sm">
              Filtrar
            </Button>
            {(dateRange.from || dateRange.to) && (
              <a href="?tab=analytics" className="text-muted-foreground text-sm underline underline-offset-2">
                Limpiar
              </a>
            )}
          </form>
          <KpiCards
            totalClicks={companyStats.total}
            uniqueClicks={companyStats.unique}
            topCountry={topCountry}
            topDevice={topDevice}
          />
          <ClicksOverTime series={[{ label: 'Toda la empresa', days: companyStats.days }]} />
          <WorldMap data={companyStats.byCountry} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BreakdownCard title="Por dispositivo" items={companyStats.byDevice} accent="chart-2" />
            <BreakdownCard title="Por referrer" items={companyStats.byReferrer} accent="chart-3" />
            <BreakdownCard title="Por canal" items={companyStats.byChannel} accent="chart-4" />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="alerts">
        <AlertRulesManager initialRules={alertRules} links={globalLinks.map((l) => ({ id: l.id, title: l.title }))} />
      </TabsContent>
      <TabsContent value="security">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SimpleListManager
            title="Dominios permitidos"
            placeholder="ejemplo.com"
            apiPath="/api/admin/allowed-domains"
            fieldName="domain"
            responseKey="domain"
            initialItems={allowedDomains.map((d) => ({ id: d.id, value: d.domain }))}
            emptyHint="Sin restricción: cualquier dominio de destino está permitido."
            icon={Tick02Icon}
            tone="green"
          />
          <SimpleListManager
            title="Dominios/patrones bloqueados"
            placeholder="dominio-sospechoso.com"
            apiPath="/api/admin/blocked-patterns"
            fieldName="pattern"
            responseKey="pattern"
            initialItems={blockedPatterns.map((p) => ({ id: p.id, value: p.pattern }))}
            emptyHint="Sin patrones bloqueados todavía."
            icon={Cancel01Icon}
            tone="pink"
          />
        </div>
      </TabsContent>
      <TabsContent value="audit">
        <AuditLogTable entries={auditLog} />
      </TabsContent>
    </Tabs>
  );
}
