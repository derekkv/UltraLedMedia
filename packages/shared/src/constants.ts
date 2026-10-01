/**
 * Constantes del contrato compartido entre backend y frontend.
 */

/** Módulos de negocio de la aplicación. */
export const MODULES = ['VENTA', 'COBRANZA', 'GERENCIAL', 'CLIENTES'] as const;
export type ModuleKey = (typeof MODULES)[number];

/** Acciones posibles sobre un módulo (RBAC). */
export const PERMISSION_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Roles semilla del sistema. */
export const SYSTEM_ROLES = ['ADMIN', 'GERENTE', 'VENDEDOR', 'COBRADOR'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Construye la clave legible de un permiso, p. ej. "venta:read". */
export function permissionKey(module: ModuleKey, action: PermissionAction): string {
  return `${module.toLowerCase()}:${action.toLowerCase()}`;
}

/* -------------------------------------------------------------------------- */
/* Formulario Cliente (módulo Venta)                                          */
/* -------------------------------------------------------------------------- */

/** A.5 — Grupo comercial al que pertenece el cliente. */
export const GRUPOS_COMERCIALES = [
  'GASTRONOMIA',
  'ROPA_MODA',
  'SALUD_BELLEZA',
  'TECNOLOGIA',
  'LICORES_DISCOTECA',
  'SUPERMERCADO_TIENDA',
  'SERVICIOS_PROFESIONALES',
  'FERRETERIA_CONSTRUCCION',
  'EDUCACION',
  'VEHICULOS_LIVIANOS',
  'VEHICULOS_PESADOS',
  'OTRO',
] as const;
export type GrupoComercial = (typeof GRUPOS_COMERCIALES)[number];

/** B.2 — Origen del material publicitario. */
export const MATERIALES_PUBLICIDAD = ['ENTREGA_MATERIAL', 'SOLICITA_DISENO'] as const;
export type MaterialPublicidad = (typeof MATERIALES_PUBLICIDAD)[number];

/** B.4 — Duración del spot. */
export const DURACIONES_SPOT = ['SEG_10', 'SEG_15', 'SEG_20', 'SEG_30'] as const;
export type DuracionSpot = (typeof DURACIONES_SPOT)[number];

/** C.4 — Plan contratado. */
export const PLANES_CONTRATADOS = ['DIARIO', 'SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const;
export type PlanContratado = (typeof PLANES_CONTRATADOS)[number];

/** D.2 — Modalidad de pago. */
export const MODALIDADES_PAGO = ['TRANSFERENCIA', 'EFECTIVO', 'DEUNA_PAYPHONE'] as const;
export type ModalidadPago = (typeof MODALIDADES_PAGO)[number];

/** D.3 — Datos de facturación. */
export const FACTURA_CON = ['DATOS_RUC', 'CONSUMIDOR_FINAL'] as const;
export type FacturaCon = (typeof FACTURA_CON)[number];

/** Estado del contrato de publicidad del cliente. */
export const CLIENTE_ESTADOS = ['ACTIVO', 'PAUSADO', 'VENCIDO', 'CANCELADO'] as const;
export type ClienteEstado = (typeof CLIENTE_ESTADOS)[number];
