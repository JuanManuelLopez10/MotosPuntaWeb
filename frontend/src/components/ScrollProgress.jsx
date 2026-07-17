import { motion, useScroll, useSpring } from "framer-motion";
import "./ScrollProgress.css";

// Barra fina de progreso de scroll arriba de todo (acento rojo).
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.2 });
  return <motion.div className="scrollprog" style={{ scaleX }} aria-hidden="true" />;
}
