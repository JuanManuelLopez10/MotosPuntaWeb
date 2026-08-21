# -*- coding: utf-8 -*-
"""
FASE 0 — Migración products -> productos (estructura anidada).

  Cascos:                productos/{modelo}/{diseño}/{variante}   (3 niveles)
  Motos / indumentaria / accesorios:
                         productos/{modelo}/colores/{color}       (2 niveles reales)

- Documento del MODELO: datos comunes + ficha técnica (specs, una sola vez) + seo.
- Documento de VARIANTE: color, hex, acabado, precio, stock, imagen, talles, customSpecs, legacyId.

Uso:
  python migrar_a_productos.py            -> DRY-RUN (analiza y reporta, NO escribe)
  python migrar_a_productos.py write      -> BORRA 'productos' y la reescribe desde 'products'
"""
import json, re, sys, unicodedata
from collections import defaultdict, Counter
from google.cloud import firestore
from google.oauth2 import service_account
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WRITE = len(sys.argv) > 1 and sys.argv[1] == "write"

CRED = r"C:\Users\26lop\dev\MotosPuntaWeb\backend\fscredentials.json"
with open(CRED, encoding="utf-8") as f:
    cd = json.load(f)
db = firestore.Client(
    credentials=service_account.Credentials.from_service_account_info(cd),
    project=cd.get("project_id"),
)

# --- Campos de ficha técnica por tipo (replican Product.kt) ---
MOTO_STR = ["cilindrada","cilindros","caballaje","refrigeracion","frenos","marcaFrenos","torque",
            "garantia","tablero","capacidadTanque","cantidadCambios","rodadoDelantero","rodadoTrasero",
            "iluminacion","alimentacion"]
MOTO_BOOL = ["quickshifter","controlTraccion","horquillaInvertida","monoshockTrasero","controlCrucero",
             "embragueAntirrebote","calientaPunos","calientaAsientos","modosManejo"]
CASCO_STR = ["material","cierre","colorVisor","peso","estrellasSharp"]
CASCO_BOOL = ["ece2206","ece2205","dot","visorSolarInterno","pinlock","dobleVisor"]
GUANTES_STR = ["clima","proteccionNudillos","largoGuante"]
GUANTES_BOOL = ["proteccionDedos","proteccionPalma","limpiavisor"]
CAMPERA_STR = ["largoCampera","genero"]
CAMPERA_BOOL = ["abrigoExtraible","entradasAire","camperaVerano"]

CLOTHING = ["xs","s","m","l","xl","xxl","3xl"]
BOOT = ["38","39","40","41","42","43","44","45"]

R2 = "https://pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev/catalog/"

def s(v): return "" if v is None else str(v).strip()
def low(v): return s(v).lower()

def slug(*parts):
    txt = " ".join(s(p) for p in parts if s(p))
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()
    txt = re.sub(r"[^a-zA-Z0-9]+", "-", txt).strip("-").lower()
    return txt

def slug_nospace(*parts):  # como el catalogSlug (sin guiones), para la imagen R2
    txt = " ".join(s(p) for p in parts if s(p))
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", "", txt).lower()

def truthy(v):
    if isinstance(v, bool): return v
    if isinstance(v, (int, float)): return v != 0
    t = low(v)
    return t not in ("", "false", "no", "0")

def digits(v):
    d = "".join(c for c in s(v) if c.isdigit())
    return d if d and int(d) != 0 else ""

def spec_fields(product_type, type_):
    pt, ty = low(product_type), low(type_)
    if pt == "motos":  return MOTO_STR, MOTO_BOOL
    if pt == "cascos": return CASCO_STR, CASCO_BOOL
    if pt == "indumentaria":
        if ty == "guantes":  return ["material"] + GUANTES_STR, GUANTES_BOOL
        if ty == "camperas": return ["material"] + CAMPERA_STR, CAMPERA_BOOL
        return ["material"], []
    return [], []

def size_fields_for(product_type, type_):
    if low(type_) == "botas": return BOOT
    return CLOTHING  # indumentaria/accesorios; motos/cascos no llevan (mapa vacío)

def effective_image(p):
    img = s(p.get("imageLink"))
    if img: return img
    sl = slug_nospace(p.get("title"), p.get("pattern"), p.get("color"), p.get("acabado"))
    return f"{R2}{sl}.png" if sl else ""

# --- 1) leer products y agrupar por modelo (title normalizado) ---
raw = []
for d in db.collection("products").stream():
    data = d.to_dict() or {}
    data["_id"] = d.id
    raw.append(data)

modelos = defaultdict(list)
sin_title = 0
for p in raw:
    t = s(p.get("title"))
    if not t:
        sin_title += 1
        continue
    modelos[t.lower()].append(p)

warnings = []
tipo_count = Counter()
total_variantes = 0
ejemplos = []

def build_model(variants):
    p0 = variants[0]
    title = s(p0.get("title"))
    ptype = s(p0.get("productType")).capitalize()   # "cascos" -> "Cascos" (como los de prueba)
    type_ = s(p0.get("type"))
    brand = s(p0.get("brand"))
    model_slug = slug(title)
    str_f, bool_f = spec_fields(ptype, type_)
    # ficha: tomar de la variante que tenga el campo cargado (como syncSpecs)
    specs = {}
    for f in str_f:
        val = next((s(v.get(f)) for v in variants if s(v.get(f))), "")
        if val: specs[f] = val
    for f in bool_f:
        if any(truthy(v.get(f)) for v in variants):
            specs[f] = True
    desc = next((s(v.get("description")) for v in variants if s(v.get("description"))), "")
    doc = {
        "title": title, "slug": model_slug, "brand": brand, "model": s(p0.get("model")),
        "productType": ptype, "type": type_,
        "description": desc, "shortDescription": "",
        "seo": {
            "title": f"{title} | {ptype} {brand} en Motos Punta".replace("  ", " ").strip(),
            "description": desc,
            "keywords": [k for k in [title.lower(), f"{ptype} {brand}".lower().strip(),
                                     brand.lower(), f"{title} {type_}".lower().strip()] if k],
        },
        "specs": specs,
    }
    return model_slug, ptype, doc

def build_variant(p, product_type, type_):
    color = s(p.get("color"))
    acabado = s(p.get("acabado"))
    sizes, deps = {}, {}
    for sz in size_fields_for(product_type, type_):
        # products guarda talles como campos sueltos, con casing inconsistente (3xl vs 3Xl)
        key = next((k for k in p if k.lower() == sz), None)
        if key is not None:
            sizes[sz] = truthy(p.get(key))
        dep = next((s(p.get(k)) for k in p if k.lower() == f"{sz}deposit"), "")
        if dep: deps[sz] = dep
    cs = p.get("customSpecs")
    v = {
        "colorName": color,
        "color": "",  # hex: products no lo tiene; se carga después (queda el nombre en colorName)
        "acabado": acabado,
        "price": digits(p.get("price")),
        "currency": "USD",
        "availability": "in stock" if low(p.get("availability")) == "in stock" else "No",
        "outlet": truthy(p.get("outlet")),
        "precioAnterior": digits(p.get("precioAnterior")),
        "image": effective_image(p),
        "sizes": sizes,
        "sizeDeposits": deps,
        "customSpecs": cs if isinstance(cs, dict) else {},
        "legacyId": p["_id"],
    }
    return color, acabado, v

# --- 2) armar el árbol destino (en memoria) ---
tree = {}  # model_slug -> {"doc":..., "type":..., "subs": {subcol: {variant_id: vdoc}}}
model_slugs_seen = {}
for _, variants in modelos.items():
    model_slug, ptype, mdoc = build_model(variants)
    if model_slug in model_slugs_seen and model_slugs_seen[model_slug] != mdoc["title"]:
        warnings.append(f"Slug de modelo repetido '{model_slug}': '{mdoc['title']}' vs '{model_slugs_seen[model_slug]}'")
    model_slugs_seen[model_slug] = mdoc["title"]
    tipo_count[low(ptype)] += 1
    node = {"doc": mdoc, "type": low(ptype), "subs": defaultdict(dict)}
    es_casco = low(ptype) == "cascos"
    for p in variants:
        color, acabado, vdoc = build_variant(p, ptype, s(p.get("type")))
        if es_casco:
            design = s(p.get("pattern")) or "sin-diseno"
            subcol = slug(design)
            vid = slug(color, acabado) or slug(p["_id"])
        else:
            subcol = "colores"
            vid = slug(color) or slug(p["_id"])
        # colisión de id de variante dentro de la misma sub-colección
        base_vid = vid; n = 2
        while vid in node["subs"][subcol]:
            vid = f"{base_vid}-{n}"; n += 1
        node["subs"][subcol][vid] = vdoc
        total_variantes += 1
        if not digits(p.get("price")):
            warnings.append(f"[{mdoc['title']}] variante '{color} {acabado}'.strip() sin precio")
    # Lista de sub-colecciones en el doc del modelo: la app (SDK Android) no puede listar
    # sub-colecciones, así que las enumera por acá.
    node["doc"]["designs"] = sorted(node["subs"].keys())
    tree[model_slug] = node

# --- 3) reporte ---
print(f"{'=== ESCRITURA (write) ===' if WRITE else '=== DRY-RUN (no escribe) ==='}\n")
print(f"products leídos: {len(raw)}  | sin title (se saltean): {sin_title}")
print(f"modelos: {len(tree)}   variantes totales: {total_variantes}")
print("por tipo:", dict(tipo_count))
print(f"avisos de datos: {len(warnings)}")

def dump(model_slug):
    node = tree[model_slug]
    print(f"\n  productos/{model_slug}   [{node['type']}]")
    d = node["doc"]
    print(f"    title={d['title']!r} brand={d['brand']!r} type={d['type']!r}")
    print(f"    specs={d['specs']}")
    print(f"    seo.title={d['seo']['title']!r}")
    for sub, variants in list(node["subs"].items())[:4]:
        print(f"    └ {sub}/  ({len(variants)})")
        for vid, v in list(variants.items())[:2]:
            print(f"        {vid}:  color={v['colorName']!r} acabado={v['acabado']!r} price={v['price']!r} "
                  f"avail={v['availability']!r} sizes={ {k:x for k,x in v['sizes'].items() if x} } img={'sí' if v['image'] else 'NO'}")

con_ficha = sum(1 for n in tree.values() if n["doc"]["specs"])
print(f"modelos con ficha técnica (specs no vacío): {con_ficha}/{len(tree)}")

print("\n--- EJEMPLOS ---")
by_type_example = {}
for ms, node in tree.items():
    by_type_example.setdefault(node["type"], ms)
for t, ms in by_type_example.items():
    dump(ms)
if "mt-stinger-2" in tree:
    print("\n  [casco con ficha cargada]")
    dump("mt-stinger-2")

print("\n--- primeros 12 avisos ---")
for w in warnings[:12]:
    print("  ⚠", w)

# --- 4) escritura ---
if WRITE:
    print("\nBorrando 'productos' anterior…")
    def delete_recursive(col_ref, batch_size=300):
        for doc in col_ref.list_documents(page_size=batch_size):
            for sub in doc.collections():
                delete_recursive(sub, batch_size)
            doc.delete()
    delete_recursive(db.collection("productos"))
    print("Escribiendo estructura nueva…")
    n_docs = 0
    for model_slug, node in tree.items():
        mref = db.collection("productos").document(model_slug)
        mref.set(node["doc"]); n_docs += 1
        for sub, variants in node["subs"].items():
            for vid, vdoc in variants.items():
                mref.collection(sub).document(vid).set(vdoc); n_docs += 1
    print(f"Listo. Documentos escritos: {n_docs}  (modelos + variantes)")
else:
    print("\n(No se escribió nada. Corré con 'write' para poblar 'productos'.)")
