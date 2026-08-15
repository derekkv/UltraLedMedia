import { prisma } from '../lib/prisma';

/** Usuario autenticado resuelto con sus roles, permisos y módulos habilitados. */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[]; // claves de rol (ADMIN, VENDEDOR, ...)
  permissions: string[]; // claves de permiso (venta:read, ...)
  modules: string[]; // módulos con al menos un permiso
}

/** Carga el usuario y calcula la unión de sus permisos/módulos desde sus roles. */
export async function loadCurrentUser(userId: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!user) return null;

  const roles = user.roles.map((ur) => ur.role.key);
  const permissions = new Set<string>();
  const modules = new Set<string>();

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
      modules.add(rolePermission.permission.module);
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    roles,
    permissions: [...permissions],
    modules: [...modules],
  };
}
