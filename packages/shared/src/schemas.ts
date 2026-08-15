import { z } from 'zod';
import { SYSTEM_ROLES } from './constants';

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
