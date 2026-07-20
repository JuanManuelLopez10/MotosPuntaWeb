import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, ChevronRight, Search, MessageCircle, Gauge, Zap, ShieldCheck,
  Wallet, Wrench, BadgeCheck, SlidersHorizontal, X,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import Loader from "../components/Loader";
import ProductCard from "../components/ProductCard";
import Marquee from "../components/Marquee";
import { waLink, MOTO_TYPE_META, MOTO_TYPE_ORDER } from "../data/site";
import {
  fetchProducts, isMoto, inStock, formatPrice, priceValue, productImage,
  productFullName, cc, typeSlug, PRODUCT_PLACEHOLDER,
} from "../lib/catalog";
import { useSeo } from "../lib/seo";
import "./Motos.css";

const EASE = [0.22, 1, 0.36, 1];
const PAGE = 24;
const SORTS = [
  { key: "relevance", label: "Relevancia" },
  { key: "price-asc", label: "Precio: menor a mayor" },
  { key: "price-desc", label: "Precio: mayor a menor" },
  { key: "name", label: "Nombre (A–Z)" },
];

const VALUE_PROPS = [
  { icon: BadgeCheck, title: "0 km oficial", text: "Unidades nuevas, con patente y trámites al día." },
  { icon: ShieldCheck, title: "Garantía", text: "Respaldo oficial de cada marca que representamos." },
  { icon: Wallet, title: "Financiación", text: "Cuotas con bancos y financieras, a tu medida." },
  { icon: Wrench, title: "Service y repuestos", text: "Postventa y repuestos originales en Maldonado." },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// Número que cuenta hacia arriba al montar (con fallback si la pestaña está oculta).
function CountUp({ value }) {
  const target = Number(value) || 0;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) { setN(target); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target]);
  return <>{n.toLocaleString("es-UY")}</>;
}

// Spec chip del spotlight (cc / HP), solo si el dato existe.
function heroSpecs(p) {
  const out = [];
  const cilind = cc(p);
  if (cilind) out.push(`${cilind} cc`);
  const hp = String(p.caballaje || "").replace(/[^\d]/g, "");
  if (hp) out.push(`${hp} HP`);
  return out;
}

// ---------- HERO SPOTLIGHT (flagships rotando) ----------
function MotoHero({ motos, stats, onExplore }) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const infoY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const infoOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const has = motos.length > 0;
  useEffect(() => { setIdx(0); }, [motos.length]);
  useEffect(() => {
    if (reduced || motos.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % motos.length), 5200);
    return () => clearInterval(id);
  }, [reduced, motos.length]);

  const current = has ? motos[idx] : null;
  const specs = current ? heroSpecs(current) : [];
  const price = current ? formatPrice(current.price) : null;

  return (
    <section className="mhero" ref={heroRef}>
      <div className="mhero__bg" aria-hidden="true">
        <span className="mhero__grid" />
        <span className="mhero__glow" />
      </div>

      <div className="container mhero__inner">
        <motion.div className="mhero__lead" style={{ y: infoY, opacity: infoOpacity }}>
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            Motos Punta · Maldonado
          </motion.p>
          <h1 className="mhero__title">
            <LineReveal delay={0.15}>Motos</LineReveal>
            <LineReveal delay={0.25}><span className="txt-accent">0 km</span></LineReveal>
          </h1>
          <motion.p className="mhero__sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6, ease: EASE }}>
            Naked, sport, scooters, enduro y más. Todas las cilindradas, con financiación
            clara y atención directa por WhatsApp.
          </motion.p>

          <motion.div className="mhero__stats" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6, ease: EASE }}>
            {stats.map((s) => (
              <div key={s.label} className="mhero__stat">
                <span className="mhero__statVal tabular"><CountUp value={s.value} /></span>
                <span className="mhero__statLabel">{s.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div className="mhero__ctas" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6, ease: EASE }}>
            <button className="btn btn-primary" onClick={onExplore}>Explorar modelos <ArrowRight size={18} /></button>
            <a className="btn btn-secondary" href={waLink("Hola Motos Punta 👋 Quiero consultar por una moto.")} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Consultar
            </a>
          </motion.div>
        </motion.div>

        <motion.div className="mhero__stage" style={{ y: imgY }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="mhero__disc" aria-hidden="true" />
          {current ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                className="mhero__slide"
                initial={{ opacity: 0, scale: 0.9, x: 40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.03, x: -40 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <img
                  className="mhero__img"
                  src={productImage(current)}
                  alt={productFullName(current)}
                  onError={(e) => { if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
                />
                <div className="mhero__caption">
                  <div className="mhero__capText">
                    {current.brand && <span className="mhero__capBrand">{current.brand}</span>}
                    <Link to={`/producto/${encodeURIComponent(current.id)}`} className="mhero__capName">{current.title}</Link>
                    <div className="mhero__capMeta">
                      {current.type && <span className="mhero__capType">{current.type}</span>}
                      {specs.map((s) => <span key={s} className="mhero__capSpec">{s}</span>)}
                    </div>
                  </div>
                  <div className="mhero__capBuy">
                    <span className="mhero__capPrice tabular">{price || "Consultar"}</span>
                    <Link to={`/producto/${encodeURIComponent(current.id)}`} className="mhero__capLink">Ver ficha <ChevronRight size={15} /></Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="mhero__slide mhero__slide--skel"><div className="pskeleton" style={{ width: "100%", height: "100%" }} /></div>
          )}
        </motion.div>

        {motos.length > 1 && (
          <div className="mhero__dots" role="tablist" aria-label="Motos destacadas">
            {motos.map((m, i) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={i === idx}
                aria-label={m.title}
                className={`mhero__dot ${i === idx ? "is-on" : ""}`}
                onClick={() => setIdx(i)}
              >
                <img src={productImage(m)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = 0; }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LineReveal({ children, delay = 0 }) {
  return (
    <span className="line-mask">
      <motion.span className="line-mask__inner" initial={{ y: "115%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: EASE, delay }}>
        {children}
      </motion.span>
    </span>
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

// ---------- PÁGINA ----------
export default function Motos() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(PAGE);
  const [moreFilters, setMoreFilters] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const gridRef = useRef(null);

  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [brands, setBrands] = useState(() => searchParams.getAll("marca"));
  const [ccs, setCcs] = useState(() => searchParams.getAll("cc"));
  const [priceMin, setPriceMin] = useState(() => searchParams.get("min") || "");
  const [priceMax, setPriceMax] = useState(() => searchParams.get("max") || "");
  const [stockOnly, setStockOnly] = useState(() => searchParams.get("stock") === "1");
  const [sort, setSort] = useState(() => searchParams.get("orden") || "relevance");

  useEffect(() => {
    let alive = true;
    fetchProducts().then((p) => alive && setProducts(p)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const motos = useMemo(() => (products || []).filter(isMoto), [products]);

  // Tipos presentes en los datos, ordenados por el orden preferido.
  const typeList = useMemo(() => {
    const map = new Map();
    motos.forEach((p) => {
      const raw = (p.type || "").trim();
      const s = typeSlug(raw);
      if (!s) return;
      const cur = map.get(s) || { slug: s, type: raw, count: 0 };
      cur.count += 1;
      map.set(s, cur);
    });
    return [...map.values()]
      .sort((a, b) => {
        const ia = MOTO_TYPE_ORDER.indexOf(a.slug), ib = MOTO_TYPE_ORDER.indexOf(b.slug);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((t) => ({ ...t, label: MOTO_TYPE_META[t.slug]?.label || t.type, blurb: MOTO_TYPE_META[t.slug]?.blurb || "" }));
  }, [motos]);

  const activeType = useMemo(
    () => (tipo ? typeList.find((t) => t.slug === typeSlug(tipo)) || null : null),
    [tipo, typeList],
  );

  useSeo({
    path: activeType ? `/motos/${activeType.slug}` : "/motos",
    title: activeType ? `Motos ${activeType.label}` : "Motos 0km en Maldonado",
    description: activeType
      ? `Motos ${activeType.label} 0km en Motos Punta, Maldonado. ${MOTO_TYPE_META[activeType.slug]?.blurb || "Financiación y patente al día."}`
      : "Motos 0km en Maldonado: naked, sport, scooters, enduro, calle y más. Todas las cilindradas, con financiación clara y atención por WhatsApp.",
  });

  // Imagen representativa por tipo (prefiere en stock y rojo, como la Home).
  const typeImages = useMemo(() => {
    const out = {};
    typeList.forEach((t) => {
      const pool = motos.filter((p) => typeSlug(p.type) === t.slug && (p.imageLink || "").trim());
      const pick =
        pool.find((p) => inStock(p) && /rojo|red/i.test(p.color || "")) ||
        pool.find(inStock) ||
        pool.find((p) => /rojo|red/i.test(p.color || "")) ||
        pool[0];
      out[t.slug] = pick ? productImage(pick) : null;
    });
    return out;
  }, [typeList, motos]);

  // Spotlight: flagships con foto (con ficha técnica primero), por precio desc.
  const spotlight = useMemo(() => {
    const withImg = motos.filter((p) => (p.imageLink || "").trim());
    const flagship = withImg.filter((p) => inStock(p) && String(p.caballaje || "").trim());
    const base = flagship.length >= 3 ? flagship : withImg.filter(inStock);
    const list = (base.length ? base : withImg).sort((a, b) => (priceValue(b.price) || 0) - (priceValue(a.price) || 0));
    return list.slice(0, 5);
  }, [motos]);

  // El loader espera a los datos Y a que la primera imagen del hero esté cargada (con
  // tope de 3.5s por si la imagen falla o tarda).
  useEffect(() => {
    if (!spotlight.length) return;
    let done = false;
    const finish = () => { if (!done) { done = true; setHeroReady(true); } };
    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = productImage(spotlight[0]);
    if (img.complete) finish();
    const t = setTimeout(finish, 3500);
    return () => { clearTimeout(t); img.onload = null; img.onerror = null; };
  }, [spotlight]);

  const heroStats = useMemo(() => {
    const brandCount = new Set(motos.map((p) => (p.brand || "").trim()).filter(Boolean)).size;
    return [
      { label: "Modelos", value: motos.length },
      { label: "En stock", value: motos.filter(inStock).length },
      { label: "Marcas", value: brandCount },
    ];
  }, [motos]);

  // Opciones de filtro (dentro del tipo activo, si hay).
  const scope = useMemo(
    () => (activeType ? motos.filter((p) => typeSlug(p.type) === activeType.slug) : motos),
    [motos, activeType],
  );
  const brandOptions = useMemo(
    () => [...new Set(scope.map((p) => (p.brand || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [scope],
  );
  const ccOptions = useMemo(
    () => [...new Set(scope.map(cc).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [scope],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    let list = motos.filter((p) => {
      if (activeType && typeSlug(p.type) !== activeType.slug) return false;
      if (q && !`${p.title || ""} ${p.brand || ""} ${p.color || ""} ${p.model || ""} ${p.type || ""}`.toLowerCase().includes(q)) return false;
      if (brands.length && !brands.includes((p.brand || "").trim())) return false;
      if (ccs.length && !ccs.includes(cc(p))) return false;
      const val = priceValue(p.price);
      if (min != null && (val == null || val < min)) return false;
      if (max != null && (val == null || val > max)) return false;
      if (stockOnly && !inStock(p)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => (priceValue(a.price) ?? Infinity) - (priceValue(b.price) ?? Infinity));
    else if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b.price) || 0) - (priceValue(a.price) || 0));
    else if (sort === "name") list = [...list].sort((a, b) => (a.title || "").localeCompare(b.title || "", "es"));
    else list = [...list].sort((a, b) => (inStock(b) ? 1 : 0) - (inStock(a) ? 1 : 0));
    return list;
  }, [motos, activeType, query, brands, ccs, priceMin, priceMax, stockOnly, sort]);

  // Estado de filtros -> URL (links compartibles). El tipo va en el path, no acá.
  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    brands.forEach((v) => p.append("marca", v));
    ccs.forEach((v) => p.append("cc", v));
    if (priceMin) p.set("min", priceMin);
    if (priceMax) p.set("max", priceMax);
    if (stockOnly) p.set("stock", "1");
    if (sort !== "relevance") p.set("orden", sort);
    if (p.toString() !== searchParams.toString()) setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, brands, ccs, priceMin, priceMax, stockOnly, sort]);

  useEffect(() => { setVisible(PAGE); }, [tipo, query, brands, ccs, priceMin, priceMax, stockOnly, sort]);

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toggle = (setter) => (val) => setter((cur) => (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]));
  const clearFilters = () => {
    setQuery(""); setBrands([]); setCcs([]); setPriceMin(""); setPriceMax(""); setStockOnly(false); setSort("relevance");
  };
  // Cambiar de tipo limpia los filtros secundarios y baja a la grilla.
  const goType = (slug) => { clearFilters(); navigate(slug ? `/motos/${slug}` : "/motos"); requestAnimationFrame(scrollToGrid); };

  const activeFilterCount =
    brands.length + ccs.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (stockOnly ? 1 : 0) + (query.trim() ? 1 : 0);

  const shown = filtered.slice(0, visible);
  const loading = !error && (!products || (spotlight.length > 0 && !heroReady));

  return (
    <>
    <Loader show={loading} />
    <PageTransition>
      <MotoHero motos={spotlight} stats={heroStats} onExplore={scrollToGrid} />

      {/* MARCAS */}
      {brandOptions.length > 0 && !activeType && (
        <section className="mbrands">
          <div className="container"><p className="mbrands__title">Las marcas que representamos</p></div>
          <Marquee speed={34}>
            {[...new Set(motos.map((p) => (p.brand || "").trim()).filter(Boolean))].sort().map((b) => (
              <button key={b} className="mbrand" onClick={() => { clearFilters(); setBrands([b]); scrollToGrid(); }}>
                {b}
              </button>
            ))}
          </Marquee>
        </section>
      )}

      {/* EXPLORAR POR TIPO */}
      {typeList.length > 1 && (
        <section className="section container mtypes">
          <div className="sec-head">
            <Reveal><h2 className="sec-head__title">Explorá por tipo</h2></Reveal>
          </div>
          <div className="mtype-grid">
            {typeList.map((t, i) => (
              <motion.button
                key={t.slug}
                type="button"
                className={`mtype ${activeType?.slug === t.slug ? "is-active" : ""}`}
                onClick={() => goType(t.slug)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                style={{ "--mtype-image": typeImages[t.slug] ? `url("${typeImages[t.slug]}")` : "none" }}
              >
                <span className="mtype__media" aria-hidden="true" />
                <span className="mtype__count">{t.count} {t.count === 1 ? "modelo" : "modelos"}</span>
                <span className="mtype__label">{t.label}</span>
                {t.blurb && <span className="mtype__blurb">{t.blurb}</span>}
                <ArrowRight className="mtype__arrow" size={20} />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* BROWSE: tabs + filtros + grilla */}
      <section className="section container mbrowse" ref={gridRef}>
        <div className="mbrowse__head">
          <div>
            <p className="eyebrow">Catálogo de motos</p>
            <h2 className="mbrowse__title">{activeType ? `Motos ${activeType.label}` : "Todas las motos"}</h2>
          </div>
          <p className="mbrowse__count">{products ? `${filtered.length} moto${filtered.length !== 1 ? "s" : ""}` : " "}</p>
        </div>

        {/* Tabs por tipo */}
        <div className="mtabs" role="tablist" aria-label="Tipo de moto">
          <button role="tab" aria-selected={!activeType} className={`mtab ${!activeType ? "is-active" : ""}`} onClick={() => goType(null)}>
            Todas
            {!activeType && <motion.span layoutId="motoTabInd" className="mtab__ind" />}
          </button>
          {typeList.map((t) => (
            <button key={t.slug} role="tab" aria-selected={activeType?.slug === t.slug}
              className={`mtab ${activeType?.slug === t.slug ? "is-active" : ""}`} onClick={() => goType(t.slug)}>
              {t.label}
              {activeType?.slug === t.slug && <motion.span layoutId="motoTabInd" className="mtab__ind" />}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mtoolbar">
          <div className="mtoolbar__search">
            <Search size={18} />
            <input type="search" placeholder="Buscar modelo, marca, color…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar motos" />
          </div>
          <select className="mtoolbar__sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <label className="mtoolbar__stock">
            <input type="checkbox" checked={stockOnly} onChange={(e) => setStockOnly(e.target.checked)} />
            <span>Solo con stock</span>
          </label>
          <button className={`mtoolbar__more ${moreFilters ? "is-on" : ""}`} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
            <SlidersHorizontal size={16} /> Más filtros
          </button>
          {activeFilterCount > 0 && <button className="mtoolbar__clear" onClick={clearFilters}><X size={15} /> Limpiar</button>}
        </div>

        {/* Marcas (chips) */}
        {brandOptions.length > 1 && (
          <div className="mchips" role="group" aria-label="Marca">
            {brandOptions.map((b) => (
              <button key={b} className={`mchip ${brands.includes(b) ? "is-on" : ""}`} aria-pressed={brands.includes(b)} onClick={() => toggle(setBrands)(b)}>
                {b}
              </button>
            ))}
          </div>
        )}

        {/* Más filtros: cilindrada + precio */}
        <AnimatePresence initial={false}>
          {moreFilters && (
            <motion.div className="mmore" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <div className="mmore__inner">
                {ccOptions.length > 0 && (
                  <div className="mmore__block">
                    <span className="mmore__label">Cilindrada</span>
                    <div className="mchips">
                      {ccOptions.map((c) => (
                        <button key={c} className={`mchip ${ccs.includes(c) ? "is-on" : ""}`} aria-pressed={ccs.includes(c)} onClick={() => toggle(setCcs)(c)}>{c}cc</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mmore__block">
                  <span className="mmore__label">Precio (USD)</span>
                  <div className="mmore__range">
                    <input type="number" min="0" inputMode="numeric" placeholder="Mín" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Precio mínimo" />
                    <span className="mmore__dash">–</span>
                    <input type="number" min="0" inputMode="numeric" placeholder="Máx" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Precio máximo" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grilla */}
        {error && <p className="mmsg">No pudimos cargar las motos ({error}). Probá recargar en un momento.</p>}
        {!products && !error && (
          <div className="mgrid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="pskeleton" />)}</div>
        )}
        {products && !error && (
          shown.length === 0 ? (
            <div className="mempty">
              <p className="mmsg">No encontramos motos con ese criterio.</p>
              {activeFilterCount > 0 && <button className="btn btn-secondary" onClick={clearFilters}>Limpiar filtros</button>}
            </div>
          ) : (
            <>
              <div className="mgrid">{shown.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              {visible < filtered.length && (
                <div className="mmore-btn">
                  <button className="btn btn-secondary" onClick={() => setVisible((v) => v + PAGE)}>
                    Ver más ({filtered.length - visible})
                  </button>
                </div>
              )}
            </>
          )
        )}
      </section>

      {/* POR QUÉ MOTOS PUNTA */}
      <section className="section container">
        <div className="sec-head"><Reveal><h2 className="sec-head__title">Por qué comprar tu moto acá</h2></Reveal></div>
        <div className="mvalues">
          {VALUE_PROPS.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06} className="mvalue">
              <span className="mvalue__icon"><v.icon size={24} /></span>
              <h3 className="mvalue__title">{v.title}</h3>
              <p className="mvalue__text">{v.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FINANCIACIÓN */}
      <section className="section container">
        <Reveal className="fin-band">
          <div>
            <p className="eyebrow">Financiación</p>
            <h2 className="fin-band__title">Llevate tu moto en cuotas</h2>
            <p className="fin-band__sub">Mirá los requisitos de cada banco y financiera. Sin compromiso.</p>
          </div>
          <div className="fin-band__actions">
            <Link to="/financiacion" className="btn btn-primary">Ver financiación <ArrowRight size={18} /></Link>
            <a className="btn btn-secondary" href={waLink("Hola Motos Punta 👋 Quiero consultar por financiación de una moto.")} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>
          </div>
        </Reveal>
      </section>
    </PageTransition>
    </>
  );
}
