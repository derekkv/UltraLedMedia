import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ShieldCheck } from 'lucide-react';
import {
  userCreateSchema,
  userUpdateSchema,
  SYSTEM_ROLES,
  type SystemRole,
} from '@ultraled/shared';
import { api, ApiException } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal';
import { useConfirm } from '@/providers/confirm';
import { toast } from '@/components/toaster';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

const usersQuery = {
  queryKey: ['users'],
  queryFn: () => api.get<{ items: UserRow[]; nextCursor: string | null }>('/users?limit=50'),
};

export const Route = createFileRoute('/_app/usuarios')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!me.roles.includes('ADMIN')) throw redirect({ to: '/' });
  },
  component: UsersPage,
});

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const ROLE_INFO: { key: SystemRole; name: string; desc: string; perms: string[] }[] = [
  {
    key: 'ADMIN',
    name: 'Administrador',
    desc: 'Control total del sistema.',
    perms: ['Todos los módulos', 'Gestión de usuarios y roles', 'Ver actividad / logs'],
  },
  {
    key: 'GERENTE',
    name: 'Gerente',
    desc: 'Visión gerencial y lectura transversal.',
    perms: ['Gerencial (completo)', 'Venta (lectura)', 'Cobranza (lectura)', 'Clientes (lectura)'],
  },
  {
    key: 'VENDEDOR',
    name: 'Vendedor',
    desc: 'Gestiona clientes y ventas.',
    perms: ['Venta: crear, editar, eliminar', 'Clientes (lectura)'],
  },
  {
    key: 'COBRADOR',
    name: 'Cobrador',
    desc: 'Gestiona la cobranza.',
    perms: ['Cobranza: crear, editar, eliminar', 'Clientes (lectura)'],
  },
];

function UsersPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading } = useQuery(usersQuery);
  const { data: me } = useQuery(meQueryOptions);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (user: UserRow) => api.del<void>(`/users/${user.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado.');
    },
    onError: (err) =>
      toast.error(err instanceof ApiException ? err.message : 'No se pudo eliminar el usuario.'),
  });

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (user: UserRow): void => {
    setEditing(user);
    setFormOpen(true);
  };

  const removeUser = async (user: UserRow): Promise<void> => {
    const ok = await confirm({
      title: 'Eliminar usuario',
      description: `Se eliminará la cuenta de "${user.fullName}" (${user.email}). Esta acción no se puede deshacer.`,
      variant: 'destructive',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    deleteMutation.mutate(user);
  };

  const users = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Administración</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alta y gestión de accesos al sistema.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Nuevo usuario
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios registrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sin usuarios.</p>
            ) : (
              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1 p-2"
              >
                {users.map((u) => (
                  <motion.li
                    key={u.id}
                    variants={staggerItem}
                    className="flex flex-col gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary/12 text-xs font-bold text-secondary">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.fullName}
                          {me?.id === u.id && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (tú)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="muted">
                            {r.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant={u.isActive ? 'success' : 'destructive'}>
                          {u.isActive ? 'activo' : 'inactivo'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar"
                          disabled={me?.id === u.id || deleteMutation.isPending}
                          title={me?.id === u.id ? 'No puedes eliminar tu cuenta' : 'Eliminar'}
                          onClick={() => void removeUser(u)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </CardContent>
        </Card>

        {/* Info de roles */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-secondary" /> Roles del sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {ROLE_INFO.map((role) => (
              <div key={role.key}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{role.key.toLowerCase()}</Badge>
                  <span className="text-sm font-medium">{role.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{role.desc}</p>
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {role.perms.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                      <span className="size-1 rounded-full bg-secondary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal open={formOpen} onOpenChange={setFormOpen} className="max-w-lg overflow-hidden p-0">
        {formOpen && (
          <UserForm
            key={editing?.id ?? 'new'}
            user={editing}
            onDone={() => setFormOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Formulario (crear / editar) en modal                                       */
/* -------------------------------------------------------------------------- */

interface UserFormValues {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  isActive?: boolean;
  roleKeys: string[];
}

function UserForm({
  user,
  onDone,
}: {
  user: UserRow | null;
  onDone: () => void;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const isEdit = user !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema) as Resolver<UserFormValues>,
    defaultValues: isEdit
      ? {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone ?? '',
          password: '',
          isActive: user.isActive,
          roleKeys: user.roles,
        }
      : { fullName: '', email: '', phone: '', password: '', isActive: true, roleKeys: [] },
  });

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (user) {
        const payload: Record<string, unknown> = {
          fullName: values.fullName,
          phone: values.phone?.trim() ? values.phone.trim() : null,
          isActive: values.isActive,
          roleKeys: values.roleKeys,
        };
        if (values.password && values.password.length > 0) payload.password = values.password;
        return api.patch<UserRow>(`/users/${user.id}`, payload);
      }
      return api.post<UserRow>('/users', {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        password: values.password,
        roleKeys: values.roleKeys,
      });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isEdit ? 'Usuario actualizado.' : `Usuario "${saved.fullName}" creado.`);
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof ApiException ? err.message : 'No se pudo guardar el usuario.'),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="flex max-h-[88vh] flex-col" noValidate>
      <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
        <ModalTitle className="text-lg font-semibold text-foreground">
          {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        </ModalTitle>
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

      <div className="flex-1 overflow-y-auto no-scrollbar px-6">
        <div className="flex flex-col gap-3 pb-1">
          <Field label="Nombre" error={errors.fullName?.message}>
            <Input {...register('fullName')} placeholder="Nombre completo" />
          </Field>
          {!isEdit && (
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} placeholder="usuario@ultraled.media" />
            </Field>
          )}
          <Field label="Teléfono" error={errors.phone?.message}>
            <Input {...register('phone')} placeholder="Opcional" />
          </Field>
          <Field
            label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
            error={errors.password?.message}
          >
            <Input
              type="password"
              {...register('password')}
              placeholder={isEdit ? 'Dejar en blanco para no cambiarla' : 'Mínimo 8 caracteres'}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-3">
              {SYSTEM_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    value={role}
                    {...register('roleKeys')}
                    className="size-4 accent-[var(--secondary)]"
                  />
                  {role}
                </label>
              ))}
            </div>
            {errors.roleKeys && (
              <p className="text-xs text-destructive">{errors.roleKeys.message}</p>
            )}
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('isActive')}
                className="size-4 accent-[var(--secondary)]"
              />
              Cuenta activa
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
        <ModalClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </ModalClose>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
