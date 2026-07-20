import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Info, MessageCircle, ArrowRight, ShieldCheck, ClipboardCheck, Send, Loader2, CheckCircle2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { FINANCING, ELIGIBILITY_QUESTIONS, evaluate } from "../data/financing";
import { waLink } from "../data/site";
import { fetchProducts, formatPrice, productFullName } from "../lib/catalog";
import { submitLead } from "../lib/leads";
import { useSeo } from "../lib/seo";
import "./Financiacion.css";

const EASE = [0.22, 1, 0.36, 1];

function YesNo({ value, onChange }) {
  return (
    <div className="yn" role="group">
      <button type="button" className={`yn__opt ${value === true ? "is-on" : ""}`} aria-pressed={value === true} onClick={() => onChange(value === true ? undefined : true)}>Sí</button>
      <button type="button" className={`yn__opt ${value === false ? "is-on" : ""}`} aria-pressed={value === false} onClick={() => onChange(value === false ? undefined : false)}>No</button>
    </div>
  );
}

export default function Financiacion() {
  const [searchParams] = useSearchParams();
  const motoId = searchParams.get("moto") || "";
  const [moto, setMoto] = useState(null);
  const [answers, setAnswers] = useState({});
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [requestFor, setRequestFor] = useState(null); // entidad para la solicitud (modal)

  useSeo({
    path: "/financiacion",
    title: "Financiación de motos",
    description:
      "Financiá tu moto 0km en Maldonado. Trabajamos con BBVA, Santander, Creditel, Créditos Directos, Anda y más. Completá el checklist y mirá a qué opciones accedés.",
  });

  useEffect(() => {
    if (!motoId) return;
    let alive = true;
    fetchProducts().then((list) => { if (alive) setMoto(list.find((p) => p.id === motoId) || null); }).catch(() => {});
    return () => { alive = false; };
  }, [motoId]);

  const motoName = moto ? productFullName(moto) : "";
  const motoPrice = moto ? formatPrice(moto.price) : "";
  const setAnswer = (key, val) => setAnswers((a) => ({ ...a, [key]: val }));

  const results = useMemo(() => FINANCING.map((f) => ({ f, ...evaluate(f, answers) })), [answers]);
  const answered = Object.values(answers).some((v) => v !== undefined && v !== "");
  const eligibleCount = results.filter((r) => r.status === "ok").length;
  const shown = onlyEligible ? results.filter((r) => r.status !== "no") : results;

  const waFor = (name) => {
    const forMoto = motoName ? ` para la ${motoName}${motoPrice ? ` (${motoPrice})` : ""}` : "";
    return waLink(`Hola Motos Punta 👋 Cumplo con los requisitos de ${name}${forMoto}. Quiero avanzar con la financiación.`);
  };
  const waGeneral = waLink(`Hola Motos Punta 👋 Quiero consultar por financiación${motoName ? ` de la ${motoName}` : ""}.`);

  const questions = ELIGIBILITY_QUESTIONS.filter((q) => !q.dependsOn || answers[q.dependsOn] === true);

  return (
    <PageTransition>
      <section className="fin">
        <div className="container">
          <header className="fin__head">
            <p className="eyebrow">Financiación</p>
            <h1 className="fin__title">Financiá tu moto</h1>
            <p className="fin__intro">
              Trabajamos con los principales bancos y financieras del Uruguay. Completá el
              checklist y te decimos a cuáles podés acceder — después escribinos para empezar.
            </p>
          </header>

          {moto && (
            <motion.div className="fin__moto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <div className="fin__motoInfo">
                <span className="fin__motoLabel">Estás consultando por</span>
                <span className="fin__motoName">{moto.title}</span>
                {motoPrice && <span className="fin__motoPrice tabular">{motoPrice}</span>}
              </div>
              <a className="btn btn-primary" href={waGeneral} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> Consultar
              </a>
            </motion.div>
          )}

          {/* Checklist de elegibilidad */}
          <div className="check">
            <div className="check__head">
              <ClipboardCheck size={20} className="check__icon" />
              <h2 className="check__title">¿A qué financiación podés acceder?</h2>
            </div>
            <p className="check__sub">Completá tus datos (no se guarda nada) y las opciones se marcan solas.</p>

            <div className="check__grid">
              {questions.map((q) => (
                <div key={q.key} className={`check__q ${q.type === "bool" ? "check__q--bool" : ""}`}>
                  <label className="check__label" htmlFor={`q-${q.key}`}>{q.label}</label>
                  {q.type === "number" ? (
                    <div className="check__num">
                      <input id={`q-${q.key}`} type="number" min="0" inputMode="numeric" value={answers[q.key] ?? ""} onChange={(e) => setAnswer(q.key, e.target.value)} placeholder="0" />
                      {q.suffix && <span className="check__suffix">{q.suffix}</span>}
                    </div>
                  ) : (
                    <YesNo value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
                  )}
                </div>
              ))}
            </div>

            {answered && (
              <div className="check__result">
                <strong>{eligibleCount}</strong> de {FINANCING.length} opciones disponibles con tus datos.
                <label className="check__filter">
                  <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
                  Ocultar las que no cumplo
                </label>
              </div>
            )}
          </div>

          {/* Opciones */}
          <div className="fin__grid">
            {shown.map(({ f, status, fails }, i) => (
              <motion.article
                key={f.id}
                className={`fincard fincard--${status}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.05, ease: EASE }}
              >
                <div className="fincard__top">
                  <h2 className="fincard__name">{f.name}</h2>
                  {f.badge && <span className="fincard__badge">{f.badge}</span>}
                </div>
                {f.tagline && <p className="fincard__tagline">{f.tagline}</p>}

                {answered && status !== "incompleto" && (
                  <div className={`fincard__status fincard__status--${status}`}>
                    {status === "ok" ? <><Check size={15} /> Cumplís los requisitos</> : <><X size={15} /> No cumplís</>}
                  </div>
                )}

                {f.facts?.length > 0 && (
                  <dl className="fincard__facts">
                    {f.facts.map((fact) => (
                      <div key={fact.label} className="fincard__fact">
                        <dt>{fact.label}</dt><dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <p className="fincard__reqTitle">Requisitos</p>
                <ul className="fincard__reqs">
                  {f.requirements.map((r, idx) => (
                    <li key={idx}><Check size={16} className="fincard__check" /><span>{r}</span></li>
                  ))}
                </ul>

                {status === "no" && fails.length > 0 && (
                  <div className="fincard__fails">
                    {fails.map((r, idx) => <p key={idx}><X size={14} /> <span>{r}</span></p>)}
                  </div>
                )}

                {f.notes?.length > 0 && (
                  <div className="fincard__notes">
                    {f.notes.map((n, idx) => <p key={idx}><Info size={15} /> <span>{n}</span></p>)}
                  </div>
                )}

                <button type="button" className={`fincard__cta ${status === "ok" ? "fincard__cta--ok" : ""}`} onClick={() => setRequestFor(f)}>
                  Cumplo con los requisitos <ArrowRight size={16} />
                </button>
              </motion.article>
            ))}
          </div>

          <p className="fin__disclaimer">
            <ShieldCheck size={16} />
            Los requisitos y condiciones son orientativos y pueden variar; se confirman con cada entidad al momento de la solicitud.
          </p>

          <motion.div className="fin__cta" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
            <div>
              <h2 className="fin__ctaTitle">¿Listo para empezar?</h2>
              <p className="fin__ctaSub">Escribinos por WhatsApp y te decimos qué documentación llevar según la opción que elijas.</p>
            </div>
            <div className="fin__ctaActions">
              <a className="btn btn-primary" href={waGeneral} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar por WhatsApp</a>
              <Link to="/motos" className="btn btn-secondary">Ver motos <ArrowRight size={18} /></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {requestFor && (
        <SolicitudModal
          option={requestFor}
          motoName={motoName}
          motoPrice={motoPrice}
          answers={answers}
          eligibles={results.filter((r) => r.status === "ok").map((r) => r.f.name)}
          waHref={waFor(requestFor.name)}
          onClose={() => setRequestFor(null)}
        />
      )}
    </PageTransition>
  );
}

// Modal de solicitud de financiación: captura el contacto y manda un lead con la
// entidad, la moto (si viene) y las respuestas del checklist.
function SolicitudModal({ option, motoName, motoPrice, answers, eligibles, waHref, onClose }) {
  const [form, setForm] = useState({ nombre: "", contacto: "", mensaje: "", website: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSend = form.nombre.trim() && form.contacto.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend || status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await submitLead({
        tipo: "financiacion",
        nombre: form.nombre,
        contacto: form.contacto,
        mensaje: form.mensaje,
        producto: motoName ? `${motoName}${motoPrice ? ` (${motoPrice})` : ""}` : "",
        website: form.website,
        extra: { entidad: option.name, respuestas: answers, elegibles: eligibles },
      });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "No se pudo enviar. Probá de nuevo o escribinos por WhatsApp.");
    }
  };

  return (
    <div className="fmodal" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div
        className="fmodal__card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
      >
        <button className="fmodal__close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>

        {status === "ok" ? (
          <div className="fmodal__ok">
            <CheckCircle2 size={44} />
            <h3>¡Solicitud enviada!</h3>
            <p>Gracias{form.nombre.trim() ? `, ${form.nombre.trim().split(" ")[0]}` : ""}. Te contactamos para avanzar con {option.name}.</p>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Solicitar financiación</p>
            <h3 className="fmodal__title">{option.name}{option.badge ? ` · ${option.badge}` : ""}</h3>
            {motoName && <p className="fmodal__moto">Para: <strong>{motoName}</strong>{motoPrice ? ` — ${motoPrice}` : ""}</p>}

            <form className="fmodal__form" onSubmit={submit} noValidate>
              <label className="ct__field"><span>Nombre *</span><input value={form.nombre} onChange={set("nombre")} autoComplete="name" required /></label>
              <label className="ct__field"><span>Teléfono o email *</span><input value={form.contacto} onChange={set("contacto")} placeholder="099 123 456 o tu@email.com" required /></label>
              <label className="ct__field"><span>Mensaje (opcional)</span><textarea rows={3} value={form.mensaje} onChange={set("mensaje")} placeholder="Algo que quieras aclarar" /></label>
              <input className="ct__hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} aria-hidden="true" />
              {status === "error" && <p className="ct__err">{errorMsg}</p>}
              <div className="fmodal__actions">
                <button type="submit" className="btn btn-primary" disabled={status === "sending" || !canSend}>
                  {status === "sending" ? (<><Loader2 size={18} className="ct__spin" /> Enviando…</>) : (<><Send size={18} /> Enviar solicitud</>)}
                </button>
                <a className="btn btn-secondary" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
              </div>
              <p className="fmodal__note">Enviamos también las respuestas de tu checklist para agilizar.</p>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
