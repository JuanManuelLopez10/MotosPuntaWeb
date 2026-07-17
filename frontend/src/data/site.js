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

// Media de fondo del hero (primera impresión). Para usar un video, cambiá type a
// "video" y src a "/Wallpaper.mp4" (dejá el archivo en frontend/public/).
export const HERO_MEDIA = { type: "image", src: "/Wallpaper.jpg" };

// Categorías del catálogo (mapean al campo productType de Firestore).
export const CATEGORIES = [
  { key: "motos", label: "Motos" },
  { key: "cascos", label: "Cascos" },
  { key: "indumentaria", label: "Indumentaria" },
  { key: "accesorios", label: "Accesorios" },
];
