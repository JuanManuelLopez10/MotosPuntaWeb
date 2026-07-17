import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { SITE, waLink } from "../data/site";
import "./Header.css";

const NAV = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/outlet", label: "Outlet", hot: true },
  { to: "/financiacion", label: "Financiación" },
  { to: "/contacto", label: "Contacto" },
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
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={`hdr__link ${n.hot ? "hdr__link--hot" : ""}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <a
          className="btn btn-primary hdr__cta"
          href={waLink("Hola Motos Punta 👋 Quiero hacer una consulta.")}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>

        <button className="hdr__burger" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="hdr__mobile" onClick={() => setOpen(false)}>
          <nav className="hdr__mobileNav" aria-label="Menú móvil">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={`hdr__mobileLink ${n.hot ? "hdr__link--hot" : ""}`}>
                {n.label}
              </NavLink>
            ))}
            <a className="btn btn-primary" href={waLink("Hola Motos Punta 👋 Quiero hacer una consulta.")} target="_blank" rel="noreferrer">
              Consultar por WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
