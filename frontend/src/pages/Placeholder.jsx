import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageTransition from "../components/PageTransition";
import "./Placeholder.css";

// Página en construcción, on-brand. Se reemplaza por la real en cada fase.
export default function Placeholder({ eyebrow, title, subtitle }) {
  return (
    <PageTransition>
      <section className="ph">
        <div className="container ph__inner">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="ph__title">{title}</h1>
          {subtitle && <p className="ph__sub">{subtitle}</p>}
          <Link to="/" className="btn btn-secondary ph__back">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
        </div>
        <div className="ph__glow" aria-hidden="true" />
      </section>
    </PageTransition>
  );
}
