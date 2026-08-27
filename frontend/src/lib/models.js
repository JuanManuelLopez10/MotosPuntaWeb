import { buildApiUrl } from "../api";
import { formatPrice, priceValue, PRODUCT_PLACEHOLDER } from "./catalog";

// --- Fase 2: la web lee la colección anidada `productos` (un doc por MODELO, con variantes). ---

// Caché en memoria del listado (por sesión de pestaña). Evita re-descargar el catálogo en
// cada navegación y permite resolver la ficha SIN pegarle a la red si ya lo tenemos.
let _modelsCache = null;   // { data, ts }
let _modelsPromise = null; // dedup de llamadas concurrentes
const MODELS_TTL = 5 * 60 * 1000; // 5 min (alineado con el cache del backend)

// Trae todos los modelos (cada uno con su lista `variants`).
export async function fetchModels() {
  const now = Date.now();
  if (_modelsCache && now - _modelsCache.ts < MODELS_TTL) return _modelsCache.data;
  if (_modelsPromise) return _modelsPromise;
  _modelsPromise = fetch(buildApiUrl("/api/productos"))
    .then((res) => { if (!res.ok) throw new Error(`API ${res.status}`); return res.json(); })
    .then((data) => {
      const arr = Array.isArray(data) ? data : [];
      _modelsCache = { data: arr, ts: Date.now() };
      _modelsPromise = null;
      return arr;
    })
    .catch((e) => { _modelsPromise = null; throw e; });
  return _modelsPromise;
}

// Trae un modelo por su slug. Si el listado ya está en memoria, lo resuelve desde ahí
// (sin red); si no, pega al endpoint de un solo modelo.
export async function fetchModel(slug) {
  if (_modelsCache) {
    const hit = _modelsCache.data.find((m) => m.slug === slug);
    if (hit) return hit;
  }
  const res = await fetch(buildApiUrl(`/api/producto/${encodeURIComponent(slug)}`));
  if (!res.ok) throw new Error(`API ${res.status}`);
  return await res.json();
}

export const variants = (m) => (m && Array.isArray(m.variants) ? m.variants : []);

export function isMotoModel(m) {
  return String(m?.productType || "").trim().toLowerCase() === "motos";
}

export function variantInStock(v) {
  return String(v?.availability || "").trim().toLowerCase() === "in stock";
}

// El modelo "tiene stock" si alguna variante lo tiene.
export function modelInStock(m) {
  return variants(m).some(variantInStock);
}

// Imagen representativa: la primera variante en stock con foto, o la primera con foto, o placeholder.
export function modelImage(m) {
  const vs = variants(m);
  const withImg = vs.filter((v) => (v.image || "").trim());
  const pick = withImg.find(variantInStock) || withImg[0];
  return pick ? pick.image.trim() : PRODUCT_PLACEHOLDER;
}

// Precio del modelo: el más barato entre sus variantes. Devuelve texto ya formateado o null.
export function modelPrice(m) {
  const nums = variants(m).map((v) => priceValue(v.price)).filter((n) => n != null);
  if (!nums.length) return null;
  return formatPrice(String(Math.min(...nums)));
}

// ¿Hay variantes con distinto precio? (para mostrar "desde")
export function modelPriceFrom(m) {
  const nums = variants(m).map((v) => priceValue(v.price)).filter((n) => n != null);
  return nums.length > 1 && Math.min(...nums) !== Math.max(...nums);
}

// Muestra de color por nombre (fallback, porque la migración dejó el hex vacío).
const COLOR_HEX = {
  negro: "#141417", blanco: "#F5F5F5", gris: "#8A8A90", plata: "#C7C9CC", rojo: "#E11322",
  azul: "#1E5AE0", celeste: "#4FB0E5", verde: "#2FA84A", amarillo: "#F2C200", naranja: "#F07A1E",
  rosa: "#E86A9A", rosado: "#E86A9A", violeta: "#7A3FC4", dorado: "#C9A24B", arena: "#D9C7A6",
  marron: "#6B4B2A", "marrón": "#6B4B2A", bordo: "#6E1420", beige: "#D9C7A6", turquesa: "#2CC4B7",
};
export const colorHex = (name) => COLOR_HEX[String(name || "").trim().toLowerCase()] || "#5B5B63";

// Colores distintos del modelo (para swatches / subtítulo). Usa el hex de la variante si lo
// tiene, o el del nombre como fallback.
export function modelColors(m) {
  const seen = new Set();
  const out = [];
  for (const v of variants(m)) {
    const name = (v.colorName || "").trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      const hex = (v.color || "").trim();
      out.push({ name, hex: hex.startsWith("#") ? hex : colorHex(name) });
    }
  }
  return out;
}

// Diseños distintos (solo cascos; el resto no tiene).
export function modelDesigns(m) {
  const seen = new Set();
  for (const v of variants(m)) {
    if (v.design && !seen.has(v.design)) seen.add(v.design);
  }
  return [...seen];
}

// Diseños que tienen al menos una variante en stock.
export function modelDesignsInStock(m) {
  const seen = new Set();
  for (const v of variants(m)) {
    if (v.design && variantInStock(v)) seen.add(v.design);
  }
  return [...seen];
}

// Etiqueta legible de un diseño ("bunch" -> "Bunch", "sr-2" -> "Sr 2").
export function designLabel(d) {
  return String(d || "").replace(/-/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

// Variantes de un diseño concreto del modelo.
export function designVariants(m, design) {
  return variants(m).filter((v) => v.design === design);
}

// Colores del modelo (o del diseño, si `m.variants` ya viene acotado) con imagen y stock.
// Un color puede repetirse entre variantes; se prefiere la imagen de la variante en stock.
export function colorSwatches(m) {
  const seen = new Map();
  for (const v of variants(m)) {
    const name = (v.colorName || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const inS = variantInStock(v);
    const hex = (v.color || "").startsWith("#") ? v.color : colorHex(v.colorName);
    if (!seen.has(key)) {
      seen.set(key, { name, acabado: v.acabado || "", hex, image: (v.image || "").trim(), soldOut: !inS });
    } else if (inS && seen.get(key).soldOut) {
      const e = seen.get(key);
      e.image = (v.image || "").trim() || e.image;
      e.soldOut = false;
      e.acabado = v.acabado || e.acabado;
    }
  }
  return [...seen.values()];
}

// Entradas de CATÁLOGO: un casco se separa por DISEÑO (Modelo+Diseño, ej. "MT Stinger 2
// Bunch"); el resto (indumentaria/accesorios) queda como un solo modelo. Solo se incluyen
// diseños/modelos con al menos una variante EN STOCK (los agotados no aparecen).
// Cada entrada es un modelo "acotado": conserva todo pero con `variants` filtradas al diseño,
// así los helpers modelImage/modelPrice/modelColors/… siguen funcionando tal cual.
export function catalogEntries(models) {
  const out = [];
  for (const m of models || []) {
    const casco = String(m.productType || "").toLowerCase() === "cascos";
    const designs = casco ? modelDesignsInStock(m) : [];
    if (designs.length) {
      for (const d of designs) {
        out.push({
          ...m,
          variants: designVariants(m, d),
          design: d,
          designLabel: designLabel(d),
          entryKey: `${m.slug}|${d}`,
          displayName: `${m.title} ${designLabel(d)}`.trim(),
        });
      }
    } else if (modelInStock(m)) {
      out.push({ ...m, design: null, designLabel: "", entryKey: m.slug, displayName: m.title });
    }
  }
  return out;
}

export function modelOutlet(m) {
  return variants(m).some((v) => v.outlet === true || v.outlet === "true" || v.outlet === 1);
}

// Cilindrada del modelo (solo dígitos), leída de la ficha. Vacío -> "".
export function modelCc(m) {
  return String(m?.specs?.cilindrada || "").replace(/[^\d]/g, "");
}
// Valor de un campo de ficha del modelo.
export const modelSpec = (m, key) => String(m?.specs?.[key] ?? "").trim();

// Precio numérico más bajo del modelo (para filtrar/ordenar). Vacío -> null.
export function modelPriceValue(m) {
  const nums = variants(m).map((v) => priceValue(v.price)).filter((n) => n != null);
  return nums.length ? Math.min(...nums) : null;
}

// Talles ofrecidos por el modelo (etiquetas: XS, M, 40…), unión de todas las variantes.
const SIZE_LABEL = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL", "3xl": "3XL" };
function sizeTruthy(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") { const t = v.trim().toLowerCase(); return t !== "" && t !== "false" && t !== "no" && t !== "0"; }
  return false;
}
export function modelSizes(m) {
  const set = new Set();
  for (const v of variants(m)) {
    const sz = v.sizes || {};
    for (const k in sz) {
      if (!sizeTruthy(sz[k])) continue;
      const key = String(k).toLowerCase();
      set.add(SIZE_LABEL[key] || (/^\d+$/.test(key) ? key : key.toUpperCase()));
    }
  }
  return [...set];
}

// Subtítulo compacto de la card del modelo.
export function modelSubtitle(m) {
  if (isMotoModel(m)) {
    const cc = String(m.specs?.cilindrada || "").replace(/[^\d]/g, "");
    return [m.brand, cc ? `${cc}cc` : ""].filter(Boolean).join(" · ");
  }
  const colors = modelColors(m).length;
  const designs = modelDesigns(m).length;
  const parts = [m.brand];
  if (designs > 1) parts.push(`${designs} diseños`);
  else if (colors > 1) parts.push(`${colors} colores`);
  return parts.filter(Boolean).join(" · ");
}
