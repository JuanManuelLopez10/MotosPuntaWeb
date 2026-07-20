import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { waLink } from "../data/site";
import "./Header.css";

const WA_HREF = waLink("Hola Motos Punta 👋 Quiero hacer una consulta.");

// WhatsApp es un link más del nav (mismo estilo que los demás); Outlet es el único
// distinto (pill rojo, `hot`). Orden pedido: Motos · Catálogo · Financiación · Contacto ·
// WhatsApp · Outlet.
const NAV = [
  { to: "/motos", label: "Motos" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/financiacion", label: "Financiación" },
  { to: "/contacto", label: "Contacto" },
  { href: WA_HREF, label: "WhatsApp", external: true },
  { to: "/outlet", label: "Outlet", hot: true },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`hdr ${scrolled ? "hdr--solid" : ""}`}>
      <div className="container hdr__row">
        <Link to="/" className="hdr__logo" aria-label="Motos Punta — inicio">
          <img src="/LOGO.png" alt="Motos Punta" height="34" />
        </Link>

        <nav className="hdr__nav" aria-label="Principal">
          {NAV.map((n) =>
            n.external ? (
              <a key={n.label} className="hdr__link" href={n.href} target="_blank" rel="noreferrer">
                {n.label}
              </a>
            ) : (
              <NavLink key={n.label} to={n.to} className={`hdr__link ${n.hot ? "hdr__link--hot" : ""}`}>
                {n.label}
              </NavLink>
            ),
          )}
        </nav>

        <button className="hdr__burger" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="hdr__mobile" onClick={() => setOpen(false)}>
          <nav className="hdr__mobileNav" aria-label="Menú móvil">
            {NAV.map((n) =>
              n.external ? (
                <a key={n.label} className="hdr__mobileLink" href={n.href} target="_blank" rel="noreferrer">
                  {n.label}
                </a>
              ) : (
                <NavLink key={n.label} to={n.to} className={`hdr__mobileLink ${n.hot ? "hdr__link--hot" : ""}`}>
                  {n.label}
                </NavLink>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
