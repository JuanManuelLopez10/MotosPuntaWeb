import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle, ShoppingCart, CalendarClock, Percent, Gauge, ShieldCheck, Cog, Wrench,
  Zap, ArrowDownUp, Waves, Navigation, Sun, Flame, Armchair, SlidersHorizontal, Droplets, Glasses, Wind, Thermometer,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import { waLink, waProductMessage, waBuyMessage, waReserveMessage } from "../data/site";
import { formatPrice, priceValue } from "../lib/catalog";
import { variants as getVariants, modelDesigns, isMotoModel, colorHex } from "../lib/models";
import { useSeo } from "../lib/seo";
import { useCart } from "../lib/cart.jsx";
import "./Producto.css";

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

export default function ModelPage({ model }) {
  const vs = getVariants(model);
  const moto = isMotoModel(model);
  const casco = String(model.productType || "").toLowerCase() === "cascos";
  const designs = modelDesigns(model);

  const [design, setDesign] = useState(designs[0] || null);
  const designVariants = useMemo(
    () => (casco && design ? vs.filter((v) => v.design === design) : vs),
    [vs, casco, design],
  );
  const [variantId, setVariantId] = useState(designVariants[0]?.id);
  useEffect(() => { setVariantId(designVariants[0]?.id); }, [design]); // al cambiar diseño, primer color
  const selected = designVariants.find((v) => v.id === variantId) || designVariants[0] || vs[0] || {};

  const price = formatPrice(selected.price);
  const prevPrice = selected.outlet && priceValue(selected.precioAnterior) > priceValue(selected.price)
    ? formatPrice(selected.precioAnterior) : null;
  const soldOut = String(selected.availability || "").toLowerCase() !== "in stock";
  const sizes = offeredSizes(selected);
  const finish = [selected.colorName, selected.acabado].filter(Boolean).join(" ");
  const name = [model.title, finish].filter(Boolean).join(" ");

  useSeo({
    path: `/producto/${model.slug}`,
    title: model.seo?.title || model.title,
    description: model.seo?.description || model.description || `${model.title} en Motos Punta, Maldonado.`,
    image: selected.image,
    type: "product",
  });
  useEffect(() => { window.scrollTo(0, 0); }, [model.slug]);

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

  const colorList = designVariants.map((v) => ({ id: v.id, name: v.colorName, hex: (v.color || "").startsWith("#") ? v.color : colorHex(v.colorName), acabado: v.acabado }));

  // --- Compra (carrito): solo no-motos con stock y precio. El id del carrito es el legacyId
  //     (id de `products`) para que el backend recalcule el precio como siempre. ---
  const { addItem } = useCart();
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const canBuy = !moto && !soldOut && !!price;
  const needsSize = sizes.length > 0;
  useEffect(() => { setSize(null); setSizeError(false); }, [selected.id]);

  const handleAdd = () => {
    if (needsSize && !size) { setSizeError(true); return; }
    addItem({
      // id = dirección de la variante en `productos` (para que el backend la encuentre y recalcule el precio)
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
    setTimeout(() => setAdded(false), 2500);
  };

  // CTA: moto sin stock -> reservar; moto con stock -> comprar+financiación; resto -> consultar
  let cta;
  if (moto && soldOut) cta = <a className="pcard__cta pcard__cta--reserve" href={waLink(waReserveMessage(name))} target="_blank" rel="noreferrer"><CalendarClock size={16} /> Encargar / Reservar</a>;
  else if (moto) cta = (
    <div className="pcard__ctas">
      <a className="pcard__cta pcard__cta--buy" href={waLink(waBuyMessage(name, price))} target="_blank" rel="noreferrer"><ShoppingCart size={16} /> Comprar</a>
      <Link className="pcard__cta" to={`/financiacion?moto=${encodeURIComponent(model.slug)}`}><Percent size={16} /> Financiación</Link>
    </div>
  );
  else cta = <a className="pcard__cta" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Consultar por WhatsApp</a>;

  return (
    <PageTransition>
      <section className="pd">
        <div className="container">
          <div className="pd__hero">
            <div className="pd__heroInfo">
              <motion.h1 className="pd__title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{model.title}</motion.h1>
              {(moto ? model.type : finish) && <p className="pd__sub">{moto ? model.type : finish}</p>}

              <div className="pd__priceRow">
                {prevPrice ? (<><span className="pd__price pd__price--outlet tabular">{price}</span><span className="pd__priceOld tabular">{prevPrice}</span></>)
                  : (<span className="pd__price tabular">{price || "Consultar precio"}</span>)}
                {moto && <span className={`pd__stock ${soldOut ? "is-out" : "is-in"}`}>{soldOut ? "Sin stock" : "En stock"}</span>}
              </div>

              {/* Selector de diseño (cascos) */}
              {casco && designs.length > 1 && (
                <div className="pd__buy">
                  <span className="pd__buyLabel">Diseño</span>
                  <div className="pd__sizeOpts">
                    {designs.map((d) => (
                      <button key={d} type="button" className={`pd__sizeOpt ${design === d ? "is-on" : ""}`} onClick={() => setDesign(d)}>
                        {d.replace(/-/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de color */}
              {colorList.length > 1 && (
                <div className="pd__buy">
                  <span className="pd__buyLabel">Color</span>
                  <div className="pd__sizeOpts">
                    {colorList.map((c) => (
                      <button key={c.id} type="button" className={`pd__sizeOpt ${selected.id === c.id ? "is-on" : ""}`}
                        onClick={() => setVariantId(c.id)} title={[c.name, c.acabado].filter(Boolean).join(" ")}>
                        <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)", marginRight: 7, verticalAlign: "-1px" }} />
                        {[c.name, c.acabado].filter(Boolean).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Talles del color elegido (seleccionables si se puede comprar) */}
              {sizes.length > 0 && (
                <div className="pd__buy">
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
                        <span key={s} className="pd__sizeOpt is-on" style={{ cursor: "default" }}>{s}</span>
                      )
                    ))}
                  </div>
                </div>
              )}

              {canBuy ? (
                <>
                  <div className="pd__buy">
                    <span className="pd__buyLabel">Cantidad</span>
                    <div className="pd__qty">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Restar uno">−</button>
                      <span className="pd__qtyN tabular">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Sumar uno">+</button>
                    </div>
                  </div>
                  <div className="pd__actions">
                    <button className="pcard__cta pcard__cta--buy" onClick={handleAdd}>
                      <ShoppingCart size={16} /> {added ? "Agregado ✓" : "Agregar al carrito"}
                    </button>
                    <a className="pcard__cta" href={waLink(waProductMessage(name))} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} /> Consultar
                    </a>
                  </div>
                </>
              ) : (
                <div className="pd__actions">{cta}</div>
              )}
            </div>

            <div className="pd__heroStage">
              <motion.img className="pd__heroImg" key={selected.image} src={selected.image} alt={name}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        </div>

        <div className="container">
          {heroStats.length > 0 && (
            <div className="pd__section"><div className="pd__heroStats">
              {heroStats.map((s) => (<div key={s.label} className="pd__stat"><span className="pd__statVal">{s.value}</span><span className="pd__statLabel">{s.label}</span></div>))}
            </div></div>
          )}

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

          {model.description && model.description.trim() && (
            <div className="pd__section">
              <h2 className="pd__secTitle">Descripción</h2>
              <p className="pd__desc">{model.description}</p>
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
