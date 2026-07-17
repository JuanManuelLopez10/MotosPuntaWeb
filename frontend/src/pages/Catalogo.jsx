import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import PageTransition from "../components/PageTransition";
import ProductCard from "../components/ProductCard";
import { fetchProducts, inStock, formatPrice, priceValue, cc, availableSizes, SIZE_ORDER } from "../lib/catalog";
import { CATEGORIES } from "../data/site";
import "./Catalogo.css";

const TABS = [{ key: "todos", label: "Todos" }, ...CATEGORIES];
const PAGE = 48;
const SORTS = [
  { key: "relevance", label: "Relevancia" },
  { key: "price-asc", label: "Precio: menor a mayor" },
  { key: "price-desc", label: "Precio: mayor a menor" },
  { key: "name", label: "Nombre (A–Z)" },
];

// Muestra de color por nombre (para el swatch). Desconocido -> gris neutro.
const COLOR_HEX = {
  negro: "#141417", blanco: "#F5F5F5", gris: "#8A8A90", rojo: "#E11322", azul: "#1E5AE0",
  celeste: "#4FB0E5", verde: "#2FA84A", amarillo: "#F2C200", naranja: "#F07A1E",
  rosa: "#E86A9A", rosado: "#E86A9A", violeta: "#7A3FC4", dorado: "#C9A24B",
  marron: "#6B4B2A", "marrón": "#6B4B2A", bordo: "#6E1420", beige: "#D9C7A6",
};
const colorHex = (name) => COLOR_HEX[String(name || "").trim().toLowerCase()] || "#5B5B63";

// Sección de filtro desplegable (accordion). Cerrada por defecto; muestra cuántos
// valores hay elegidos en la cabecera.
function FilterSection({ title, count = 0, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`facc ${open ? "is-open" : ""}`}>
      <button type="button" className="facc__head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="facc__title">{title}</span>
        {count > 0 && <span className="facc__badge">{count}</span>}
        <ChevronDown className="facc__chev" size={18} />
      </button>
      <div className="facc__body"><div className="facc__inner">{children}</div></div>
    </div>
  );
}

function ChipGroup({ options, selected, onToggle, unit = "", swatch = false }) {
  return (
    <div className="chips">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`chip ${selected.includes(opt) ? "is-on" : ""}`}
          aria-pressed={selected.includes(opt)}
          onClick={() => onToggle(opt)}
        >
          {swatch && <span className="chip__sw" style={{ background: colorHex(opt) }} />}
          {opt}{unit}
        </button>
      ))}
    </div>
  );
}

const sortStr = (arr) => [...arr].sort((a, b) => a.localeCompare(b, "es"));
const sortNum = (arr) => [...arr].sort((a, b) => Number(a) - Number(b));

export default function Catalogo() {
  const { categoria } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = TABS.some((t) => t.key === categoria) ? categoria : "todos";

  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  // Estado de filtros: se inicializa desde la URL (para links compartibles).
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [types, setTypes] = useState(() => searchParams.getAll("tipo"));
  const [cilindradas, setCilindradas] = useState(() => searchParams.getAll("cc"));
  const [colors, setColors] = useState(() => searchParams.getAll("color"));
  const [sizes, setSizes] = useState(() => searchParams.getAll("talle"));
  const [brands, setBrands] = useState(() => searchParams.getAll("marca"));
  const [priceMin, setPriceMin] = useState(() => searchParams.get("min") || "");
  const [priceMax, setPriceMax] = useState(() => searchParams.get("max") || "");
  const [stockOnly, setStockOnly] = useState(() => searchParams.get("stock") === "1");
  const [sort, setSort] = useState(() => searchParams.get("orden") || "relevance");

  useEffect(() => {
    let alive = true;
    fetchProducts().then((p) => alive && setProducts(p)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  // Estado de filtros -> URL (reemplaza, sin ensuciar el historial). Así el link
  // refleja exactamente lo que se ve y se puede compartir.
  // OJO: NO poner setSearchParams en las deps (cambia de identidad en cada render y
  // dispararía un loop que pisa la navegación de las pestañas). Solo se escribe si el
  // querystring realmente cambió.
  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    types.forEach((v) => p.append("tipo", v));
    cilindradas.forEach((v) => p.append("cc", v));
    colors.forEach((v) => p.append("color", v));
    sizes.forEach((v) => p.append("talle", v));
    brands.forEach((v) => p.append("marca", v));
    if (priceMin) p.set("min", priceMin);
    if (priceMax) p.set("max", priceMax);
    if (stockOnly) p.set("stock", "1");
    if (sort !== "relevance") p.set("orden", sort);
    if (p.toString() !== searchParams.toString()) setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, types, cilindradas, colors, sizes, brands, priceMin, priceMax, stockOnly, sort]);

  useEffect(() => { setVisible(PAGE); }, [active, query, types, cilindradas, colors, sizes, brands, priceMin, priceMax, stockOnly, sort]);

  const inCategory = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => active === "todos" || (p.productType || "").toLowerCase() === active)
      .filter((p) => formatPrice(p.price));
  }, [products, active]);

  // Facetado: la lista final y las opciones de cada filtro se calculan juntas. Cada
  // filtro ofrece solo los valores que quedan disponibles según los OTROS filtros
  // activos (por eso, al elegir cascos, "Naked" desaparece de Tipo). Los valores ya
  // elegidos se mantienen visibles para poder desmarcarlos.
  const { filtered, typeOptions, cilindradaOptions, sizeOptions, colorOptions, brandOptions } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;

    const match = (p, skip) => {
      if (q && !`${p.title || ""} ${p.brand || ""} ${p.color || ""} ${p.model || ""} ${p.pattern || ""}`.toLowerCase().includes(q)) return false;
      if (skip !== "type" && types.length && !types.includes((p.type || "").trim())) return false;
      if (skip !== "cc" && cilindradas.length && !cilindradas.includes(cc(p))) return false;
      if (skip !== "color" && colors.length && !colors.includes((p.color || "").trim())) return false;
      if (skip !== "size" && sizes.length && !availableSizes(p).some((s) => sizes.includes(s))) return false;
      if (skip !== "brand" && brands.length && !brands.includes((p.brand || "").trim())) return false;
      const val = priceValue(p.price);
      if (skip !== "price" && min != null && (val == null || val < min)) return false;
      if (skip !== "price" && max != null && (val == null || val > max)) return false;
      if (skip !== "stock" && stockOnly && !inStock(p)) return false;
      return true;
    };

    const optSet = (skip, getVal, keep) => {
      const set = new Set(inCategory.filter((p) => match(p, skip)).map(getVal).filter(Boolean));
      keep.forEach((v) => set.add(v)); // mantener lo ya elegido visible
      return set;
    };

    const typeSet = optSet("type", (p) => (p.type || "").trim(), types);
    const colorSet = optSet("color", (p) => (p.color || "").trim(), colors);
    const brandSet = optSet("brand", (p) => (p.brand || "").trim(), brands);
    const ccSet = active === "motos" ? optSet("cc", (p) => cc(p), cilindradas) : new Set();
    const sizeSet = active === "motos" ? new Set() : (() => {
      const s = new Set();
      inCategory.filter((p) => match(p, "size")).forEach((p) => availableSizes(p).forEach((x) => s.add(x)));
      sizes.forEach((v) => s.add(v)); // mantener lo ya elegido visible
      return s;
    })();

    let list = inCategory.filter((p) => match(p, null));
    if (sort === "price-asc") list = [...list].sort((a, b) => (priceValue(a.price) || 0) - (priceValue(b.price) || 0));
    else if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b.price) || 0) - (priceValue(a.price) || 0));
    else if (sort === "name") list = [...list].sort((a, b) => (a.title || "").localeCompare(b.title || "", "es"));
    else list = [...list].sort((a, b) => (inStock(b) ? 1 : 0) - (inStock(a) ? 1 : 0));

    return {
      filtered: list,
      typeOptions: sortStr([...typeSet]),
      colorOptions: sortStr([...colorSet]),
      brandOptions: sortStr([...brandSet]),
      cilindradaOptions: sortNum([...ccSet]),
      sizeOptions: SIZE_ORDER.filter((s) => sizeSet.has(s)),
    };
  }, [inCategory, active, query, types, cilindradas, colors, sizes, brands, priceMin, priceMax, stockOnly, sort]);

  const shown = filtered.slice(0, visible);
  const toggle = (setter) => (val) => setter((cur) => (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]));
  const clearFilters = () => {
    setQuery(""); setTypes([]); setCilindradas([]); setColors([]); setSizes([]); setBrands([]);
    setPriceMin(""); setPriceMax(""); setStockOnly(false); setSort("relevance");
  };
  // Cambiar de categoría (tab) limpia los filtros y navega. Un link compartido con
  // filtros NO se limpia al entrar (solo al hacer clic en otra pestaña).
  const goTab = (key) => { clearFilters(); navigate(key === "todos" ? "/catalogo" : `/catalogo/${key}`); };

  const activeFilterCount =
    types.length + cilindradas.length + colors.length + sizes.length + brands.length +
    (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (stockOnly ? 1 : 0) + (query.trim() ? 1 : 0);

  return (
    <PageTransition>
      <section className="cat">
        <div className="container">
          <header className="cat__head">
            <p className="eyebrow">Catálogo</p>
            <h1 className="cat__title">Elegí lo tuyo</h1>
          </header>

          <div className="cat__controls">
            <div className="cat__tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={active === t.key}
                  className={`cat__tab ${active === t.key ? "is-active" : ""}`} onClick={() => goTab(t.key)}>
                  {t.label}
                  {active === t.key && <motion.span layoutId="catTabInd" className="cat__tabInd" />}
                </button>
              ))}
            </div>
            <div className="cat__search">
              <Search size={18} />
              <input type="search" placeholder="Buscar modelo, marca, color…" value={query}
                onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en el catálogo" />
            </div>
          </div>

          <div className="cat__layout">
            <aside className={`cat__filters ${showFilters ? "is-open" : ""}`} aria-label="Filtros">
              <div className="cat__filtersHead">
                <SlidersHorizontal size={18} className="cat__filtersIcon" />
                <h2 className="cat__filtersTitle">Filtros</h2>
                {activeFilterCount > 0 && <button className="cat__clear" onClick={clearFilters}>Limpiar</button>}
                <button className="cat__filtersClose" onClick={() => setShowFilters(false)} aria-label="Cerrar filtros"><X size={20} /></button>
              </div>

              <FilterSection title="Ordenar por" defaultOpen>
                <select id="sort" className="filt__select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </FilterSection>

              {typeOptions.length > 1 && (
                <FilterSection title="Tipo" count={types.length}>
                  <ChipGroup options={typeOptions} selected={types} onToggle={toggle(setTypes)} />
                </FilterSection>
              )}

              {cilindradaOptions.length > 0 && (
                <FilterSection title="Cilindrada" count={cilindradas.length}>
                  <ChipGroup options={cilindradaOptions} selected={cilindradas} onToggle={toggle(setCilindradas)} unit="cc" />
                </FilterSection>
              )}

              {sizeOptions.length > 0 && (
                <FilterSection title="Talle disponible" count={sizes.length}>
                  <ChipGroup options={sizeOptions} selected={sizes} onToggle={toggle(setSizes)} />
                </FilterSection>
              )}

              {colorOptions.length > 1 && (
                <FilterSection title="Color" count={colors.length}>
                  <ChipGroup options={colorOptions} selected={colors} onToggle={toggle(setColors)} swatch />
                </FilterSection>
              )}

              <FilterSection title="Precio (USD)" count={(priceMin ? 1 : 0) + (priceMax ? 1 : 0)}>
                <div className="filt__range">
                  <input type="number" min="0" inputMode="numeric" placeholder="Mín" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Precio mínimo" />
                  <span className="filt__dash">–</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Máx" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Precio máximo" />
                </div>
              </FilterSection>

              {brandOptions.length > 1 && (
                <FilterSection title="Marca" count={brands.length}>
                  <ChipGroup options={brandOptions} selected={brands} onToggle={toggle(setBrands)} />
                </FilterSection>
              )}

              <FilterSection title="Disponibilidad" count={stockOnly ? 1 : 0}>
                <label className="filt__check filt__toggle">
                  <input type="checkbox" checked={stockOnly} onChange={(e) => setStockOnly(e.target.checked)} />
                  <span>Solo con stock</span>
                </label>
              </FilterSection>
            </aside>

            <div className="cat__results">
              <div className="cat__resultsHead">
                <p className="cat__count">{products ? `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}` : " "}</p>
                <button className="cat__filterBtn" onClick={() => setShowFilters(true)}>
                  <SlidersHorizontal size={16} /> Filtros
                  {activeFilterCount > 0 && <span className="cat__filterBadge">{activeFilterCount}</span>}
                </button>
              </div>

              {error && <p className="cat__msg">No pudimos cargar el catálogo ({error}). Probá recargar en un momento.</p>}

              {!products && !error && (
                <div className="cat__grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pskeleton" />)}</div>
              )}

              {products && !error && (
                shown.length === 0 ? (
                  <p className="cat__msg">No encontramos productos con ese criterio.</p>
                ) : (
                  <>
                    <div className="cat__grid">{shown.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                    {visible < filtered.length && (
                      <div className="cat__more">
                        <button className="btn btn-secondary" onClick={() => setVisible((v) => v + PAGE)}>
                          Ver más ({filtered.length - visible})
                        </button>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {showFilters && <div className="cat__scrim" onClick={() => setShowFilters(false)} />}
    </PageTransition>
  );
}
