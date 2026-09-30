import type { UserCreateInput, UserUpdateInput } from '@ultraled/shared';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../security/hashing';
import { HttpError } from '../../lib/http-error';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: string[];
}

type UserWithRoles = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: { role: { key: string } }[];
};

const withRoles = { roles: { include: { role: true } } } as const;

function toSummary(user: UserWithRoles): UserSummary {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    roles: user.roles.map((ur) => ur.role.key),
  };
}

/** Resuelve claves de rol a ids, validando que todas existan. */
async function resolveRoleIds(roleKeys: string[]): Promise<string[]> {
  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  if (roles.length !== roleKeys.length) {
    const found = new Set(roles.map((r) => r.key));
    const missing = roleKeys.filter((k) => !found.has(k));
    throw new HttpError(400, 'INVALID_ROLES', `Roles inexistentes: ${missing.join(', ')}`);
  }
  return roles.map((r) => r.id);
}

export async function listUsers(params: {
  cursor?: string;
  limit: number;
}): Promise<{ items: UserSummary[]; nextCursor: string | null }> {
  const users = await prisma.user.findMany({
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: withRoles,
  });

  const hasMore = users.length > params.limit;
  const items = hasMore ? users.slice(0, params.limit) : users;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;
  return { items: items.map(toSummary), nextCursor };
}

export async function getUser(id: string): Promise<UserSummary> {
  const user = await prisma.user.findUnique({ where: { id }, include: withRoles });
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
  return toSummary(user);
}

export async function createUser(input: UserCreateInput): Promise<UserSummary> {
  const roleIds = await resolveRoleIds(input.roleKeys);
  const passwordHash = await hashPassword(input.password);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: 'insensitive' } },
  });
  if (existing) throw new HttpError(409, 'EMAIL_TAKEN', 'El email ya está registrado.');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      passwordHash,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    include: withRoles,
  });
  return toSummary(user);
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<UserSummary> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  const roleIds = input.roleKeys ? await resolveRoleIds(input.roleKeys) : undefined;

  const user = await prisma.$transaction(async (tx) => {
    if (roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      });
    }
    return tx.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        isActive: input.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      include: withRoles,
    });
  });

  return toSummary(user);
}

/**
 * Elimina un usuario. Devuelve el resumen del usuario eliminado (para auditoría).
 * Protege contra la auto-eliminación y contra dejar el sistema sin administradores.
 */
export async function deleteUser(id: string, actorId: string | null): Promise<UserSummary> {
  if (actorId && actorId === id) {
    throw new HttpError(400, 'CANNOT_DELETE_SELF', 'No puedes eliminar tu propia cuenta.');
  }

  const user = await prisma.user.findUnique({ where: { id }, include: withRoles });
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');

  const isAdmin = user.roles.some((ur) => ur.role.key === 'ADMIN');
  if (isAdmin) {
    const admins = await prisma.user.count({
      where: { isActive: true, roles: { some: { role: { key: 'ADMIN' } } } },
    });
    if (admins <= 1) {
      throw new HttpError(
        400,
        'LAST_ADMIN',
        'No puedes eliminar al último administrador activo.',
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return toSummary(user);
}
