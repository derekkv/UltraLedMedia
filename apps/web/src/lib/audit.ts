import {
  ESTADO_LABELS,
  PLAN_LABELS,
  GRUPO_LABELS,
  MODALIDAD_LABELS,
  FACTURA_LABELS,
  DURACION_LABELS,
  MATERIAL_LABELS,
  formatMoney,
} from './clientes';

export interface AuditActor {
  id: string;
  email: string;
  fullName: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AuditActor | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  snapshot: Record<string, unknown> | null;
}

export interface AuditListResponse {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

export const auditQueryKey = ['audit-logs'] as const;

/** Etiqueta de la entidad afectada. */
export const ENTITY_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  user: 'Usuario',
  auth: 'Sesión',
  notification: 'Notificación',
};

/** Familia de la acción → color del punto/insignia. */
export function actionTone(action: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (action.endsWith('_CREATED')) return 'success';
  if (action.endsWith('_DELETED') || action.includes('FAILED') || action.includes('LOCKED'))
    return 'destructive';
  if (action.endsWith('_UPDATED') || action.includes('ESTADO') || action.includes('SENT'))
    return 'warning';
  return 'muted';
}

/** Etiqueta legible de la acción. */
export const ACTION_LABELS: Record<string, string> = {
  CLIENTE_CREATED: 'Cliente creado',
  CLIENTE_UPDATED: 'Cliente editado',
  CLIENTE_DELETED: 'Cliente eliminado',
  CLIENTE_ESTADO_CHANGED: 'Estado de cliente',
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario editado',
  USER_DELETED: 'Usuario eliminado',
  NOTIFICATION_SENT: 'Notificación enviada',
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio fallido',
  LOGIN_LOCKED: 'Cuenta bloqueada',
  LOGOUT: 'Cierre de sesión',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Entidades disponibles para filtrar. */
export const AUDIT_ENTITY_FILTERS = [
  { value: '', label: 'Todo' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'user', label: 'Usuarios' },
  { value: 'auth', label: 'Sesiones' },
  { value: 'notification', label: 'Notificaciones' },
] as const;

/** Convierte un valor de cambio/snapshot en texto legible. */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Nombre legible de cada campo (clientes + usuarios). */
export const FIELD_LABELS: Record<string, string> = {
  // Cliente
  razonSocial: 'Razón social',
  rucCedula: 'RUC / Cédula',
  representanteLegal: 'Representante',
  actividadNegocio: 'Actividad',
  grupoComercial: 'Grupo comercial',
  grupoComercialOtro: 'Grupo (otro)',
  direccionLocal: 'Dirección',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  personaContacto: 'Contacto',
  telefonoWhatsapp: 'Teléfono / WhatsApp',
  emailAccesoEnVivo: 'Email de acceso',
  tieneMaterial: 'Material',
  reproduccionesMensuales: 'Reproducciones/mes',
  reproduccionesDiarias: 'Reproducciones/día',
  costoDisenoExtra: 'Costo de diseño',
  duracionSpot: 'Duración del spot',
  pantallasAsignadas: 'Pantallas',
  ubicacionPantallas: 'Ubicación',
  fechaInicio: 'Inicio',
  fechaVencimiento: 'Vencimiento',
  planContratado: 'Plan',
  valorPlan: 'Valor del plan',
  diaPagoMensual: 'Día de pago',
  modalidadPago: 'Modalidad de pago',
  facturaCon: 'Factura con',
  notas: 'Notas',
  estado: 'Estado',
  // Usuario
  fullName: 'Nombre',
  email: 'Email',
  phone: 'Teléfono',
  isActive: 'Cuenta activa',
  roles: 'Roles',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** Formatea el valor de un campo concreto de forma legible (usa las etiquetas del dominio). */
export function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (field) {
    case 'estado':
      return ESTADO_LABELS[value as keyof typeof ESTADO_LABELS] ?? String(value);
    case 'planContratado':
      return PLAN_LABELS[value as keyof typeof PLAN_LABELS] ?? String(value);
    case 'grupoComercial':
      return GRUPO_LABELS[value as keyof typeof GRUPO_LABELS] ?? String(value);
    case 'modalidadPago':
      return MODALIDAD_LABELS[value as keyof typeof MODALIDAD_LABELS] ?? String(value);
    case 'facturaCon':
      return FACTURA_LABELS[value as keyof typeof FACTURA_LABELS] ?? String(value);
    case 'duracionSpot':
      return DURACION_LABELS[value as keyof typeof DURACION_LABELS] ?? String(value);
    case 'tieneMaterial':
      return MATERIAL_LABELS[value as keyof typeof MATERIAL_LABELS] ?? String(value);
    case 'valorPlan':
    case 'costoDisenoExtra':
      return formatMoney(Number(value));
    default:
      return formatAuditValue(value);
  }
}
