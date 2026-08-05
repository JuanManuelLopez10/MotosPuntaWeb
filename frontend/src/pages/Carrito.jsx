import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Trash2, Minus, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useCart } from "../lib/cart.jsx";
import { PRODUCT_PLACEHOLDER } from "../lib/catalog";
import { useSeo } from "../lib/seo";
import "./Carrito.css";

const EASE = [0.22, 1, 0.36, 1];
const fmt = (n) => `USD ${Number(n || 0).toLocaleString("es-UY")}`;

export default function Carrito() {
  const { items, subtotal, count, setQty, removeItem, clear, lineKey } = useCart();

  useSeo({
    path: "/carrito",
    title: "Tu carrito",
    description: "Revisá tu carrito y finalizá la compra en Motos Punta, Maldonado.",
  });

  if (items.length === 0) {
    return (
      <PageTransition>
        <section className="cart">
          <div className="container">
            <motion.div
              className="cart__empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <ShoppingBag size={48} className="cart__emptyIcon" />
              <h1 className="cart__emptyTitle">Tu carrito está vacío</h1>
              <p className="cart__emptySub">Sumá cascos, indumentaria y accesorios y aparecen acá.</p>
              <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
            </motion.div>
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="cart">
        <div className="container">
          <header className="cart__head">
            <p className="eyebrow">Carrito</p>
            <h1 className="cart__title">
              Tu carrito <span className="cart__count">· {count} {count === 1 ? "ítem" : "ítems"}</span>
            </h1>
          </header>

          <div className="cart__layout">
            <ul className="cart__list">
              {items.map((it) => {
                const key = lineKey(it.id, it.size);
                const meta = [it.color, it.acabado].filter(Boolean).join(" ");
                return (
                  <motion.li
                    key={key}
                    layout
                    className="cart__item"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <Link to={`/producto/${it.id}`} className="cart__thumb">
                      <img
                        src={it.image || PRODUCT_PLACEHOLDER}
                        alt={it.title}
                        loading="lazy"
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith(PRODUCT_PLACEHOLDER)) e.currentTarget.src = PRODUCT_PLACEHOLDER;
                        }}
                      />
                    </Link>

                    <div className="cart__info">
                      <Link to={`/producto/${it.id}`} className="cart__name">{it.title}</Link>
                      {(meta || it.size) && (
                        <p className="cart__meta">
                          {meta}
                          {it.size && <span className="cart__size">Talle {it.size}</span>}
                        </p>
                      )}
                      <span className="cart__unit tabular">{fmt(it.price)} c/u</span>
                    </div>

                    <div className="cart__qty" role="group" aria-label={`Cantidad de ${it.title}`}>
                      <button type="button" onClick={() => setQty(key, it.qty - 1)} disabled={it.qty <= 1} aria-label="Restar uno">
                        <Minus size={16} />
                      </button>
                      <span className="cart__qtyN tabular">{it.qty}</span>
                      <button type="button" onClick={() => setQty(key, it.qty + 1)} aria-label="Sumar uno">
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="cart__line tabular">{fmt(it.price * it.qty)}</div>

                    <button type="button" className="cart__remove" onClick={() => removeItem(key)} aria-label={`Quitar ${it.title}`}>
                      <Trash2 size={18} />
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            <aside className="cart__summary">
              <h2 className="cart__sumTitle">Resumen</h2>
              <div className="cart__sumRow"><span>Subtotal</span><span className="tabular">{fmt(subtotal)}</span></div>
              <div className="cart__sumRow cart__sumRow--muted"><span>Envío</span><span>Se coordina</span></div>
              <div className="cart__sumRow cart__sumRow--total"><span>Total</span><span className="tabular">{fmt(subtotal)}</span></div>

              <Link className="btn btn-primary cart__checkout" to="/checkout">
                Finalizar compra <ArrowRight size={18} />
              </Link>
              <p className="cart__note">Elegís entrega y forma de pago en el próximo paso.</p>

              <div className="cart__foot">
                <Link to="/catalogo" className="cart__back"><ArrowLeft size={15} /> Seguir comprando</Link>
                <button type="button" className="cart__clear" onClick={clear}>Vaciar carrito</button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
