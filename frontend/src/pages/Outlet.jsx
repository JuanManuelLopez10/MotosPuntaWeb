import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag, ArrowRight } from "lucide-react";
import PageTransition from "../components/PageTransition";
import Loader from "../components/Loader";
import ModelCard from "../components/ModelCard";
import { fetchModels, modelOutlet, modelPriceValue, isMotoModel, modelInStock } from "../lib/models";
import { useSeo } from "../lib/seo";
import "./Outlet.css";

const EASE = [0.22, 1, 0.36, 1];

export default function Outlet() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);

  useSeo({
    path: "/outlet",
    title: "Zona Outlet — ofertas",
    description:
      "Zona Outlet de Motos Punta: motos, cascos, indumentaria y accesorios con precios rebajados por tiempo limitado. Aprovechá antes de que se agoten.",
  });

  useEffect(() => {
    let alive = true;
    fetchModels().then((m) => alive && setProducts(m)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const items = useMemo(
    () => (products || []).filter((m) => modelOutlet(m) && modelPriceValue(m) != null && (isMotoModel(m) || modelInStock(m))),
    [products],
  );

  return (
    <>
    <Loader show={!products && !error} />
    <PageTransition>
      <section className="outlet">
        <div className="outlet__hero">
          <div className="container">
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
              Ofertas
            </motion.p>
            <motion.h1 className="outlet__title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ease: EASE }}>
              Zona <span className="txt-accent">Outlet</span>
            </motion.h1>
            <motion.p className="outlet__sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
              Precios rebajados por tiempo limitado. Aprovechá antes de que se agoten.
            </motion.p>
          </div>
        </div>

        <div className="container outlet__body">
          {error && <p className="cat__msg">No pudimos cargar las ofertas ({error}). Probá recargar en un momento.</p>}

          {!products && !error && (
            <div className="cat__grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pskeleton" />)}</div>
          )}

          {products && !error && (
            items.length === 0 ? (
              <div className="outlet__empty">
                <Tag size={40} />
                <p>Todavía no hay productos en oferta. ¡Volvé pronto!</p>
                <Link to="/catalogo" className="btn btn-primary">Ver catálogo <ArrowRight size={18} /></Link>
              </div>
            ) : (
              <>
                <p className="cat__count">{items.length} oferta{items.length !== 1 ? "s" : ""}</p>
                <div className="cat__grid">
                  {items.map((m) => <ModelCard key={m.slug} model={m} />)}
                </div>
              </>
            )
          )}
        </div>
      </section>
    </PageTransition>
    </>
  );
}
