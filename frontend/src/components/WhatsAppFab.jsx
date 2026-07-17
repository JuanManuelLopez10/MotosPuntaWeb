import { waLink } from "../data/site";
import "./WhatsAppFab.css";

export default function WhatsAppFab() {
  return (
    <a
      className="wafab"
      href={waLink("Hola Motos Punta 👋 Quiero hacer una consulta.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Consultar por WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" fill="currentColor">
        <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.3.7 4.5 1.9 6.4L4 29l7.9-1.8c1.8 1 3.9 1.5 6.1 1.5 6.6 0 12-5.3 12-11.9C30 8.3 24.6 3 16 3zm0 21.7c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.1.9.9-3.9-.3-.4a9.6 9.6 0 01-1.6-5.3C5.1 9.4 9.6 5 16 5s10.9 4.4 10.9 9.9-4.9 9.8-10.9 9.8zm5.6-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.5 0-.6l-.9-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.3 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.6-.3z" />
      </svg>
    </a>
  );
}
