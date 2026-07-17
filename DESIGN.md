# Design

Sistema visual de Motos Punta. Oscuro, premium y deportivo. Fondo negro/carbón, texto
blanco, un único rojo de acento (el del logo). Mobile-first. Un solo sistema de
esquinas, tipografía y espacios en todo el sitio.

## Theme

Dark-only (no hay modo claro). Atmósfera de concesionaria premium de noche: negro
carbón profundo, superficies apenas elevadas, y el rojo como el pulso de la marca —
reservado para acción y énfasis. Textura sutil (grano/viñeta muy leve) permitida para
sacar el plano del negro liso; nunca degradados de color.

## Color

Tokens en CSS custom properties (definidos en `frontend/src/styles/tokens.css`).

- `--bg` `#0A0A0B` — fondo base (negro carbón)
- `--surface` `#141417` — tarjetas y superficies elevadas
- `--surface-2` `#1D1D22` — segunda elevación (inputs, hovers)
- `--border` `rgba(255,255,255,.09)` — divisores y bordes sutiles
- `--text` `#FAFAFA` — texto principal
- `--text-muted` `#9A9AA3` — texto secundario / metadatos
- `--text-faint` `#6A6A73` — deshabilitado / captions
- `--accent` `#E11322` — ROJO de marca; fondo de acción (CTA), texto blanco encima
- `--accent-hover` `#C10E1C` — rojo en hover/active del CTA
- `--accent-bright` `#FF3B47` — rojo para texto/íconos sobre negro y glows (mejor
  contraste sobre oscuro que `--accent`)
- `--accent-dim` `rgba(225,19,34,.14)` — halo/relleno tenue del rojo (bordes activos,
  fondos de chip)
- `--success` `#2FBF71` · `--danger` `#FF5A5F` — solo estados de formulario

Regla: el rojo es el ÚNICO color. Se usa para el CTA primario, foco/estado activo,
precios destacados y detalles de marca. Nunca para texto de cuerpo ni para "decorar".
Contraste: texto normal sobre `--bg` usa `--text`/`--text-muted` (AA); blanco sobre
`--accent` se reserva para botones y texto grande.

## Typography

Dos familias, cargadas desde Google Fonts en `index.html`.

- Display / títulos: **Oswald** (condensada de impacto, ya en uso). Pesos 500–700.
  Mayúsculas para los títulos grandes, `letter-spacing` levemente negativo, `line-height`
  ajustado. Tokens: `--font-display`.
- Cuerpo / UI: **Hanken Grotesk** (sans limpia, NO Inter). Pesos 400/500/600. Tokens:
  `--font-sans`.
- Escala (clamp, fluida): display-xl `clamp(2.75rem, 8vw, 6rem)` · display-l
  `clamp(2rem, 5vw, 3.5rem)` · h2 `clamp(1.5rem, 3vw, 2.25rem)` · h3 `1.25rem` · body
  `1rem` · small `.875rem` · caption `.75rem`.
- Números (precios, cuotas): `font-variant-numeric: tabular-nums`.

## Spacing & Radius

- Base 4px. Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96 (tokens `--sp-1`…`--sp-9`).
- Contenedor: `--container: 1200px`, padding lateral `--gutter: clamp(16px, 5vw, 40px)`.
- Un solo sistema de esquinas: `--radius: 6px` (tarjetas, botones, inputs), `--radius-sm:
  4px` (chips), `--radius-lg: 12px` (contenedores grandes/imagen). Nada de esquinas
  mezcladas fuera de esta escala. Estética deportiva → esquinas más bien firmes, no
  redondeadas tipo pastilla (salvo el botón flotante de WhatsApp, que es circular por
  convención).

## Components

- **Botones**: primario (fondo `--accent`, texto blanco, hover `--accent-hover`),
  secundario (contorno `--border`, texto `--text`, hover borde `--accent`), ghost
  (solo texto). Altura cómoda al tacto (≥44px), `font-display` en mayúsculas para los
  CTA.
- **Product card**: foto PNG del producto centrada sobre superficie oscura, nombre
  (Oswald), precio (tabular, rojo si destacado), y CTA "Consultar por WhatsApp". Hover:
  leve elevación + borde que se tiñe de rojo. Sin tarjeta-dentro-de-tarjeta.
- **Tabs de categoría** (Catálogo): Motos · Cascos · Indumentaria · Accesorios. Pestaña
  activa subrayada en rojo; transición del indicador con framer-motion (layoutId).
- **Header**: transparente sobre el hero, se vuelve sólido (`--bg` con blur y borde
  inferior) al hacer scroll. Logo a la izquierda, navegación y CTA a la derecha; menú
  hamburguesa en mobile.
- **Footer**: datos reales (WhatsApp, Instagram, dirección + mapa embebido), marcas y
  aviso de privacidad (Ley 18.331).
- **WhatsApp flotante**: botón circular fijo abajo a la derecha, en todas las páginas.
- **Formularios** (contacto / financiación): inputs sobre `--surface-2`, foco con anillo
  rojo, validación clara, estados success/error.
- **Simulador de cuotas**: sliders/campos para precio o modelo, entrega, plazo (hasta 60)
  y moneda (UYU/USD); resultado de cuota grande en Oswald tabular.

## Motion

Con framer-motion (ya instalado) y respetando `prefers-reduced-motion`.

- Transición de página: fade + desplazamiento sutil en Y (16px), 280ms.
- Easing estándar: `cubic-bezier(0.22, 1, 0.36, 1)` (salida expo suave). Token
  `--ease`.
- Reveals al hacer scroll: fade-up de secciones/tarjetas, escalonado leve (stagger
  40–60ms).
- Hover de tarjeta: elevación 4px + glow rojo tenue, 200ms.
- Nada de animar propiedades de layout caras ni coreografías que bloqueen la lectura.

## Imagery

Fotos PNG de producto (motos y cascos) sobre fondo oscuro — vienen del catálogo real
(Firestore/R2). `alt` descriptivo en todas. Lazy-load debajo del pliegue. Logos de marca
en `frontend/src/assets/logos/`. Sin stock photos genéricas.
