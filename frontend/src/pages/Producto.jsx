import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft, ChevronRight, MessageCircle, ShoppingCart, Percent, CalendarClock,
  Check, Gauge, Zap, ShieldCheck, ArrowDownUp, Waves, Navigation, Cog, Fuel, Wrench, Sun,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import Loader from "../components/Loader";
import ProductCard from "../components/ProductCard";
import { waLink, waProductMessage, waBuyMessage, waReserveMessage } from "../data/site";
import {
  fetchProducts, productImage, formatPrice, priceValue, productFullName, inStock, isMoto,
  isOutlet, formatPreviousPrice, discountPct, availableSizes, PRODUCT_PLACEHOLDER,
} from "../lib/catalog";
import { useSeo, SITE_URL } from "../lib/seo";
import "./Producto.css";

const EASE = [0.22, 1, 0.36, 1];

// Descripción para SEO: la del producto si sirve, o una generada con marca/precio/categoría.
function seoDescription(p) {
  const own = (p.description || "").trim();
  if (own && own !== (p.title || "").trim()) return own.slice(0, 300);
  const price = formatPrice(p.price);
  const brand = p.brand && !(p.title || "").includes(p.brand) ? ` ${p.brand}` : "";
  const base = `${p.title}${brand} en Motos Punta, Maldonado.`;
  const extra = isMoto(p) ? " Moto 0km con financiación disponible." : " Consultá stock y precio por WhatsApp.";
  return `${base}${price ? ` Precio: ${price}.` : ""}${extra}`;
}

// URL absoluta de la imagen (para og:image / JSON-LD).
function absImage(p) {
  const img = productImage(p);
  return img.startsWith("http") ? img : `${SITE_URL}${img}`;
}

// JSON-LD Product (schema.org). Incluye `offers` sólo si hay precio.
function productJsonLd(p) {
  const price = priceValue(p.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productFullName(p) || p.title,
    image: [absImage(p)],
    description: seoDescription(p),
    sku: p.id,
    category: (p.productType || "").toLowerCase() || undefined,
  };
  if (p.brand) jsonLd.brand = { "@type": "Brand", name: p.brand };
  if (price) {
    jsonLd.offers = {
      "@type": "Offer",
      url: `${SITE_URL}/producto/${p.id}`,
      priceCurrency: "USD",
      price,
      availability: inStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: isMoto(p) ? "https://schema.org/NewCondition" : "https://schema.org/NewCondition",
    };
  }
  return jsonLd;
}

// Stats destacados del hero (los 4 números que más venden una moto).
const HERO_STATS = [
  { key: "cilindrada", label: "Cilindrada", unit: "cc" },
  { key: "caballaje", label: "Potencia", unit: "HP" },
  { key: "torque", label: "Torque", unit: "Nm" },
  { key: "cantidadCambios", label: "Cambios" },
];

// Ficha técnica agrupada por bloques (como los sitios de fábrica).
const SPEC_GROUPS = [
  { title: "Motor", icon: Cog, keys: [
    ["cilindrada", "Cilindrada", "cc"], ["cilindros", "Cilindros"], ["caballaje", "Potencia", "HP"],
    ["torque", "Torque", "Nm"], ["refrigeracion", "Refrigeración"], ["cantidadCambios", "Cambios"],
  ] },
  { title: "Frenos", icon: ShieldCheck, keys: [["frenos", "Frenos"], ["marcaFrenos", "Marca de frenos"]] },
  { title: "Chasis y rodado", icon: Wrench, keys: [["rodadoDelantero", "Rodado delantero"], ["rodadoTrasero", "Rodado trasero"]] },
  { title: "Equipamiento", icon: Gauge, keys: [["tablero", "Tablero"], ["iluminacion", "Iluminación"], ["capacidadTanque", "Capacidad del tanque", "L"], ["garantia", "Garantía"]] },
];

const MOTO_FEATURES = [
  { key: "quickshifter", label: "Quickshifter", icon: Zap },
  { key: "controlTraccion", label: "Control de tracción", icon: ShieldCheck },
  { key: "horquillaInvertida", label: "Horquilla invertida", icon: ArrowDownUp },
  { key: "monoshockTrasero", label: "Monoshock trasero", icon: Waves },
  { key: "controlCrucero", label: "Control crucero", icon: Navigation },
  { key: "embragueAntirrebote", label: "Embrague antirrebote", icon: Cog },
];

// --- Cascos ---
const CASCO_SPECS = [
  ["material", "Material"],
  ["cierre", "Cierre"],
  ["colorVisor", "Color del visor"],
  ["peso", "Peso", "g"],
];
const CASCO_HOMOLOGATIONS = [
  { key: "ece2206", label: "Homologación ECE 22.06", icon: ShieldCheck },
  { key: "ece2205", label: "Homologación ECE 22.05", icon: ShieldCheck },
  { key: "dot", label: "Homologación DOT", icon: ShieldCheck },
  { key: "visorSolarInterno", label: "Visor solar interno", icon: Sun },
];

const truthyBool = (v) => v === true || v === "true" || v === 1 || v === "1";
const specText = (val, unit) => {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return unit && /^\d+([.,]\d+)?$/.test(s) ? `${s} ${unit}` : s;
};

// Número que cuenta hacia arriba al montar (los stats viven en el hero, siempre visible).
// Soporta decimales (ej. "14,8" HP): la coma se toma como separador decimal.
function CountUp({ value, unit }) {
  const raw = String(value ?? "").replace(",", ".");
  const target = parseFloat(raw.replace(/[^\d.]/g, "")) || 0;
  const frac = raw.includes(".") ? raw.split(".")[1].replace(/\D/g, "") : "";
  const decimals = Math.min(frac.length, 2);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) { setN(target); return; } // sin rAF: número final
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1000);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target]);
  const shown = n.toLocaleString("es-UY", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <>{shown}{unit ? <span className="pd__statUnit"> {unit}</span> : null}</>;
}

export default function Producto() {
  const { id } = useParams();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const ctaRef = useRef(null);
  const [barVisible, setBarVisible] = useState(false);

  // Parallax con el scroll de la ventana (sin target ref, que rompe cuando el hero se
  // monta después del estado de carga).
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 500], [0, 80]);
  const glowY = useTransform(scrollY, [0, 500], [0, 50]);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchProducts().then((p) => alive && setProducts(p)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  // Busca por id de documento y, si no, por itemGroupId/idd/slug (así resuelven los
  // links del feed de Meta/WhatsApp, que usan /product/{itemGroupId}).
  const product = useMemo(() => {
    const list = products || [];
    return (
      list.find((p) => p.id === id) ||
      list.find((p) => p.itemGroupId === id || p.idd === id || p.slug === id) ||
      null
    );
  }, [products, id]);
  const related = useMemo(() => {
    if (!products || !product) return [];
    return products
      .filter((p) => p.id !== product.id && (p.productType || "").toLowerCase() === (product.productType || "").toLowerCase() && formatPrice(p.price))
      .slice(0, 4);
  }, [products, product]);

  useSeo(
    product
      ? {
          path: `/producto/${product.id}`,
          title: productFullName(product) || product.title,
          description: seoDescription(product),
          image: absImage(product),
          type: "product",
          jsonLd: productJsonLd(product),
        }
      : { title: "Producto", description: "Ficha de producto de Motos Punta, Maldonado." },
  );

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // Barra de compra fija: aparece cuando el CTA del hero ya pasó hacia arriba.
  useEffect(() => {
    const onScroll = () => {
      const el = ctaRef.current;
      setBarVisible(el ? el.getBoundingClientRect().bottom < 80 : false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [product]);

  if (error) return <PageTransition><section className="pd"><div className="container"><p className="cat__msg">No pudimos cargar el producto. <Link to="/catalogo">Volver al catálogo</Link>.</p></div></section></PageTransition>;
  if (!products) return <><Loader show /><PageTransition><section className="pd"><div className="container"><div className="pd__hero pd__hero--skel"><div className="pd__media pskeleton" /><div className="pskeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} /></div></div></section></PageTransition></>;
  if (!product) return <PageTransition><section className="pd"><div className="container"><p className="cat__msg">Producto no encontrado. <Link to="/catalogo">Volver al catálogo</Link>.</p></div></section></PageTransition>;

  const moto = isMoto(product);
  const casco = String(product.productType || "").toLowerCase() === "cascos";
  const soldOut = !inStock(product);
  const name = productFullName(product);
  const price = formatPrice(product.price);
  const outlet = isOutlet(product);
  const prevPrice = formatPreviousPrice(product);
  const disc = discountPct(product);
  const sizes = moto ? [] : availableSizes(product);
  const categoria = (product.productType || "").toLowerCase();

  const heroStats = moto ? HERO_STATS.map((s) => ({ ...s, raw: String(product[s.key] ?? "").trim() })).filter((s) => s.raw) : [];
  const groups = moto
    ? SPEC_GROUPS.map((g) => ({ ...g, rows: g.keys.map(([k, label, unit]) => ({ label, value: specText(product[k], unit) })).filter((r) => r.value) })).filter((g) => g.rows.length)
    : [];
  const features = moto ? MOTO_FEATURES.filter((f) => truthyBool(product[f.key])) : [];
  const attrTiles = !moto
    ? [["Marca", product.brand], ["Color", product.color], ["Acabado", product.acabado], casco && ["Diseño", product.pattern]].filter((a) => a && a[1])
    : [];
  const cascoSpecs = casco
    ? CASCO_SPECS.map(([k, label, unit]) => ({ label, value: specText(product[k], unit) })).filter((r) => r.value)
    : [];
  const cascoFeatures = casco ? CASCO_HOMOLOGATIONS.filter((f) => truthyBool(product[f.key])) : [];
  const sharpStars = casco ? Math.min(5, Math.round(Number(String(product.estrellasSharp || "").replace(/[^\d]/g, "")) || 0)) : 0;

  const ActionsBlock = (
    moto && soldOut ? (
      <a className="btn btn-primary" href={waLink(waReserveMessage(name))} target="_blank" rel="noreferrer"><CalendarClock size={18} /> Encargar / Reservar</a>
    ) : moto ? (
      <>
        <a className="btn btn-primary" href={waLink(waBuyMessage(name, price))} target="_blank" rel="noreferrer"><ShoppingCart size={18} /> Comprar</a>
        <Link className="btn btn-secondary" to={`/financiacion?moto=${encodeURIComponent(product.id)}`}><Percent size={18} /> Financiación</Link>
      </>
    ) : (
      <a className="btn btn-primary" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar por WhatsApp</a>
    )
  );

  return (
    <PageTransition>
      <section className="pd">
        <div className="container">
          {/* Breadcrumbs (las motos cuelgan de /motos; el resto, del catálogo) */}
          <nav className="pd__crumbs" aria-label="Ruta">
            <Link to="/">Inicio</Link><ChevronRight size={14} />
            {moto ? (
              <Link to="/motos" className="pd__crumbCat">Motos</Link>
            ) : (
              <>
                <Link to="/catalogo">Catálogo</Link><ChevronRight size={14} />
                <Link to={`/catalogo/${categoria}`} className="pd__crumbCat">{categoria || "productos"}</Link>
              </>
            )}
            <ChevronRight size={14} />
            <span aria-current="page">{product.title}</span>
          </nav>
        </div>

        {/* HERO */}
        <div className="pd__hero">
          <div className="container pd__heroGrid">
            <div className="pd__heroInfo">
              {product.brand && <motion.p className="pd__brand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>{product.brand}</motion.p>}
              <motion.h1 className="pd__title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: EASE }}>
                {product.title}{casco && product.pattern && <span className="pd__pattern"> {product.pattern}</span>}
              </motion.h1>
              {(moto ? product.type : attrTiles.map((a) => a[1]).join(" · ")) && (
                <motion.p className="pd__sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                  {moto ? product.type : attrTiles.map((a) => a[1]).join(" · ")}
                </motion.p>
              )}

              <motion.div className="pd__priceRow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}>
                {outlet && prevPrice ? (
                  <><span className="pd__price pd__price--outlet tabular">{price}</span><span className="pd__priceOld tabular">{prevPrice}</span>{disc && <span className="pd__disc">-{disc}%</span>}</>
                ) : (
                  <span className="pd__price tabular">{price || "Consultar precio"}</span>
                )}
                <span className={`pd__stock ${soldOut ? "is-out" : "is-in"}`}>{soldOut ? "Sin stock" : "En stock"}</span>
              </motion.div>

              <div className="pd__actions" ref={ctaRef}>{ActionsBlock}</div>

              {heroStats.length > 0 && (
                <div className="pd__heroStats">
                  {heroStats.map((s) => (
                    <div key={s.key} className="pd__stat">
                      <span className="pd__statVal"><CountUp value={s.raw} unit={s.unit} /></span>
                      <span className="pd__statLabel">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pd__heroStage">
              <motion.div className="pd__heroGlow" style={{ y: glowY }} aria-hidden="true" />
              <motion.img
                className="pd__heroImg"
                src={productImage(product)}
                alt={name}
                style={{ y: imgY }}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
                onError={(e) => { if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
              />
              {soldOut && <span className="pcard__badge pd__stageBadge">Sin stock</span>}
              {outlet && <span className="pcard__outlet pd__stageBadge pd__stageBadge--r">{disc ? `-${disc}%` : "Outlet"}</span>}
            </div>
          </div>
        </div>

        <div className="container">
          {/* Atributos (cascos / ropa) */}
          {attrTiles.length > 0 && (
            <Reveal className="pd__attrTiles">
              {attrTiles.map(([k, v]) => (
                <div key={k} className="pd__attrTile"><span className="pd__attrK">{k}</span><span className="pd__attrV">{v}</span></div>
              ))}
            </Reveal>
          )}

          {/* Features destacadas (motos) */}
          {features.length > 0 && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle">Equipamiento destacado</h2></Reveal>
              <div className="pd__featGrid">
                {features.map((f, i) => (
                  <Reveal key={f.key} delay={i * 0.05} className="pd__feat">
                    <f.icon size={22} />
                    <span>{f.label}</span>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* Ficha técnica agrupada (motos) */}
          {groups.length > 0 && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle"><Gauge size={22} /> Ficha técnica</h2></Reveal>
              <div className="pd__specGroups">
                {groups.map((g) => (
                  <Reveal key={g.title} className="pd__specGroup">
                    <h3 className="pd__specGroupTitle"><g.icon size={16} /> {g.title}</h3>
                    <dl className="pd__specs">
                      {g.rows.map((r) => (<div key={r.label} className="pd__spec"><dt>{r.label}</dt><dd>{r.value}</dd></div>))}
                    </dl>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* Especificaciones (cascos) */}
          {casco && (cascoSpecs.length > 0 || sharpStars > 0) && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle"><Gauge size={22} /> Especificaciones</h2></Reveal>
              <div className="pd__specGroups">
                <Reveal className="pd__specGroup">
                  <dl className="pd__specs">
                    {cascoSpecs.map((r) => (<div key={r.label} className="pd__spec"><dt>{r.label}</dt><dd>{r.value}</dd></div>))}
                    {sharpStars > 0 && (
                      <div className="pd__spec">
                        <dt>Estrellas SHARP</dt>
                        <dd>
                          <span className="pd__sharp" aria-label={`${sharpStars} de 5 estrellas SHARP`}>{"★".repeat(sharpStars)}{"☆".repeat(5 - sharpStars)}</span>
                          <span className="pd__sharpN"> {sharpStars}/5</span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </Reveal>
              </div>
            </div>
          )}

          {/* Homologaciones y equipamiento (cascos) */}
          {casco && cascoFeatures.length > 0 && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle"><ShieldCheck size={22} /> Homologaciones y equipamiento</h2></Reveal>
              <div className="pd__featGrid">
                {cascoFeatures.map((f, i) => (
                  <Reveal key={f.key} delay={i * 0.05} className="pd__feat">
                    <f.icon size={22} />
                    <span>{f.label}</span>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* Talles (ropa / cascos) */}
          {sizes.length > 0 && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle">Talles disponibles</h2></Reveal>
              <Reveal className="pd__sizes">{sizes.map((s) => <span key={s} className="pd__size">{s}</span>)}</Reveal>
            </div>
          )}

          {/* Descripción */}
          {product.description && product.description.trim() && product.description.trim() !== product.title.trim() && (
            <div className="pd__section">
              <Reveal><h2 className="pd__secTitle">Descripción</h2></Reveal>
              <Reveal><p className="pd__desc">{product.description}</p></Reveal>
            </div>
          )}

          {/* Financiación (motos) */}
          {moto && (
            <Reveal className="pd__finBand">
              <div>
                <p className="eyebrow">Financiación</p>
                <h2 className="pd__finTitle">Llevala financiada</h2>
                <p className="pd__finSub">Conocé las opciones, requisitos y condiciones de cada banco y financiera.</p>
              </div>
              <Link to={`/financiacion?moto=${encodeURIComponent(product.id)}`} className="btn btn-primary">Ver financiación <ChevronRight size={18} /></Link>
            </Reveal>
          )}

          {/* Relacionados */}
          {related.length > 0 && (
            <div className="pd__section">
              <div className="sec-head"><Reveal><h2 className="sec-head__title">También te puede interesar</h2></Reveal><Link to={moto ? "/motos" : `/catalogo/${categoria}`} className="sec-head__link">Ver más <ChevronRight size={16} /></Link></div>
              <div className="pd__related">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </div>
          )}
        </div>
      </section>

      {/* Sticky buy bar (aparece al scrollear más allá del CTA del hero) */}
      <motion.div
        className="pd__buybar"
        initial={false}
        animate={{ y: barVisible ? 0 : 120, opacity: barVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        aria-hidden={!barVisible}
      >
        <div className="container pd__buybarRow">
          <div className="pd__buybarInfo">
            <span className="pd__buybarName">{product.title}</span>
            <span className="pd__buybarPrice tabular">{price || "Consultar"}{outlet && prevPrice && <span className="pd__buybarOld tabular"> {prevPrice}</span>}</span>
          </div>
          <div className="pd__buybarActions">{ActionsBlock}</div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

// Pequeño wrapper de reveal al entrar en viewport.
function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}
