# -*- coding: utf-8 -*-
"""
Lector de la colección anidada 'productos' (ver migrate_to_productos.py).

Estructura:
  productos/{modelo}                      -> doc del modelo (title, brand, productType, seo, specs, designs[])
     {diseño}/{variante}                  -> cascos: sub-colección por diseño
     colores/{variante}                   -> resto: sub-colección fija 'colores'

Devuelve cada modelo con sus variantes aplanadas en la clave 'variants'. Cada variante trae
'design' = nombre del diseño (cascos) o None (sub-colección 'colores').

Rendimiento: NO se usa .collections() (una llamada por doc, lentísimo). Se leen todos los
"colores" con UNA collection_group, y los diseños de cascos en paralelo, usando el campo
`designs` del modelo para no tener que listar sub-colecciones.
"""
from concurrent.futures import ThreadPoolExecutor


def _variants_of(model_ref):
    """Variantes de UN modelo (para /api/producto/<slug>). Lista las sub-colecciones."""
    variants = []
    for sub in model_ref.collections():
        design = None if sub.id == "colores" else sub.id
        for vsnap in sub.stream():
            v = vsnap.to_dict() or {}
            v["id"] = vsnap.id
            v["design"] = design
            variants.append(v)
    return variants


def read_model(db, slug):
    """Un modelo con sus variantes, o None si no existe."""
    ref = db.collection("productos").document(slug)
    snap = ref.get()
    if not snap.exists:
        return None
    m = snap.to_dict() or {}
    m["slug"] = snap.id
    m["variants"] = _variants_of(ref)
    return m


def read_productos(db):
    """Todos los modelos con sus variantes (rápido). Lista lista para serializar a JSON."""
    models = {}
    for msnap in db.collection("productos").stream():
        m = msnap.to_dict() or {}
        m["slug"] = msnap.id
        m["variants"] = []
        m["_ref"] = msnap.reference
        models[msnap.id] = m

    # 1) TODOS los "colores" (motos / indumentaria / accesorios) en UNA sola query.
    for vsnap in db.collection_group("colores").stream():
        model_id = vsnap.reference.parent.parent.id
        m = models.get(model_id)
        if m is None:
            continue
        v = vsnap.to_dict() or {}
        v["id"] = vsnap.id
        v["design"] = None
        m["variants"].append(v)

    # 2) Diseños de cascos: una query por (modelo, diseño), en paralelo. Se sacan del campo
    #    `designs` del modelo (así no hay que listar sub-colecciones).
    tasks = []
    for m in models.values():
        for d in (m.get("designs") or []):
            if d and d != "colores":
                tasks.append((m, d))

    def _fetch(task):
        m, d = task
        docs = list(m["_ref"].collection(d).stream())
        return m, d, docs

    if tasks:
        with ThreadPoolExecutor(max_workers=24) as ex:
            for m, d, docs in ex.map(_fetch, tasks):
                for vsnap in docs:
                    v = vsnap.to_dict() or {}
                    v["id"] = vsnap.id
                    v["design"] = d
                    m["variants"].append(v)

    out = []
    for m in models.values():
        m.pop("_ref", None)
        out.append(m)
    return out
