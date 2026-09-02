import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, Truck, Building2, Wallet, CreditCard, MessageCircle, ShieldCheck, Check, Loader2, CheckCircle2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useCart } from "../lib/cart.jsx";
import { CHECKOUT } from "../data/checkout";
import { waLink } from "../data/site";
import { submitOrder } from "../lib/orders";
import { trackCheckout } from "../lib/relevance";
import { useSeo } from "../lib/seo";
import "./Checkout.css";

const EASE = [0.22, 1, 0.36, 1];
const fmt = (n) => `USD ${Number(n || 0).toLocaleString("es-UY")}`;

const DELIVERY = [
  { key: "retiro", label: "Retiro en el local", icon: Store, note: "Arturo Santana esq. 19 de Abril, Maldonado. Sin costo." },
  { key: "envio", label: "Envío a domicilio", icon: Truck, note: "Coordinamos el envío por transporte. El costo lo pagás al recibir el paquete." },
];

const PAY_METHODS = [
  { key: "transferencia", label: "Transferencia bancaria", icon: Building2, note: "Precio de lista. Te pasamos los datos y nos mandás el comprobante." },
  { key: "efectivo", label: "Reserva y pago en efectivo", icon: Wallet, note: "Precio de lista. Reservás y pagás al retirar en el local." },
  { key: "mercadopago", label: "Mercado Pago (tarjeta)", icon: CreditCard, note: `Pago online con tarjeta. Se suma ${CHECKOUT.mpSurchargePct}% por el costo de la tarjeta.` },
];

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const [entrega, setEntrega] = useState("retiro");
  const [metodo, setMetodo] = useState("transferencia");
  const [form, setForm] = useState({ nombre: "", contacto: "", direccion: "", ciudad: "", website: "" });
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useSeo({ path: "/checkout", title: "Finalizar compra", description: "Completá tu pedido en Motos Punta, Maldonado." });

  // El envío lo cobra la transportadora contra entrega: no se suma al pago online.
  const base = subtotal;
  const surcharge = metodo === "mercadopago" ? Math.round((base * CHECKOUT.mpSurchargePct) / 100) : 0;
  const total = base + surcharge;

  // Aviso a la app: un cliente llegó al checkout (fase previa a la compra). 1 vez por sesión.
  useEffect(() => {
    if (items.length > 0) {
      const resumen = items.map((i) => `${i.qty}× ${i.title}${i.size ? ` · ${i.size}` : ""}`).join(", ");
      trackCheckout(resumen, fmt(subtotal));
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsAddress = entrega === "envio";
  const errors = {
    nombre: !form.nombre.trim(),
    contacto: !form.contacto.trim(),
    direccion: needsAddress && !form.direccion.trim(),
    ciudad: needsAddress && !form.ciudad.trim(),
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleConfirm = async () => {
    setTouched(true);
    if (!isValid || status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await submitOrder({
        items: items.map((i) => ({ id: i.id, size: i.size, qty: i.qty })),
        cliente: { nombre: form.nombre.trim(), contacto: form.contacto.trim(), direccion: form.direccion.trim(), ciudad: form.ciudad.trim() },
        entrega,
        metodo,
        website: form.website,
      });
      if (metodo === "mercadopago" && res.initPoint) {
        window.location.href = res.initPoint; // redirige a Mercado Pago
        return;
      }
      clear();
      setResult(res);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message || "No se pudo procesar el pedido. Probá de nuevo o escribinos por WhatsApp.");
    }
  };

  // --- Pantalla de confirmación (transferencia / efectivo) ---
  if (status === "ok" && result) {
    const esTransfer = result.metodo === "transferencia";
    const waHref = waLink(
      esTransfer
        ? `Hola Motos Punta 👋 Hice el pedido #${result.orderId} y voy a pagar por transferencia. Te mando el comprobante.`
        : `Hola Motos Punta 👋 Reservé el pedido #${result.orderId} para pagar en efectivo al retirar. ¿Coordinamos?`,
    );
    return (
      <PageTransition>
        <section className="cko">
          <div className="container">
            <motion.div className="cko__done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <CheckCircle2 size={48} className="cko__doneIcon" />
              <h1 className="cko__doneTitle">{esTransfer ? "¡Pedido registrado!" : "¡Reserva registrada!"}</h1>
              <p className="cko__doneSub">
                Gracias{form.nombre.trim() ? `, ${form.nombre.trim().split(" ")[0]}` : ""}. Tu pedido <strong>#{result.orderId}</strong> quedó anotado por <strong>{fmt(result.totalUsd)}</strong>.
              </p>

              {esTransfer ? (
                <div className="cko__bank">
                  <p className="cko__bankTitle">Datos para la transferencia</p>
                  <dl className="cko__bankRows">
                    <div><dt>Banco</dt><dd>{CHECKOUT.bank.banco}</dd></div>
                    <div><dt>Titular</dt><dd>{CHECKOUT.bank.titular}</dd></div>
                    <div><dt>Cuenta en dólares</dt><dd className="tabular">{CHECKOUT.bank.cuentaUsd}</dd></div>
                    <div><dt>Cuenta en pesos</dt><dd className="tabular">{CHECKOUT.bank.cuentaUyu}</dd></div>
                  </dl>
                  {CHECKOUT.bank.nota && <p className="cko__bankNote">{CHECKOUT.bank.nota}</p>}
                  <p className="cko__bankNote">Hacé la transferencia y mandanos el comprobante por WhatsApp para confirmar.</p>
                </div>
              ) : (
                <p className="cko__doneMsg">Te esperamos en el local para pagar en efectivo y retirar. Coordinemos el día y horario por WhatsApp.</p>
              )}

              <div className="cko__doneActions">
                <a className="btn btn-primary" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={18} /> {esTransfer ? "Enviar comprobante" : "Coordinar retiro"}</a>
                <Link className="btn btn-secondary" to="/catalogo">Seguir comprando</Link>
              </div>
            </motion.div>
          </div>
        </section>
      </PageTransition>
    );
  }

  if (items.length === 0) {
    return (
      <PageTransition>
        <section className="cko">
          <div className="container">
            <div className="cko__empty">
              <h1 className="cko__emptyTitle">No hay nada para pagar</h1>
              <p className="cko__emptySub">Tu carrito está vacío.</p>
              <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
            </div>
          </div>
        </section>
      </PageTransition>
    );
  }

  const fieldClass = (k) => `cko__field ${touched && errors[k] ? "is-error" : ""}`;
  const isMp = metodo === "mercadopago";

  return (
    <PageTransition>
      <section className="cko">
        <div className="container">
          <header className="cko__head">
            <p className="eyebrow">Finalizar compra</p>
            <h1 className="cko__title">Último paso</h1>
            <Link to="/carrito" className="cko__back">← Volver al carrito</Link>
          </header>

          <div className="cko__layout">
            <div className="cko__main">
              {/* 1 · Datos */}
              <section className="cko__block">
                <h2 className="cko__blockTitle"><span className="cko__num">1</span> Tus datos</h2>
                <div className="cko__fields">
                  <label className={fieldClass("nombre")}>
                    <span>Nombre y apellido *</span>
                    <input type="text" value={form.nombre} onChange={set("nombre")} autoComplete="name" />
                  </label>
                  <label className={fieldClass("contacto")}>
                    <span>Teléfono (WhatsApp) *</span>
                    <input type="tel" inputMode="tel" value={form.contacto} onChange={set("contacto")} placeholder="099 123 456" autoComplete="tel" />
                  </label>
                </div>
              </section>

              {/* 2 · Entrega */}
              <section className="cko__block">
                <h2 className="cko__blockTitle"><span className="cko__num">2</span> Entrega</h2>
                <div className="cko__opts cko__opts--2">
                  {DELIVERY.map((d) => (
                    <button key={d.key} type="button" className={`cko__opt ${entrega === d.key ? "is-on" : ""}`} aria-pressed={entrega === d.key} onClick={() => setEntrega(d.key)}>
                      <d.icon size={20} className="cko__optIcon" />
                      <span className="cko__optLabel">{d.label}</span>
                      <span className="cko__optNote">{d.note}</span>
                      {entrega === d.key && <Check size={16} className="cko__optCheck" />}
                    </button>
                  ))}
                </div>
                {needsAddress && (
                  <div className="cko__fields cko__fields--address">
                    <label className={fieldClass("direccion")}>
                      <span>Dirección *</span>
                      <input type="text" value={form.direccion} onChange={set("direccion")} placeholder="Calle y número" autoComplete="street-address" />
                    </label>
                    <label className={fieldClass("ciudad")}>
                      <span>Ciudad / localidad *</span>
                      <input type="text" value={form.ciudad} onChange={set("ciudad")} autoComplete="address-level2" />
                    </label>
                  </div>
                )}
              </section>

              {/* 3 · Pago */}
              <section className="cko__block">
                <h2 className="cko__blockTitle"><span className="cko__num">3</span> Cómo querés pagar</h2>
                <div className="cko__opts">
                  {PAY_METHODS.map((m) => (
                    <button key={m.key} type="button" className={`cko__opt cko__opt--pay ${metodo === m.key ? "is-on" : ""}`} aria-pressed={metodo === m.key} onClick={() => setMetodo(m.key)}>
                      <m.icon size={20} className="cko__optIcon" />
                      <span className="cko__optLabel">{m.label}</span>
                      <span className="cko__optNote">{m.note}</span>
                      {metodo === m.key && <Check size={16} className="cko__optCheck" />}
                    </button>
                  ))}
                </div>
                {metodo === "transferencia" && (
                  <p className="cko__hint"><ShieldCheck size={15} /> Al confirmar te mostramos los datos bancarios y coordinás el comprobante por WhatsApp.</p>
                )}
              </section>
            </div>

            {/* Resumen */}
            <aside className="cko__summary">
              <h2 className="cko__sumTitle">Tu pedido</h2>
              <ul className="cko__items">
                {items.map((it) => (
                  <li key={`${it.id}__${it.size || ""}`} className="cko__item">
                    <span className="cko__itemQty">{it.qty}×</span>
                    <span className="cko__itemName">{it.title}{it.size ? ` · T${it.size}` : ""}</span>
                    <span className="cko__itemLine tabular">{fmt(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="cko__sumRow"><span>Subtotal</span><span className="tabular">{fmt(subtotal)}</span></div>
              <div className="cko__sumRow cko__sumRow--muted"><span>Envío</span><span>{entrega === "envio" ? "A coordinar" : "—"}</span></div>
              {surcharge > 0 && (
                <div className="cko__sumRow cko__sumRow--surcharge"><span>Costo tarjeta ({CHECKOUT.mpSurchargePct}%)</span><span className="tabular">{fmt(surcharge)}</span></div>
              )}
              <div className="cko__sumRow cko__sumRow--total"><span>Total</span><span className="tabular">{fmt(total)}</span></div>

              {status === "error" && <p className="cko__err">{errorMsg}</p>}

              <button type="button" className="btn btn-primary cko__confirm" onClick={handleConfirm} disabled={status === "sending"}>
                {status === "sending"
                  ? <><Loader2 size={18} className="cko__spin" /> Procesando…</>
                  : isMp
                    ? <><CreditCard size={18} /> Pagar con Mercado Pago</>
                    : <><Check size={18} /> Confirmar pedido</>}
              </button>

              <p className="cko__note">
                {isMp
                  ? "Te llevamos a la pantalla segura de Mercado Pago para completar el pago."
                  : "Registramos tu pedido y coordinamos pago y entrega por WhatsApp."}
              </p>
            </aside>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
