import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle, ShoppingCart, CalendarClock, Percent, Gauge, ShieldCheck, Cog, Wrench,
  Zap, ArrowDownUp, Waves, Navigation, Sun, Flame, Armchair, SlidersHorizontal, Droplets, Glasses, Wind, Thermometer,
  ChevronRight, Minus, Plus, Check,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import { waLink, waProductMessage, waBuyMessage, waReserveMessage } from "../data/site";
import { formatPrice, priceValue, PRODUCT_PLACEHOLDER } from "../lib/catalog";
import {
  variants as getVariants, modelDesigns, modelDesignsInStock, designLabel, isMotoModel, colorHex, variantInStock,
} from "../lib/models";
import { useSeo, SITE_URL } from "../lib/seo";
import { useCart } from "../lib/cart.jsx";
import { trackVisit } from "../lib/relevance";
import "./Producto.css";

const EASE = [0.22, 1, 0.36, 1];
const truthy = (v) => v === true || v === "true" || v === 1 || v === "1";
const specText = (val, unit) => {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return unit && /^\d+([.,]\d+)?$/.test(s) ? `${s} ${unit}` : s;
};

const SPEC_GROUPS = [
  { title: "Motor", icon: Cog, keys: [["cilindrada", "Cilindrada", "cc"], ["cilindros", "Cilindros"], ["caballaje", "Potencia", "HP"], ["torque", "Torque", "Nm"], ["refrigeracion", "Refrigeración"], ["alimentacion", "Alimentación"], ["cantidadCambios", "Cambios"]] },
  { title: "Frenos", icon: ShieldCheck, keys: [["frenos", "Frenos"], ["marcaFrenos", "Marca de frenos"]] },
  { title: "Chasis y rodado", icon: Wrench, keys: [["rodadoDelantero", "Rodado delantero"], ["rodadoTrasero", "Rodado trasero"]] },
  { title: "Equipamiento", icon: Gauge, keys: [["tablero", "Tablero"], ["iluminacion", "Iluminación"], ["capacidadTanque", "Capacidad del tanque", "L"], ["garantia", "Garantía"]] },
];
const MOTO_FEATURES = [
  { key: "quickshifter", label: "Quickshifter", icon: Zap }, { key: "controlTraccion", label: "Control de tracción", icon: ShieldCheck },
  { key: "horquillaInvertida", label: "Horquilla invertida", icon: ArrowDownUp }, { key: "monoshockTrasero", label: "Monoshock trasero", icon: Waves },
  { key: "controlCrucero", label: "Control crucero", icon: Navigation }, { key: "embragueAntirrebote", label: "Embrague antirrebote", icon: Cog },
  { key: "calientaPunos", label: "Calienta puños", icon: Flame }, { key: "calientaAsientos", label: "Calienta asientos", icon: Armchair },
  { key: "modosManejo", label: "Modos de manejo", icon: SlidersHorizontal },
];
const CASCO_SPECS = [["material", "Material"], ["cierre", "Cierre"], ["colorVisor", "Color del visor"], ["peso", "Peso", "g"]];
const CASCO_FEATURES = [
  { key: "ece2206", label: "Homologación ECE 22.06", icon: ShieldCheck }, { key: "ece2205", label: "Homologación ECE 22.05", icon: ShieldCheck },
  { key: "dot", label: "Homologación DOT", icon: ShieldCheck }, { key: "visorSolarInterno", label: "Visor solar interno", icon: Sun },
  { key: "pinlock", label: "Pinlock", icon: Droplets }, { key: "dobleVisor", label: "Doble visor", icon: Glasses },
];
const GUANTES_SPECS = [["clima", "Clima"], ["proteccionNudillos", "Protección nudillos"], ["largoGuante", "Largo"]];
const GUANTES_FEATURES = [
  { key: "proteccionDedos", label: "Protección en dedos", icon: ShieldCheck }, { key: "proteccionPalma", label: "Protección en palma", icon: ShieldCheck },
  { key: "limpiavisor", label: "Limpiavisor", icon: Droplets },
];
const CAMPERA_SPECS = [["largoCampera", "Largo"], ["genero", "Género"]];
const CAMPERA_FEATURES = [
  { key: "abrigoExtraible", label: "Abrigo interior extraíble", icon: Thermometer }, { key: "entradasAire", label: "Entradas de aire", icon: Wind },
  { key: "camperaVerano", label: "Campera de verano", icon: Sun },
];

const SIZE_LABEL = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL", "3xl": "3XL" };
const sizeLabel = (k) => SIZE_LABEL[String(k).toLowerCase()] || (/^\d+$/.test(k) ? k : String(k).toUpperCase());
const offeredSizes = (v) => Object.entries(v?.sizes || {}).filter(([, on]) => truthy(on)).map(([k]) => sizeLabel(k));
const onImgErr = (e) => { if (e.currentTarget.src !== window.location.origin + PRODUCT_PLACEHOLDER) e.currentTarget.src = PRODUCT_PLACEHOLDER; };

export default function ModelPage({ model }) {
  const { design: urlDesign } = useParams();
  const vs = getVariants(model);
  const moto = isMotoModel(model);
  const casco = String(model.productType || "").toLowerCase() === "cascos";
  const cat = String(model.productType || "").toLowerCase();

  // El diseño viene de la URL (/producto/:slug/:design). Si no es válido, el primero con stock.
  const allDesigns = modelDesigns(model);
  const stockDesigns = modelDesignsInStock(model);
  const design = casco
    ? (urlDesign && allDesigns.includes(urlDesign) ? urlDesign : (stockDesigns[0] || allDesigns[0] || null))
    : null;

  // Variantes (colores) del diseño elegido. En no-cascos, todas.
  const dVariants = useMemo(() => (casco && design ? vs.filter((v) => v.design === design) : vs), [vs, casco, design]);

  const [variantId, setVariantId] = useState(() => (dVariants.find(variantInStock) || dVariants[0])?.id);
  // Al cambiar de diseño: primer color con stock y subir al inicio (para ver la "primera vista").
  useEffect(() => {
    setVariantId((dVariants.find(variantInStock) || dVariants[0])?.id);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, model.slug]);
  const selected = dVariants.find((v) => v.id === variantId) || dVariants[0] || vs[0] || {};

  // Relevancia: registra la visita a la ficha de este diseño (deduplicado por sesión).
  useEffect(() => { trackVisit(model.slug, design); }, [model.slug, design]);

  const price = formatPrice(selected.price);
  const curVal = priceValue(selected.price);
  const prevVal = priceValue(selected.precioAnterior);
  const prevPrice = selected.outlet && prevVal > curVal ? formatPrice(selected.precioAnterior) : null;
  const disc = prevPrice && prevVal ? Math.round((1 - curVal / prevVal) * 100) : 0;
  const soldOut = !variantInStock(selected);
  const sizes = offeredSizes(selected);
  const finish = [selected.colorName, selected.acabado].filter(Boolean).join(" ");
  const designName = design ? designLabel(design) : "";
  const name = [model.title, designName, finish].filter(Boolean).join(" ");

  // Datos estructurados de Producto (schema.org) para rich results en Google (foto/precio/stock).
  const seoPath = `/producto/${model.slug}${design ? `/${design}` : ""}`;
  const seoDesc = model.seo?.description || model.description || `${model.title} en Motos Punta, Maldonado.`;
  const absImg = selected.image ? (selected.image.startsWith("http") ? selected.image : `${SITE_URL}${selected.image}`) : undefined;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: [model.title, designName].filter(Boolean).join(" "),
    ...(absImg ? { image: [absImg] } : {}),
    description: seoDesc,
    sku: model.slug,
    ...(model.brand ? { brand: { "@type": "Brand", name: model.brand } } : {}),
  };
  if (price) {
    productJsonLd.offers = {
      "@type": "Offer",
      url: `${SITE_URL}${seoPath}`,
      priceCurrency: "USD",
      price: String(priceValue(selected.price) ?? ""),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    };
  }

  useSeo({
    path: seoPath,
    title: model.seo?.title || [model.title, designName].filter(Boolean).join(" "),
    description: seoDesc,
    image: selected.image,
    type: "product",
    jsonLd: productJsonLd,
  });

  const specs = model.specs || {};
  const heroStats = moto
    ? [["cilindrada", "Cilindrada", "cc"], ["caballaje", "Potencia", "HP"], ["torque", "Torque", "Nm"], ["cantidadCambios", "Cambios"]]
        .map(([k, label, unit]) => ({ label, value: specText(specs[k], unit) })).filter((s) => s.value)
    : [];
  const groups = moto
    ? SPEC_GROUPS.map((g) => ({ ...g, rows: g.keys.map(([k, label, unit]) => ({ label, value: specText(specs[k], unit) })).filter((r) => r.value) })).filter((g) => g.rows.length)
    : [];
  const motoFeats = moto ? MOTO_FEATURES.filter((f) => truthy(specs[f.key])) : [];
  const cascoSpecs = casco ? CASCO_SPECS.map(([k, label, unit]) => ({ label, value: specText(specs[k], unit) })).filter((r) => r.value) : [];
  const cascoFeats = casco ? CASCO_FEATURES.filter((f) => truthy(specs[f.key])) : [];
  const type = String(model.type || "").toLowerCase();
  const apparelSpecList = type === "guantes" ? GUANTES_SPECS : type === "camperas" ? CAMPERA_SPECS : [];
  const apparelFeatList = type === "guantes" ? GUANTES_FEATURES : type === "camperas" ? CAMPERA_FEATURES : [];
  const apparelSpecs = apparelSpecList.map(([k, label]) => ({ label, value: specText(specs[k]) })).filter((r) => r.value);
  const apparelFeats = apparelFeatList.filter((f) => truthy(specs[f.key]));
  const customSpecs = selected.customSpecs && typeof selected.customSpecs === "object"
    ? Object.entries(selected.customSpecs).filter(([k, v]) => String(k).trim() && String(v ?? "").trim()) : [];

  // Colores del diseño elegido (con marca de agotado). Es lo que se ve "primero".
  const colorList = dVariants.map((v) => ({
    id: v.id, name: v.colorName, acabado: v.acabado,
    hex: (v.color || "").startsWith("#") ? v.color : colorHex(v.colorName),
    image: v.image, soldOut: !variantInStock(v),
  }));

  // Otros diseños del mismo modelo (solo con stock), para el row del final.
  const otherDesigns = casco
    ? stockDesigns.filter((d) => d !== design).map((d) => {
        const dv = vs.filter((v) => v.design === d);
        const rep = dv.find(variantInStock) || dv[0];
        return { design: d, label: designLabel(d), image: rep?.image || PRODUCT_PLACEHOLDER, price: formatPrice(rep?.price) };
      })
    : [];

  // --- Compra (carrito): solo no-motos con stock y precio. ---
  const { addItem } = useCart();
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const canBuy = !moto && !soldOut && !!price;
  const needsSize = sizes.length > 0;
  useEffect(() => { setSize(null); setQty(1); setSizeError(false); }, [selected.id]);

  const handleAdd = () => {
    if (needsSize && !size) { setSizeError(true); return; }
    addItem({
      // id = dirección de la variante en `productos` (para que el backend recalcule el precio)
      id: [model.slug, selected.design || "colores", selected.id].join("|"),
      title: model.title,
      color: selected.colorName,
      acabado: selected.acabado,
      image: selected.image,
      price: priceValue(selected.price),
      size: size || null,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const ActionsBlock = moto && soldOut ? (
    <a className="btn btn-primary" href={waLink(waReserveMessage(name))} target="_blank" rel="noreferrer"><CalendarClock size={18} /> Encargar / Reservar</a>
  ) : moto ? (
    <>
      <a className="btn btn-primary" href={waLink(waBuyMessage(name, price))} target="_blank" rel="noreferrer"><ShoppingCart size={18} /> Comprar</a>
      <Link className="btn btn-secondary" to={`/financiacion?moto=${encodeURIComponent(model.slug)}`}><Percent size={18} /> Financiación</Link>
    </>
  ) : canBuy ? (
    <>
      <button type="button" className={`btn btn-primary pd__add ${added ? "is-added" : ""}`} onClick={handleAdd}>
        {added ? <><Check size={18} /> Agregado</> : <><ShoppingCart size={18} /> Agregar al carrito</>}
      </button>
      <a className="btn btn-secondary" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar</a>
    </>
  ) : (
    <a className="btn btn-primary" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar por WhatsApp</a>
  );

  return (
    <PageTransition>
      <section className="pd">
        <div className="container">
          <nav className="pd__crumbs" aria-label="Ruta">
            <Link to="/">Inicio</Link><ChevronRight size={14} />
            {moto ? (
              <Link to="/motos" className="pd__crumbCat">Motos</Link>
            ) : (
              <>
                <Link to="/catalogo">Catálogo</Link><ChevronRight size={14} />
                <Link to={`/catalogo/${cat}`} className="pd__crumbCat">{cat || "productos"}</Link>
              </>
            )}
            <ChevronRight size={14} />
            <span aria-current="page">{[model.title, designName].filter(Boolean).join(" ")}</span>
          </nav>

          {/* HERO */}
          <div className="pd__hero">
            <div className="pd__heroGrid">
              {/* Panel de info / compra */}
              <div className="pd__heroInfo">
                {model.brand && <motion.p className="pd__brand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>{model.brand}</motion.p>}
                <motion.h1 className="pd__title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: EASE }}>
                  {model.title}{designName && <span className="pd__pattern"> {designName}</span>}
                </motion.h1>
                {(moto ? model.type : finish) && <p className="pd__sub">{moto ? model.type : finish}</p>}

                <div className="pd__priceRow">
                  {prevPrice ? (
                    <><span className="pd__price pd__price--outlet tabular">{price}</span>
                      <span className="pd__priceOld tabular">{prevPrice}</span>
                      {disc > 0 && <span className="pd__disc">-{disc}%</span>}</>
                  ) : (
                    <span className="pd__price tabular">{price || "Consultar precio"}</span>
                  )}
                  <span className={`pd__stock ${soldOut ? "is-out" : "is-in"}`}>{soldOut ? "Sin stock" : "En stock"}</span>
                </div>

                {/* Colores del diseño elegido */}
                {colorList.length > 1 && (
                  <div className="pd__pick">
                    <span className="pd__buyLabel">Color</span>
                    <div className="pd__sizeOpts">
                      {colorList.map((c) => {
                        const label = [c.name, c.acabado].filter(Boolean).join(" ");
                        return (
                          <button key={c.id} type="button"
                            className={`pd__sizeOpt pd__colorOpt ${selected.id === c.id ? "is-on" : ""} ${c.soldOut ? "is-out" : ""}`}
                            onClick={() => setVariantId(c.id)}
                            title={c.soldOut ? `${label} — sin stock` : label}>
                            <span className="pd__swatch" style={{ background: c.hex }} />
                            {c.soldOut ? <s>{label}</s> : label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Talles */}
                {sizes.length > 0 && (
                  <div className="pd__pick">
                    <span className="pd__buyLabel">
                      {canBuy ? "Talle" : "Talles disponibles"}
                      {canBuy && sizeError && !size && <em className="pd__sizeReq"> — elegí uno</em>}
                    </span>
                    <div className="pd__sizeOpts">
                      {sizes.map((s) => (
                        canBuy ? (
                          <button key={s} type="button" className={`pd__sizeOpt ${size === s ? "is-on" : ""}`}
                            onClick={() => { setSize(s); setSizeError(false); }}>{s}</button>
                        ) : (
                          <span key={s} className="pd__sizeOpt is-info">{s}</span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {canBuy && (
                  <div className="pd__pick">
                    <span className="pd__buyLabel">Cantidad</span>
                    <div className="pd__qty">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Restar uno"><Minus size={16} /></button>
                      <span className="pd__qtyN tabular">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Sumar uno"><Plus size={16} /></button>
                    </div>
                  </div>
                )}

                <div className="pd__actions">{ActionsBlock}</div>

                {heroStats.length > 0 && (
                  <div className="pd__heroStats">
                    {heroStats.map((s) => (
                      <div key={s.label} className="pd__stat">
                        <span className="pd__statVal">{s.value}</span>
                        <span className="pd__statLabel">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage: imagen enmarcada + miniaturas de los colores del diseño */}
              <div className="pdm__stage">
                <div className="pdm__gallery">
                  <div className={`pdm__frame ${soldOut ? "is-out" : ""}`}>
                    <span className="pdm__glow" aria-hidden="true" />
                    <motion.img className="pdm__img" key={selected.image}
                      src={selected.image || PRODUCT_PLACEHOLDER} alt={name}
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
                      onError={onImgErr} />
                    {soldOut && <span className="pdm__soldBadge">Sin stock</span>}
                    {prevPrice && <span className="pcard__outlet pdm__outletBadge">{disc > 0 ? `-${disc}%` : "Outlet"}</span>}
                  </div>

                  {colorList.length > 1 && (
                    <div className="pdm__thumbs" role="list" aria-label="Colores">
                      {colorList.map((c) => (
                        <button key={c.id} type="button" role="listitem"
                          className={`pdm__thumb ${selected.id === c.id ? "is-on" : ""} ${c.soldOut ? "is-out" : ""}`}
                          onClick={() => setVariantId(c.id)}
                          title={[c.name, c.acabado].filter(Boolean).join(" ") + (c.soldOut ? " — sin stock" : "")}>
                          <img src={c.image || PRODUCT_PLACEHOLDER} alt={c.name} loading="lazy" onError={onImgErr} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          {groups.length > 0 && (
            <div className="pd__section">
              <h2 className="pd__secTitle"><Gauge size={22} /> Ficha técnica</h2>
              <div className="pd__specGroups">{groups.map((g) => (
                <div key={g.title} className="pd__specGroup"><h3 className="pd__specGroupTitle"><g.icon size={16} /> {g.title}</h3>
                  <dl className="pd__specs">{g.rows.map((r) => (<div key={r.label} className="pd__spec"><dt>{r.label}</dt><dd>{r.value}</dd></div>))}</dl>
                </div>))}
              </div>
            </div>
          )}

          {(cascoSpecs.length > 0 || apparelSpecs.length > 0) && (
            <div className="pd__section">
              <h2 className="pd__secTitle"><Gauge size={22} /> Especificaciones</h2>
              <div className="pd__specGroups"><div className="pd__specGroup"><dl className="pd__specs">
                {[...cascoSpecs, ...apparelSpecs].map((r) => (<div key={r.label} className="pd__spec"><dt>{r.label}</dt><dd>{r.value}</dd></div>))}
              </dl></div></div>
            </div>
          )}

          {(cascoFeats.length > 0 || motoFeats.length > 0 || apparelFeats.length > 0) && (
            <div className="pd__section">
              <h2 className="pd__secTitle"><ShieldCheck size={22} /> Equipamiento</h2>
              <div className="pd__featGrid">
                {[...motoFeats, ...cascoFeats, ...apparelFeats].map((f) => (
                  <div key={f.key} className="pd__feat"><f.icon size={22} /><span>{f.label}</span></div>
                ))}
              </div>
            </div>
          )}

          {customSpecs.length > 0 && (
            <div className="pd__section">
              <h2 className="pd__secTitle"><Gauge size={22} /> Más especificaciones</h2>
              <div className="pd__specGroups"><div className="pd__specGroup"><dl className="pd__specs">
                {customSpecs.map(([k, v]) => (<div key={k} className="pd__spec"><dt>{k}</dt><dd>{String(v)}</dd></div>))}
              </dl></div></div>
            </div>
          )}

          {moto && (
            <div className="pd__finBand">
              <div>
                <p className="eyebrow">Financiación</p>
                <h2 className="pd__finTitle">Llevala financiada</h2>
                <p className="pd__finSub">Conocé las opciones, requisitos y condiciones de cada banco y financiera.</p>
              </div>
              <Link to={`/financiacion?moto=${encodeURIComponent(model.slug)}`} className="btn btn-primary">Ver financiación <ChevronRight size={18} /></Link>
            </div>
          )}

          {model.description && model.description.trim() && (
            <div className="pd__section">
              <h2 className="pd__secTitle">Descripción</h2>
              <p className="pd__desc">{model.description}</p>
            </div>
          )}

          {/* Otros diseños del mismo modelo */}
          {otherDesigns.length > 0 && (
            <div className="pd__section">
              <h2 className="pd__secTitle">Otros diseños de {model.title}</h2>
              <div className="pd__designs">
                {otherDesigns.map((d) => (
                  <Link key={d.design} to={`/producto/${encodeURIComponent(model.slug)}/${encodeURIComponent(d.design)}`} className="pd__designCard">
                    <div className="pd__designImg"><img src={d.image} alt={`${model.title} ${d.label}`} loading="lazy" onError={onImgErr} /></div>
                    <span className="pd__designName">{d.label}</span>
                    {d.price && <span className="pd__designPrice tabular">{d.price}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
