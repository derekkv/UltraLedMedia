import type {
  ClienteEstado,
  DuracionSpot,
  FacturaCon,
  GrupoComercial,
  MaterialPublicidad,
  ModalidadPago,
  PlanContratado,
} from '@ultraled/shared';

/** Cliente tal como lo devuelve la API (DTO). */
export interface Cliente {
  id: string;
  razonSocial: string;
  rucCedula: string;
  representanteLegal: string | null;
  actividadNegocio: string | null;
  grupoComercial: GrupoComercial;
  grupoComercialOtro: string | null;
  direccionLocal: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  personaContacto: string | null;
  telefonoWhatsapp: string | null;
  emailAccesoEnVivo: string | null;
  tieneMaterial: MaterialPublicidad;
  reproduccionesMensuales: number;
  reproduccionesDiarias: number;
  costoDisenoExtra: number | null;
  duracionSpot: DuracionSpot;
  pantallasAsignadas: string | null;
  ubicacionPantallas: string | null;
  fechaInicio: string;
  fechaVencimiento: string;
  planContratado: PlanContratado;
  valorPlan: number;
  diaPagoMensual: number;
  modalidadPago: ModalidadPago;
  facturaCon: FacturaCon;
  notas: string | null;
  estado: ClienteEstado;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteListResponse {
  items: Cliente[];
  nextCursor: string | null;
}

/** Archivo adjunto a un cliente (DTO de la API). */
export interface ClienteArchivo {
  id: string;
  clienteId: string;
  nombre: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
}

export interface ClienteArchivoListResponse {
  items: ClienteArchivo[];
}

/** Clave de caché para la lista de clientes (prefijo para invalidar todo). */
export const clientesQueryKey = ['clientes'] as const;

/** Clave de caché para los archivos de un cliente. */
export const clienteArchivosQueryKey = (clienteId: string): readonly unknown[] => [
  'cliente-archivos',
  clienteId,
];

/** URL de descarga/preview de un adjunto (same-origin, usa la cookie de sesión). */
export function archivoUrl(
  clienteId: string,
  archivoId: string,
  opts?: { download?: boolean },
): string {
  const base = `/api/v1/clientes/${clienteId}/archivos/${archivoId}`;
  return opts?.download ? `${base}?download=true` : base;
}

/** ¿El tipo MIME corresponde a una imagen (para mostrar miniatura)? */
export function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith('image/');
}

/** Formatea un tamaño en bytes de forma legible (B, KB, MB…). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** `accept` del input de archivos: imágenes, video, audio, PDF y ofimática. */
export const ARCHIVO_ACCEPT =
  'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

export const GRUPO_LABELS: Record<GrupoComercial, string> = {
  GASTRONOMIA: 'Gastronomía y Restaurantes',
  ROPA_MODA: 'Ropa y Moda',
  SALUD_BELLEZA: 'Salud / Belleza',
  TECNOLOGIA: 'Tecnología / Celulares',
  LICORES_DISCOTECA: 'Licores / Discoteca',
  SUPERMERCADO_TIENDA: 'Supermercado / Tienda',
  SERVICIOS_PROFESIONALES: 'Servicios Profesionales',
  FERRETERIA_CONSTRUCCION: 'Ferretería / Construcción',
  EDUCACION: 'Educación',
  VEHICULOS_LIVIANOS: 'Vehículo liviano',
  VEHICULOS_PESADOS: 'Vehículo pesado',
  OTRO: 'Otro',
};

export const MATERIAL_LABELS: Record<MaterialPublicidad, string> = {
  ENTREGA_MATERIAL: 'Entrega video / imagen',
  SOLICITA_DISENO: 'Solicita diseño (costo extra)',
};

export const DURACION_LABELS: Record<DuracionSpot, string> = {
  SEG_10: '10 seg',
  SEG_15: '15 seg',
  SEG_20: '20 seg',
  SEG_30: '30 seg',
};

export const PLAN_LABELS: Record<PlanContratado, string> = {
  DIARIO: 'Diario',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};

export const MODALIDAD_LABELS: Record<ModalidadPago, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  DEUNA_PAYPHONE: 'DeUna / PayPhone',
};

export const FACTURA_LABELS: Record<FacturaCon, string> = {
  DATOS_RUC: 'Datos del RUC',
  CONSUMIDOR_FINAL: 'Consumidor Final',
};

export const ESTADO_LABELS: Record<ClienteEstado, string> = {
  ACTIVO: 'Activo',
  PAUSADO: 'Pausado',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

export const ESTADO_BADGE: Record<ClienteEstado, 'success' | 'warning' | 'destructive' | 'muted'> = {
  ACTIVO: 'success',
  PAUSADO: 'warning',
  VENCIDO: 'destructive',
  CANCELADO: 'muted',
};

const moneyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

/** Formatea una fecha AAAA-MM-DD para lectura (sin desfase por zona horaria). */
export function formatDate(value: string): string {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}
