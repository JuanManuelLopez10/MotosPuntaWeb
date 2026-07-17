import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, MessageCircle, Instagram, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { SITE, waLink } from "../data/site";
import { submitLead } from "../lib/leads";
import "./Contacto.css";

const EASE = [0.22, 1, 0.36, 1];

export default function Contacto() {
  const [form, setForm] = useState({ nombre: "", contacto: "", mensaje: "", website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
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
        tipo: "contacto",
        nombre: form.nombre,
        contacto: form.contacto,
        mensaje: form.mensaje,
        website: form.website,
      });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "No se pudo enviar. Probá de nuevo o escribinos por WhatsApp.");
    }
  };

  return (
    <PageTransition>
      <section className="ct">
        <div className="container ct__grid">
          <div className="ct__intro">
            <p className="eyebrow">Contacto</p>
            <h1 className="ct__title">Hablemos</h1>
            <p className="ct__sub">
              Dejanos tu consulta y te respondemos a la brevedad. O escribinos directo por
              WhatsApp, como prefieras.
            </p>
            <div className="ct__channels">
              <a href={waLink("Hola Motos Punta 👋")} target="_blank" rel="noreferrer" className="ct__channel">
                <MessageCircle size={18} /> {SITE.phoneDisplay}
              </a>
              <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="ct__channel">
                <Instagram size={18} /> @{SITE.instagram}
              </a>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(SITE.mapsQuery)}`} target="_blank" rel="noreferrer" className="ct__channel">
                <MapPin size={18} /> {SITE.address}
              </a>
            </div>
          </div>

          <motion.div className="ct__formWrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            {status === "ok" ? (
              <div className="ct__success">
                <CheckCircle2 size={44} />
                <h2>¡Mensaje enviado!</h2>
                <p>Gracias{form.nombre.trim() ? `, ${form.nombre.trim().split(" ")[0]}` : ""}. Te vamos a responder pronto.</p>
                <a className="btn btn-secondary" href={waLink("Hola Motos Punta 👋")} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> Seguir por WhatsApp
                </a>
              </div>
            ) : (
              <form className="ct__form" onSubmit={submit} noValidate>
                <label className="ct__field">
                  <span>Nombre *</span>
                  <input type="text" value={form.nombre} onChange={set("nombre")} autoComplete="name" required />
                </label>
                <label className="ct__field">
                  <span>Teléfono o email *</span>
                  <input type="text" value={form.contacto} onChange={set("contacto")} placeholder="099 123 456 o tu@email.com" required />
                </label>
                <label className="ct__field">
                  <span>Mensaje</span>
                  <textarea rows={5} value={form.mensaje} onChange={set("mensaje")} placeholder="¿En qué te podemos ayudar?" />
                </label>

                {/* Honeypot anti-spam (oculto para humanos) */}
                <input className="ct__hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} aria-hidden="true" />

                {status === "error" && <p className="ct__err">{errorMsg}</p>}

                <button type="submit" className="btn btn-primary ct__submit" disabled={status === "sending" || !canSend}>
                  {status === "sending" ? (<><Loader2 size={18} className="ct__spin" /> Enviando…</>) : (<><Send size={18} /> Enviar consulta</>)}
                </button>

                <p className="ct__note">
                  Al enviar aceptás que usemos tus datos para responderte. <Link to="/privacidad">Aviso de privacidad</Link>.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}
