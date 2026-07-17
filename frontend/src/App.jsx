import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import WhatsAppFab from "./components/WhatsAppFab";
import ScrollProgress from "./components/ScrollProgress";
import Home from "./pages/Home";
import Catalogo from "./pages/Catalogo";
import Producto from "./pages/Producto";
import Outlet from "./pages/Outlet";
import Financiacion from "./pages/Financiacion";
import Contacto from "./pages/Contacto";
import Privacidad from "./pages/Privacidad";

// Nota: NO usamos AnimatePresence acá. Envolver <Routes> en AnimatePresence dejaba la
// página anterior montada (no podía rastrear el "exit" a través de Routes) y rompía la
// navegación entre /catalogo y /catalogo/:categoria. Cada página anima su ENTRADA con
// PageTransition (initial -> animate), que es lo que se ve al navegar.
export default function App() {
  return (
    <>
      <ScrollProgress />
      <Header />
      <main id="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/catalogo/:categoria" element={<Catalogo />} />
          <Route path="/producto/:id" element={<Producto />} />
          <Route path="/outlet" element={<Outlet />} />
          <Route path="/financiacion" element={<Financiacion />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
