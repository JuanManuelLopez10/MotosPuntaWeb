import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

// Carrito de compras (cascos / indumentaria / accesorios; las motos no van al carrito).
// Estado mínimo en el cliente + persistencia en localStorage para que no se pierda al
// recargar. El precio se guarda como número en USD; el backend lo recalculará al pagar.

const CartContext = createContext(null);
const STORAGE_KEY = "mp_cart_v1";

// Clave de línea: el mismo producto en distinto talle son líneas separadas.
export const lineKey = (id, size) => `${id}__${size || ""}`;

const clampQty = (q) => Math.min(99, Math.max(1, Math.floor(Number(q)) || 1));

// Lee el carrito guardado, saneando datos viejos/corruptos (precio y cantidad válidos).
function loadInitial() {
  if (typeof localStorage === "undefined") return { items: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    const items = parsed.items
      .filter((it) => it && it.id && Number(it.price) > 0)
      .map((it) => ({ ...it, price: Number(it.price), qty: clampQty(it.qty), size: it.size || null }));
    return { items };
  } catch {
    return { items: [] };
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const key = lineKey(action.item.id, action.item.size);
      const existing = state.items.find((it) => lineKey(it.id, it.size) === key);
      if (existing) {
        return {
          items: state.items.map((it) =>
            lineKey(it.id, it.size) === key ? { ...it, qty: clampQty(it.qty + action.item.qty) } : it,
          ),
        };
      }
      return { items: [...state.items, { ...action.item, qty: clampQty(action.item.qty) }] };
    }
    case "setQty":
      return {
        items: state.items.map((it) =>
          lineKey(it.id, it.size) === action.key ? { ...it, qty: clampQty(action.qty) } : it,
        ),
      };
    case "remove":
      return { items: state.items.filter((it) => lineKey(it.id, it.size) !== action.key) };
    case "clear":
      return { items: [] };
    case "hydrate":
      return { items: action.items };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  // Persistir en cada cambio.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage lleno o bloqueado: el carrito sigue en memoria */
    }
  }, [state]);

  // Mantener sincronizadas otras pestañas del mismo sitio.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) dispatch({ type: "hydrate", items: loadInitial().items });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Acciones estables (dispatch no cambia) para que no re-disparen efectos en los consumidores.
  const addItem = useCallback((item) => dispatch({ type: "add", item }), []);
  const setQty = useCallback((key, qty) => dispatch({ type: "setQty", key, qty }), []);
  const removeItem = useCallback((key) => dispatch({ type: "remove", key }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(() => {
    const count = state.items.reduce((n, it) => n + it.qty, 0);
    const subtotal = state.items.reduce((n, it) => n + it.price * it.qty, 0);
    return { items: state.items, count, subtotal, addItem, setQty, removeItem, clear, lineKey };
  }, [state, addItem, setQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
