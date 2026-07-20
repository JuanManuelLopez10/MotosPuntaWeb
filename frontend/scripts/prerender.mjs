// Prerender de SEO: tras `vite build`, reemplaza el bloque <head> entre los markers
// <!--seo:start-->/<!--seo:end--> de dist/index.html por el <head> específico de cada ruta,
// generando dist/<ruta>/index.html. Así los scrapers de redes (WhatsApp/Facebook/Twitter),
// que NO ejecutan JS, ven el título/descripción/imagen correctos por página, incluidos los
// productos. El cuerpo sigue siendo la SPA (el contenido lo renderiza React en el cliente).
//
// La meta debe coincidir con src/lib/seo.js y las páginas. Trae los productos del mismo API
// que la web (VITE_API_BASE_URL o el fallback). Si el API falla, prerenderiza sólo las
// páginas estáticas y NO rompe el build.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

const SITE_URL = "https://motospunta.uy";
const SITE_NAME = "Motos Punta";
const DEFAULT_TITLE = `${SITE_NAME} — Concesionaria de motos en Maldonado`;
const DEFAULT_IMAGE = `${SITE_URL}/og-cover.jpg`;
const API_BASE = (process.env.VITE_API_BASE_URL || "https://motospuntaweb.onrender.com").replace(/\/+$/, "");
const CATALOG_DESC =
  "Cascos, indumentaria y accesorios para tu moto en Motos Punta, Maldonado. AGV, LS2, MT y más marcas. Consultá stock y precios por WhatsApp.";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeSeg = (s) => /^[A-Za-z0-9._-]+$/.test(s); // seguro como segmento de URL/archivo

// ---- helpers (equivalentes a los de src/lib/catalog.js y Producto.jsx) ----
const priceValue = (raw) => {
  const d = String(raw || "").replace(/[^\d]/g, "");
  return d && Number(d) !== 0 ? Number(d) : null;
};
const formatPrice = (raw) => {
  const v = priceValue(raw);
  return v == null ? null : `USD ${v.toLocaleString("es-UY")}`;
};
const isMoto = (p) => String(p.productType || "").trim().toLowerCase() === "motos";
const inStock = (p) => String(p.availability || "").trim().toLowerCase() === "in stock";
const productFullName = (p) => [p.title, p.color, p.acabado].filter(Boolean).join(" ");
const R2 = "https://pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev/catalog/";
const imgSlug = (p) =>
  `${p.title || ""} ${p.pattern || ""} ${p.color || ""} ${p.acabado || ""}`
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
const productImage = (p) => {
  const img = (p.imageLink || "").trim();
  if (img) return img.startsWith("http") ? img : `${SITE_URL}${img}`;
  const s = imgSlug(p);
  return s ? `${R2}${s}.png` : DEFAULT_IMAGE;
};
const typeSlug = (t) =>
  String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function seoDescription(p) {
  const own = (p.description || "").trim();
  if (own && own !== (p.title || "").trim()) return own.slice(0, 300);
  const price = formatPrice(p.price);
  const brand = p.brand && !(p.title || "").includes(p.brand) ? ` ${p.brand}` : "";
  const base = `${p.title}${brand} en Motos Punta, Maldonado.`;
  const extra = isMoto(p) ? " Moto 0km con financiación disponible." : " Consultá stock y precio por WhatsApp.";
  return `${base}${price ? ` Precio: ${price}.` : ""}${extra}`;
}
function productJsonLd(p) {
  const price = priceValue(p.price);
  const j = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productFullName(p) || p.title,
    image: [productImage(p)],
    description: seoDescription(p),
    sku: p.id,
    category: (p.productType || "").toLowerCase() || undefined,
  };
  if (p.brand) j.brand = { "@type": "Brand", name: p.brand };
  if (price) {
    j.offers = {
      "@type": "Offer",
      url: `${SITE_URL}/producto/${p.id}`,
      priceCurrency: "USD",
      price,
      availability: inStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    };
  }
  return j;
}

const MOTO_TYPE_META = {
  naked: ["Naked", "Deportivas urbanas, sin carenado"],
  sport: ["Sport", "Performance y aerodinámica pura"],
  calle: ["Calle", "Prácticas para el día a día"],
  scooter: ["Scooter", "Automáticas, cómodas y ágiles"],
  enduro: ["Enduro", "Listas para asfalto y tierra"],
  custom: ["Custom", "Estilo cruiser, para la ruta"],
  pollerita: ["Pollerita", "Paso bajo, fáciles de manejar"],
  multiprop: ["Multipropósito", "Versátiles para todo terreno"],
};

const MARKETING = [
  { path: "/", title: null, description: "Concesionaria de motos en Maldonado, Uruguay. Motos 0 km, cascos, indumentaria y accesorios. Financiación clara y atención directa por WhatsApp." },
  { path: "/motos", title: "Motos 0km en Maldonado", description: "Motos 0km en Maldonado: naked, sport, scooters, enduro, calle y más. Todas las cilindradas, con financiación clara y atención por WhatsApp." },
  { path: "/catalogo", title: "Catálogo de cascos, indumentaria y accesorios", description: CATALOG_DESC },
  { path: "/catalogo/cascos", title: "Cascos para moto", description: CATALOG_DESC },
  { path: "/catalogo/indumentaria", title: "Indumentaria para moto", description: CATALOG_DESC },
  { path: "/catalogo/accesorios", title: "Accesorios para moto", description: CATALOG_DESC },
  { path: "/financiacion", title: "Financiación de motos", description: "Financiá tu moto 0km en Maldonado. Trabajamos con BBVA, Santander, Creditel, Créditos Directos, Anda y más. Completá el checklist y mirá a qué opciones accedés." },
  { path: "/outlet", title: "Zona Outlet — ofertas", description: "Zona Outlet de Motos Punta: motos, cascos, indumentaria y accesorios con precios rebajados por tiempo limitado. Aprovechá antes de que se agoten." },
  { path: "/contacto", title: "Contacto", description: "Contactá a Motos Punta en Maldonado. WhatsApp 099 673 830, Arturo Santana esq. 19 de Abril. Escribinos y te respondemos a la brevedad." },
];

// Construye el bloque <head> (lo que va entre los markers) para una ruta.
function seoBlock({ title, description, path, image, type = "website", jsonLd }) {
  const full = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = `${SITE_URL}${path}`;
  const img = image || DEFAULT_IMAGE;
  const d = description || "";
  const lines = [
    `<title>${esc(full)}</title>`,
    `<meta name="description" content="${esc(d)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(full)}" />`,
    `<meta property="og:description" content="${esc(d)}" />`,
    `<meta property="og:type" content="${esc(type)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:locale" content="es_UY" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(full)}" />`,
    `<meta name="twitter:description" content="${esc(d)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
  ];
  if (jsonLd) lines.push(`<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(jsonLd)}</script>`);
  return lines.join("\n    ");
}

const SEO_RE = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;

async function main() {
  const template = await readFile(join(DIST, "index.html"), "utf8");
  if (!SEO_RE.test(template)) {
    console.warn("prerender: no encontré los markers <!--seo:start-->; se omite el prerender.");
    return;
  }

  const write = async (path, meta) => {
    const rel = path === "/" ? "index.html" : `${path.replace(/^\/|\/$/g, "")}/index.html`;
    const out = join(DIST, rel);
    await mkdir(dirname(out), { recursive: true });
    const html = template.replace(SEO_RE, `<!--seo:start-->\n    ${seoBlock(meta)}\n    <!--seo:end-->`);
    await writeFile(out, html, "utf8");
  };

  let count = 0;
  for (const m of MARKETING) { await write(m.path, m); count++; }

  // Productos (para previews por-producto + rich results). Si el API falla, seguimos sin ellos.
  let products = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(`${API_BASE}/api/products`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) products = await res.json();
  } catch (e) {
    console.warn(`prerender: sin productos (${e.message}); sólo páginas estáticas.`);
  }

  if (Array.isArray(products) && products.length) {
    // Rutas por tipo de moto (/motos/:tipo), según los tipos presentes en los datos.
    const motoTypes = new Set(products.filter(isMoto).map((p) => typeSlug(p.type)).filter(Boolean));
    for (const slug of motoTypes) {
      const [label, blurb] = MOTO_TYPE_META[slug] || [slug, ""];
      await write(`/motos/${slug}`, {
        path: `/motos/${slug}`,
        title: `Motos ${label}`,
        description: `Motos ${label} 0km en Motos Punta, Maldonado. ${blurb}`,
      });
      count++;
    }

    const seenGroup = new Set();
    for (const p of products) {
      if (!priceValue(p.price)) continue; // sin precio no lo indexamos
      if (!p.id || !safeSeg(String(p.id))) continue;
      const meta = {
        path: `/producto/${p.id}`,
        title: productFullName(p) || p.title,
        description: seoDescription(p),
        image: productImage(p),
        type: "product",
        jsonLd: productJsonLd(p),
      };
      await write(`/producto/${p.id}`, meta); count++;
      // alias /product/{itemGroupId} (link del feed de Meta), canonical → /producto/{id}
      const g = String(p.itemGroupId || "").trim();
      if (g && safeSeg(g) && !seenGroup.has(g)) { seenGroup.add(g); await write(`/product/${g}`, meta); count++; }
    }
  }

  console.log(`prerender: ${count} rutas generadas (${products.length} productos).`);
}

main().catch((e) => { console.error("prerender error (no bloquea el build):", e); });
