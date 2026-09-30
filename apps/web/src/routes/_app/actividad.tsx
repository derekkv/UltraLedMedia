import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ChevronRight, X, ArrowRight } from 'lucide-react';
import { meQueryOptions } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';
import {
  auditQueryKey,
  actionLabel,
  actionTone,
  fieldLabel,
  formatFieldValue,
  AUDIT_ENTITY_FILTERS,
  ENTITY_LABELS,
  type AuditListResponse,
  type AuditLogEntry,
} from '@/lib/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/actividad')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!me.roles.includes('ADMIN')) throw redirect({ to: '/' });
  },
  component: ActividadPage,
});

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const SELECT_CLASS =
  'flex h-10 w-auto min-w-40 rounded-md bg-input px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

const DOT: Record<ReturnType<typeof actionTone>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

function ActividadPage(): React.ReactElement {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [entity, setEntity] = React.useState('');
  const [selected, setSelected] = React.useState<AuditLogEntry | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: [...auditQueryKey, debounced, entity],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '60' });
      if (debounced) params.set('q', debounced);
      if (entity) params.set('entity', entity);
      return api.get<AuditListResponse>(`/audit-logs?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <p className={EYEBROW}>Administración</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight">Actividad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Registro detallado de cada acción: quién, cuándo y qué cambió.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por acción, persona o id…"
            className="pl-9"
          />
        </div>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrar por tipo"
        >
          {AUDIT_ENTITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="px-5 py-12 text-center text-sm text-destructive">
              No se pudo cargar la actividad.
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-muted-foreground">
              No hay actividad registrada todavía.
            </div>
          ) : (
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-1 p-2"
            >
              {items.map((log) => (
                <motion.li key={log.id} variants={staggerItem}>
                  <button
                    type="button"
                    onClick={() => setSelected(log)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[actionTone(log.action)])}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{log.summary}</span>
                        <Badge variant={actionTone(log.action)}>{actionLabel(log.action)}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {log.actor?.fullName ?? 'Sistema'}
                        {log.entity ? ` · ${ENTITY_LABELS[log.entity] ?? log.entity}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className="text-xs tabular-nums text-muted-foreground"
                        title={formatDateTime(log.createdAt)}
                      >
                        {timeAgo(log.createdAt)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardContent>
      </Card>

      <LogDetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function LogDetailModal({
  log,
  onClose,
}: {
  log: AuditLogEntry | null;
  onClose: () => void;
}): React.ReactElement {
  return (
    <Modal open={log !== null} onOpenChange={(o) => !o && onClose()} className="max-w-lg">
      {log && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn('size-2 rounded-full', DOT[actionTone(log.action)])}
                  aria-hidden="true"
                />
                <ModalTitle className="text-base font-semibold text-foreground">
                  {actionLabel(log.action)}
                </ModalTitle>
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">{log.summary}</p>
            </div>
            <ModalClose asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </ModalClose>
          </div>

          {/* Meta */}
          <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-xs">
            <Meta label="Quién" value={log.actor?.fullName ?? 'Sistema'} />
            <Meta label="Cuándo" value={formatDateTime(log.createdAt)} />
            <Meta label="Tipo" value={log.entity ? ENTITY_LABELS[log.entity] ?? log.entity : '—'} />
            {log.actor?.email && <Meta label="Email" value={log.actor.email} />}
            {log.ip && <Meta label="IP" value={log.ip} />}
          </dl>

          {/* Cambios (amigable) */}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div className="mt-4">
              <p className={cn(EYEBROW, 'mb-2')}>Qué cambió</p>
              <div className="flex flex-col gap-2">
                {Object.entries(log.changes).map(([field, change]) => (
                  <div key={field} className="rounded-xl bg-surface-2 p-3">
                    <p className="text-xs font-semibold text-foreground">{fieldLabel(field)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive line-through decoration-destructive/50">
                        {formatFieldValue(field, change.from)}
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
                        {formatFieldValue(field, change.to)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Snapshot (alta/borrado) */}
          {log.snapshot && Object.keys(log.snapshot).length > 0 && (
            <div className="mt-4">
              <p className={cn(EYEBROW, 'mb-2')}>Datos</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-xl bg-surface-2 p-3 sm:grid-cols-2">
                {Object.entries(log.snapshot)
                  .filter(([k]) => k !== 'id' && k !== 'version')
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2 text-xs">
                      <dt className="shrink-0 text-muted-foreground">{fieldLabel(key)}</dt>
                      <dd className="truncate text-right font-medium text-foreground">
                        {formatFieldValue(key, value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <ModalClose asChild>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                Cerrar
              </button>
            </ModalClose>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
