import { useEffect } from "react";

// Dominio oficial. Se usa para canonical, og:url y las URLs absolutas de JSON-LD.
export const SITE_URL = "https://motospunta.uy";
export const SITE_NAME = "Motos Punta";
const DEFAULT_IMAGE = `${SITE_URL}/og-cover.jpg`;
const DEFAULT_TITLE = `${SITE_NAME} — Concesionaria de motos en Maldonado`;

// Upsert de un <meta> por atributo (name/property). Marca los creados con data-seo.
function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Hook de SEO por página: título, descripción, canonical, Open Graph, Twitter y (opcional)
// JSON-LD. OJO: es una SPA — esto lo ve Google (ejecuta JS), pero los scrapers de redes
// (WhatsApp/Facebook/Twitter) leen el HTML estático de index.html, así que las previews
// por-producto sólo serían perfectas con SSR/prerender (ver ESTADO_META.md).
export function useSeo({ title, description, path, image, type = "website", jsonLd, noindex = false } = {}) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    document.title = fullTitle;
    const url = `${SITE_URL}${path || window.location.pathname}`;
    const img = image || DEFAULT_IMAGE;

    if (description) upsertMeta("name", "description", description);
    upsertLink("canonical", url);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    upsertMeta("property", "og:title", fullTitle);
    if (description) upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "es_UY");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    if (description) upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", img);

    let script;
    if (jsonLdKey) {
      // Quita el JSON-LD que dejó el prerender (o una página anterior) para no duplicarlo.
      document.head.querySelectorAll("script[data-seo-jsonld]").forEach((s) => s.remove());
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "");
      script.textContent = jsonLdKey;
      document.head.appendChild(script);
    }
    return () => { if (script) script.remove(); };
  }, [title, description, path, image, type, noindex, jsonLdKey]);
}
