# -*- coding: utf-8 -*-
"""
Lector de la colección anidada 'productos' (ver migrate_to_productos.py).

Estructura:
  productos/{modelo}                      -> doc del modelo (title, brand, productType, seo, specs…)
     {diseño}/{variante}                  -> cascos: sub-colección por diseño
     colores/{color}                      -> resto: sub-colección fija 'colores'

Devuelve cada modelo con sus variantes aplanadas en la clave 'variants'. Cada variante trae
'design' = nombre del diseño (cascos) o None (sub-colección 'colores').
"""


def _variants_of(model_ref):
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
    """Todos los modelos con sus variantes. Lista lista para serializar a JSON."""
    models = []
    for msnap in db.collection("productos").stream():
        m = msnap.to_dict() or {}
        m["slug"] = msnap.id
        m["variants"] = _variants_of(msnap.reference)
        models.append(m)
    return models
