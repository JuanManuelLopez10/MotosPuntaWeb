import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  modelImage, modelPrice, modelPriceFrom, modelSubtitle, modelOutlet, modelInStock, colorSwatches,
} from "../lib/models";
import { PRODUCT_PLACEHOLDER } from "../lib/catalog";
import "./ProductCard.css";

// Tarjeta del CATÁLOGO. En cascos, `model` viene acotado a un DISEÑO (Modelo+Diseño), así que
// muestra "MT Stinger 2 · Bunch"; en el resto es el modelo entero. Al pasar el cursor por un
// círculo de color, la imagen cambia a la de ese color.
export default function ModelCard({ model }) {
  const design = model.design || null;
  const img = modelImage(model);
  const price = modelPrice(model);
  const from = modelPriceFrom(model);
  const sub = modelSubtitle(model);
  const outlet = modelOutlet(model);
  const soldOut = !modelInStock(model);
  // En el catálogo solo se ofrecen colores con stock (los agotados no se muestran).
  const swatches = colorSwatches(model).filter((c) => !c.soldOut && c.image).slice(0, 6);
  const extra = colorSwatches(model).filter((c) => !c.soldOut && c.image).length - swatches.length;
  const to = `/producto/${encodeURIComponent(model.slug)}${design ? `/${encodeURIComponent(design)}` : ""}`;

  // Cross-fade al pasar el cursor por un color: una capa base (imagen representativa) y una
  // capa que aparece encima con la foto del color en hover. `hover` controla la opacidad;
  // `lastHover` mantiene la foto durante el fundido de salida (para que también desvanezca).
  const [hover, setHover] = useState(null);
  const [lastHover, setLastHover] = useState(null);
  const onImgErr = (e) => {
    if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) e.currentTarget.src = PRODUCT_PLACEHOLDER;
  };
  // Precargar las fotos de los colores para que el fundido no arranque en blanco.
  useEffect(() => {
    swatches.forEach((c) => { if (c.image) { const im = new Image(); im.src = c.image; } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.entryKey || model.slug]);

  return (
    <article className={`pcard ${outlet ? "pcard--outlet" : ""} ${soldOut ? "pcard--out" : ""}`}>
      <Link to={to} className="pcard__media" aria-label={model.displayName || model.title}>
        <img
          className={`pcard__img ${soldOut ? "is-out" : ""}`}
          src={img}
          alt={model.displayName || model.title}
          loading="lazy"
          onError={onImgErr}
        />
        <img
          className={`pcard__img pcard__img--hover ${hover ? "is-shown" : ""}`}
          src={lastHover || img}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={onImgErr}
        />
        {soldOut && <span className="pcard__badge">Sin stock</span>}
        {outlet && <span className="pcard__outlet">Outlet</span>}
      </Link>

      <div className="pcard__body">
        <h3 className="pcard__title">
          <Link to={to} className="pcard__titleLink">{model.title}</Link>
          {design && <span className="pcard__pattern"> {model.designLabel}</span>}
        </h3>
        {sub && <p className="pcard__sub">{sub}</p>}

        {swatches.length > 1 && (
          <div className="pcard__swatches" role="list" aria-label="Colores disponibles">
            {swatches.map((c) => (
              <span
                key={c.name}
                role="listitem"
                className="pcard__swatch"
                title={[c.name, c.acabado].filter(Boolean).join(" ")}
                style={{ background: c.hex }}
                onMouseEnter={() => { setHover(c.image); setLastHover(c.image); }}
                onMouseLeave={() => setHover(null)}
              />
            ))}
            {extra > 0 && <span className="pcard__swatchMore">+{extra}</span>}
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
