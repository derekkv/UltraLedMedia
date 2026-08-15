import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userCreateSchema, type UserCreateInput, SYSTEM_ROLES } from '@ultraled/shared';
import { api, ApiException } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const { data } = useQuery(usersQuery);
  const [formError, setFormError] = React.useState<string | null>(null);

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
    onSuccess: async () => {
      reset({ email: '', fullName: '', phone: '', password: '', roleKeys: [] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiException ? err.message : 'No se pudo crear el usuario.');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    createMutation.mutate(values);
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
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
            <ul className="divide-y divide-border">
              {(data?.items ?? []).map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-secondary">{u.roles.join(', ')}</span>
                    <span
                      className={
                        u.isActive
                          ? 'rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success'
                          : 'rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive'
                      }
                    >
                      {u.isActive ? 'activo' : 'inactivo'}
                    </span>
                  </div>
                </li>
              ))}
              {data && data.items.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted-foreground">Sin usuarios.</li>
              )}
            </ul>
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
                        className="accent-[var(--primary)]"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {errors.roleKeys && (
                  <p className="text-xs text-destructive">{errors.roleKeys.message}</p>
                )}
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}

              <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-1">
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
