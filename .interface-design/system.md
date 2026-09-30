# Interface Design System — Ultraled Media

**Dirección y feel:** panel de operaciones internas (venta, cobranza, gerencial, clientes) para
una empresa de medios/pantallas LED. Serio, calmado y preciso — un "control room" legible, no
juguetón. Superficies limpias, jerarquía clara, **sin bordes grises finos, sin neón/glow**.

**Marca:** monograma hexagonal UL (`components/logo`). Primario **teal** (acción); secundario
**magenta `#F3068C`** como acento de marca (nav activo, insignias, número de sección, botón
secondary). El color se usa con avaricia: la mayor parte es neutra.

**Público:** personal de la empresa (vendedor, cobrador, gerente, admin), a lo largo del día, en
desktop y móvil (mobile-first, PWA).

## Sistema de temas (configurable)

- Fuente de verdad en JS: `lib/themes.ts` (neutros/estados por modo + presets de marca) aplicado
  como variables CSS por `providers/theme.tsx`. `styles/theme.css` es solo fallback de primer
  pintado + mapeo `@theme inline` + utilidades.
- **Modo** claro/oscuro/sistema. **Presets** de marca: Verde Pastel (default), Océano, Violeta,
  Ámbar. **Personalización por token** (cualquier color) + **radio** global, con overrides por modo
  persistidos en localStorage. UI en `Ajustes` detrás de la opción desplegable "Personalizar tema".
- Oscuro: fondo `#172035`, superficies `#1e2942`/`#25314c`, campos `#101a2e`. Claro: fondo
  `#f6f8fa`, tarjetas `#ffffff`, campos `#eef1f5`, primario accesible `#3f9199`.

## Profundidad y bordes

- **Sin líneas grises**: `--border: transparent`. La separación es por **tono + elevación**.
- Estrategia única: **sombras suaves de 2 capas** (`elevated-1` tarjetas, `elevated-2`
  popovers/modales). `--border-strong` solo para botones `outline`.
- Campos con **relleno** (`bg-input`, sin borde); foco con `ring`.

## Jerarquía y tipografía

- **Plus Jakarta Sans**. Jerarquía por **peso + color + tamaño** (no solo tamaño). `tabular-nums`
  en toda cifra. Escala ~1.25. **Un foco por vista.**
- **Eyebrow** recurrente (firma editorial): `text-[11px] font-semibold uppercase tracking-wider
  text-muted-foreground` encima de títulos/labels.

## Firma visual (identidad "ops de medios LED")

- **Riel de acento** de 3px (`bg-primary`) en la métrica hero (evoca la franja de un panel LED).
- **Puntos de estado** (dot + label) tipo "en aire/pausado": success/warning/destructive/muted.
- Número de sección en insignia magenta (`bg-secondary/12 text-secondary`) en formularios largos.

## Espaciado, radios, movimiento

- Base 4px. Radio **`--radius: 0.5rem`** (8px); escala `sm≈2 / md=4 / lg=8 / xl=14`.
- Framer Motion: `EASE_OUT=[0.22,1,0.36,1]`, 150–260ms. `fadeRise` páginas, stagger listas,
  modales scale-in `0.96→1`, press `active:scale-[0.98]`, nav activo con `layoutId`,
  `reducedMotion="user"` global. Barras de scroll finas; `.no-scrollbar` en modales/móvil.

## Navegación

- Barra compacta: **Inicio · Módulos · Ajustes** (+ **Administración** solo ADMIN). Los 4 módulos de
  negocio viven dentro de **Módulos**; **Usuarios** y **Actividad** dentro de **Administración**.
- Sidebar 264px (desktop) + tab bar inferior (móvil), sin bordes; indicador activo magenta
  (`bg-secondary/12 text-secondary`) con `layoutId`.

## Componentes clave (medidas)

- **Button** — h-9 (default) / h-8 (sm) / h-11 (lg); radius md; 14px/600; foco `ring-2 ring-ring/60
  ring-offset-2`; variants primary (teal), secondary (magenta), outline, ghost, destructive.
- **Card** — radius lg, `elevated-1`, `bg-card`, sin borde; padding 20px.
- **Input / select** — h-10, `bg-input` relleno, foco `border-primary` + ring.
- **Badge** — pill 11px/500; variants muted/primary/secondary/success/warning/destructive (fondo 12%).
- **Alert** (`components/ui/alert`) — aviso en línea con **riel de acento a la izquierda** + icono
  semántico; variants info/success/warning/destructive.
- **Toast** (`components/toaster`, sonner) — superficie **neutra** elevada + **icono con color
  semántico** (estilo Linear/Vercel), sin `richColors`; bottom-right, `mobileOffset` sobre tab bar.
- **Modal** (Radix Dialog + Framer) — centrado, radius xl, `elevated-2`, scrim `bg-black/55 blur`.
  Patrón de forms largos: `p-0 overflow-hidden` + `flex max-h-[88vh] flex-col` (header fijo, cuerpo
  `overflow-y-auto no-scrollbar`, footer fijo) + botón cerrar (X) con `ModalClose`.
- **Confirm** (`useConfirm`) — insignia con icono contextual (destructive=triángulo rojo tenue,
  primary=info teal) + título/descripción + acciones a la derecha.
- **Notificaciones** — **modal** (móvil y PC): contador, "Marcar todas", tiempos relativos, no leído
  con acento magenta, estado vacío.

## Patrones de datos y feedback

- Listas: filas redondeadas espaciadas con hover (no divisores). Estados **loading (Skeleton) /
  vacío / error** siempre, con icono + copy + CTA.
- Confirmaciones destructivas → `useConfirm`. Mutaciones → `toast` (success/error con mensajes claros).
- Vigencias: badge inteligente (verde/ámbar/rojo) según días a vencer; `tabular-nums`.
- Tiempo real por WebSocket invalida queries (`realtime.on` en la vista; el socket lo posee
  `Notifications`). Concurrencia optimista con `version` (409 → recargar).

## AUDITORÍA / LOGS (obligatorio)

Toda mutación (crear/editar/eliminar/cambiar estado) **debe** registrar un log con
`audit(request, {...})` — ver `apps/api/src/security/audit.ts` y `.kiro/steering/logging.md`.
Estructura: `action` `<ENTIDAD>_<VERBO>`, `entity`, `entityId`, `summary`, `changes`
(`diffObjects`) en ediciones, `snapshot` (`auditSnapshot`) en altas/borrados; actor/IP/UA/fecha se
agregan solos. Visor en **Administración → Actividad** (`/audit-logs`, ADMIN).

## Reglas operativas

Ver `.kiro/steering/ui-ux.md` (tokens, sin neón, estados, `useConfirm`, `toast`, motion) y
`.kiro/steering/logging.md` (auditoría). Tokens siempre; nunca hex sueltos ni `bg-white`.
