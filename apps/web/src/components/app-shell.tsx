import * as React from 'react';
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
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
import { Notifications } from '@/components/notifications';
import { cn } from '@/lib/utils';

interface NavItem {
  to: LinkProps['to'];
  label: string;
  icon: LucideIcon;
  module?: ModuleKey;
}

const MODULE_NAV: NavItem[] = [
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

function Brand(): React.ReactElement {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px_2px_var(--primary)]" />
      <span className="text-sm font-bold tracking-[0.2em] text-foreground">ULTRALED</span>
    </Link>
  );
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={String(item.to)}
                to={item.to}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-surface-1 text-primary'
                    : 'text-foreground-secondary hover:bg-surface-1 hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_1px_var(--primary)]" />
                )}
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <div className="truncate text-xs text-muted-foreground" title={user.email}>
            {user.fullName}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-1 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Salir
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:left-64 md:px-6">
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="hidden text-sm text-muted-foreground md:block">Panel de operaciones</div>
        <div className="flex items-center gap-1">
          <Notifications />
          <button
            type="button"
            onClick={onLogout}
            aria-label="Salir"
            className="grid size-9 place-items-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-destructive md:hidden"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="px-4 pb-24 pt-20 md:ml-64 md:px-8 md:pb-10">{children}</main>

      {/* Tab bar (móvil) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/90 backdrop-blur-sm md:hidden"
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
              <Icon className={cn('size-5', active && 'drop-shadow-[0_0_6px_var(--primary)]')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
