import * as React from 'react';
import { Bell, ShoppingCart, Receipt, LayoutDashboard, Users, type LucideIcon } from 'lucide-react';
import type { ModuleKey } from '@ultraled/shared';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'VENTA', label: 'Venta', icon: ShoppingCart },
  { key: 'COBRANZA', label: 'Cobranza', icon: Receipt },
  { key: 'GERENCIAL', label: 'Gerencial', icon: LayoutDashboard },
  { key: 'CLIENTES', label: 'Clientes', icon: Users },
];

function Brand(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px_2px_var(--primary)]" />
      <span className="text-sm font-bold tracking-[0.2em] text-foreground">ULTRALED</span>
    </div>
  );
}

interface AppShellProps {
  activeKey?: ModuleKey;
  items?: NavItem[];
  children: React.ReactNode;
}

export function AppShell({
  activeKey = 'GERENCIAL',
  items = NAV_ITEMS,
  children,
}: AppShellProps): React.ReactElement {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {items.map((item) => (
            <NavButton key={item.key} item={item} active={item.key === activeKey} />
          ))}
        </nav>
        <div className="mt-auto p-4 text-xs text-muted-foreground">v0.1.0</div>
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:left-64 md:px-6">
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="hidden text-sm text-muted-foreground md:block">Panel de operaciones</div>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-9 place-items-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-accent shadow-[0_0_8px_2px_var(--accent)]" />
        </button>
      </header>

      {/* Contenido */}
      <main className="px-4 pb-24 pt-20 md:ml-64 md:px-8 md:pb-10">{children}</main>

      {/* Tab bar (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/90 backdrop-blur-sm md:hidden">
        {items.map((item) => (
          <TabButton key={item.key} item={item} active={item.key === activeKey} />
        ))}
      </nav>
    </div>
  );
}

function NavButton({ item, active }: { item: NavItem; active: boolean }): React.ReactElement {
  const Icon = item.icon;
  return (
    <button
      type="button"
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
    </button>
  );
}

function TabButton({ item, active }: { item: NavItem; active: boolean }): React.ReactElement {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={cn(
        'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className={cn('size-5', active && 'drop-shadow-[0_0_6px_var(--primary)]')} />
      {item.label}
    </button>
  );
}
