# Reglas de UI/UX — Ultraled Media

Estas reglas son obligatorias para todo trabajo de interfaz en `apps/web`. Objetivo: una UI
**elegante, minimalista, útil y bonita**, coherente en tema claro y oscuro. **Sin efectos neón/glow.**

## Principios

1. **Jerarquía por peso y espacio**, no por brillos. Un foco por vista.
2. **Color con avaricia**: la mayor parte de la pantalla es neutra; el primario comunica (acción, estado activo), no decora.
3. **Movimiento con propósito**: confirma acciones y orienta; nunca distrae. Respetar `prefers-reduced-motion`.
4. **Accesibilidad**: contraste AA, foco visible, objetivos táctiles ≥ 40px, todo operable por teclado.
5. **Usar lo que existe** antes de crear: tokens, componentes en `components/ui`, primitivos Radix.

## Tokens (nunca hardcodear color)

Usar siempre variables semánticas vía clases Tailwind. **Prohibido** `#hex`, `bg-white`, `text-gray-*`.

- Superficies: `bg-background`, `bg-surface-1`, `bg-surface-2`, `bg-card`, `bg-popover`, `bg-input`
- Texto: `text-foreground`, `text-foreground-secondary`, `text-muted-foreground` (4 niveles)
- Bordes: `border-border`, `border-border-strong`; foco: `ring-ring`
- Marca/acción: `bg-primary` + `text-primary-foreground`, `hover:bg-primary-hover`, realce `primary-soft`
- Semánticos: `success`, `warning`, `destructive` (+ `-foreground`)
- Definidos en `src/styles/theme.css` (claro en `:root`, oscuro en `.dark`).

**Paleta base:** oscuro fondo `#172035`, primario `#87c5ca`. En claro el primario se oscurece a un
teal accesible; el magenta del logo se reserva **solo para la marca**, no para la UI.

## Profundidad

- Elevación con sombras suaves de 2 capas: utilidades `elevated-1` (tarjetas) y `elevated-2` (popovers/modales).
- **No** usar glows, `shadow-[0_0_...]`, ni bordes de color saturado como decoración.
- Separación por espacio y tono antes que por líneas.

## Tipografía

- Fuente: **Plus Jakarta Sans** (`font-sans`). Números con `tabular-nums`.
- Jerarquía con tamaño + peso + color. Títulos `font-bold`/`font-semibold` con tracking ligeramente negativo.
- Escala aproximada 1.25; evitar tamaños casi iguales.

## Espaciado y forma

- Base 4px; usar múltiplos. Padding simétrico.
- Radios: `rounded-sm/md/lg/xl` (escala en tokens). Inputs/botones `md`, tarjetas `lg`, modales `xl`.

## Movimiento (Framer Motion)

- Import desde `framer-motion`. Usar variantes de `src/lib/motion.ts` (`fadeRise`, `stagger*`, `modalVariants`, `overlayVariants`).
- Duración 150–260ms, ease-out `EASE_OUT`. Press `active:scale-[0.98]`.
- Animar solo `opacity`/`transform`. Entradas de página con `fadeRise`; listas con stagger; modales scale-in.
- `MotionConfig reducedMotion="user"` ya está en la raíz.

## Componentes y patrones

- Base en `components/ui`: `Button` (variants: primary, secondary, outline, ghost, destructive), `Input`, `Label`, `Card`, `Badge`, `Skeleton`, `Modal`.
- **Confirmaciones**: usar `useConfirm()` (`providers/confirm`) para acciones destructivas/irreversibles (salir, eliminar, desactivar). No usar `window.confirm`.
- **Feedback no bloqueante**: `toast` de `components/toaster` (sonner) para éxito/error de mutaciones.
- **Modales**: componente `Modal` (Radix Dialog + Framer). Controles con teclado y foco ya resueltos por Radix.
- **Tema**: `useTheme()` y `<ThemeToggle/>`. Nunca leer/escribir `localStorage` de tema a mano.
- **Estados obligatorios** en cada vista: cargando (Skeleton), vacío, error, además de hover/focus/disabled.
- **Marca**: `<Logo/>` / `<LogoMark/>`. No reimplementar el hexágono.

## Layout

- Shell responsive `AppShell`: sidebar en desktop, tab bar inferior en móvil; mobile-first.
- Navegación filtrada por permisos (`user.modules` + rol). Indicador activo animado con `layoutId`.

## Checklist antes de entregar UI

- [ ] Sin colores hardcodeados; todo vía tokens.
- [ ] Se ve bien en claro y oscuro.
- [ ] Sin glows/neón.
- [ ] Estados: loading/empty/error/hover/focus/disabled.
- [ ] Acciones destructivas con `useConfirm`; mutaciones con `toast`.
- [ ] Animaciones sutiles y con `reduced-motion` respetado.
- [ ] Responsive (móvil y desktop) verificado.
