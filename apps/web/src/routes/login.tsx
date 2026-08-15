import * as React from 'react';
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { loginSchema, type LoginInput } from '@ultraled/shared';
import { login, meQueryOptions } from '@/lib/auth';
import { ApiException } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { fadeRise } from '@/lib/motion';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
      throw redirect({ to: search.redirect ?? '/' });
    } catch (err) {
      if (err instanceof ApiException) return;
      throw err;
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
      await router.invalidate();
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
    <div className="relative grid min-h-dvh place-items-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div variants={fadeRise} initial="hidden" animate="show" className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-12" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Ultraled Media</h1>
            <p className="mt-1 text-sm text-muted-foreground">Accede a tu panel de operaciones</p>
          </div>
        </div>

        <Card className="p-6">
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
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {serverError}
              </motion.p>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
