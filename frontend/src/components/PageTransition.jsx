import { motion } from "framer-motion";

// Envuelve cada página: fade + desplazamiento sutil en Y. Respeta reduced-motion
// (framer-motion lo detecta y reduce automáticamente vía MotionConfig del navegador).
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
