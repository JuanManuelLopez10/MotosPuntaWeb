# -*- coding: utf-8 -*-
"""
Genera el feed de productos para el catalogo de Meta a partir de los documentos
de Firestore (coleccion 'products'). Cada talle ofrecido de cada producto = una
variante (item), agrupadas por item_group_id.

Reglas (acordadas con el negocio):
- Productos CON talles: cada flag de talle en true = ese talle tiene stock => una
  variante "in stock". El item_group_id es el id del documento (unico por color+diseno),
  asi cada color/diseno es su propio producto en Meta y los talles son sus variantes.
- Productos SIN talles cargados: un solo item; el stock sale del campo 'availability'.
- El link se arma con el dominio oficial https://motospunta.uy usando el titulo
  (los links guardados en Firestore apuntan a un dominio viejo; actualizarlos es
   una tarea pendiente aparte).
"""
import csv
import io
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

try:
    import requests
except Exception:
    requests = None

SITE = "https://motospunta.uy"

# Base publica de las fotos del catalogo en R2 (las que la app arma por nombre).
# El feed verifica que la foto exista antes de incluir el producto, asi uno recien
# creado cuya foto todavia no se subio no aparece roto en el catalogo.
R2_CATALOG_URL_PREFIX = "https://pub-bf9ca1311dd14422b325c7934e5e96c0.r2.dev/catalog/"

# Talles conocidos: (clave en Firestore en minuscula, etiqueta para Meta)
_CLOTHING = [("xs", "XS"), ("s", "S"), ("m", "M"), ("l", "L"),
             ("xl", "XL"), ("xxl", "XXL"), ("3xl", "3XL")]
_FOOTWEAR = [(str(n), str(n)) for n in range(35, 49)]  # 35..48
_SIZES = _CLOTHING + _FOOTWEAR

FEED_COLUMNS = ["id", "title", "description", "availability", "condition",
                "price", "link", "image_link", "brand", "item_group_id",
                "color", "size", "product_type"]


def _truthy(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() not in ("", "false", "no", "0")
    if isinstance(v, (int, float)):
        return v != 0
    return False


def _price(raw):
    """'320 USD' / '320' -> '320 USD'. Vacio/0 -> ''."""
    digits = "".join(c for c in str(raw) if c.isdigit())
    return f"{digits} USD" if digits and int(digits) != 0 else ""


def _clean(s):
    """Limpia comillas sueltas y espacios (hay datos sucios en Firestore)."""
    return str(s or "").strip().strip('"').strip("'").strip()


def _offered_sizes(prod):
    """Talles que el producto ofrece (flags en true), sin importar el casing."""
    lower = {k.lower(): v for k, v in prod.items()}
    return [label for key, label in _SIZES if key in lower and _truthy(lower[key])]


def product_to_rows(prod):
    avail = "in stock" if str(prod.get("availability", "")).strip().lower() == "in stock" else "out of stock"
    price = _price(prod.get("price", ""))
    image = (prod.get("imageLink") or "").strip()
    # link_key (= titulo) arma la ruta de la web; group_id (= id del doc, unico por
    # color+diseno) agrupa las VARIANTES de talle en Meta. Antes ambos eran el titulo,
    # por eso TODOS los colores de un modelo se fusionaban en un solo producto.
    link_key = _clean(prod.get("itemGroupId") or prod.get("idd") or prod.get("id") or "")
    group_id = _clean(prod.get("id") or prod.get("idd") or link_key)
    title = (prod.get("title") or "").strip()
    desc = (prod.get("description") or "").strip() or title
    common = {
        "title": title, "description": desc,
        "condition": "new", "price": price, "image_link": image,
        "link": f"{SITE}/product/{quote(link_key)}" if link_key else SITE,
        "brand": (prod.get("brand") or "").strip(),
        "item_group_id": group_id,
        "color": (prod.get("color") or "").strip(),
        "product_type": (prod.get("productType") or "").strip(),
    }
    sizes = _offered_sizes(prod)
    if sizes:
        # Un talle ofrecido = hay stock de ese talle (flag en true). Cada talle = una
        # variante "in stock" del mismo grupo (color+diseno).
        rows = []
        for sz in sizes:
            r = dict(common); r["id"] = f"{group_id}-{sz}"; r["size"] = sz
            r["availability"] = "in stock"
            rows.append(r)
        return rows
    # Producto sin talles cargados: un solo item; el stock sale del campo 'availability'.
    r = dict(common); r["id"] = group_id; r["size"] = ""
    r["availability"] = avail
    return [r]


def _missing_r2_images(products):
    """Set de imageLinks de R2 (catalog/) que NO existen todavia (HEAD 404). Solo revisa
    las de R2; las viejas (freeimage) se asumen validas. Ante error de red se da el
    beneficio de la duda (no se descarta el producto)."""
    if requests is None:
        return set()
    urls = {(p.get("imageLink") or "").strip() for p in products}
    urls = {u for u in urls if u.startswith(R2_CATALOG_URL_PREFIX)}
    if not urls:
        return set()

    def head_404(u):
        try:
            r = requests.head(u, timeout=6, allow_redirects=True)
            return u if r.status_code == 404 else None
        except Exception:
            return None  # error de red -> no descartar

    missing = set()
    with ThreadPoolExecutor(max_workers=16) as ex:
        for res in ex.map(head_404, urls):
            if res:
                missing.add(res)
    return missing


def build_feed_rows(products, only_in_stock=False, require_image=True):
    rows = []
    seen = set()
    missing_r2 = _missing_r2_images(products) if require_image else set()
    for p in products:
        img = (p.get("imageLink") or "").strip()
        if require_image and not img:
            continue
        if img in missing_r2:
            continue  # foto de R2 aun no subida -> se omite hasta que exista
        for r in product_to_rows(p):
            if not r["price"]:
                continue  # Meta exige precio
            if only_in_stock and r["availability"] != "in stock":
                continue
            if r["id"] in seen:
                continue  # id duplicado (dato repetido en Firestore) -> se saltea
            seen.add(r["id"])
            rows.append(r)
    return rows


def build_feed_csv(products, **kw):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=FEED_COLUMNS)
    w.writeheader()
    for r in build_feed_rows(products, **kw):
        w.writerow(r)
    return buf.getvalue()
