# -*- coding: utf-8 -*-
"""
Genera el feed de productos para el catalogo de Meta a partir de los documentos
de Firestore (coleccion 'products'). Cada talle ofrecido de cada producto = una
variante (item), agrupadas por item_group_id.

Reglas (acordadas con el negocio):
- El stock se determina SOLO por el campo 'availability' ("in stock" => en stock).
- Los talles que ofrece un producto = los flags de talle que esten en true.
- El link se arma con el dominio oficial https://motospunta.uy
  (los links guardados en Firestore apuntan a un dominio viejo; actualizarlos es
   una tarea pendiente aparte).
"""
import csv
import io
from urllib.parse import quote

SITE = "https://motospunta.uy"

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
    igid = _clean(prod.get("itemGroupId") or prod.get("idd") or prod.get("id") or "")
    base_id = _clean(prod.get("id") or prod.get("idd") or igid)   # id del documento = unico
    title = (prod.get("title") or "").strip()
    desc = (prod.get("description") or "").strip() or title
    common = {
        "title": title, "description": desc, "availability": avail,
        "condition": "new", "price": price, "image_link": image,
        "link": f"{SITE}/product/{quote(igid)}" if igid else SITE,
        "brand": (prod.get("brand") or "").strip(),
        "item_group_id": igid,
        "color": (prod.get("color") or "").strip(),
        "product_type": (prod.get("productType") or "").strip(),
    }
    sizes = _offered_sizes(prod)
    if sizes:
        rows = []
        for sz in sizes:
            r = dict(common); r["id"] = f"{base_id}-{sz}"; r["size"] = sz
            rows.append(r)
        return rows
    r = dict(common); r["id"] = base_id; r["size"] = ""
    return [r]


def build_feed_rows(products, only_in_stock=False, require_image=True):
    rows = []
    seen = set()
    for p in products:
        if require_image and not (p.get("imageLink") or "").strip():
            continue
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
