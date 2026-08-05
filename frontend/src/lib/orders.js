import { buildApiUrl } from "../api";

// Crea una orden en el backend. El backend recalcula el precio real desde Firestore y,
// si el método es Mercado Pago, devuelve `initPoint` (URL a la que hay que redirigir).
export async function submitOrder(payload) {
  const res = await fetch(buildApiUrl("/api/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
