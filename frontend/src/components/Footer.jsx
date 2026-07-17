import { useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, MapPin, MessageCircle } from "lucide-react";
import { SITE, waLink } from "../data/site";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  const [showMap, setShowMap] = useState(false);
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(SITE.mapsQuery)}&z=15&output=embed`;
  return (
    <footer className="ftr">
      <div className="container ftr__grid">
        <div className="ftr__brand">
          <img src="/logo.svg" alt="Motos Punta" height="40" />
          <p className="ftr__tag">
            Concesionaria de motos en Maldonado. Motos 0 km, cascos, indumentaria y accesorios.
          </p>
        </div>

        <div className="ftr__col">
          <h4 className="ftr__h">Navegar</h4>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/financiacion">Financiación</Link>
          <Link to="/contacto">Contacto</Link>
        </div>

        <div className="ftr__col">
          <h4 className="ftr__h">Contacto</h4>
          <a href={waLink("Hola Motos Punta 👋")} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> {SITE.phoneDisplay}
          </a>
          <a href={SITE.instagramUrl} target="_blank" rel="noreferrer">
            <Instagram size={16} /> @{SITE.instagram}
          </a>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(SITE.mapsQuery)}`} target="_blank" rel="noreferrer">
            <MapPin size={16} /> {SITE.address}
          </a>
        </div>

        <div className="ftr__map">
          {showMap ? (
            <iframe
              title="Ubicación Motos Punta"
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <button className="ftr__mapBtn" onClick={() => setShowMap(true)}>
              <MapPin size={20} />
              <span>Ver ubicación en el mapa</span>
              <span className="ftr__mapAddr">{SITE.address}</span>
            </button>
          )}
        </div>
      </div>

      <div className="container ftr__bottom">
        <span>© {year} {SITE.name}. Todos los derechos reservados.</span>
        <Link to="/privacidad" className="ftr__legal">Aviso de privacidad</Link>
      </div>
    </footer>
  );
}
