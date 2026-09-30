import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Check,
  Palette,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { meQueryOptions } from '@/lib/auth';
import { useTheme, type Theme } from '@/providers/theme';
import { THEME_PRESETS, COLOR_TOKEN_GROUPS, getPreset } from '@/lib/themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { transition } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/ajustes')({
  component: AjustesPage,
});

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

function AjustesPage(): React.ReactElement {
  const theme = useTheme();
  const { data: me } = useQuery(meQueryOptions);
  const [open, setOpen] = React.useState(false);
  const px = Math.round(theme.radius * 16);
  const activePreset = getPreset(theme.presetId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferencias de apariencia y datos de tu cuenta.
        </p>
      </div>

      {/* Modo */}
      <Card>
        <CardHeader>
          <CardTitle>Modo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = theme.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => theme.setTheme(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-md px-3 py-4 text-sm font-medium transition-colors active:scale-[0.98]',
                    active
                      ? 'bg-secondary/12 text-secondary'
                      : 'bg-surface-2 text-foreground-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Personalizar tema (oculto tras una opción) */}
      <Card>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-surface-2"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary/12 text-secondary">
            <Palette className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Personalizar tema</p>
            <p className="text-xs text-muted-foreground">
              {activePreset.name}
              {theme.isCustomized ? ' · personalizado' : ''}
            </p>
          </div>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={transition}>
            <ChevronDown className="size-5 text-muted-foreground" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-6 px-5 pb-5">
                {/* Preset de marca */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tema
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {THEME_PRESETS.map((preset) => {
                      const active = theme.presetId === preset.id;
                      const brand = preset[theme.resolved];
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => theme.setPreset(preset.id)}
                          aria-pressed={active}
                          className={cn(
                            'relative flex flex-col gap-2 rounded-lg bg-surface-2 p-3 text-left transition-colors active:scale-[0.98]',
                            active ? 'ring-2 ring-secondary' : 'hover:bg-surface-1',
                          )}
                        >
                          <div className="flex gap-1.5">
                            <span
                              className="size-5 rounded-full"
                              style={{ backgroundColor: brand.primary }}
                            />
                            <span
                              className="size-5 rounded-full"
                              style={{ backgroundColor: brand.secondary }}
                            />
                          </div>
                          <span className="flex items-center gap-1 text-xs font-medium">
                            {preset.name}
                            {active && <Check className="size-3 text-secondary" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ajuste fino por token */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Ajuste fino del modo{' '}
                    <span className="font-medium text-foreground">
                      {theme.resolved === 'dark' ? 'oscuro' : 'claro'}
                    </span>
                    . Se aplica al instante.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={theme.resetCustomization}
                    disabled={!theme.isCustomized}
                  >
                    <RotateCcw /> Restablecer
                  </Button>
                </div>

                {/* Radio */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="radius"
                      className="text-sm font-medium text-foreground-secondary"
                    >
                      Redondeo de esquinas
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground">{px}px</span>
                  </div>
                  <input
                    id="radius"
                    type="range"
                    min={0}
                    max={1}
                    step={0.0625}
                    value={theme.radius}
                    onChange={(e) => theme.setRadius(Number(e.target.value))}
                    className="w-full accent-[var(--secondary)]"
                  />
                </div>

                {/* Colores por grupo */}
                {COLOR_TOKEN_GROUPS.map((group) => (
                  <div key={group.group} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.tokens.map((token) => (
                        <label
                          key={token.name}
                          className="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1.5"
                          title={token.label}
                        >
                          <input
                            type="color"
                            value={theme.getToken(token.name)}
                            onChange={(e) => theme.setToken(token.name, e.target.value)}
                            className="size-7 shrink-0 cursor-pointer rounded bg-transparent p-0"
                            aria-label={token.label}
                          />
                          <span className="truncate text-xs text-foreground-secondary">
                            {token.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">
              {me?.fullName.slice(0, 2).toUpperCase() ?? '··'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{me?.fullName ?? '—'}</p>
              <p className="truncate text-sm text-muted-foreground">{me?.email ?? '—'}</p>
            </div>
          </div>
          {me && me.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {me.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
