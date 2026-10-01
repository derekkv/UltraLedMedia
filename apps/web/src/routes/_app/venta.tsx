import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type DefaultValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Pencil, Plus, Play, Pause, Trash2, Search, X, Building2, Paperclip, Upload, Download, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import {
  clienteCreateSchema,
  CLIENTE_ESTADOS,
  GRUPOS_COMERCIALES,
  MATERIALES_PUBLICIDAD,
  DURACIONES_SPOT,
  PLANES_CONTRATADOS,
  MODALIDADES_PAGO,
  FACTURA_CON,
  PANTALLAS,
  permissionKey,
  type ClienteEstado,
  type PantallaCatalogo,
} from '@ultraled/shared';
import { api, ApiException } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { realtime, type WsMessage } from '@/lib/ws';
import {
  clientesQueryKey,
  clienteArchivosQueryKey,
  archivoUrl,
  isImageMime,
  formatBytes,
  formatDate,
  formatMoney,
  ARCHIVO_ACCEPT,
  DURACION_LABELS,
  ESTADO_BADGE,
  ESTADO_LABELS,
  FACTURA_LABELS,
  GRUPO_LABELS,
  MATERIAL_LABELS,
  MODALIDAD_LABELS,
  PLAN_LABELS,
  type Cliente,
  type ClienteArchivo,
  type ClienteArchivoListResponse,
  type ClienteListResponse,
} from '@/lib/clientes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal';
import { useConfirm } from '@/providers/confirm';
import { toast } from '@/components/toaster';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/venta')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!me.modules.includes('VENTA')) throw redirect({ to: '/' });
  },
  component: VentaPage,
});

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const ESTADO_DOT: Record<ClienteEstado, string> = {
  ACTIVO: 'bg-success',
  PAUSADO: 'bg-warning',
  VENCIDO: 'bg-destructive',
  CANCELADO: 'bg-muted-foreground',
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function VencimientoLabel({
  fecha,
  estado,
}: {
  fecha: string;
  estado: ClienteEstado;
}): React.ReactElement {
  if (estado === 'CANCELADO') {
    return <span className="text-xs text-muted-foreground">Contrato cancelado</span>;
  }
  const d = daysUntil(fecha);
  const color =
    d < 0 ? 'text-destructive' : d <= 7 ? 'text-warning' : 'text-muted-foreground';
  const label =
    d < 0
      ? `Vencido hace ${-d} d`
      : d === 0
        ? 'Vence hoy'
        : d <= 7
          ? `Vence en ${d} d`
          : `Vence ${formatDate(fecha)}`;
  return <span className={cn('text-xs tabular-nums', color)}>{label}</span>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiException ? err.message : fallback;
}

/* -------------------------------------------------------------------------- */
/* Valores del formulario                                                     */
/* -------------------------------------------------------------------------- */

interface ClienteFormValues {
  razonSocial: string;
  rucCedula: string;
  representanteLegal: string;
  actividadNegocio: string;
  grupoComercial: string;
  grupoComercialOtro: string;
  direccionLocal: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  personaContacto: string;
  telefonoWhatsapp: string;
  emailAccesoEnVivo: string;
  tieneMaterial: string;
  reproduccionesMensuales: number;
  reproduccionesDiarias: number;
  costoDisenoExtra?: number;
  duracionSpot: string;
  pantallasAsignadas: string;
  ubicacionPantallas: string;
  fechaInicio: string;
  fechaVencimiento: string;
  planContratado: string;
  valorPlan: number;
  diaPagoMensual: number;
  modalidadPago: string;
  facturaCon: string;
  notas: string;
}

const EMPTY_FORM: DefaultValues<ClienteFormValues> = {
  razonSocial: '',
  rucCedula: '',
  representanteLegal: '',
  actividadNegocio: '',
  grupoComercial: '',
  grupoComercialOtro: '',
  direccionLocal: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  personaContacto: '',
  telefonoWhatsapp: '',
  emailAccesoEnVivo: '',
  tieneMaterial: '',
  duracionSpot: '',
  pantallasAsignadas: '',
  ubicacionPantallas: '',
  fechaInicio: '',
  fechaVencimiento: '',
  planContratado: '',
  modalidadPago: '',
  facturaCon: '',
  notas: '',
};

function clienteToForm(c: Cliente): DefaultValues<ClienteFormValues> {
  return {
    razonSocial: c.razonSocial,
    rucCedula: c.rucCedula,
    representanteLegal: c.representanteLegal ?? '',
    actividadNegocio: c.actividadNegocio ?? '',
    grupoComercial: c.grupoComercial,
    grupoComercialOtro: c.grupoComercialOtro ?? '',
    direccionLocal: c.direccionLocal ?? '',
    facebook: c.facebook ?? '',
    instagram: c.instagram ?? '',
    tiktok: c.tiktok ?? '',
    personaContacto: c.personaContacto ?? '',
    telefonoWhatsapp: c.telefonoWhatsapp ?? '',
    emailAccesoEnVivo: c.emailAccesoEnVivo ?? '',
    tieneMaterial: c.tieneMaterial,
    reproduccionesMensuales: c.reproduccionesMensuales,
    reproduccionesDiarias: c.reproduccionesDiarias,
    costoDisenoExtra: c.costoDisenoExtra ?? undefined,
    duracionSpot: c.duracionSpot,
    pantallasAsignadas: c.pantallasAsignadas ?? '',
    ubicacionPantallas: c.ubicacionPantallas ?? '',
    fechaInicio: c.fechaInicio,
    fechaVencimiento: c.fechaVencimiento,
    planContratado: c.planContratado,
    valorPlan: c.valorPlan,
    diaPagoMensual: c.diaPagoMensual,
    modalidadPago: c.modalidadPago,
    facturaCon: c.facturaCon,
    notas: c.notas ?? '',
  };
}

const SELECT_CLASS =
  'flex h-10 w-full rounded-md bg-input px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50';

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

function VentaPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: me } = useQuery(meQueryOptions);

  const canCreate = me?.permissions.includes(permissionKey('VENTA', 'CREATE')) ?? false;
  const canUpdate = me?.permissions.includes(permissionKey('VENTA', 'UPDATE')) ?? false;
  const canDelete = me?.permissions.includes(permissionKey('VENTA', 'DELETE')) ?? false;

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [estadoFilter, setEstadoFilter] = React.useState<ClienteEstado | ''>('');

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cliente | null>(null);
  const [readOnly, setReadOnly] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sincronización en vivo: cualquier cambio de cliente refresca la lista.
  React.useEffect(() => {
    const off = realtime.on((message: WsMessage) => {
      if (message.type.startsWith('cliente.')) {
        void queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      }
    });
    return () => off();
  }, [queryClient]);

  const listQuery = useQuery({
    queryKey: [...clientesQueryKey, debouncedSearch, estadoFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (estadoFilter) params.set('estado', estadoFilter);
      return api.get<ClienteListResponse>(`/clientes?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const estadoMutation = useMutation({
    mutationFn: (input: { id: string; estado: ClienteEstado; version: number }) =>
      api.patch<Cliente>(`/clientes/${input.id}/estado`, {
        estado: input.estado,
        version: input.version,
      }),
    onSuccess: async (cliente) => {
      await queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      toast.success(`Publicidad ${ESTADO_LABELS[cliente.estado].toLowerCase()}.`);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo cambiar el estado.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (cliente: Cliente) => api.del<void>(`/clientes/${cliente.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      toast.success('Cliente eliminado.');
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo eliminar el cliente.')),
  });

  const openCreate = (): void => {
    setEditing(null);
    setReadOnly(false);
    setFormOpen(true);
  };

  const openDetail = (cliente: Cliente): void => {
    setEditing(cliente);
    setReadOnly(!canUpdate);
    setFormOpen(true);
  };

  const togglePausa = async (cliente: Cliente): Promise<void> => {
    if (cliente.estado === 'ACTIVO') {
      const ok = await confirm({
        title: 'Pausar publicidad',
        description: `La publicidad de "${cliente.razonSocial}" dejará de reproducirse en pantalla hasta que se reactive.`,
        variant: 'destructive',
        confirmText: 'Pausar',
      });
      if (!ok) return;
      estadoMutation.mutate({ id: cliente.id, estado: 'PAUSADO', version: cliente.version });
    } else {
      estadoMutation.mutate({ id: cliente.id, estado: 'ACTIVO', version: cliente.version });
    }
  };

  const removeCliente = async (cliente: Cliente): Promise<void> => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      description: `Se eliminará "${cliente.razonSocial}" y todo su contrato de forma permanente. Esta acción no se puede deshacer.`,
      variant: 'destructive',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    deleteMutation.mutate(cliente);
  };

  const items = listQuery.data?.items ?? [];
  const activos = items.filter((c) => c.estado === 'ACTIVO').length;
  const pausados = items.filter((c) => c.estado === 'PAUSADO').length;
  const porVencer = items.filter(
    (c) => c.estado !== 'CANCELADO' && daysUntil(c.fechaVencimiento) >= 0 && daysUntil(c.fechaVencimiento) <= 7,
  ).length;
  const vencidos = items.filter(
    (c) => c.estado !== 'CANCELADO' && daysUntil(c.fechaVencimiento) < 0,
  ).length;
  const hasData = items.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Módulo de venta</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro y gestión de clientes y sus contratos de publicidad.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus /> Nuevo cliente
          </Button>
        )}
      </div>

      {/* Resumen */}
      {hasData && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="En pantalla" value={activos} dot="bg-success" />
          <MiniStat label="Pausados" value={pausados} dot="bg-warning" />
          <MiniStat label="Por vencer" value={porVencer} dot="bg-warning" tone={porVencer > 0 ? 'warning' : undefined} />
          <MiniStat label="Vencidos" value={vencidos} dot="bg-destructive" tone={vencidos > 0 ? 'destructive' : undefined} />
        </div>
      )}

      {/* Aviso de vencimientos próximos */}
      {porVencer > 0 && (
        <Alert variant="warning" className="mt-4">
          {porVencer === 1
            ? '1 contrato vence en los próximos 7 días.'
            : `${porVencer} contratos vencen en los próximos 7 días.`}{' '}
          Gestiona el cobro para evitar la pausa automática.
        </Alert>
      )}

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social, RUC o contacto…"
            className="pl-9"
          />
        </div>
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as ClienteEstado | '')}
          className={cn(SELECT_CLASS, 'w-auto min-w-40')}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {CLIENTE_ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_LABELS[estado]}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
              <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted-foreground">
                <Building2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {debouncedSearch || estadoFilter
                    ? 'Ningún cliente coincide con el filtro'
                    : 'Aún no hay clientes registrados'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {debouncedSearch || estadoFilter
                    ? 'Prueba con otros términos o limpia el filtro.'
                    : 'Registra el primer cliente para comenzar.'}
                </p>
              </div>
              {canCreate && !debouncedSearch && !estadoFilter && (
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Nuevo cliente
                </Button>
              )}
            </div>
          ) : (
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-1 p-2"
            >
              {items.map((cliente) => (
                <motion.li
                  key={cliente.id}
                  variants={staggerItem}
                  className="flex flex-col gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => openDetail(cliente)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={cn('size-2 shrink-0 rounded-full', ESTADO_DOT[cliente.estado])}
                      aria-hidden="true"
                    />
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-foreground-secondary">
                      {cliente.razonSocial.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{cliente.razonSocial}</span>
                        <Badge variant={ESTADO_BADGE[cliente.estado]}>
                          {ESTADO_LABELS[cliente.estado]}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        RUC/CI {cliente.rucCedula} · {GRUPO_LABELS[cliente.grupoComercial]}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="min-w-0 sm:text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(cliente.valorPlan)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {PLAN_LABELS[cliente.planContratado]} ·{' '}
                        <VencimientoLabel fecha={cliente.fechaVencimiento} estado={cliente.estado} />
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {canUpdate && cliente.estado !== 'CANCELADO' && cliente.estado !== 'VENCIDO' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={cliente.estado === 'ACTIVO' ? 'Pausar' : 'Activar'}
                          title={
                            cliente.estado === 'ACTIVO'
                              ? 'Pausar publicidad'
                              : 'Activar publicidad'
                          }
                          disabled={estadoMutation.isPending}
                          onClick={() => void togglePausa(cliente)}
                        >
                          {cliente.estado === 'ACTIVO' ? <Pause /> : <Play />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={canUpdate ? 'Editar' : 'Ver ficha'}
                        onClick={() => openDetail(cliente)}
                      >
                        <Pencil />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar"
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeCliente(cliente)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardContent>
      </Card>

      <ClienteFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editing}
        readOnly={readOnly}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  dot,
  tone,
}: {
  label: string;
  value: number;
  dot: string;
  tone?: 'warning' | 'destructive';
}): React.ReactElement {
  const valueColor =
    tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={cn('size-1.5 rounded-full', dot)} />
          <p className={EYEBROW}>{label}</p>
        </div>
        <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', valueColor)}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal de formulario                                                        */
/* -------------------------------------------------------------------------- */

function ClienteFormModal({
  open,
  onOpenChange,
  cliente,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  readOnly: boolean;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isEdit = cliente !== null;
  const [estado, setEstado] = React.useState<ClienteEstado>('ACTIVO');
  // Archivos seleccionados antes de crear el cliente (se suben tras el alta).
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteCreateSchema) as unknown as Resolver<ClienteFormValues>,
    defaultValues: EMPTY_FORM,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(cliente ? clienteToForm(cliente) : EMPTY_FORM);
    setEstado(cliente?.estado ?? 'ACTIVO');
    setPendingFiles([]);
  }, [open, cliente, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ClienteFormValues) => {
      if (cliente) {
        return api.patch<Cliente>(`/clientes/${cliente.id}`, {
          ...values,
          version: cliente.version,
          estado,
        });
      }
      const saved = await api.post<Cliente>('/clientes', values);
      // Sube los archivos adjuntados durante el alta, ya con el id del cliente.
      if (pendingFiles.length > 0) {
        const fd = new FormData();
        for (const file of pendingFiles) fd.append('archivos', file, file.name);
        try {
          await api.upload<ClienteArchivoListResponse>(`/clientes/${saved.id}/archivos`, fd);
        } catch (err) {
          // El cliente ya se creó; avisamos del fallo de los adjuntos sin perder el registro.
          toast.error(
            errorMessage(err, 'El cliente se creó, pero no se pudieron subir algunos archivos.'),
          );
        }
      }
      return saved;
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      await queryClient.invalidateQueries({ queryKey: clienteArchivosQueryKey(saved.id) });
      toast.success(isEdit ? 'Cambios guardados.' : `Cliente "${saved.razonSocial}" registrado.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo guardar el cliente.')),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));
  const hasErrors = Object.keys(errors).length > 0;

  const grupo = watch('grupoComercial');
  const material = watch('tieneMaterial');
  const pantallasValue = watch('pantallasAsignadas');
  const ubicacionValue = watch('ubicacionPantallas');
  const disabled = readOnly;

  const title = isEdit ? (readOnly ? 'Ficha del cliente' : 'Editar cliente') : 'Nuevo cliente';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl overflow-hidden p-0"
    >
      <form onSubmit={onSubmit} className="flex max-h-[88vh] flex-col" noValidate>
        {/* Encabezado fijo */}
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <ModalTitle className="text-lg font-semibold text-foreground">{title}</ModalTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Formulario Cliente Ultra Led</p>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && !readOnly && (
              <div className="flex flex-col items-end gap-1">
                <Label className="text-[11px]">Estado</Label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as ClienteEstado)}
                  className={cn(SELECT_CLASS, 'h-8 w-auto')}
                >
                  {CLIENTE_ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isEdit && readOnly && (
              <Badge variant={ESTADO_BADGE[estado]}>{ESTADO_LABELS[estado]}</Badge>
            )}
            <ModalClose asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </ModalClose>
          </div>
        </div>

        {/* Cuerpo desplazable */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6">
          <div className="flex flex-col gap-5 pb-1">
            <Section n="A" title="Información de la empresa">
              <Field label="Razón social / Nombre comercial *" error={errors.razonSocial?.message}>
                <Input {...register('razonSocial')} disabled={disabled} />
              </Field>
              <Field label="RUC / Cédula *" error={errors.rucCedula?.message}>
                <Input {...register('rucCedula')} disabled={disabled} placeholder="Ej. 1790012345001" />
              </Field>
              <Field label="Representante legal / Dueño" error={errors.representanteLegal?.message}>
                <Input {...register('representanteLegal')} disabled={disabled} />
              </Field>
              <Field label="Actividad principal del negocio" error={errors.actividadNegocio?.message}>
                <Input {...register('actividadNegocio')} disabled={disabled} />
              </Field>
              <Field label="Grupo comercial *" error={errors.grupoComercial?.message}>
                <select {...register('grupoComercial')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {GRUPOS_COMERCIALES.map((g) => (
                    <option key={g} value={g}>
                      {GRUPO_LABELS[g]}
                    </option>
                  ))}
                </select>
              </Field>
              {grupo === 'OTRO' && (
                <Field label="¿Cuál? *" error={errors.grupoComercialOtro?.message}>
                  <Input {...register('grupoComercialOtro')} disabled={disabled} />
                </Field>
              )}
              <Field label="Dirección del local" error={errors.direccionLocal?.message}>
                <Input {...register('direccionLocal')} disabled={disabled} />
              </Field>
              <Field label="Persona de contacto" error={errors.personaContacto?.message}>
                <Input {...register('personaContacto')} disabled={disabled} />
              </Field>
              <Field label="Teléfono / WhatsApp" error={errors.telefonoWhatsapp?.message}>
                <Input {...register('telefonoWhatsapp')} disabled={disabled} />
              </Field>
              <Field label="Email para acceso en vivo" error={errors.emailAccesoEnVivo?.message}>
                <Input type="email" {...register('emailAccesoEnVivo')} disabled={disabled} />
              </Field>
              <Field label="Facebook" error={errors.facebook?.message}>
                <Input {...register('facebook')} disabled={disabled} />
              </Field>
              <Field label="Instagram" error={errors.instagram?.message}>
                <Input {...register('instagram')} disabled={disabled} />
              </Field>
              <Field label="TikTok" error={errors.tiktok?.message}>
                <Input {...register('tiktok')} disabled={disabled} />
              </Field>
            </Section>

            <Section n="B" title="Información de la publicidad">
              <Field label="Material *" error={errors.tieneMaterial?.message}>
                <select {...register('tieneMaterial')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {MATERIALES_PUBLICIDAD.map((m) => (
                    <option key={m} value={m}>
                      {MATERIAL_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Reproducciones mensuales *"
                error={errors.reproduccionesMensuales?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register('reproduccionesMensuales', { valueAsNumber: true })}
                  disabled={disabled}
                />
              </Field>
              <Field
                label="Reproducciones diarias *"
                error={errors.reproduccionesDiarias?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register('reproduccionesDiarias', { valueAsNumber: true })}
                  disabled={disabled}
                />
              </Field>
              <Field label="Duración del spot *" error={errors.duracionSpot?.message}>
                <select {...register('duracionSpot')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {DURACIONES_SPOT.map((d) => (
                    <option key={d} value={d}>
                      {DURACION_LABELS[d]}
                    </option>
                  ))}
                </select>
              </Field>
              {material === 'SOLICITA_DISENO' && (
                <Field label="Costo del diseño (USD) *" error={errors.costoDisenoExtra?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('costoDisenoExtra', { valueAsNumber: true })}
                    disabled={disabled}
                  />
                </Field>
              )}
            </Section>

            <Section n="C" title="Plan y vigencia del contrato">
              <Field label="Pantalla(s) asignada(s)" error={errors.pantallasAsignadas?.message} full>
                <input type="hidden" {...register('pantallasAsignadas')} />
                <input type="hidden" {...register('ubicacionPantallas')} />
                <PantallasPicker
                  value={pantallasValue ?? ''}
                  disabled={disabled}
                  onChange={(pantallas, ubicaciones) => {
                    setValue('pantallasAsignadas', pantallas, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue('ubicacionPantallas', ubicaciones, { shouldDirty: true });
                  }}
                />
              </Field>
              {ubicacionValue && (
                <Field label="Ubicación" full>
                  <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground-secondary">
                    {ubicacionValue}
                  </p>
                </Field>
              )}
              <Field label="Fecha de inicio *" error={errors.fechaInicio?.message}>
                <Input type="date" {...register('fechaInicio')} disabled={disabled} />
              </Field>
              <Field label="Fecha de vencimiento *" error={errors.fechaVencimiento?.message}>
                <Input type="date" {...register('fechaVencimiento')} disabled={disabled} />
              </Field>
              <Field label="Plan contratado *" error={errors.planContratado?.message}>
                <select {...register('planContratado')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {PLANES_CONTRATADOS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valor del plan (USD) *" error={errors.valorPlan?.message}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('valorPlan', { valueAsNumber: true })}
                  disabled={disabled}
                />
              </Field>
            </Section>

            <Section n="D" title="Información de pagos mensuales">
              <Field label="Día de pago fijo (1–31) *" error={errors.diaPagoMensual?.message}>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  {...register('diaPagoMensual', { valueAsNumber: true })}
                  disabled={disabled}
                />
              </Field>
              <Field label="Modalidad de pago *" error={errors.modalidadPago?.message}>
                <select {...register('modalidadPago')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {MODALIDADES_PAGO.map((m) => (
                    <option key={m} value={m}>
                      {MODALIDAD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="¿Factura con? *" error={errors.facturaCon?.message}>
                <select {...register('facturaCon')} disabled={disabled} className={SELECT_CLASS}>
                  <option value="">Selecciona…</option>
                  {FACTURA_CON.map((f) => (
                    <option key={f} value={f}>
                      {FACTURA_LABELS[f]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notas" error={errors.notas?.message} full>
                <Input {...register('notas')} disabled={disabled} />
              </Field>
            </Section>

            <ArchivosSection
              clienteId={cliente?.id ?? null}
              readOnly={readOnly}
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
              confirm={confirm}
            />

            {!readOnly && (
              <Alert variant="info">
                Si el cliente no paga hasta la fecha acordada, la publicidad se pausa
                automáticamente al día siguiente.
              </Alert>
            )}
          </div>
        </div>

        {/* Pie fijo */}
        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-4">
          <span className="text-xs text-destructive">
            {hasErrors && !readOnly ? 'Revisa los campos marcados.' : ''}
          </span>
          <div className="flex gap-2">
            <ModalClose asChild>
              <Button type="button" variant="ghost">
                {readOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
            </ModalClose>
            {!readOnly && (
              <Button type="submit" disabled={mutation.isPending || (isEdit && !isDirty)}>
                {mutation.isPending
                  ? 'Guardando…'
                  : isEdit
                    ? 'Guardar cambios'
                    : 'Registrar cliente'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers de UI                                                              */
/* -------------------------------------------------------------------------- */

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded bg-secondary/12 text-[11px] font-bold text-secondary">
          {n}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Selector de pantallas (catálogo con ubicación fija)                        */
/* -------------------------------------------------------------------------- */

function PantallasPicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (pantallas: string, ubicaciones: string) => void;
}): React.ReactElement {
  const selected = React.useMemo(
    () =>
      new Set(
        value
          ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      ),
    [value],
  );

  const ciudades = React.useMemo(() => {
    const map = new Map<string, PantallaCatalogo[]>();
    for (const p of PANTALLAS) {
      const arr = map.get(p.ciudad) ?? [];
      arr.push(p);
      map.set(p.ciudad, arr);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = (nombre: string): void => {
    const next = new Set(selected);
    if (next.has(nombre)) next.delete(nombre);
    else next.add(nombre);
    const elegidas = PANTALLAS.filter((p) => next.has(p.nombre));
    onChange(
      elegidas.map((p) => p.nombre).join(', '),
      elegidas.map((p) => p.ubicacion).join(' · '),
    );
  };

  // Solo lectura: mostrar únicamente las pantallas seleccionadas.
  if (disabled) {
    const elegidas = PANTALLAS.filter((p) => selected.has(p.nombre));
    if (elegidas.length === 0) {
      return <p className="text-xs text-muted-foreground">Sin pantallas asignadas.</p>;
    }
    return (
      <ul className="flex flex-col gap-1.5">
        {elegidas.map((p) => (
          <li key={p.key} className="rounded-lg bg-surface-2 px-3 py-2">
            <span className="block text-sm font-medium text-foreground">{p.nombre}</span>
            <span className="block text-xs text-muted-foreground">{p.ubicacion}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rounded-lg border border-border p-1">
      <div className="max-h-56 overflow-y-auto no-scrollbar">
        {ciudades.map(([ciudad, pantallas]) => (
          <div key={ciudad} className="px-1 py-1">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ciudad}
            </p>
            {pantallas.map((p) => {
              const checked = selected.has(p.nombre);
              return (
                <label
                  key={p.key}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2',
                    checked && 'bg-primary-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.nombre)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{p.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{p.ubicacion}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sección de archivos adjuntos                                               */
/* -------------------------------------------------------------------------- */

function ArchivoThumb({ archivo, clienteId }: { archivo: ClienteArchivo; clienteId: string }): React.ReactElement {
  if (isImageMime(archivo.mimeType)) {
    return (
      <img
        src={archivoUrl(clienteId, archivo.id)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="size-10 shrink-0 rounded-md object-cover"
      />
    );
  }
  const Icon = archivo.mimeType === 'application/pdf' ? FileText : FileIcon;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

function ArchivosSection({
  clienteId,
  readOnly,
  pendingFiles,
  onPendingChange,
  confirm,
}: {
  clienteId: string | null;
  readOnly: boolean;
  pendingFiles: File[];
  onPendingChange: (files: File[]) => void;
  confirm: ReturnType<typeof useConfirm>;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const existing = clienteId !== null;

  const archivosQuery = useQuery({
    queryKey: clienteArchivosQueryKey(clienteId ?? 'nuevo'),
    queryFn: () => api.get<ClienteArchivoListResponse>(`/clientes/${clienteId}/archivos`),
    enabled: existing,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append('archivos', f, f.name);
      return api.upload<ClienteArchivoListResponse>(`/clientes/${clienteId}/archivos`, fd);
    },
    onSuccess: async (res) => {
      if (clienteId) {
        await queryClient.invalidateQueries({ queryKey: clienteArchivosQueryKey(clienteId) });
      }
      toast.success(
        res.items.length === 1 ? 'Archivo subido.' : `${res.items.length} archivos subidos.`,
      );
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudieron subir los archivos.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (archivo: ClienteArchivo) =>
      api.del<void>(`/clientes/${clienteId}/archivos/${archivo.id}`),
    onSuccess: async () => {
      if (clienteId) {
        await queryClient.invalidateQueries({ queryKey: clienteArchivosQueryKey(clienteId) });
      }
      toast.success('Archivo eliminado.');
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo eliminar el archivo.')),
  });

  const addFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    if (existing) {
      uploadMutation.mutate(arr);
    } else {
      onPendingChange([...pendingFiles, ...arr]);
    }
  };

  const removePending = (index: number): void => {
    onPendingChange(pendingFiles.filter((_, i) => i !== index));
  };

  const removeExisting = async (archivo: ClienteArchivo): Promise<void> => {
    const ok = await confirm({
      title: 'Eliminar archivo',
      description: `Se eliminará "${archivo.nombre}" de forma permanente. Esta acción no se puede deshacer.`,
      variant: 'destructive',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    deleteMutation.mutate(archivo);
  };

  const items = archivosQuery.data?.items ?? [];
  const canEdit = !readOnly;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded bg-secondary/12 text-[11px] font-bold text-secondary">
          E
        </span>
        <span className="text-sm font-semibold text-foreground">Archivos y documentos</span>
      </legend>

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ARCHIVO_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            disabled={uploadMutation.isPending}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60',
              dragging && 'border-primary bg-primary-soft',
            )}
          >
            <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
              <Upload className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {uploadMutation.isPending ? 'Subiendo…' : 'Arrastra archivos o haz clic para subir'}
            </span>
            <span className="text-xs text-muted-foreground">
              Imágenes, videos, PDF y documentos · hasta 25 MB c/u
            </span>
          </button>
        </>
      )}

      {/* Archivos pendientes (alta de cliente nuevo) */}
      {!existing && pendingFiles.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-1 text-muted-foreground">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="size-5" aria-hidden="true" />
                ) : (
                  <FileIcon className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {file.name}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {formatBytes(file.size)}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${file.name}`}
                onClick={() => removePending(index)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!existing && pendingFiles.length === 0 && !canEdit && (
        <p className="text-xs text-muted-foreground">Sin archivos adjuntos.</p>
      )}

      {/* Archivos ya guardados (edición / ficha) */}
      {existing && (
        <>
          {archivosQuery.isLoading ? (
            <div className="flex flex-col gap-1.5">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : archivosQuery.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
              <p className="text-sm text-destructive">No se pudieron cargar los archivos.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => archivosQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" aria-hidden="true" />
              {canEdit ? 'Aún no hay archivos. Sube el primero arriba.' : 'Sin archivos adjuntos.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map((archivo) => (
                <li
                  key={archivo.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2"
                >
                  <ArchivoThumb archivo={archivo} clienteId={clienteId} />
                  <a
                    href={archivoUrl(clienteId, archivo.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="block truncate text-sm font-medium text-foreground hover:underline">
                      {archivo.nombre}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatBytes(archivo.tamano)}
                    </span>
                  </a>
                  <a
                    href={archivoUrl(clienteId, archivo.id, { download: true })}
                    download={archivo.nombre}
                    aria-label={`Descargar ${archivo.nombre}`}
                    title="Descargar"
                    className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${archivo.nombre}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => void removeExisting(archivo)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  );
}
