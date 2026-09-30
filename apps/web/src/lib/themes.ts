/**
 * Sistema de temas.
 * - Neutros y estados: dependen del modo (claro/oscuro) → BASE_TOKENS.
 * - Marca (primario/secundario/ring): depende del preset → THEME_PRESETS.
 * - El usuario puede sobreescribir cualquier token por modo (overrides) y el radio.
 * Todo se aplica como variables CSS en :root (ver ThemeProvider).
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export interface BrandTokens {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryForeground: string;
  secondary: string;
  secondaryHover: string;
  secondaryForeground: string;
  ring: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  light: BrandTokens;
  dark: BrandTokens;
}

/** Mapea cada campo de marca a su variable CSS. */
export const BRAND_VAR: Record<keyof BrandTokens, string> = {
  primary: '--primary',
  primaryHover: '--primary-hover',
  primarySoft: '--primary-soft',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryHover: '--secondary-hover',
  secondaryForeground: '--secondary-foreground',
  ring: '--ring',
};

/** Nombre de token (sin `--`) → campo de marca, para lectura inversa. */
export const BRAND_NAME_TO_KEY: Record<string, keyof BrandTokens> = {
  primary: 'primary',
  'primary-hover': 'primaryHover',
  'primary-soft': 'primarySoft',
  'primary-foreground': 'primaryForeground',
  secondary: 'secondary',
  'secondary-hover': 'secondaryHover',
  'secondary-foreground': 'secondaryForeground',
  ring: 'ring',
};

export const DEFAULT_PRESET_ID = 'verde-pastel';
export const DEFAULT_RADIUS = 0.5; // rem

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'verde-pastel',
    name: 'Verde Pastel',
    light: {
      primary: '#3f9199',
      primaryHover: '#367f86',
      primarySoft: '#87c5ca',
      primaryForeground: '#ffffff',
      secondary: '#f3068c',
      secondaryHover: '#d80680',
      secondaryForeground: '#ffffff',
      ring: '#3f9199',
    },
    dark: {
      primary: '#87c5ca',
      primaryHover: '#9bd0d4',
      primarySoft: '#87c5ca',
      primaryForeground: '#0f1728',
      secondary: '#f3068c',
      secondaryHover: '#ff3ba7',
      secondaryForeground: '#ffffff',
      ring: '#87c5ca',
    },
  },
  {
    id: 'oceano',
    name: 'Océano',
    light: {
      primary: '#2f6db3',
      primaryHover: '#285d99',
      primarySoft: '#7fb0e6',
      primaryForeground: '#ffffff',
      secondary: '#e0663c',
      secondaryHover: '#c9552e',
      secondaryForeground: '#ffffff',
      ring: '#2f6db3',
    },
    dark: {
      primary: '#6ea8e6',
      primaryHover: '#84b6ec',
      primarySoft: '#6ea8e6',
      primaryForeground: '#0b1524',
      secondary: '#ff855a',
      secondaryHover: '#ff9a75',
      secondaryForeground: '#1a0d07',
      ring: '#6ea8e6',
    },
  },
  {
    id: 'violeta',
    name: 'Violeta',
    light: {
      primary: '#6d5ae0',
      primaryHover: '#5c4bc9',
      primarySoft: '#b3a8f2',
      primaryForeground: '#ffffff',
      secondary: '#d9457f',
      secondaryHover: '#c23a6f',
      secondaryForeground: '#ffffff',
      ring: '#6d5ae0',
    },
    dark: {
      primary: '#a99bf2',
      primaryHover: '#b8adf5',
      primarySoft: '#a99bf2',
      primaryForeground: '#14112b',
      secondary: '#f36aa0',
      secondaryHover: '#f782b1',
      secondaryForeground: '#220e18',
      ring: '#a99bf2',
    },
  },
  {
    id: 'ambar',
    name: 'Ámbar',
    light: {
      primary: '#b7791f',
      primaryHover: '#9c6717',
      primarySoft: '#f0c675',
      primaryForeground: '#ffffff',
      secondary: '#2f9e8f',
      secondaryHover: '#288578',
      secondaryForeground: '#ffffff',
      ring: '#b7791f',
    },
    dark: {
      primary: '#e6b450',
      primaryHover: '#edc169',
      primarySoft: '#e6b450',
      primaryForeground: '#241a05',
      secondary: '#4fc7b5',
      secondaryHover: '#68d2c2',
      secondaryForeground: '#04201c',
      ring: '#e6b450',
    },
  },
];

/** Neutros + estados por modo (fuente de verdad; el CSS solo es fallback de primer pintado). */
export const BASE_TOKENS: Record<ResolvedMode, Record<string, string>> = {
  light: {
    background: '#f6f8fa',
    'surface-1': '#ffffff',
    'surface-2': '#eef1f5',
    card: '#ffffff',
    popover: '#ffffff',
    input: '#eef1f5',
    foreground: '#172035',
    'foreground-secondary': '#516074',
    'muted-foreground': '#8a96a8',
    border: 'transparent',
    'border-strong': 'rgba(23, 32, 53, 0.14)',
    success: '#3f9d78',
    warning: '#c9922e',
    destructive: '#d1495b',
    'destructive-foreground': '#ffffff',
  },
  dark: {
    background: '#172035',
    'surface-1': '#1e2942',
    'surface-2': '#25314c',
    card: '#1e2942',
    popover: '#1e2942',
    input: '#101a2e',
    foreground: '#e7ecf3',
    'foreground-secondary': '#a6b2c6',
    'muted-foreground': '#6c7a93',
    border: 'transparent',
    'border-strong': 'rgba(255, 255, 255, 0.16)',
    success: '#4bb18a',
    warning: '#d6a441',
    destructive: '#e06170',
    'destructive-foreground': '#16090b',
  },
};

export interface TokenMeta {
  name: string;
  label: string;
}
export interface TokenGroup {
  group: string;
  tokens: TokenMeta[];
}

/** Tokens de color editables desde Ajustes (agrupados). Los bordes se omiten por su transparencia. */
export const COLOR_TOKEN_GROUPS: TokenGroup[] = [
  {
    group: 'Marca',
    tokens: [
      { name: 'primary', label: 'Primario' },
      { name: 'primary-hover', label: 'Primario (hover)' },
      { name: 'primary-soft', label: 'Primario suave' },
      { name: 'primary-foreground', label: 'Texto sobre primario' },
      { name: 'secondary', label: 'Secundario' },
      { name: 'secondary-hover', label: 'Secundario (hover)' },
      { name: 'secondary-foreground', label: 'Texto sobre secundario' },
      { name: 'ring', label: 'Foco (ring)' },
    ],
  },
  {
    group: 'Superficies',
    tokens: [
      { name: 'background', label: 'Fondo' },
      { name: 'surface-1', label: 'Superficie 1' },
      { name: 'surface-2', label: 'Superficie 2' },
      { name: 'card', label: 'Tarjeta' },
      { name: 'popover', label: 'Popover' },
      { name: 'input', label: 'Campos' },
    ],
  },
  {
    group: 'Texto',
    tokens: [
      { name: 'foreground', label: 'Texto principal' },
      { name: 'foreground-secondary', label: 'Texto secundario' },
      { name: 'muted-foreground', label: 'Texto atenuado' },
    ],
  },
  {
    group: 'Estados',
    tokens: [
      { name: 'success', label: 'Éxito' },
      { name: 'warning', label: 'Advertencia' },
      { name: 'destructive', label: 'Destructivo' },
      { name: 'destructive-foreground', label: 'Texto sobre destructivo' },
    ],
  },
];

/** Todos los tokens de color (neutros + estados + marca) que el proveedor aplica/limpia. */
export const APPLIED_TOKENS: string[] = [
  ...Object.keys(BASE_TOKENS.light),
  ...Object.keys(BRAND_NAME_TO_KEY),
];

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}
