import { buildApiUrl } from "../api";

// Envía un lead (contacto / financiación) al backend Flask -> Firestore (colección leads).
export async function submitLead(payload) {
  const res = await fetch(buildApiUrl("/api/leads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
