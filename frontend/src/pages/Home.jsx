import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Calculator, ChevronRight } from "lucide-react";
import PageTransition from "../components/PageTransition";
import Loader from "../components/Loader";
import ProductCard from "../components/ProductCard";
import Marquee from "../components/Marquee";
import { CATEGORIES, waLink, HERO_MEDIA } from "../data/site";
import { fetchProducts, formatPrice, inStock } from "../lib/catalog";
import { useSeo } from "../lib/seo";
import "./Home.css";

const logoMods = import.meta.glob("../assets/logos/*.png", { eager: true, import: "default" });
const BRAND_LOGOS = Object.entries(logoMods).map(([path, src]) => ({
  src, name: path.split("/").pop().replace(".png", ""),
}));

const EASE = [0.22, 1, 0.36, 1];

// Reveal de una línea de texto detrás de una máscara (sube desde abajo).
function LineReveal({ children, delay = 0 }) {
  return (
    <span className="line-mask">
      <motion.span
        className="line-mask__inner"
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

const CATEGORY_BLURB = {
  motos: "0 km, todas las cilindradas",
  cascos: "AGV, LS2, MT y más",
  indumentaria: "Equipate para la ruta",
  accesorios: "Todo para tu moto",
};

export default function Home() {
  const [products, setProducts] = useState(null);
  const heroRef = useRef(null);
  // El video del hero sólo se monta en escritorio (para no bajar 43MB en mobile) y se
  // descarta si falla (queda la imagen de fondo).
  const [useHeroVideo, setUseHeroVideo] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);

  useSeo({
    path: "/",
    description:
      "Concesionaria de motos en Maldonado, Uruguay. Motos 0 km, cascos, indumentaria y accesorios. Financiación clara y atención directa por WhatsApp.",
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (orientation: landscape)");
    const on = () => setUseHeroVideo(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.28]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  useEffect(() => {
    let alive = true;
    fetchProducts().then((p) => alive && setProducts(p)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const featured = useMemo(() => {
    if (!products) return [];
    const withImg = products.filter((p) => (p.imageLink || "").trim() && formatPrice(p.price) && inStock(p));
    const motos = withImg.filter((p) => (p.productType || "").toLowerCase() === "motos");
    const rest = withImg.filter((p) => (p.productType || "").toLowerCase() !== "motos");
    return [...motos, ...rest].slice(0, 8);
  }, [products]);

  const categoryImages = useMemo(() => {
    if (!products) return {};

    return Object.fromEntries(
      CATEGORIES.map(({ key }) => {
        const categoryProducts = products.filter(
          (item) => (item.productType || "").toLowerCase() === key && (item.imageLink || "").trim(),
        );
        const product = categoryProducts.find((item) => /rojo|red/i.test(item.color || "")) ?? categoryProducts[0];
        return [key, product?.imageLink];
      }),
    );
  }, [products]);

  return (
    <>
    <Loader show={!products} />
    <PageTransition>
      {/* HERO full-bleed */}
      <section className="hero" ref={heroRef}>
        <motion.div className="hero__bg" style={{ scale: bgScale }} aria-hidden="true">
          <img className="hero__bgMedia hero__bgImage" src={HERO_MEDIA.src} alt="" />
          {HERO_MEDIA.video && useHeroVideo && !heroVideoFailed && (
            <video
              className="hero__bgMedia hero__bgVideo"
              src={HERO_MEDIA.video}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setHeroVideoFailed(true)}
            />
          )}
        </motion.div>
        <div className="hero__scrim" aria-hidden="true" />

        <motion.div className="container hero__content" style={{ y: contentY, opacity: contentOpacity }}>
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Concesionaria en Maldonado
          </motion.p>
          <h1 className="hero__title">
            <LineReveal delay={0.2}>Tu próxima</LineReveal>
            <LineReveal delay={0.3}>moto empieza</LineReveal>
            <LineReveal delay={0.4}><span className="txt-accent">acá</span></LineReveal>
          </h1>
          <motion.p className="hero__sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6, ease: EASE }}>
            Motos 0 km, cascos, indumentaria y accesorios. Financiación clara y atención
            directa por WhatsApp — sin vueltas.
          </motion.p>
          <motion.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.6, ease: EASE }}>
            <Link to="/catalogo" className="btn btn-primary">Ver catálogo <ArrowRight size={18} /></Link>
            <Link to="/financiacion" className="btn btn-secondary"><Calculator size={18} /> Simular cuota</Link>
          </motion.div>
        </motion.div>

        <div className="hero__scroll" aria-hidden="true"><span /></div>
      </section>

      {/* MARCAS (marquee) */}
      <section className="brands">
        <div className="container"><p className="brands__title">Trabajamos con las mejores marcas</p></div>
          <Marquee speed={38}>
          {BRAND_LOGOS.map((b) => (
            <Link key={b.name} to={`/catalogo?marca=${encodeURIComponent(b.name)}`} className="brands__logoLink" aria-label={`Ver productos de ${b.name}`}>
              <img src={b.src} alt={b.name} className="brands__logo" loading="lazy" />
            </Link>
          ))}
        </Marquee>
      </section>

      {/* CATEGORÍAS (después de las marcas, lleva al catálogo) */}
      <section className="section container">
        <div className="sec-head"><RevealHeading>Explorá por categoría</RevealHeading></div>
        <div className="cat-grid">
          {CATEGORIES.map((c, i) => {
            const image = categoryImages[c.key];
            return (
              <motion.div key={c.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}>
                <Link to={c.key === "motos" ? "/motos" : `/catalogo/${c.key}`} className="cat-card" style={{ "--category-image": image ? `url("${image}")` : "none" }}>
                  <span className="cat-card__label">{c.label}</span>
                  <span className="cat-card__blurb">{CATEGORY_BLURB[c.key]}</span>
                  <ArrowRight className="cat-card__arrow" size={20} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* DESTACADOS (productos reales) */}
      <section className="section container">
        <div className="sec-head">
          <RevealHeading>Destacados</RevealHeading>
          <Link to="/catalogo" className="sec-head__link">Ver todo <ChevronRight size={16} /></Link>
        </div>
        {featured.length === 0 ? (
          <div className="feat-grid">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="pskeleton" />)}
          </div>
        ) : (
          <motion.div
            className="feat-grid"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >
            {featured.map((p) => (
              <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* CTA FINANCIACIÓN */}
      <section className="section container">
        <motion.div className="fin-band" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
          <div>
            <p className="eyebrow">Financiación</p>
            <h2 className="fin-band__title">Estimá tu cuota en 30 segundos</h2>
            <p className="fin-band__sub">Elegí moto, entrega y plazo. Sin compromiso.</p>
          </div>
          <div className="fin-band__actions">
            <Link to="/financiacion" className="btn btn-primary">Ir al simulador <ArrowRight size={18} /></Link>
            <a className="btn btn-secondary" href={waLink("Hola Motos Punta 👋 Quiero consultar por financiación.")} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>
          </div>
        </motion.div>
      </section>
    </PageTransition>
    </>
  );
}

// Título de sección con reveal enmascarado.
function RevealHeading({ children }) {
  return (
    <h2 className="sec-head__title">
      <span className="line-mask">
        <motion.span
          className="line-mask__inner"
          initial={{ y: "115%" }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {children}
        </motion.span>
      </span>
    </h2>
  );
}
