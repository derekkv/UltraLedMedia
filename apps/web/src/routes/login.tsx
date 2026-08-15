import * as React from 'react';
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@ultraled/shared';
import { login, meQueryOptions } from '@/lib/auth';
import { ApiException } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    // Si ya hay sesión, salir del login.
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
      throw redirect({ to: search.redirect ?? '/' });
    } catch (err) {
      if (err instanceof ApiException) return; // sin sesión: mostrar login
      throw err; // el redirect se propaga
    }
  },
  component: LoginPage,
});

function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      await router.invalidate(); // recarga /me en los guards
      await navigate({ to: search.redirect ?? '/' });
    } catch (err) {
      if (err instanceof ApiException) {
        setServerError(
          err.status === 423
            ? 'Cuenta bloqueada temporalmente. Intenta más tarde.'
            : 'Email o contraseña inválidos.',
        );
      } else {
        setServerError('No se pudo conectar. Intenta de nuevo.');
      }
    }
  });

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="size-3 rounded-full bg-primary shadow-[0_0_14px_3px_var(--primary)]" />
          <h1 className="text-xl font-bold tracking-[0.3em] text-foreground">ULTRALED</h1>
          <p className="text-sm text-muted-foreground">Acceso a operaciones</p>
        </div>

        <Card className="glow border-primary/20">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="tu@ultraled.media"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
