import * as React from 'react';
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  LayoutGrid,
  Settings,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { CurrentUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Notifications } from '@/components/notifications';
import { transition } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface NavItem {
  to: LinkProps['to'];
  label: string;
  icon: LucideIcon;
}

/** Navegación principal compacta. Los módulos de negocio viven dentro de "Módulos". */
const BASE_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/modulos', label: 'Módulos', icon: LayoutGrid },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

/** Rutas de módulos de negocio (para resaltar "Módulos" cuando se está dentro). */
const MODULE_PATHS = ['/venta', '/cobranza', '/gerencial', '/clientes'];

function navForUser(user: CurrentUser): NavItem[] {
  const items = [...BASE_NAV];
  if (hasRole(user, 'ADMIN')) {
    // Administración (usuarios, etc.) va antes de Ajustes.
    items.splice(2, 0, { to: '/administracion', label: 'Administración', icon: ShieldCheck });
  }
  return items;
}

interface AppShellProps {
  user: CurrentUser;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({ user, onLogout, children }: AppShellProps): React.ReactElement {
  const items = navForUser(user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: LinkProps['to']): boolean => {
    const p = String(to);
    if (p === '/') return pathname === '/';
    if (p === '/modulos')
      return pathname === '/modulos' || MODULE_PATHS.some((m) => pathname.startsWith(m));
    if (p === '/administracion')
      return pathname.startsWith('/administracion') || pathname.startsWith('/usuarios');
    return pathname.startsWith(p);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-surface-1 md:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={String(item.to)}
                to={item.to}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-secondary'
                    : 'text-foreground-secondary hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-desktop"
                    transition={transition}
                    className="absolute inset-0 rounded-md bg-secondary/12"
                  />
                )}
                <Icon className="relative z-10 size-[18px]" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary/15 text-xs font-bold text-secondary">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Salir"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between bg-background/80 px-4 backdrop-blur-md elevated-1 md:left-64 md:px-6">
        <div className="md:hidden">
          <Logo />
        </div>
        <div className="hidden text-sm font-medium text-muted-foreground md:block">
          Panel de operaciones
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Notifications />
        </div>
      </header>

      {/* Contenido */}
      <main className="overflow-x-clip px-4 pb-24 pt-20 md:ml-64 md:px-8 md:pb-10">{children}</main>

      {/* Tab bar (móvil) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid bg-surface-1/95 shadow-[0_-4px_16px_-6px_rgba(0,0,0,0.18)] backdrop-blur-md md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={String(item.to)}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                active ? 'text-secondary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
