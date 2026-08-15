# Interface Design System — Ultraled Media

**Dirección y feel:** elegante, minimalista, útil. Producto de operaciones internas (venta,
cobranza, gerencial, clientes) para una empresa de medios LED. Serio y calmado; superficies
limpias, sin ruido. Sin neón.

**Marca:** monograma hexagonal UL (`components/logo`). El magenta del logo es solo de marca; la
UI vive en teal + neutros.

## Tema (doble, tokens en `src/styles/theme.css`)

- Oscuro: fondo `#172035`; superficies `#1e2942`, `#25314c`; primario `#87c5ca` (texto oscuro encima).
- Claro: fondo `#f6f8fa`; tarjetas `#ffffff`; tinta `#172035`; primario accesible `#3f9199` (hue conservado).
- Texto en 4 niveles; bordes de baja opacidad; foco con `ring`.
- Semánticos desaturados: success `#3f9d78`, warning `#c9922e`, destructive `#d1495b` (claro) / variantes en oscuro.

## Profundidad

- Estrategia: **sombras suaves** (2 capas) — `elevated-1`, `elevated-2`. Sin glows. Bordes tenues para separar.

## Jerarquía y tipografía

- Plus Jakarta Sans. Tamaño + peso + color como palancas. `tabular-nums` en cifras.
- Escala ~1.25; foco único por vista; densidad cómoda.

## Espaciado y radios

- Base 4px. Radios: sm/md (inputs, botones), lg (tarjetas), xl (modales).

## Movimiento (Framer Motion)

- `EASE_OUT = [0.22,1,0.36,1]`, 150–260ms. `fadeRise` en páginas; stagger en listas; modales scale-in `0.96→1`; press `scale .98`; toggle de tema con swap de icono; nav activo con `layoutId`.
- `reducedMotion="user"` global.

## Componentes clave (medidas)

- **Button** — h-9 (default), h-8 (sm), h-11 (lg); radius md; 14px/600; variants primary/secondary/outline/ghost/destructive.
- **Card** — radius lg, `elevated-1`, `bg-card`, borde tenue, padding 20px.
- **Input** — h-10, `bg-input`, borde tenue, foco `border-primary` + `ring`.
- **Badge** — pill, 11px/500; variants muted/primary/success/warning/destructive (fondo al 12-15%).
- **Modal** — Radix Dialog + Framer, centrado, max-w-md, radius xl, `elevated-2`, overlay `bg-black/50` con blur.
- **Sidebar** — 264px; nav con pill activo `bg-primary/10` + `layoutId`; footer con avatar + logout.
- **Notifications** — Popover animado, badge de no leídas con `bg-primary`.

## Patrones

- Confirmaciones: `useConfirm()`. Feedback: `toast` (sonner, theme-aware).
- Estados: loading (Skeleton), vacío, error siempre presentes.

Ver reglas operativas completas en `.kiro/steering/ui-ux.md`.
