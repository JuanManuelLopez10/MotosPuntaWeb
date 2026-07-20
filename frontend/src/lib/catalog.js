import { buildApiUrl } from "../api";

// Trae todos los productos desde el backend Flask (lee Firestore).
export async function fetchProducts() {
  const res = await fetch(buildApiUrl("/api/products"));
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Trae un producto por su id (doc id) desde el backend.
export async function fetchProduct(id) {
  const res = await fetch(buildApiUrl(`/api/product/${encodeURIComponent(id)}`));
  if (!res.ok) throw new Error(`API ${res.status}`);
  return await res.json();
}

// Base pública de las fotos del catálogo en R2 (para los que no tienen imageLink).
const R2_CATALOG = "https://pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev/catalog/";
export const PRODUCT_PLACEHOLDER = "/product-placeholder.svg";

// Mismo slug que el feed (meta_feed._catalog_slug): title+pattern+color+acabado,
// minúsculas, sin acentos, sin espacios.
function slug(p) {
  const s = `${p.title || ""} ${p.pattern || ""} ${p.color || ""} ${p.acabado || ""}`;
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// URL de imagen: la guardada, o la calculada en R2, o placeholder (el onError del <img>
// cae al placeholder si la calculada no existe).
export function productImage(p) {
  const img = (p.imageLink || "").trim();
  if (img) return img;
  const s = slug(p);
  return s ? `${R2_CATALOG}${s}.png` : PRODUCT_PLACEHOLDER;
}

// Precio: viene como número ("93", "5990") en USD. Vacío/0 -> null.
export function formatPrice(raw) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits || Number(digits) === 0) return null;
  return `USD ${Number(digits).toLocaleString("es-UY")}`;
}

// Valor numérico del precio (para filtrar y ordenar). Vacío/0 -> null.
export function priceValue(raw) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  return digits && Number(digits) !== 0 ? Number(digits) : null;
}

export function isMoto(p) {
  return String(p.productType || "").trim().toLowerCase() === "motos";
}

// --- Zona Outlet ---
export function isOutlet(p) {
  const v = p.outlet;
  return v === true || v === "true" || v === 1;
}

// Precio anterior (para tachar), solo si es mayor al actual.
export function formatPreviousPrice(p) {
  const prev = priceValue(p.precioAnterior);
  const now = priceValue(p.price);
  if (prev == null || (now != null && prev <= now)) return null;
  return `USD ${prev.toLocaleString("es-UY")}`;
}

// Porcentaje de descuento (entero) o null.
export function discountPct(p) {
  const prev = priceValue(p.precioAnterior);
  const now = priceValue(p.price);
  if (prev == null || now == null || prev <= now) return null;
  return Math.round((1 - now / prev) * 100);
}

// Cilindrada normalizada a dígitos ("125cc" -> "125"). Vacío -> "".
export function cc(p) {
  return String(p.cilindrada || "").replace(/[^\d]/g, "");
}

// Slug url-safe de un tipo de moto ("Multiprop." -> "multiprop", "Naked" -> "naked").
// Sirve para la ruta /motos/:tipo y para resolver el param de vuelta al tipo real.
export function typeSlug(t) {
  return String(t || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// --- Talles ---
const CLOTHING = [["xs", "XS"], ["s", "S"], ["m", "M"], ["l", "L"], ["xl", "XL"], ["xxl", "XXL"], ["3xl", "3XL"]];
const FOOTWEAR = Array.from({ length: 14 }, (_, i) => [String(35 + i), String(35 + i)]); // 35..48
const SIZES = [...CLOTHING, ...FOOTWEAR];
export const SIZE_ORDER = SIZES.map(([, label]) => label);

function sizeTruthy(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t !== "" && t !== "false" && t !== "no" && t !== "0";
  }
  return false;
}

// Talles disponibles (flag en true) de un producto, con el casing inconsistente de Firestore.
export function availableSizes(p) {
  const lower = {};
  for (const k in p) lower[k.toLowerCase()] = p[k];
  return SIZES.filter(([key]) => key in lower && sizeTruthy(lower[key])).map(([, label]) => label);
}

// Nombre completo para el mensaje de WhatsApp y el alt.
export function productFullName(p) {
  return [p.title, p.color, p.acabado].filter(Boolean).join(" ");
}

// Subtítulo compacto de la card (evita repetir el título).
export function productSubtitle(p) {
  const pt = (p.productType || "").toLowerCase();
  if (pt === "motos") {
    return [p.brand, p.cilindrada ? `${String(p.cilindrada).replace(/[^\d]/g, "")}cc` : ""]
      .filter(Boolean).join(" · ");
  }
  const finish = [p.color, p.acabado].filter(Boolean).join(" ");
  return finish || p.pattern || p.brand || "";
}

export function inStock(p) {
  return String(p.availability || "").trim().toLowerCase() === "in stock";
}
