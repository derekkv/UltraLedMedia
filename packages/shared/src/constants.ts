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
