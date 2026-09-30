import { z } from 'zod';
import {
  SYSTEM_ROLES,
  GRUPOS_COMERCIALES,
  MATERIALES_PUBLICIDAD,
  DURACIONES_SPOT,
  PLANES_CONTRATADOS,
  MODALIDADES_PAGO,
  FACTURA_CON,
  CLIENTE_ESTADOS,
} from './constants';

/** Rol asignable (clave de rol del sistema). */
export const roleKeySchema = z.enum(SYSTEM_ROLES);

/** Credenciales de login. */
export const loginSchema = z.object({
  email: z.email({ message: 'Email inválido' }),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Alta de usuario (por gerencia/admin). */
export const userCreateSchema = z.object({
  email: z.email({ message: 'Email inválido' }),
  fullName: z.string().min(1, 'El nombre es requerido').max(200),
  phone: z.string().max(40).optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(200),
  roleKeys: z.array(roleKeySchema).min(1, 'Asigna al menos un rol'),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

/** Edición de usuario (todos los campos opcionales). */
export const userUpdateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(40).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(200).optional(),
  roleKeys: z.array(roleKeySchema).min(1, 'Asigna al menos un rol').optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/** Creación de una notificación dirigida a un usuario. */
export const notificationCreateSchema = z.object({
  userId: z.uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

/* -------------------------------------------------------------------------- */
/* Formulario Cliente (módulo Venta)                                          */
/* -------------------------------------------------------------------------- */

/** Convierte "", null o NaN en undefined (para inputs vacíos del formulario). */
const emptyToUndefined = (value: unknown): unknown =>
  value === '' || value === null || (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value;

/** Texto opcional: los vacíos se guardan como ausencia (undefined), con tope de longitud. */
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

/** Fecha en formato AAAA-MM-DD. */
const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida (AAAA-MM-DD)')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha inválida');

/**
 * Campos del formulario cliente (sin metadatos de control como version/estado).
 * Reutilizado por creación y edición.
 */
const clienteObject = z.object({
  // A. Información de la empresa cliente
  razonSocial: z.string().trim().min(1, 'La razón social es requerida').max(200),
  rucCedula: z
    .string()
    .trim()
    .min(1, 'El RUC / Cédula es requerido')
    .max(30)
    // Normaliza: elimina espacios y guiones, mayúsculas -> anti-duplicados robusto.
    .transform((v) => v.replace(/[\s-]+/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'RUC / Cédula inválido')),
  representanteLegal: optionalText(200),
  actividadNegocio: optionalText(300),
  grupoComercial: z.enum(GRUPOS_COMERCIALES),
  grupoComercialOtro: optionalText(120),
  direccionLocal: optionalText(300),
  facebook: optionalText(200),
  instagram: optionalText(200),
  tiktok: optionalText(200),
  personaContacto: optionalText(200),
  telefonoWhatsapp: optionalText(40),
  emailAccesoEnVivo: z.preprocess(
    emptyToUndefined,
    z.email({ message: 'Email inválido' }).optional(),
  ),

  // B. Información de la publicidad
  queDeseaPublicitar: optionalText(500),
  tieneMaterial: z.enum(MATERIALES_PUBLICIDAD),
  costoDisenoExtra: z.preprocess(
    emptyToUndefined,
    z.number().min(0, 'Debe ser ≥ 0').max(9_999_999).optional(),
  ),
  textoPantalla: optionalText(500),
  duracionSpot: z.enum(DURACIONES_SPOT),

  // C. Plan y vigencia del contrato
  pantallasAsignadas: optionalText(200),
  ubicacionPantallas: optionalText(200),
  fechaInicio: fechaSchema,
  fechaVencimiento: fechaSchema,
  planContratado: z.enum(PLANES_CONTRATADOS),
  valorPlan: z.preprocess(
    emptyToUndefined,
    z.number({ message: 'El valor del plan es requerido' }).min(0, 'Debe ser ≥ 0').max(9_999_999),
  ),
  reproduccionesDiarias: z.preprocess(
    emptyToUndefined,
    z
      .number({ message: 'Las reproducciones son requeridas' })
      .int('Debe ser un entero')
      .min(0)
      .max(100_000),
  ),

  // D. Información de pagos mensuales
  diaPagoMensual: z.preprocess(
    emptyToUndefined,
    z
      .number({ message: 'El día de pago es requerido' })
      .int('Debe ser un entero')
      .min(1, 'Entre 1 y 31')
      .max(31, 'Entre 1 y 31'),
  ),
  modalidadPago: z.enum(MODALIDADES_PAGO),
  facturaCon: z.enum(FACTURA_CON),

  notas: optionalText(1000),
});

/** Validaciones cruzadas del formulario cliente. */
function refineCliente(
  data: z.infer<typeof clienteObject>,
  ctx: z.RefinementCtx,
): void {
  if (data.grupoComercial === 'OTRO' && !data.grupoComercialOtro) {
    ctx.addIssue({
      code: 'custom',
      path: ['grupoComercialOtro'],
      message: 'Especifica el grupo comercial',
    });
  }
  if (data.tieneMaterial === 'SOLICITA_DISENO' && data.costoDisenoExtra === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['costoDisenoExtra'],
      message: 'Indica el costo del diseño solicitado',
    });
  }
  // Comparación lexicográfica válida para fechas ISO (AAAA-MM-DD).
  if (data.fechaVencimiento < data.fechaInicio) {
    ctx.addIssue({
      code: 'custom',
      path: ['fechaVencimiento'],
      message: 'El vencimiento no puede ser anterior al inicio',
    });
  }
}

/** Alta de cliente. */
export const clienteCreateSchema = clienteObject.superRefine(refineCliente);
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;

/**
 * Edición de cliente. Incluye `version` (bloqueo optimista) y `estado` opcional.
 * Es un reemplazo total del formulario, por eso mantiene todos los campos.
 */
export const clienteUpdateSchema = clienteObject
  .extend({
    version: z.number().int().min(0),
    estado: z.enum(CLIENTE_ESTADOS).optional(),
  })
  .superRefine(refineCliente);
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;

/** Cambio de estado del contrato (pausar / activar / cancelar) con bloqueo optimista. */
export const clienteEstadoUpdateSchema = z.object({
  estado: z.enum(CLIENTE_ESTADOS),
  version: z.number().int().min(0),
});
export type ClienteEstadoUpdateInput = z.infer<typeof clienteEstadoUpdateSchema>;
