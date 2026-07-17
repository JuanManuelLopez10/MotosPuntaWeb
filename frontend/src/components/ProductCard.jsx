import { Link } from "react-router-dom";
import { MessageCircle, ShoppingCart, Percent, CalendarClock } from "lucide-react";
import { waLink, waProductMessage, waBuyMessage, waReserveMessage } from "../data/site";
import {
  productImage, formatPrice, productFullName, productSubtitle, inStock, isMoto,
  isOutlet, formatPreviousPrice, discountPct, PRODUCT_PLACEHOLDER,
} from "../lib/catalog";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const price = formatPrice(product.price);
  const name = productFullName(product);
  const sub = productSubtitle(product);
  const moto = isMoto(product);
  const soldOut = !inStock(product);
  const isCasco = String(product.productType || "").toLowerCase() === "cascos";
  const pattern = String(product.pattern || "").trim();
  const outlet = isOutlet(product);
  const prevPrice = formatPreviousPrice(product);
  const disc = discountPct(product);

  // CTAs según disponibilidad:
  //  - moto sin stock  -> "Encargar / Reservar" (+ cartel "Sin stock")
  //  - moto con stock  -> "Comprar" + "Financiación"
  //  - resto (cascos, etc.) -> "Consultar" por WhatsApp
  let actions;
  if (moto && soldOut) {
    actions = (
      <a className="pcard__cta pcard__cta--reserve" href={waLink(waReserveMessage(name))} target="_blank" rel="noreferrer">
        <CalendarClock size={16} /> Encargar / Reservar
      </a>
    );
  } else if (moto) {
    actions = (
      <div className="pcard__ctas">
        <a className="pcard__cta pcard__cta--buy" href={waLink(waBuyMessage(name, price))} target="_blank" rel="noreferrer">
          <ShoppingCart size={16} /> Comprar
        </a>
        <Link className="pcard__cta" to={`/financiacion?moto=${encodeURIComponent(product.id)}`}>
          <Percent size={16} /> Financiación
        </Link>
      </div>
    );
  } else {
    actions = (
      <a className="pcard__cta" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer">
        <MessageCircle size={16} /> Consultar
      </a>
    );
  }

  return (
    <article className={`pcard ${outlet ? "pcard--outlet" : ""}`}>
      <Link to={`/producto/${encodeURIComponent(product.id)}`} className="pcard__media" aria-label={name}>
        <img
          src={productImage(product)}
          alt={name}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) {
              e.currentTarget.src = PRODUCT_PLACEHOLDER;
            }
          }}
        />
        {soldOut && <span className="pcard__badge">Sin stock</span>}
        {outlet && <span className="pcard__outlet">{disc ? `-${disc}%` : "Outlet"}</span>}
      </Link>

      <div className="pcard__body">
        <h3 className="pcard__title">
          <Link to={`/producto/${encodeURIComponent(product.id)}`} className="pcard__titleLink">{product.title}</Link>
          {isCasco && pattern && <span className="pcard__pattern"> {pattern}</span>}
        </h3>
        {sub && <p className="pcard__sub">{sub}</p>}
        <div className="pcard__foot">
          {outlet && prevPrice ? (
            <>
              <span className="pcard__price pcard__price--outlet tabular">{price}</span>
              <span className="pcard__priceOld tabular">{prevPrice}</span>
            </>
          ) : (
            <span className="pcard__price tabular">{price || "Consultar"}</span>
          )}
        </div>
        {actions}
      </div>
    </article>
  );
}
