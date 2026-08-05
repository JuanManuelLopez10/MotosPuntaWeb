import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, MessageCircle } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useCart } from "../lib/cart.jsx";
import { waLink } from "../data/site";
import { useSeo } from "../lib/seo";
import "./Checkout.css";

const EASE = [0.22, 1, 0.36, 1];

const STATES = {
  exito: { icon: CheckCircle2, tone: "ok", title: "¡Pago aprobado!", sub: "Recibimos tu pago. Te contactamos para coordinar la entrega." },
  pendiente: { icon: Clock, tone: "pending", title: "Pago pendiente", sub: "Tu pago está en proceso. Apenas se acredite, coordinamos la entrega." },
  error: { icon: XCircle, tone: "error", title: "El pago no se completó", sub: "No se concretó el pago. Podés intentar de nuevo o escribirnos por WhatsApp." },
};

export default function CheckoutResultado() {
  const location = useLocation();
  const [params] = useSearchParams();
  const { clear } = useCart();
  const key = location.pathname.split("/").pop(); // exito | error | pendiente
  const st = STATES[key] || STATES.pendiente;
  const orderId = params.get("external_reference");

  useSeo({ path: `/checkout/${key}`, title: st.title, description: "Estado de tu pago en Motos Punta." });

  useEffect(() => {
    if (key === "exito") clear(); // el pedido ya se pagó; vaciamos el carrito
  }, [key, clear]);

  const Icon = st.icon;
  const waHref = waLink(`Hola Motos Punta 👋 Consulto por mi pedido${orderId ? ` #${orderId}` : ""}.`);

  return (
    <PageTransition>
      <section className="cko">
        <div className="container">
          <motion.div className={`cko__done cko__done--${st.tone}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <Icon size={48} className="cko__doneIcon" />
            <h1 className="cko__doneTitle">{st.title}</h1>
            <p className="cko__doneSub">{st.sub}{orderId ? <> Pedido <strong>#{orderId}</strong>.</> : null}</p>
            <div className="cko__doneActions">
              {key === "error"
                ? <Link className="btn btn-primary" to="/checkout">Volver a intentar</Link>
                : <Link className="btn btn-primary" to="/catalogo">Seguir comprando</Link>}
              <a className="btn btn-secondary" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
            </div>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}
