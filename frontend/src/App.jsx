import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import WhatsAppFab from "./components/WhatsAppFab";
import ScrollProgress from "./components/ScrollProgress";
import Home from "./pages/Home";
import Motos from "./pages/Motos";
import Catalogo from "./pages/Catalogo";
import Producto from "./pages/Producto";
import Carrito from "./pages/Carrito";
import Checkout from "./pages/Checkout";
import CheckoutResultado from "./pages/CheckoutResultado";
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
          <Route path="/motos" element={<Motos />} />
          <Route path="/motos/:tipo" element={<Motos />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/catalogo/:categoria" element={<Catalogo />} />
          <Route path="/producto/:id" element={<Producto />} />
          {/* Cascos: Modelo + Diseño (/producto/mt-stinger-2/micro) */}
          <Route path="/producto/:id/:design" element={<Producto />} />
          {/* Alias: los links del feed de Meta/WhatsApp usan /product/{itemGroupId} */}
          <Route path="/product/:id" element={<Producto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/exito" element={<CheckoutResultado />} />
          <Route path="/checkout/error" element={<CheckoutResultado />} />
          <Route path="/checkout/pendiente" element={<CheckoutResultado />} />
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
