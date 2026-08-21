import { buildApiUrl } from "../api";
import { formatPrice, priceValue, PRODUCT_PLACEHOLDER } from "./catalog";

// --- Fase 2: la web lee la colección anidada `productos` (un doc por MODELO, con variantes). ---

// Trae todos los modelos (cada uno con su lista `variants`).
export async function fetchModels() {
  const res = await fetch(buildApiUrl("/api/productos"));
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Trae un modelo por su slug.
export async function fetchModel(slug) {
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
