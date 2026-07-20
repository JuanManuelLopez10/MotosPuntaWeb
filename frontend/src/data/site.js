// Datos reales de Motos Punta (para header, footer, WhatsApp, contacto).
export const SITE = {
  name: "Motos Punta",
  whatsapp: "59899673830", // formato internacional para wa.me
  phoneDisplay: "099 673 830",
  instagram: "motospunta",
  instagramUrl: "https://instagram.com/motospunta",
  address: "Arturo Santana esq. 19 de Abril, Maldonado",
  mapsQuery: "Arturo Santana esq. 19 de Abril, Maldonado, Uruguay",
};

// Arma un link de WhatsApp con mensaje precargado (opcionalmente con el producto).
export function waLink(text) {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function waProductMessage(productName) {
  return `Hola Motos Punta 👋 Me interesa: ${productName}. ¿Me pasás más info?`;
}

export function waBuyMessage(productName, price) {
  return `Hola Motos Punta 👋 Quiero comprar: ${productName}${price ? ` (${price})` : ""}. ¿Cómo seguimos?`;
}

export function waReserveMessage(productName) {
  return `Hola Motos Punta 👋 Quiero encargar/reservar: ${productName}. ¿Cómo es la disponibilidad y la seña?`;
}

// Media de fondo del hero (primera impresión). `src` es la imagen base (siempre visible);
// `video` es el mp4 que se superpone en escritorio (alojado en R2 para no inflar el repo).
// Si el video falla o no está, queda la imagen (fallback en Home.jsx).
export const HERO_MEDIA = {
  type: "image",
  src: "/Wallpaper.jpg",
  video: "https://pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev/media/Wallpaper.mp4",
};

// Categorías (mapean al campo productType de Firestore). Se usa para la grilla de la
// Home (las 4). Las motos tienen su propia página (/motos), así que el CATÁLOGO solo
// muestra las 3 categorías de indumentaria/accesorios.
export const CATEGORIES = [
  { key: "motos", label: "Motos" },
  { key: "cascos", label: "Cascos" },
  { key: "indumentaria", label: "Indumentaria" },
  { key: "accesorios", label: "Accesorios" },
];
export const CATALOG_CATEGORIES = [
  { key: "cascos", label: "Cascos" },
  { key: "indumentaria", label: "Indumentaria" },
  { key: "accesorios", label: "Accesorios" },
];

// Tipos de moto (campo `type` de Firestore). El slug es la clave de la URL (/motos/:tipo)
// y para armar el explorador por tipo. La etiqueta y el copy son de presentación; el
// filtrado real se hace comparando slugs contra los tipos que existen en los datos.
export const MOTO_TYPE_META = {
  naked:     { label: "Naked",         blurb: "Deportivas urbanas, sin carenado" },
  sport:     { label: "Sport",         blurb: "Performance y aerodinámica pura" },
  calle:     { label: "Calle",         blurb: "Prácticas para el día a día" },
  scooter:   { label: "Scooter",       blurb: "Automáticas, cómodas y ágiles" },
  enduro:    { label: "Enduro",        blurb: "Listas para asfalto y tierra" },
  custom:    { label: "Custom",        blurb: "Estilo cruiser, para la ruta" },
  pollerita: { label: "Pollerita",     blurb: "Paso bajo, fáciles de manejar" },
  multiprop: { label: "Multipropósito", blurb: "Versátiles para todo terreno" },
};
// Orden de presentación preferido (se intersecta con los tipos presentes en los datos).
export const MOTO_TYPE_ORDER = [
  "naked", "sport", "calle", "scooter", "enduro", "custom", "pollerita", "multiprop",
];
