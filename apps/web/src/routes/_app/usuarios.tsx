import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { userCreateSchema, type UserCreateInput, SYSTEM_ROLES } from '@ultraled/shared';
import { api, ApiException } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/toaster';
import { staggerContainer, staggerItem } from '@/lib/motion';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
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

function UsersPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(usersQuery);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { roleKeys: [] },
  });

  const createMutation = useMutation({
    mutationFn: (input: UserCreateInput) => api.post<UserRow>('/users', input),
    onSuccess: async (user) => {
      reset({ email: '', fullName: '', phone: '', password: '', roleKeys: [] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Usuario ${user.fullName} creado`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiException ? err.message : 'No se pudo crear el usuario.');
    },
  });

  const onSubmit = handleSubmit((values) => createMutation.mutate(values));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Alta y gestión de accesos (solo administración).
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios registrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="divide-y divide-border"
              >
                {(data?.items ?? []).map((u) => (
                  <motion.li
                    key={u.id}
                    variants={staggerItem}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="muted">
                          {r.toLowerCase()}
                        </Badge>
                      ))}
                      <Badge variant={u.isActive ? 'success' : 'destructive'}>
                        {u.isActive ? 'activo' : 'inactivo'}
                      </Badge>
                    </div>
                  </motion.li>
                ))}
                {data && data.items.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Sin usuarios.
                  </li>
                )}
              </motion.ul>
            )}
          </CardContent>
        </Card>

        {/* Alta */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
              <Field label="Nombre" error={errors.fullName?.message}>
                <Input {...register('fullName')} placeholder="Nombre completo" />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register('email')} placeholder="usuario@ultraled.media" />
              </Field>
              <Field label="Teléfono" error={errors.phone?.message}>
                <Input {...register('phone')} placeholder="Opcional" />
              </Field>
              <Field label="Contraseña" error={errors.password?.message}>
                <Input type="password" {...register('password')} placeholder="Mínimo 8 caracteres" />
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
                        className="size-4 accent-[var(--primary)]"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {errors.roleKeys && (
                  <p className="text-xs text-destructive">{errors.roleKeys.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="mt-1">
                {isSubmitting ? 'Creando…' : 'Crear usuario'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
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
