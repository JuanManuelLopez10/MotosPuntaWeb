import "./Marquee.css";

// Marquee infinito y sin costuras: duplica el contenido y lo desplaza con CSS.
export default function Marquee({ children, speed = 34, className = "" }) {
  return (
    <div className={`marquee ${className}`}>
      <div className="marquee__track" style={{ "--marquee-dur": `${speed}s` }}>
        <div className="marquee__group">{children}</div>
        <div className="marquee__group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
