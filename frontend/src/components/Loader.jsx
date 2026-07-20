import { useEffect, useState } from "react";
import "./Loader.css";

// Overlay a pantalla completa con el logo mientras carga el contenido. Tapa TODO (incluido
// el header) y bloquea el scroll/interacción hasta que `show` pase a false. Aparece recién
// a los `delay` ms para no parpadear en cargas rápidas (API caliente) y se desvanece al
// terminar. La ENTRADA es una animación CSS (automática al montar) y la SALIDA una clase
// + transición; no se usa AnimatePresence ni requestAnimationFrame (poco fiables con
// StrictMode: el overlay quedaba montado u opaco a 0).
export default function Loader({ show, delay = 150, label = "Cargando" }) {
  const [mounted, setMounted] = useState(false); // presencia en el DOM
  const [leaving, setLeaving] = useState(false);  // fade de salida

  useEffect(() => {
    if (show) {
      // Espera `delay` antes de montar; si la carga fue rapidísima nunca aparece.
      const t = setTimeout(() => { setLeaving(false); setMounted(true); }, delay);
      return () => clearTimeout(t);
    }
    // Terminó de cargar: desvanecer y desmontar al final del fade.
    setLeaving(true);
    const t = setTimeout(() => setMounted(false), 420);
    return () => clearTimeout(t);
  }, [show, delay]);

  // Bloquea el scroll del body mientras el overlay está montado.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`loader ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="loader__inner">
        <div className="loader__logoWrap">
          <span className="loader__ring" aria-hidden="true" />
          <img className="loader__logo" src="/LOGO.png" alt="Motos Punta" />
        </div>
        <span className="loader__label">{label}<span className="loader__dots" aria-hidden="true" /></span>
        <span className="loader__bar" aria-hidden="true" />
      </div>
    </div>
  );
}
