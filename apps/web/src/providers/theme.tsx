import * as React from 'react';
import {
  APPLIED_TOKENS,
  BASE_TOKENS,
  BRAND_NAME_TO_KEY,
  BRAND_VAR,
  DEFAULT_PRESET_ID,
  DEFAULT_RADIUS,
  getPreset,
  type ThemeMode,
  type ResolvedMode,
} from '@/lib/themes';

// Alias retrocompatibles.
export type Theme = ThemeMode;
export type ResolvedTheme = ResolvedMode;

type Overrides = Record<ResolvedMode, Record<string, string>>;

interface ThemeConfig {
  mode: ThemeMode;
  presetId: string;
  radius: number;
  overrides: Overrides;
}

interface ThemeContextValue {
  // Modo claro/oscuro/sistema
  theme: ThemeMode;
  resolved: ResolvedMode;
  setTheme: (theme: ThemeMode) => void;
  toggle: () => void;
  // Preset de marca
  presetId: string;
  setPreset: (id: string) => void;
  // Radio global (rem)
  radius: number;
  setRadius: (rem: number) => void;
  // Personalización por token (modo resuelto actual)
  getToken: (name: string) => string;
  setToken: (name: string, value?: string) => void;
  resetCustomization: () => void;
  isCustomized: boolean;
}

const STORAGE_KEY = 'ul-theme-config';
const LEGACY_MODE_KEY = 'ul-theme';
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemMode(): ResolvedMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function emptyOverrides(): Overrides {
  return { light: {}, dark: {} };
}

function readConfig(): ThemeConfig {
  const fallback: ThemeConfig = {
    mode: 'system',
    presetId: DEFAULT_PRESET_ID,
    radius: DEFAULT_RADIUS,
    overrides: emptyOverrides(),
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
      return {
        mode:
          parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system'
            ? parsed.mode
            : 'system',
        presetId: typeof parsed.presetId === 'string' ? parsed.presetId : DEFAULT_PRESET_ID,
        radius: typeof parsed.radius === 'number' ? parsed.radius : DEFAULT_RADIUS,
        overrides: {
          light: parsed.overrides?.light ?? {},
          dark: parsed.overrides?.dark ?? {},
        },
      };
    }
    // Migración desde la versión anterior (solo modo).
    const legacy = localStorage.getItem(LEGACY_MODE_KEY);
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
      return { ...fallback, mode: legacy };
    }
  } catch {
    /* configuración corrupta -> valores por defecto */
  }
  return fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [config, setConfig] = React.useState<ThemeConfig>(() => readConfig());
  const { mode, presetId, radius, overrides } = config;

  const [resolved, setResolved] = React.useState<ResolvedMode>(() =>
    typeof window === 'undefined' ? 'dark' : mode === 'system' ? systemMode() : mode,
  );

  // Resuelve el modo y escucha cambios del sistema.
  React.useEffect(() => {
    const next = mode === 'system' ? systemMode() : mode;
    setResolved(next);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setResolved(systemMode());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  // Aplica las variables CSS efectivas.
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');

    // Limpia tokens aplicados previamente.
    APPLIED_TOKENS.forEach((name) => root.style.removeProperty(`--${name}`));

    // Base (neutros + estados).
    Object.entries(BASE_TOKENS[resolved]).forEach(([name, value]) => {
      root.style.setProperty(`--${name}`, value);
    });

    // Marca (preset).
    const preset = getPreset(presetId);
    (Object.keys(BRAND_VAR) as (keyof typeof BRAND_VAR)[]).forEach((key) => {
      root.style.setProperty(BRAND_VAR[key], preset[resolved][key]);
    });

    // Radio.
    root.style.setProperty('--radius', `${radius}rem`);

    // Overrides del usuario (ganan).
    Object.entries(overrides[resolved]).forEach(([name, value]) => {
      root.style.setProperty(`--${name}`, value);
    });
  }, [resolved, presetId, radius, overrides]);

  // Persistencia.
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [config]);

  const setTheme = React.useCallback((next: ThemeMode) => {
    setConfig((c) => ({ ...c, mode: next }));
  }, []);

  const toggle = React.useCallback(() => {
    setConfig((c) => ({ ...c, mode: resolved === 'dark' ? 'light' : 'dark' }));
  }, [resolved]);

  const setPreset = React.useCallback((id: string) => {
    setConfig((c) => ({ ...c, presetId: id }));
  }, []);

  const setRadius = React.useCallback((rem: number) => {
    setConfig((c) => ({ ...c, radius: rem }));
  }, []);

  const setToken = React.useCallback(
    (name: string, value?: string) => {
      setConfig((c) => {
        const modeOverrides = { ...c.overrides[resolved] };
        if (value == null) delete modeOverrides[name];
        else modeOverrides[name] = value;
        return { ...c, overrides: { ...c.overrides, [resolved]: modeOverrides } };
      });
    },
    [resolved],
  );

  const resetCustomization = React.useCallback(() => {
    setConfig((c) => ({ ...c, overrides: emptyOverrides(), radius: DEFAULT_RADIUS }));
  }, []);

  const getToken = React.useCallback(
    (name: string): string => {
      const override = overrides[resolved][name];
      if (override != null) return override;
      const brandKey = BRAND_NAME_TO_KEY[name];
      if (brandKey) return getPreset(presetId)[resolved][brandKey];
      return BASE_TOKENS[resolved][name] ?? '#000000';
    },
    [overrides, resolved, presetId],
  );

  const isCustomized =
    Object.keys(overrides.light).length > 0 ||
    Object.keys(overrides.dark).length > 0 ||
    radius !== DEFAULT_RADIUS;

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: mode,
      resolved,
      setTheme,
      toggle,
      presetId,
      setPreset,
      radius,
      setRadius,
      getToken,
      setToken,
      resetCustomization,
      isCustomized,
    }),
    [
      mode,
      resolved,
      setTheme,
      toggle,
      presetId,
      setPreset,
      radius,
      setRadius,
      getToken,
      setToken,
      resetCustomization,
      isCustomized,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
