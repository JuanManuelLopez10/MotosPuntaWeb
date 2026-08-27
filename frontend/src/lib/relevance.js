import { buildApiUrl } from "../api";

// Relevancia (popularidad con decaimiento). El backend guarda y decae; acá solo pedimos el
// ranking para ordenar el catálogo y registramos visitas a las fichas.

// Clave de una entrada Modelo+Diseño (igual que _rel_key del backend).
export function relKey(slug, design) {
  const s = String(slug || "").trim();
  if (!s) return "";
  const d = String(design || "").trim().toLowerCase();
  return d && d !== "colores" ? `${s}|${d}` : s;
}

// --- Ranking para ordenar el catálogo: {clave: valor}. Cacheado en memoria por sesión. ---
let _cache = null;
let _promise = null;
let _ts = 0;
const TTL = 60 * 1000;

export async function fetchRelevance() {
  const now = Date.now();
  if (_cache && now - _ts < TTL) return _cache;
  if (_promise) return _promise;
  _promise = fetch(buildApiUrl("/api/relevance"))
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      _cache = data && typeof data === "object" ? data : {};
      _ts = Date.now();
      _promise = null;
      return _cache;
    })
    .catch(() => { _promise = null; return {}; });
  return _promise;
}

// --- Registrar una visita a la ficha. Fire-and-forget, deduplicado por sesión. ---
export function trackVisit(slug, design) {
  const key = relKey(slug, design);
  if (!key) return;
  try {
    const flag = `mp_visited:${key}`;
    if (sessionStorage.getItem(flag)) return; // 1 vez por pestaña/sesión
    sessionStorage.setItem(flag, "1");
  } catch { /* sessionStorage no disponible: seguimos igual */ }
  try {
    fetch(buildApiUrl("/api/track/visit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: String(slug || ""), design: String(design || "") }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* noop */ }
}
