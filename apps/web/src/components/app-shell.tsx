import * as React from 'react';
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Receipt,
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from '@ultraled/shared';
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
  module?: ModuleKey;
}

const MODULE_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/venta', label: 'Venta', icon: ShoppingCart, module: 'VENTA' },
  { to: '/cobranza', label: 'Cobranza', icon: Receipt, module: 'COBRANZA' },
  { to: '/gerencial', label: 'Gerencial', icon: LayoutDashboard, module: 'GERENCIAL' },
  { to: '/clientes', label: 'Clientes', icon: Users, module: 'CLIENTES' },
];

function navForUser(user: CurrentUser): NavItem[] {
  const items = MODULE_NAV.filter((item) => !item.module || user.modules.includes(item.module));
  if (hasRole(user, 'ADMIN')) {
    items.push({ to: '/usuarios', label: 'Usuarios', icon: ShieldCheck });
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
  const isActive = (to: LinkProps['to']): boolean =>
    to === '/' ? pathname === '/' : pathname.startsWith(String(to));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface-1 md:flex">
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
                    ? 'text-primary'
                    : 'text-foreground-secondary hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-desktop"
                    transition={transition}
                    className="absolute inset-0 rounded-md bg-primary/10"
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
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
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
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:left-64 md:px-6">
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
      <main className="px-4 pb-24 pt-20 md:ml-64 md:px-8 md:pb-10">{children}</main>

      {/* Tab bar (móvil) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/90 backdrop-blur-md md:hidden"
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
                active ? 'text-primary' : 'text-muted-foreground',
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
