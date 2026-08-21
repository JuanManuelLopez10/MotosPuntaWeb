import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  modelImage, modelPrice, modelPriceFrom, modelSubtitle, modelColors, modelOutlet,
} from "../lib/models";
import { PRODUCT_PLACEHOLDER } from "../lib/catalog";
import "./ProductCard.css";

// Tarjeta del CATÁLOGO por MODELO (Fase 2). El detalle de color/diseño vive en la página
// del modelo (/producto/{slug}).
export default function ModelCard({ model }) {
  const img = modelImage(model);
  const price = modelPrice(model);
  const from = modelPriceFrom(model);
  const sub = modelSubtitle(model);
  const colors = modelColors(model).slice(0, 6);
  const extra = modelColors(model).length - colors.length;
  const outlet = modelOutlet(model);
  const to = `/producto/${encodeURIComponent(model.slug)}`;

  return (
    <article className={`pcard ${outlet ? "pcard--outlet" : ""}`}>
      <Link to={to} className="pcard__media" aria-label={model.title}>
        <img
          src={img}
          alt={model.title}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) {
              e.currentTarget.src = PRODUCT_PLACEHOLDER;
            }
          }}
        />
        {outlet && <span className="pcard__outlet">Outlet</span>}
      </Link>

      <div className="pcard__body">
        <h3 className="pcard__title">
          <Link to={to} className="pcard__titleLink">{model.title}</Link>
        </h3>
        {sub && <p className="pcard__sub">{sub}</p>}

        {colors.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0 6px" }}>
            {colors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                style={{
                  width: 14, height: 14, borderRadius: "50%", background: c.hex,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)", flex: "none",
                }}
              />
            ))}
            {extra > 0 && <span style={{ fontSize: 12, color: "var(--muted, #8a8a90)" }}>+{extra}</span>}
          </div>
        )}

        <div className="pcard__foot">
          <span className="pcard__price tabular">
            {price ? (from ? `desde ${price}` : price) : "Consultar"}
          </span>
        </div>

        <Link className="pcard__cta" to={to}>
          Ver opciones <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}
