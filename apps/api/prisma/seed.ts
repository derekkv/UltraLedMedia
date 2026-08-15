import { PrismaClient, type ModuleKey, type PermissionAction } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { MODULES, PERMISSION_ACTIONS, permissionKey } from '@ultraled/shared';

const prisma = new PrismaClient();

/** Metadatos de los roles semilla. */
const ROLE_META: Record<string, { name: string; description: string }> = {
  ADMIN: {
    name: 'Administrador',
    description: 'Gerencia: gestiona usuarios, roles y todos los módulos.',
  },
  GERENTE: {
    name: 'Gerente',
    description: 'Acceso completo al módulo Gerencial y lectura transversal.',
  },
  VENDEDOR: { name: 'Vendedor', description: 'Módulo de Venta y lectura de Clientes.' },
  COBRADOR: { name: 'Cobrador', description: 'Módulo de Cobranza y lectura de Clientes.' },
};

/** Qué módulos/acciones concede cada rol. */
const ROLE_PERMISSIONS: Record<
  string,
  { module: ModuleKey; actions: readonly PermissionAction[] }[]
> = {
  ADMIN: MODULES.map((module) => ({ module, actions: PERMISSION_ACTIONS })),
  GERENTE: [
    { module: 'GERENCIAL', actions: PERMISSION_ACTIONS },
    { module: 'VENTA', actions: ['READ'] },
    { module: 'COBRANZA', actions: ['READ'] },
    { module: 'CLIENTES', actions: ['READ'] },
  ],
  VENDEDOR: [
    { module: 'VENTA', actions: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
    { module: 'CLIENTES', actions: ['READ'] },
  ],
  COBRADOR: [
    { module: 'COBRANZA', actions: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
    { module: 'CLIENTES', actions: ['READ'] },
  ],
};

async function seedPermissions(): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();
  for (const module of MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      const key = permissionKey(module, action);
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { module, action, key },
      });
      keyToId.set(key, permission.id);
    }
  }
  return keyToId;
}

async function seedRoles(permKeyToId: Map<string, string>): Promise<Map<string, string>> {
  const roleKeyToId = new Map<string, string>();
  for (const [roleKey, meta] of Object.entries(ROLE_META)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { name: meta.name, description: meta.description, isSystem: true },
      create: { key: roleKey, name: meta.name, description: meta.description, isSystem: true },
    });
    roleKeyToId.set(roleKey, role.id);

    const grants = ROLE_PERMISSIONS[roleKey] ?? [];
    const permissionIds = grants.flatMap((grant) =>
      grant.actions.map((action) => {
        const id = permKeyToId.get(permissionKey(grant.module, action));
        if (!id) throw new Error(`Permiso no encontrado: ${grant.module}:${action}`);
        return id;
      }),
    );

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  return roleKeyToId;
}

async function seedAdmin(adminRoleId: string): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno para el seed.');
  }

  const passwordHash = await hash(password); // Argon2id por defecto

  const admin = await prisma.user.upsert({
    where: { email },
    update: {}, // no reescribe la contraseña en reseed
    create: { email, passwordHash, fullName: 'Administrador' },
  });

  await prisma.userRole.createMany({
    data: [{ userId: admin.id, roleId: adminRoleId }],
    skipDuplicates: true,
  });
}

async function main(): Promise<void> {
  const permKeyToId = await seedPermissions();
  const roleKeyToId = await seedRoles(permKeyToId);
  const adminRoleId = roleKeyToId.get('ADMIN');
  if (!adminRoleId) throw new Error('Rol ADMIN no fue creado.');
  await seedAdmin(adminRoleId);

  console.log(
    `Seed OK: ${permKeyToId.size} permisos, ${roleKeyToId.size} roles, admin=${process.env.ADMIN_EMAIL}`,
  );
}

main()
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
