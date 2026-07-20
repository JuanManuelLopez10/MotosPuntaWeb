# ESTADO — Integración Meta Catálogo + Firestore (Motos Punta)

> Documento de traspaso. Para retomar en una ventana nueva: leé esto entero.
> Proyecto SEPARADO del publicador de Instagram (ese tiene su propio ESTADO en
> `C:\Users\26lop\OneDrive\Escritorio\Instagram\_automation\ESTADO.md`).

## ⚡ ESTADO ACTUAL (15/07/2026) — LEER PRIMERO

**La WEB fue REHECHA de cero** (sesión 15/07) (Vite+React, tema oscuro premium, sistema de diseño
Impeccable: Oswald + Hanken Grotesk, acento rojo). Backend Flask/Render + Firestore intacto.
Todo el frontend está en `frontend/src` (páginas en `pages/`, componentes en `components/`,
datos en `data/`, helpers en `lib/`, estilos en `styles/`). Se prueba con dev server:
`cd frontend && npm run dev` (localhost:5173). El screenshot del preview NO anda (se cuelga);
se verifica por get_page_text / read_page / javascript_tool. TIP: el navegador del preview NO
alcanza el API de Render (CORS/red) → para ver con datos, levantar un mock local que sirva el
snapshot en `/api/products` con CORS `*` y arrancar Vite con `VITE_API_BASE_URL=http://localhost:PUERTO`.

**NUEVO (17/07/2026) — Sección MOTOS separada del catálogo (sin commitear aún):**
- Las **motos ya NO están en el Catálogo**: el catálogo es solo Cascos / Indumentaria / Accesorios
  (se sacó la pestaña Motos y el filtro Cilindrada; "Todos" excluye motos). Las motos tienen su
  **propia página `/motos`** y **botón propio en el nav** (separado de "Catálogo").
- **`pages/Motos.jsx` + `Motos.css` (NUEVOS)**: página premium y compleja. Secciones: **hero
  spotlight** que rota los flagships (con foto, tipo, cc/HP, precio, "Ver ficha" + thumbnails),
  **marquee de las 9 marcas** (pills que filtran), **explorador por tipo** (cards con imagen de
  fondo + count + blurb → `/motos/:tipo`), **browse** con tabs por tipo + buscador + orden + "solo
  con stock" + chips de marca + "Más filtros" (cilindrada/precio) → grilla de ProductCard con URL
  compartible, **franja "Por qué comprar acá"** y **CTA financiación**. Animaciones framer-motion
  (reveals, count-up, parallax, crossfade del spotlight, respeta prefers-reduced-motion).
- El campo fuerte de las motos es **`type`** (Naked 31, Calle 22, Sport 14, Multiprop. 14, Pollerita
  12, Scooter 10, Enduro 9, Custom 4 — todos poblados) y **`brand`** (9). La **cilindrada casi no
  está cargada** (solo ~13 motos) → es filtro secundario, solo aparece si hay datos.
- Ruta `/motos` y `/motos/:tipo` (slug del tipo). Reencaminados: Home (card Motos→/motos), Producto
  (breadcrumb + "Ver más" de motos→/motos), Financiación ("Ver motos"→/motos). Nav con "Motos".
- Helpers nuevos: `typeSlug()` en `lib/catalog.js`; `CATALOG_CATEGORIES`, `MOTO_TYPE_META`,
  `MOTO_TYPE_ORDER` en `data/site.js`. **Verificado** (build OK, sin errores de consola, filtrado
  por tipo/marca OK, catálogo sin motos=381 productos, móvil sin overflow). Datos reales: 116 motos.
- **Loader/preloader con logo** (`components/Loader.jsx` + `Loader.css`, NUEVOS): overlay a pantalla
  completa (z-index 9999, tapa el header, bloquea el scroll del body) con el logo + anillo girando +
  barra + "Cargando…", mientras cargan los productos. Enganchado en TODAS las páginas que cargan
  productos: Motos, Catálogo, Home, Producto, Outlet (`<Loader show={!products && !error}/>` FUERA del
  `PageTransition` porque este usa transform y rompería el `position:fixed`). En Motos además espera la
  1ª imagen del hero (tope 3.5s). Aparece a los 150ms (no parpadea en cargas rápidas) y se desvanece al
  terminar. **GOTCHAS aprendidos:** (1) NO usar `AnimatePresence` para el overlay — en StrictMode la
  animación de salida no lo desmontaba (quedaba pegado); se hace con estado `mounted`/`leaving` + timeout.
  (2) La ENTRADA no puede depender de una animación de opacidad: la pestaña del preview está oculta y el
  navegador PAUSA las animaciones CSS → una `@keyframes` `opacity:0→1` queda congelada en 0 y el overlay
  se ve transparente. Por eso el `.loader` tiene `opacity:1` de base (siempre visible) y la entrada es
  solo `transform`; el fade-out es una `transition`. Verificado el ciclo completo (aparece opaco, tapa
  todo, bloquea scroll, y desaparece al llegar los datos) en Motos y Catálogo.

**HECHO en la web (todo funcionando en local):**
- **Home** (`pages/Home.jsx`): hero full-bleed con `Wallpaper.mp4` (video en landscape) / `Wallpaper.jpg`
  (foto en portrait) + parallax + reveal enmascarado del título; **marquee** de marcas; **categorías**
  (Motos/Cascos/Indumentaria/Accesorios) con imagen de fondo por categoría; **destacados** (productos reales
  del API); banda de financiación; barra de progreso de scroll.
- **Header** (`components/Header.jsx`): logo `/LOGO.png` GRANDE que SOBRESALE del header (104px, posición
  absoluta, `--header-h`=76px). Nav con **Outlet** resaltado en rojo.
- **Catálogo** (`pages/Catalogo.jsx`): **filtros FACETADOS** (las opciones se achican según lo ya filtrado)
  en accordion desplegable — Tipo, Cilindrada (solo motos), Talle (solo ropa/cascos), Color (con swatch),
  Precio, Marca, Solo con stock. **Sincronizado con la URL** → links compartibles (ej.
  `/catalogo/motos?tipo=Naked&cc=155&color=Rojo`). Búsqueda + carga incremental. Tabs por categoría.
- **Product cards** (`components/ProductCard.jsx`): CTAs por disponibilidad (moto con stock → Comprar +
  Financiación; moto sin stock → "Sin stock" + Encargar/Reservar; resto → Consultar por WhatsApp). Badge de
  Outlet (−%) + precio anterior tachado. Foto y título enlazan a `/producto/:id`. En cascos suma el diseño
  al lado del título.
- **Página de producto** (`pages/Producto.jsx`, ruta `/producto/:id`): RICA y ADAPTATIVA (estilo sitios de
  vehículos premium). Breadcrumbs; hero con imagen + glow + parallax, **stats animados** (cc/HP/torque/
  cambios, count-up con fallback si la pestaña está oculta); **buy bar sticky**; **ficha técnica AGRUPADA**
  (Motor / Frenos / Chasis y rodado / Equipamiento — solo campos cargados); **equipamiento destacado**
  (features en true, con íconos); talles; atributos (cascos: color/acabado/diseño); **relacionados** de la
  misma categoría. Cada sección aparece solo si el producto tiene esos datos. La **cuota estimada fue QUITADA**
  (JM: aún no está bien diseñado ese cálculo). Trae el producto de `/api/products` (no del endpoint por id).
- **Financiación** (`pages/Financiacion.jsx`, datos en `data/financing.js`): **checklist de elegibilidad**
  (edad, sueldo, antigüedad EN MESES, clearing, cédula<6M, empresa afiliada a Anda, extranjero→"Residencia
  legal") que marca a cuáles de las **6 opciones** accede: BBVA, BBVA Tasa 0%, Santander/Creditel, Créditos
  Directos, Anda, Cash. Cada tarjeta: requisitos + estado (Cumplís/No cumplís + qué falla) + botón **"Cumplo
  con los requisitos"** → **modal de solicitud** (nombre/contacto/mensaje) → lead `tipo:"financiacion"` con
  entidad + respuestas del checklist. El botón "Financiación" de las cards de moto llega acá con `?moto=id`.
- **Zona Outlet** (`pages/Outlet.jsx`, ruta `/outlet`): grilla de productos con `outlet==true` (badge −%,
  precio tachado). Empty state si no hay.
- **Contacto** (`pages/Contacto.jsx`): formulario (nombre/contacto/mensaje + honeypot) → `POST /api/leads`
  → Firestore `leads`.
- **Backend** (`backend/app.py`): endpoint **`POST /api/leads`** (contacto y financiación → colección
  `leads`). **YA COMMITEADO Y DEPLOYADO en Render** (commit `35b3877`, probado en vivo HTTP 201).
- Tema: **OSCURO** (fondo `#0A0A0B`, texto claro, acento rojo; valores en `styles/tokens.css`, con el GRIS
  CLARO comentado por si se quiere probar de nuevo). Header transparente con texto blanco sobre el hero y
  sólido al scrollear. (JM probó gris claro y volvió al oscuro.)

**HECHO en la app Kotlin (AppByKotlin) — SIN COMMITEAR:**
- **migrateImageLinks()** (`ProductRepository.kt` + `ProductViewModel.kt`): rellena el `imageLink` VACÍO con
  la URL de R2 calculada por nombre (title+pattern+color+acabado). Corre al abrir la app (después de
  migrateAcabado). Idempotente. Objetivo: subís la foto a R2 con ese nombre y aparece sola.
- **Zona Outlet en la app**: nuevos campos `outlet` (bool) + `precioAnterior` en `Product.kt`; métodos
  `setOutlet/removeOutlet` (`ProductRepository.kt`); `addToOutlet/removeFromOutlet` (`ProductViewModel.kt`);
  botón **"Sumar a Zona Outlet" / "Quitar de Outlet"** en `ProductDetailScreen.kt` con **diálogo que pide el
  precio nuevo mostrando el actual tachado**. APK compilado (BUILD SUCCESSFUL) → `Escritorio\MotosPunta.apk`.

**ESTADO DE GIT (importante):**
- **App Kotlin**: los cambios de esta sesión (imageLink + outlet) quedaron **COMMITEADOS localmente y
  pusheados** (repo MotosPunta-StockApp) — ver último commit.
- **Web frontend**: el rebuild del 15/07 quedó **COMMITEADO LOCALMENTE pero NO pusheado** (para no deployar a
  producción/Vercel sin OK de JM). El backend (leads) sí está pusheado. `Wallpaper.mp4` (43MB) y las carpetas
  de tooling `.claude/ .agents/ .codex/` (Impeccable, reinstalable con `npx impeccable install`) están en
  `.gitignore` — el video vive local; para deploy hay que resolverlo aparte.
- **Sección Motos + Loader + ajustes + SEO + prerender (17/07)**: TODO está en el **working tree SIN
  COMMITEAR** (JM decide cuándo commitear/pushear). Modificados: App, index.html, package.json, vercel.json,
  Header.jsx/.css, data/financing.js, data/site.js, lib/catalog.js, Catalogo, Contacto, Financiacion.jsx/.css,
  Home, Outlet, Producto. Nuevos: `pages/Motos.jsx/.css`, `components/Loader.jsx/.css`, `lib/seo.js`,
  `scripts/prerender.mjs`, y en `public/`: `robots.txt`, `sitemap.xml`, `site.webmanifest`,
  `favicon-32/192/512.png`, `apple-touch-icon.png`, `og-cover.jpg`. (Ya se puede commitear sin problema.)
- **Ajustes finos (17/07):** (1) botón **Outlet** ahora es un **pill rojo con glow pulsante** en el nav de
  escritorio (`Header.css`, `.hdr__nav .hdr__link--hot`; el móvil sigue en rojo brillante). (2) **Cash**
  ahora pide **mayor de 21** (no 25) — `data/financing.js` (fact, requisito y `criteria.edadMin`).
  (3) La **foto del hero de Motos** es **25% más grande** (`.mhero__img { transform: scale(1.25) }`, origen
  center-bottom; verificado: no recorta arriba ni pisa el caption, sin overflow en desktop/móvil).
- **Nav reordenado (17/07):** orden **Motos · Catálogo · Financiación · Contacto · WhatsApp · Outlet**.
  **WhatsApp pasó a ser un link más del nav** (mismo estilo que los demás; se sacó el botón `btn-primary
  hdr__cta`), y **Outlet es el único distinto** (el pill). En `Header.jsx` el NAV soporta items externos
  (`{ href, external:true }`) → WhatsApp es un `<a target=_blank>`. Verificado: entra sin overflow hasta
  ~840px (abajo de 820 pasa a burger); menú móvil con el mismo orden y WhatsApp como link normal.
- **Checklist de financiación alineado (17/07):** los controles (Sí/No e inputs) se **empujan al fondo de la
  celda** (`.check__q > .check__num, .check__q > .yn { margin-top:auto }` + `align-items:stretch` en
  `.check__grid`), así quedan alineados en la fila aunque una pregunta ocupe 2 líneas (era el caso de
  "¿Tu N° de cédula…?"). Verificado: la fila de las 3 booleanas queda con spread 0.

- **Botón Outlet más grande/cuadrado (17/07):** `.hdr__nav .hdr__link--hot` pasó a `padding:12px 26px`,
  `border-radius: var(--radius-sm)` (4px), `font-size:1.02rem`, `font-weight:700` (antes era pill 999px chico).
- **SEO integral (17/07) — NUEVO:**
  - **`index.html`** reescrito: title, description, canonical, robots, Open Graph completo (site_name, url,
    locale es_UY, **image=og-cover.jpg 1200×630**, dimensiones, alt), Twitter card, theme-color, links de
    favicon (32/192/512 + apple-touch) + manifest, y **JSON-LD `AutoDealer`** (nombre, dirección Maldonado,
    tel +59899673830, sameAs IG).
  - **Hook `src/lib/seo.js` (`useSeo`)**: setea por página título/description/canonical/OG/Twitter y JSON-LD
    (upsert de tags, sin dependencias). Llamado en Home, Motos (dinámico por tipo), Catálogo (por tab),
    Producto (título del producto + **JSON-LD `Product`** con precio USD/stock/marca), Financiación, Outlet,
    Contacto. Esto lo ve Google (ejecuta JS); para los scrapers de redes (que leen el HTML estático) se agregó
    el **PRERENDER** (ver más abajo), así que las previews por-producto ya salen bien.
  - **Favicon con el logo real**: generados desde `public/LOGO.png` con el canvas del navegador (recorte del
    bbox + centrado sobre blanco) → `favicon-32/192/512.png`, `apple-touch-icon.png` (180). Verificados a ojo.
  - **`og-cover.jpg`** (1200×630): compuesta en canvas (Wallpaper + velo + glow + logo + "MOTOS 0KM EN
    MALDONADO"). Verificada a ojo.
  - **`public/robots.txt`** (+ Sitemap), **`public/sitemap.xml`** (páginas estáticas), **`public/site.webmanifest`**.
  - **FIX de lógica (importante):** el feed de Meta/WhatsApp linkea a `motospunta.uy/product/{itemGroupId}`
    pero la ruta era `/producto/{docId}` → esos links caían al Home. Se agregó ruta **alias `/product/:id`**
    y la ficha ahora **resuelve por id O itemGroupId/idd/slug** (`Producto.jsx`), con canonical al
    `/producto/{docId}`. Verificado: `/product/CFMotoNK675` abre la ficha real. (El feed en sí sigue igual;
    el alias lo cubre desde la web.)
  - **Assets generados** con un endpoint temporal `/_save` en el mock local (scratchpad) + canvas del
    navegador, porque no hay ImageMagick/sharp en la PC. Para regenerarlos: levantar el mock, cargar la web
    apuntando al mock y correr el snippet de canvas (ver historial).
- **PRERENDER de SEO (17/07) — HECHO:** en vez de migrar a SSR/Next (reescritura grande), se prerenderiza el
  `<head>` por ruta en el build. Los scrapers de redes NO ejecutan JS → sólo leen el `<head>`, así que con esto
  las previews de WhatsApp/Facebook/Twitter salen correctas por página **incluidos los ~500 productos**. Cómo:
  - `index.html` tiene markers `<!--seo:start-->/<!--seo:end-->` alrededor del bloque SEO variable (title,
    description, canonical, OG, twitter). El resto (favicons, manifest, JSON-LD `AutoDealer`, fonts) es fijo.
  - **`scripts/prerender.mjs`** (Node puro, sin Puppeteer): tras `vite build`, trae los productos del API
    (`VITE_API_BASE_URL` o el fallback Render; timeout 60s, si falla NO rompe el build) y escribe
    `dist/<ruta>/index.html` reemplazando el bloque entre markers por el `<head>` de cada ruta: páginas
    estáticas, `/motos/:tipo`, `/catalogo/:cat`, `/producto/{id}` (con **JSON-LD Product** precio USD/stock),
    y alias `/product/{itemGroupId}` (canonical → `/producto/{id}`). Última corrida: **698 rutas**.
  - `package.json`: `"build:seo": "vite build && node scripts/prerender.mjs"` y `"prerender"`. **`vercel.json`**:
    `buildCommand: "npm run build:seo"` + `outputDirectory: dist` (Vercel sirve el archivo estático prerenderizado
    y el rewrite a `/index.html` queda de fallback SPA). El `build` normal (`vite build`) NO prerenderiza (rápido
    para dev); el deploy usa `build:seo`.
  - El body sigue siendo la SPA (React renderiza en el cliente sobre el `<div id=root>` vacío — no hay SSR del
    cuerpo, así que no hay hydration mismatch). `useSeo` al montar **quita el JSON-LD estático** del prerender y
    pone el suyo (sin duplicar). Verificado: `/producto/{id}` y `/product/{itemGroupId}` sirven el head correcto
    por curl (sin JS) y la ficha hidrata con 1 solo JSON-LD Product.
  - Limitaciones/pendientes: el precio/stock del `<head>` prerenderizado es del último deploy (la página en vivo
    sí trae datos frescos por fetch) — para OG está OK. Falta opcional: **sitemap dinámico de productos** (hoy el
    sitemap tiene sólo las páginas fijas). Para regenerar/probar el prerender local: levantar el mock y
    `VITE_API_BASE_URL=http://localhost:8899 npm run build:seo`, servir `dist/` (script `serve-dist.mjs` del
    scratchpad imita el routing de Vercel).

**PRÓXIMOS PASOS / PENDIENTES:**
1. **Correr el APK nuevo** una vez para que `migrateImageLinks` + los campos de Outlet queden en Firestore.
2. **Borrar 3 leads de PRUEBA** en Firestore (colección `leads`): "PRUEBA - borrar", "Prueba Web - borrar",
   "Prueba Financiacion - borrar".
3. **Cálculo de cuotas**: JM va a pasar cómo quedan las cuotas aproximadas (tasas/coeficientes). Cuando llegue,
   se suma al simulador y al botón "Cumplo con los requisitos" (y se puede reponer en la página de producto).
4. **Deploy del frontend a producción** (Vercel / motospunta.uy) cuando JM decida → hacer `git push`. Al salir,
   **sumar `https://motospunta.uy` a `ALLOWED_ORIGINS`** (env en Render) para que los formularios anden desde
   ese dominio (hoy están habilitados vercel.app + localhost). Resolver el `Wallpaper.mp4` para el deploy.
5. (JM ya NO usa Codex — sin riesgo de pisarse; se puede commitear/pushear libremente.)
6. Pendientes viejos que siguen: etiquetado de posts en Uruguay (verificar), y la limpieza de datos de abajo
   (parte se hizo: JM borró los 4 AGV Compact; faltan las correcciones de color y las comillas sueltas).

## Limpieza de datos pendiente (detalle, para cuando se retome)
- **3 itemGroupId con comilla suelta** (`"AGVK1Top`, etc.): docs `AmarilloAGVK1TopSoleluna`,
  `AmarilloAGVK1TopTracker`, `RojoMTBreakerSVChento`. El feed YA las limpia (`_clean`) → cosmético.
- **5 "duplicados" que son colores MAL ETIQUETADOS** (el campo `color` no coincide con el color del id del
  doc): `CelesteMTStinger2Register` (color Azul→Celeste), `Negro2VitalTwist110FullTwist` (Celeste→Negro?),
  `Negro mateLS2FF816Solid` (Negro→Negro mate), `Negro-brilloMTThunder4Solid` (Negro→Negro brillo?),
  `Rosa-BrilloMTStinger2Cheste` (Rosa→Rosa Brillo?). Arreglo = corregir el campo `color` (confirmar el string exacto con el usuario).
- **1 duplicado REAL:** AGV Compact ST x4 (ids random `CpQTJWRK58YSPj2bEs0V`/`IitIsDZ3DREcKMEGpxaI`/
  `eKk6qqsg5OL4kmHwDHO9`/`z8RBo3hRiqi7b4dF1qT7`; `model`=título por error; 3 con precio 100, 1 con 550;
  sin foto). Borrar 3, dejar 1 (¿cuál precio?).
- **OJO:** no hay service account local para escribir en Firestore. Opciones: consola de Firestore (a mano)
  o migración en la app (rebuild). Varios arreglos necesitan criterio del usuario.

## Objetivo del usuario (Juan, Motos Punta, Maldonado, Uruguay)
Catálogo de productos integrado entre la app (Kotlin/Firestore), la web y Meta.
Sus 3 metas, en orden de interés:
1. **Catálogo de WhatsApp con talles** (la principal).
2. Etiquetar productos en los posts.
3. Finalizar compras por Meta o por la web.

## Elegibilidad / realidad (verificado 25/06/2026)
- Catálogo de Meta + catálogo de WhatsApp: ✅ disponibles en Uruguay, GRATIS.
- Checkout dentro de Meta (pagar en IG/FB): ❌ Meta lo está eliminando en todo el mundo.
- Etiquetar posts: ⚠️ Meta restringió la "tienda"/etiquetado fuera de EE.UU. desde 2023;
  en Uruguay puede no estar disponible/estable → verificar en su Commerce Manager.
- Conclusión: el valor real es CATÁLOGO → WhatsApp + anuncios; el checkout va en la web.

## Arquitectura
- **App Kotlin** (repo AppByKotlin, Escritorio): escribe el stock en Firestore colección `products`.
- **Frontend web**: Vite + React en Vercel. Dominio OFICIAL: **motospunta.uy**
  (en los datos los `link` viejos apuntan a `motospunta-web.vercel.app` — PENDIENTE actualizar).
- **Backend web**: Flask (Python) en **Render**: `https://motospuntaweb.onrender.com`
  Lee Firestore con service account (env `GOOGLE_CREDENTIALS`). Ya tiene WhatsApp Cloud API
  (`whatsapp_bot.py`: `WHATSAPP_TOKEN` + `PHONE_NUMBER_ID`, envío de mensajes por Graph API).
- **Imágenes**: freeimage.host / iili.io (URLs públicas directas, ej. `iili.io/29iPbJs.png`).
- **Repo web**: `github.com/JuanManuelLopez10/MotosPuntaWeb` (gh autenticado como JuanManuelLopez10 → se puede pushear). Clonado en: `C:\Users\26lop\dev\MotosPuntaWeb`

## HECHO ✅ — Fase 1 COMPLETA
- Catálogo creado en Commerce Manager: **"MotosPuntaCatalog"** (gratis).
- Feed: `backend/meta_feed.py` + ruta `/meta-feed.csv` en `backend/app.py`.
  Pusheado a `main` (commit `2fce805`) → Render deployó solo.
- **URL del feed**: `https://motospuntaweb.onrender.com/meta-feed.csv`
- Origen de datos **"Feed Motos Punta"** conectado en Commerce Manager, programado **cada hora**, divisa **USD**.
- **Primera carga: 593 productos, 0 errores, 0 problemas.** Catálogo poblado y sincronizando solo.

## HECHO ✅ — Fase 1.5: Catálogo en WhatsApp (CONECTADO 26/06/2026)
- `MotosPuntaCatalog` quedó **conectado al WhatsApp Business app 099673830** (WABA tipo SMB,
  ID **239988395868377**) y el **ícono de catálogo en el encabezado de chat está ACTIVADO**
  (más botón "Añadir al carrito" activado).
- **Aprendizajes clave (para no repetir el calvario):**
  - Hay **UNA sola cuenta de Facebook = Gallego Faotto (gemotoss@hotmail.com)** = admin del
    portfolio `motospunta`. `motospunta@gmail.com` es solo un email de contacto de esa MISMA
    cuenta; en Business aparece con el nombre "Gerardo Lopez Faotto". La invitación pendiente
    "gemotoss — Invitado" era un duplicado **no aceptable** (da "ya formás parte del porfolio").
  - El número 099673830 figura en el portfolio como cuenta **"Aplicación de WhatsApp Business" (SMB)**,
    Conectado. **NO se gestiona por Graph API**: `POST /{waba}/product_catalogs` devuelve
    `(#10) This operation can not be performed on SMB business type`.
  - La conexión se hace por **WhatsApp Manager** (Commerce Manager → *Todas las herramientas* →
    WhatsApp Manager → cuenta 099673830 → *Herramientas de la cuenta → Catálogo → Elegir un catálogo*).
    En la **app**, "Conectar un catálogo de Meta Business Suite" NO lista los catálogos del portfolio
    para cuentas SMB (daba "no se encontraron catálogos").
  - **Bug del catálogo fantasma:** un catálogo creado-y-**borrado** tiempo atrás dejó el cupo
    "máx 1" trabado (WhatsApp Manager mostraba vacío pero al conectar daba *"WABA debe tener un
    catálogo de productos como máximo"*). **FIX que funcionó:** crear un catálogo **temporal desde la
    app** (Añadir un artículo nuevo) → repara la conexión → **DESVINCULARLO** (no borrar) desde
    WhatsApp Manager → cupo libre → conectar `MotosPuntaCatalog`.
  - **Regla de oro:** un catálogo se **DESVINCULA**, NUNCA se borra (borrar uno conectado = fantasma).
  - Queda un **catálogo de prueba** (el temporal de la app) que conviene **borrar** ahora que está
    desvinculado (borrar uno desvinculado es seguro).

## Lógica del feed (`backend/meta_feed.py`) — decisiones tomadas
- Stock (ACTUALIZADO 26/06, commit bea23a2): productos CON talles → cada flag de talle en true = ese
  talle tiene stock = una variante "in stock"; productos SIN talles → stock por el campo `availability`.
- Variantes (ACTUALIZADO 26/06): `item_group_id` = **id del documento** (único por color+diseño), así
  cada color/diseño es su propio producto en Meta y los talles son sus variantes. ANTES el
  item_group_id era el título → fusionaba TODOS los colores de un modelo en un solo producto (bug que
  mostraba "Agotado" y ocultaba opciones, ej. Axxis Draken). El `id` del item sigue = id del doc + "-" + talle.
  VERIFICADO 26/06: Draken OK en WhatsApp; análisis del feed completo = **0 grupos con colores fusionados**.
  El bug afectaba a **80 modelos** (MT Stinger 2 con 13 colores->55 productos, MT Thunder 4, MT Atom SV, etc.),
  todos separados ahora por la misma corrida del fix.
- Link: armado con `https://motospunta.uy/product/{itemGroupId}` (NO se usa el `link` guardado).
- Precio: se normaliza ("320 USD" o "320" => "320 USD").
- Se EXCLUYEN productos sin imagen y sin precio. Se limpian comillas sueltas y se deduplican ids.
- Talles conocidos: ropa xs/s/m/l/xl/xxl/3xl ; calzado 35..48 (en la data actual no hay calzado aún).

## Modelo de datos Firestore (colección `products`)
title, model, pattern, color, price, brand, type, productType, description, imageLink (iili.io),
availability ("in stock"/"No"), link (viejo), itemGroupId, idd/slug (id del doc), flags de talle por
campo (xs, s, m, l, xl, xxl, 3Xl con casing inconsistente, + `{talle}Deposit`). La app Kotlin
(`AddScreen.kt`) crea los productos; "la foto no se agrega desde la app". 538 productos (70 sin imagen).
**Propiedades de MOTO (29/06, app):** las motos (productType "motos", 129) NO llevan talles. Campos nuevos
en Firestore: cilindrada, cilindros, caballaje, refrigeracion, frenos, marcaFrenos, torque, garantia,
tablero, capacidadTanque, cantidadCambios, rodadoDelantero, rodadoTrasero, iluminacion (strings) +
quickshifter, controlTraccion, horquillaInvertida, monoshockTrasero, controlCrucero, embragueAntirrebote
(bool). **Regla web (pendiente): si el campo está vacío / en false, NO mostrar esa propiedad en la página.**
La app los agrega a todas las motos al iniciar (migrateMotos, idempotente).

## PENDIENTE — próximos pasos
1. ✅ **HECHO (26/06/2026) — Conectar el catálogo a WhatsApp.** Ver sección «Fase 1.5» arriba.
   `MotosPuntaCatalog` quedó conectado al WhatsApp Business app **099673830** (WABA SMB ID
   239988395868377) vía **WhatsApp Manager**, e ícono de catálogo en el encabezado de chat **ACTIVADO**.
   El número de prueba 98 800 775 quedó desvinculado del catálogo.
2. Verificar en Commerce Manager si el etiquetado de posts está habilitado para Uruguay.
3. Checkout (Fase 2): sumar carrito + pasarela de pago (Mercado Pago/dLocal) a la web (Vite/React + Flask).
4. Limpiezas de data (opcional): 70 productos sin imagen; actualizar todos los `link` a motospunta.uy;
   limpiar comillas sueltas en itemGroupId e idds duplicados.
5. **Imágenes por nombre en R2** (EN CURSO, 29/06): se reusa Cloudflare R2 (bucket motospunta-media,
   dominio `pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev`) con prefijo `catalog/`. Nombre de cada foto =
   slug = normalize(title+model+color) = minúsculas, sin tildes, sin espacios (ej. "MT Stinger 2 Meld
   Rojo" → `mtstinger2meldrojo.png`). Las fotos son **PNG** (con transparencia); las viejas de iili.io
   (también .png) se dejan como están (458 productos).
   - HECHO (1) App Kotlin: `Product.kt` (CATALOG_IMG_BASE + catalogSlug/catalogImageUrl/
     catalogImageFileName) y `AddScreen.kt` (al crear NUEVO setea imageLink de R2 y muestra el nombre de
     foto en el snack; al editar respeta la imagen existente).
   - HECHO (2) Sync `sync_catalog_images.py` + `subir_fotos_catalogo.bat` en `Instagram\_automation`:
     carpeta `Escritorio\Catalogo_fotos` → redimensiona a <=1600px MANTENIENDO PNG (con transparencia)/
     sube a R2 `catalog/{slug}.png` → borra local.
     Slug Python == Kotlin (verificado). Reusa s3_client y _shrink_image de publisher.py.
   - HECHO (3): `backend/meta_feed.py` verifica por HEAD a la URL pública de R2 que la foto exista
     antes de incluir el producto (omite los 404, en paralelo); NO hizo falta poner credenciales en
     Render. Probado y pusheado (Render deploya solo). Las de freeimage no se tocan.
   - HECHO: app buildeada (APK) y circuito de imágenes probado en vivo (OK). Los 70 productos SIN foto:
     el feed ahora **auto-computa** su URL de R2 (`_effective_image` usa title+pattern+color si el
     imageLink está vacío) y la verifica por HEAD → aparecen solos al subir cada foto, sin tocar
     Firestore. La lista de los 70 con el nombre de archivo está en `Escritorio\fotos_faltantes.csv`.

## Notas técnicas
- Render free tier "se duerme" (~46s cold start). Meta tolera el cold start en el fetch programado;
  si falla seguido: mantenerlo despierto (cron ping) o plan pago.
- El feed lee SIEMPRE fresco de Firestore (no cachea) para que el stock esté al día.
- Snapshot de datos reales para pruebas offline: se bajó de `/api/products` (538 productos).
