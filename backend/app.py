from flask_cors import CORS
import json
from google.cloud import firestore
from google.oauth2 import service_account
import os
from flask import Flask, request, jsonify, send_from_directory, Response
from whatsapp_bot import send_message
from meta_feed import build_feed_csv, build_feed_csv_from_productos
from productos_reader import read_productos, read_model
import mercadopago
import requests
import time
import hashlib
import firebase_admin
from firebase_admin import credentials as fb_credentials, messaging as fcm

app = Flask(__name__)


def get_allowed_origins():
    configured_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "https://motospuntaweb.vercel.app,http://localhost:5173",
    )
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


CORS(
    app,
    resources={r"/*": {"origins": get_allowed_origins()}},
    supports_credentials=True,
)

credentials_json = os.getenv("GOOGLE_CREDENTIALS")

# Para desarrollo local: si no está la variable de entorno, se puede dejar el JSON del
# service account en backend/fscredentials.json (git lo ignora). En producción (Render) se
# sigue usando GOOGLE_CREDENTIALS.
if not credentials_json:
    _cred_file = os.path.join(os.path.dirname(__file__), "fscredentials.json")
    if os.path.exists(_cred_file):
        with open(_cred_file, "r", encoding="utf-8") as _f:
            credentials_json = _f.read()

if credentials_json:
    try:
        credentials_dict = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        db = firestore.Client(credentials=credentials, project=credentials_dict.get("project_id"))
        print("✅ Firestore inicializado correctamente")
    except Exception as e:
        print("❌ Error cargando credenciales de Firestore:", e)
        db = None
else:
    print("⚠️ GOOGLE_CREDENTIALS no está definida, Firestore no se inicializará")
    db = None

# Firebase Admin: para enviar notificaciones push (FCM) a la app de administración. Reusa las
# MISMAS credenciales del service account (no hace falta configurar nada nuevo; FCM es gratis).
fb_app = None
if db is not None:
    try:
        fb_app = firebase_admin.initialize_app(fb_credentials.Certificate(credentials_dict))
        print("✅ Firebase Admin (FCM) inicializado")
    except Exception as e:
        print("⚠️ No se pudo inicializar Firebase Admin (FCM):", e)
        fb_app = None

VERIFY_TOKEN = "motospunta_verify"

# --- Checkout / Mercado Pago (todo configurable por variables de entorno) ---
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "")          # secreto: se carga en Render, nunca en el código
USD_TO_UYU = float(os.getenv("USD_TO_UYU", "40"))           # tasa dólar->peso de RESPALDO (si falla la API)
USD_UYU_MARGIN = float(os.getenv("USD_UYU_MARGIN", "1.0"))  # margen sobre la tasa de mercado (1.02 = +2%)
MP_SURCHARGE_PCT = float(os.getenv("MP_SURCHARGE_PCT", "6"))  # recargo por pagar con tarjeta
SITE_URL = os.getenv("SITE_URL", "https://motospunta.uy").rstrip("/")           # front (back_urls de MP)
BACKEND_URL = os.getenv("BACKEND_URL", "https://motospuntaweb.onrender.com").rstrip("/")  # para el webhook
SHOP_WHATSAPP = os.getenv("SHOP_WHATSAPP", "59899673830")   # a dónde avisar cada pedido

mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN) if MP_ACCESS_TOKEN else None

# Cotización dólar->peso: se consulta a una API pública (open.er-api.com) y se cachea unas
# horas; si falla, cae al valor de respaldo USD_TO_UYU.
_rate_cache = {"value": None, "ts": 0.0}
RATE_TTL = 6 * 3600  # 6 horas


def get_usd_to_uyu():
    """Cotización dólar->peso (tasa de mercado * margen), cacheada. Fallback: USD_TO_UYU."""
    now = time.time()
    if _rate_cache["value"] and (now - _rate_cache["ts"] < RATE_TTL):
        return _rate_cache["value"]
    try:
        resp = requests.get("https://open.er-api.com/v6/latest/USD", timeout=8)
        rate = (resp.json().get("rates") or {}).get("UYU")
        if rate and float(rate) > 0:
            value = round(float(rate) * USD_UYU_MARGIN, 2)
            _rate_cache["value"] = value
            _rate_cache["ts"] = now
            return value
    except Exception as e:
        print("Error consultando tasa USD->UYU:", e)
    return _rate_cache["value"] or USD_TO_UYU

productos = []
_productos_ts = 0.0
PRODUCTS_TTL = 60  # segundos: el catálogo en memoria se refresca desde Firestore como máximo 1 vez por minuto
filteredProducts = []

# Caché del árbol anidado de la colección 'productos' (modelos con variantes), para /api/productos.
_prod_tree_cache = {"data": None, "ts": 0.0}
PRODUCTOS_TREE_TTL = 600  # 10 min; la ficha y el listado comparten este cache. Ctrl+Shift+R lo fuerza.
# Nota: el keep-alive (UptimeRobot) debe pegarle a "/" (no a /api/productos) para NO forzar una
# relectura de Firestore en cada ping. Así el catálogo solo se relee cuando entra una visita real
# y venció el TTL, en vez de cada 5 min. Baja fuerte el consumo de lecturas de Firestore.
filters = {"type":"", "brand": "", "color": "", "size": "", "MinPrice": "", "MaxPrice": ""}

def filterProducts():
    global productos
    global filters
    global filteredProducts
    filteredProducts = []
    for prod in productos:
        isOk = True
        print(filters)
        # check if product has price
        if "price" not in prod:
            print("Product without price: ", prod)
            priceWithoutUSD = 0
            continue
        else:
            priceWithoutUSD = prod["price"].replace("USD", "")
            priceWithoutUSD = priceWithoutUSD.replace(" ", "")

        if priceWithoutUSD == "":
            priceWithoutUSD = 0
        else:
            priceWithoutUSD = int(priceWithoutUSD)


        if filters["type"] != "" and filters["type"] != prod["type"]:
            isOk = False
        if filters["brand"] != "" and filters["brand"]!=prod["brand"]:
            isOk = False
        if filters["color"] != "" and filters["color"]!=prod["color"]:
            isOk = False
        if filters["size"] != "" and not prod[filters["size"]]:
            isOk = False
        if filters["MinPrice"] != "" and int(filters["MinPrice"])>=priceWithoutUSD:
            isOk = False
        if filters["MaxPrice"] != "" and int(filters["MaxPrice"])<=priceWithoutUSD:
            isOk = False
        if prod["availability"]!="in stock":
            isOk = False
        if isOk:
            filteredProducts.append(prod)
    return filteredProducts

@app.route("/", methods=["GET"])
def home():
    return "WhatsApp API funcionando"
@app.route("/send", methods=["POST"])
def send():
    """
    Recibe JSON:
    {
        "to": "598XXXXXXXX",
        "message": "texto"
    }
    """
    data = request.get_json()

    if not data or "to" not in data or "message" not in data:
        return jsonify({"error": "Formato inválido. Enviar { 'to': '', 'message': '' }"}), 400

    to = data["to"]
    message = data["message"]

    result = send_message(to, message)
    return jsonify(result)

@app.route("/api/filter/<KEY>/<VALUE>")
def addFilter(KEY, VALUE):
    global filters
    filters[KEY] = VALUE
    return jsonify(filters)

@app.route("/api/getFilteredProducts")
def getFilteredProducts():
    global filteredProducts
    filteredProducts = filterProducts()
    return jsonify(filteredProducts)

@app.route("/api/resetFilters")
def resetFilters():
    global filters
    filters = {"type":"", "brand": "", "color": "", "size": "", "MinPrice": "", "MaxPrice": ""}
    return jsonify(filters)

@app.route("/api/getFilters")
def getFilters():
    return jsonify(filters)

@app.route("/api/brands")
def get_brands():
    brands_path = os.path.join(os.path.dirname(__file__), "brands.json")

    if os.path.exists(brands_path):
        with open(brands_path, "r", encoding="utf-8") as file:
            data = json.load(file)
        return jsonify(data)

    global productos

    if not productos and db is not None:
        productos_ref = db.collection("products")
        docs = productos_ref.stream()
        productos = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            productos.append(data)

    unique_brands = []
    seen_brands = set()

    for prod in productos:
        brand = prod.get("brand")
        if brand and brand not in seen_brands:
            seen_brands.add(brand)
            unique_brands.append({"brand": brand, "bgDark": "#4b5563"})

    return jsonify(unique_brands)

@app.route("/api/classes")
def get_classes():
    global productos
    classes = []
    types = []

    for prod in productos:
        print(prod)
        if prod["productType"] not in classes:
            classes.append(prod["productType"])
        if {"bikeType": prod["type"], "class": prod["productType"]} not in types:
            types.append({"bikeType": prod["type"], "class": prod["productType"]})
    return jsonify({"classes": classes, "types": types})

@app.route("/api/sortBy/<sortValue>")
def sortProducts(sortValue):
    global filteredProducts
    if sortValue == "price-desc":
        filteredProducts.sort(key=lambda x: x["price"], reverse=True)
    elif sortValue == "price-asc":
        filteredProducts.sort(key=lambda x: x["price"])
    elif sortValue == "name-asc":
        filteredProducts.sort(key=lambda x: x["title"])
    elif sortValue == "name-desc":
        filteredProducts.sort(key=lambda x: x["title"], reverse=True)
    return jsonify(filteredProducts)

@app.route("/api/setProducts", methods=["POST"])
def set_products():
    global productos
    data = request.get_json()  # esperamos un array de productos
    if isinstance(data, list):
        productos = data
        return jsonify({"message": "Productos seteados en backend"}), 200
    return jsonify({"error": "Datos inválidos"}), 400

@app.route("/api/products")
def get_productos():
    global productos, _productos_ts
    now = time.time()
    # Ctrl+Shift+R (hard refresh) hace que el navegador mande Cache-Control/Pragma: no-cache.
    # En ese caso se ignora el TTL y se recarga en el momento; un F5 normal no manda no-cache,
    # así que respeta el TTL.
    hard_refresh = "no-cache" in (
        request.headers.get("Cache-Control", "") + " " + request.headers.get("Pragma", "")
    ).lower()
    # Recarga desde Firestore si se pidió refresco forzado, la caché está vacía o venció el TTL;
    # si no, la reutiliza. Así un alta/baja/edición del catálogo se refleja como máximo en
    # PRODUCTS_TTL segundos (o al instante con Ctrl+Shift+R), en vez de quedar congelada hasta
    # que el proceso se reinicie.
    if hard_refresh or not productos or (now - _productos_ts) >= PRODUCTS_TTL:
        productos_ref = db.collection("products")
        docs = productos_ref.stream()
        productos = []
        print("Get by db")
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            productos.append(data)
        _productos_ts = now
    else:
        print("Get by cache")
    return jsonify(productos)

@app.route("/api/product/<productId>")
def get_product_by_db(productId):
    try:
        product_ref = db.collection("products").document(productId)
        doc = product_ref.get()

        if doc.exists:
            product = doc.to_dict()
            product["id"] = doc.id
            return jsonify(product)
        else:
            return jsonify({"error": "Producto no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Colección anidada 'productos' (modelo → diseño/colores → variante). Endpoints NUEVOS
#     que conviven con /api/products; los alimenta la web nueva (catálogo por modelo + SEO). ---
def _get_productos_tree(hard=False):
    """Árbol de modelos con variantes, cacheado en memoria (TTL). Lo comparten el listado
    y la ficha (/api/producto/<slug>), así ninguna ruta paga el costo de leer Firestore por
    request. `hard=True` fuerza refresco (Ctrl+Shift+R en el front)."""
    now = time.time()
    if hard or _prod_tree_cache["data"] is None or (now - _prod_tree_cache["ts"]) >= PRODUCTOS_TREE_TTL:
        _prod_tree_cache["data"] = read_productos(db)
        _prod_tree_cache["ts"] = now
        print("Productos: por db")
    else:
        print("Productos: por cache")
    return _prod_tree_cache["data"]


@app.route("/api/productos")
def get_productos_tree():
    if db is None:
        return jsonify({"error": "Base de datos no disponible"}), 503
    hard = "no-cache" in (
        request.headers.get("Cache-Control", "") + " " + request.headers.get("Pragma", "")
    ).lower()
    return jsonify(_get_productos_tree(hard=hard))


@app.route("/api/producto/<slug>")
def get_producto_model(slug):
    if db is None:
        return jsonify({"error": "Base de datos no disponible"}), 503
    # Servir desde el árbol cacheado (mismo shape que read_model) para no pagar el costo de
    # .collections() por request (~6s). Si el modelo no está en el cache (recién creado),
    # se lee fresco como fallback.
    hard = "no-cache" in (
        request.headers.get("Cache-Control", "") + " " + request.headers.get("Pragma", "")
    ).lower()
    for m in _get_productos_tree(hard=hard):
        if m.get("slug") == slug:
            return jsonify(m)
    m = read_model(db, slug)
    if m is None:
        return jsonify({"error": "Producto no encontrado"}), 404
    return jsonify(m)


# --- RELEVANCIA (popularidad con decaimiento) ------------------------------------------------
# Cada entrada Modelo+Diseño acumula "puntos" (visita a la ficha = +1, venta desde la app = +N),
# pero con DECAIMIENTO EXPONENCIAL: cada punto pierde la mitad de su peso cada RELEVANCE_HALFLIFE
# días. Así lo reciente pesa más que lo viejo y nada crece infinito (no es histórico).
# Se guarda TODO en un solo doc (meta/relevancia, campo `scores`: {clave: {s, t}}), para leer/
# escribir con 1 operación y no disparar las cuotas de Firestore.
RELEVANCE_HALFLIFE_DAYS = 30
VISIT_WEIGHT = 1.0
SALE_WEIGHT = 5.0
TRACK_SECRET = os.getenv("TRACK_SECRET", "")   # protege /api/track/sale (lo manda la app)
VISIT_COOLDOWN = 600                            # misma IP+producto no cuenta 2 veces en 10 min

_rel_serve_cache = {"data": None, "ts": 0.0}
REL_SERVE_TTL = 30
_visit_guard = {}  # (ip, key) -> ts   (anti-abuso en memoria, best-effort)


def _rel_key(slug, design):
    slug = str(slug or "").strip()
    if not slug:
        return ""
    d = str(design or "").strip().lower()
    return f"{slug}|{d}" if d and d != "colores" else slug


def _decay_factor(dt_seconds):
    if dt_seconds <= 0:
        return 1.0
    return 0.5 ** (dt_seconds / (RELEVANCE_HALFLIFE_DAYS * 86400.0))


def _design_label(d):
    return str(d or "").replace("-", " ").strip().title()


def _key_label(key):
    """Nombre legible de una entrada (para las notificaciones), desde el árbol cacheado."""
    slug, _, design = str(key).partition("|")
    try:
        for m in _get_productos_tree():
            if m.get("slug") == slug:
                title = m.get("title", slug)
                return f"{title} {_design_label(design)}".strip() if design else title
    except Exception:
        pass
    return key


def _bump_relevance(key, weight):
    """Suma `weight` al score decayado de `key` y +1 al contador acumulado `n` (visitas+ventas).
    Devuelve el múltiplo de 5 recién cruzado (para notificar) o None. Transacción sobre el doc
    único; el merge no pisa las otras claves."""
    now = int(time.time())
    ref = db.collection("meta").document("relevancia")
    result = {"crossed": None}

    @firestore.transactional
    def _txn(txn):
        snap = ref.get(transaction=txn)
        cur = ((snap.to_dict() or {}).get("scores") or {}).get(key) if snap.exists else None
        s = float((cur or {}).get("s", 0.0))
        t = int((cur or {}).get("t", now))
        n = int((cur or {}).get("n", 0))
        s = s * _decay_factor(now - t) + float(weight)
        new_n = n + 1
        if new_n >= 5 and (n // 5) != (new_n // 5):
            result["crossed"] = (new_n // 5) * 5
        txn.set(ref, {"scores": {key: {"s": s, "t": now, "n": new_n}}}, merge=True)

    _txn(db.transaction())
    if result["crossed"]:
        try:
            send_push(
                "🔥 Producto en alza",
                f"{_key_label(key)} llegó a {result['crossed']} de interés (visitas + ventas)",
                data={"tipo": "milestone", "key": key, "n": result["crossed"]},
            )
        except Exception as e:
            print("milestone push err:", e)
    return result


def _relevance_map():
    """Mapa {clave: valor decayado AHORA}, cacheado unos segundos."""
    now = time.time()
    if _rel_serve_cache["data"] is not None and now - _rel_serve_cache["ts"] < REL_SERVE_TTL:
        return _rel_serve_cache["data"]
    snap = db.collection("meta").document("relevancia").get()
    scores = (snap.to_dict() or {}).get("scores", {}) if snap.exists else {}
    nowi = int(now)
    out = {k: round(float(v.get("s", 0.0)) * _decay_factor(nowi - int(v.get("t", nowi))), 4)
           for k, v in scores.items() if isinstance(v, dict)}
    _rel_serve_cache["data"] = out
    _rel_serve_cache["ts"] = now
    return out


@app.route("/api/relevance")
def get_relevance():
    """Ranking de relevancia para ordenar el catálogo: {clave: valor}. Nunca rompe (si no hay
    datos o falla, devuelve {})."""
    if db is None:
        return jsonify({}), 200
    try:
        return jsonify(_relevance_map())
    except Exception as e:
        print("relevance err:", e)
        return jsonify({}), 200


@app.route("/api/track/visit", methods=["POST"])
def track_visit():
    """+1 de relevancia a una entrada Modelo+Diseño. Público (lo llama la web al abrir la ficha),
    con anti-abuso: misma IP+producto no cuenta de nuevo por VISIT_COOLDOWN."""
    if db is None:
        return jsonify({"ok": False}), 200
    data = request.get_json(silent=True) or {}
    key = _rel_key(data.get("slug"), data.get("design"))
    if not key:
        return jsonify({"ok": False}), 200
    ip = (request.headers.get("X-Forwarded-For", "") or request.remote_addr or "").split(",")[0].strip()
    now = time.time()
    if now - _visit_guard.get((ip, key), 0) < VISIT_COOLDOWN:
        return jsonify({"ok": True, "counted": False}), 200
    _visit_guard[(ip, key)] = now
    if len(_visit_guard) > 5000:  # limpieza para no crecer sin fin
        for kk in [kk for kk, tt in list(_visit_guard.items()) if now - tt > VISIT_COOLDOWN]:
            _visit_guard.pop(kk, None)
    try:
        _bump_relevance(key, VISIT_WEIGHT)
    except Exception as e:
        print("track visit err:", e)
    return jsonify({"ok": True, "counted": True}), 200


@app.route("/api/track/sale", methods=["POST"])
def track_sale():
    """+N de relevancia por una venta (lo llama la app tras markSold). Protegido por TRACK_SECRET."""
    if db is None:
        return jsonify({"ok": False}), 200
    # Requiere secreto SIEMPRE: si TRACK_SECRET no está configurado, el endpoint queda deshabilitado
    # (evita abuso). Se habilita en la Parte B cuando se setea TRACK_SECRET en Render + la app lo manda.
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify({"ok": False}), 403
    data = request.get_json(silent=True) or {}
    key = _rel_key(data.get("slug"), data.get("design"))
    if not key:
        return jsonify({"ok": False}), 200
    try:
        _bump_relevance(key, SALE_WEIGHT)
    except Exception as e:
        print("track sale err:", e)
    return jsonify({"ok": True}), 200


# --- PUSH (FCM) a la app de administración ---------------------------------------------------
# La app (en TODOS los teléfonos de la empresa) registra su token FCM; el backend manda el push
# a todos en cada evento y limpia los que quedan inválidos. FCM es gratis (no necesita Blaze).
PUSH_COLL = "admin_devices"


def _tok_id(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _push_tokens(exclude=None):
    if db is None:
        return []
    out = []
    for d in db.collection(PUSH_COLL).stream():
        t = (d.to_dict() or {}).get("token") or ""
        if t and t != exclude:
            out.append(t)
    return out


def send_push(title, body, data=None, exclude_token=None):
    """Notifica a todos los dispositivos registrados. Best-effort: nunca rompe el flujo que lo
    dispara. Borra los tokens que FCM reporta como dados de baja / inválidos."""
    if fb_app is None or db is None:
        return
    tokens = _push_tokens(exclude=exclude_token)
    if not tokens:
        return
    payload = {k: str(v) for k, v in (data or {}).items()}
    try:
        msg = fcm.MulticastMessage(
            tokens=tokens,
            notification=fcm.Notification(title=title, body=body),
            data=payload,
            android=fcm.AndroidConfig(priority="high"),
        )
        resp = fcm.send_each_for_multicast(msg)
        for tok, r in zip(tokens, resp.responses):
            if not r.success and r.exception is not None:
                emsg = str(r.exception).lower()
                if "not a valid" in emsg or "not registered" in emsg or "unregistered" in emsg:
                    try:
                        db.collection(PUSH_COLL).document(_tok_id(tok)).delete()
                    except Exception:
                        pass
    except Exception as e:
        print("send_push err:", e)


@app.route("/api/push/register", methods=["POST"])
def push_register():
    """La app registra/actualiza el token FCM de un dispositivo."""
    if db is None:
        return jsonify({"ok": False}), 200
    data = request.get_json(silent=True) or {}
    token = str(data.get("token") or "").strip()
    if not token:
        return jsonify({"ok": False}), 400
    db.collection(PUSH_COLL).document(_tok_id(token)).set({
        "token": token,
        "device": str(data.get("device") or "")[:120],
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }, merge=True)
    return jsonify({"ok": True}), 200


@app.route("/api/push/unregister", methods=["POST"])
def push_unregister():
    if db is None:
        return jsonify({"ok": False}), 200
    token = str((request.get_json(silent=True) or {}).get("token") or "").strip()
    if token:
        try:
            db.collection(PUSH_COLL).document(_tok_id(token)).delete()
        except Exception:
            pass
    return jsonify({"ok": True}), 200


_checkout_guard = {}          # IP -> ts (evita spamear el push del checkout)
CHECKOUT_COOLDOWN = 300


@app.route("/api/track/checkout", methods=["POST"])
def track_checkout():
    """Aviso: un cliente llegó a la pantalla de checkout (fase previa a la compra)."""
    if db is None:
        return jsonify({"ok": False}), 200
    data = request.get_json(silent=True) or {}
    ip = (request.headers.get("X-Forwarded-For", "") or request.remote_addr or "").split(",")[0].strip()
    now = time.time()
    if now - _checkout_guard.get(ip, 0) < CHECKOUT_COOLDOWN:
        return jsonify({"ok": True, "counted": False}), 200
    _checkout_guard[ip] = now
    if len(_checkout_guard) > 5000:
        for kk in [kk for kk, tt in list(_checkout_guard.items()) if now - tt > CHECKOUT_COOLDOWN]:
            _checkout_guard.pop(kk, None)
    resumen = str(data.get("resumen") or "").strip()[:200]
    total = str(data.get("total") or "").strip()[:40]
    cuerpo = resumen or "Un cliente está por comprar"
    if total:
        cuerpo += f" · {total}"
    send_push("🛒 Cliente en el checkout", cuerpo, data={"tipo": "checkout"})
    return jsonify({"ok": True, "counted": True}), 200


@app.route("/api/track/alerta", methods=["POST"])
def track_alerta():
    """La app avisa que un producto pasó a ALERTA (tocheck). Notifica a los DEMÁS dispositivos
    (excluye al que lo marcó). Protegido por TRACK_SECRET."""
    if db is None:
        return jsonify({"ok": False}), 200
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify({"ok": False}), 403
    data = request.get_json(silent=True) or {}
    nombre = str(data.get("nombre") or "").strip()[:140]
    if not nombre:
        k = _rel_key(data.get("slug"), data.get("design"))
        nombre = _key_label(k) if k else "Un producto"
    exclude = str(data.get("excludeToken") or "").strip() or None
    send_push("⚠️ Producto en alerta", f"{nombre} — revisá stock", data={"tipo": "alerta"}, exclude_token=exclude)
    return jsonify({"ok": True}), 200


@app.route("/meta-feed-productos.csv")
def meta_feed_productos_csv():
    """Feed de Meta desde la colección 'productos' (nuevo). Convive con /meta-feed.csv; el
    catálogo de Meta se apunta a este recién en el cutover. Lee fresco para tener el stock al día."""
    if db is None:
        return Response("Firestore no inicializado", status=503, mimetype="text/plain")
    return Response(
        # require_image=False: NO se chequea cada foto en R2 con HEAD (cientos de requests que
        # hacían pasar el timeout de gunicorn). Igual se omiten las variantes sin `image`.
        build_feed_csv_from_productos(read_productos(db), require_image=False),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=meta-feed-productos.csv"},
    )


@app.route("/api/filteredProducts")
def get_filteredProducts():
    global filteredProducts
    if not filteredProducts:
        filteredProducts = []
    return jsonify(filteredProducts)

@app.route("/api/sendMessage", methods=["POST"])
def send_message_route():
    data = request.json
    to = data.get("to")
    message = data.get("message")

    result = send_message(to, message)
    return jsonify(result)


@app.route("/api/leads", methods=["POST"])
def create_lead():
    """Guarda un lead (contacto o solicitud de financiación) en Firestore (colección
    'leads'). Requiere nombre y un dato de contacto. Honeypot 'website' anti-spam."""
    if db is None:
        return jsonify({"error": "Base de datos no disponible"}), 503
    data = request.get_json(silent=True) or {}
    # Honeypot: los bots suelen completar todos los campos; si viene, se descarta.
    if str(data.get("website") or "").strip():
        return jsonify({"ok": True}), 200
    nombre = str(data.get("nombre") or "").strip()
    contacto = str(data.get("contacto") or "").strip()
    if not nombre or not contacto:
        return jsonify({"error": "Nombre y contacto son obligatorios"}), 400
    lead = {
        "nombre": nombre[:120],
        "contacto": contacto[:120],
        "mensaje": str(data.get("mensaje") or "").strip()[:2000],
        "tipo": str(data.get("tipo") or "contacto").strip()[:40],
        "producto": str(data.get("producto") or "").strip()[:200],
        "extra": data.get("extra") if isinstance(data.get("extra"), dict) else {},
        "estado": "nuevo",
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    try:
        ref = db.collection("leads").add(lead)
        # Aviso push a la app de administración.
        es_fin = lead["tipo"].lower().startswith("financ")
        titulo = "📩 Nueva solicitud de financiación" if es_fin else "📩 Nueva consulta"
        cuerpo = f"{lead['nombre']} — {lead['contacto']}"
        if lead["producto"]:
            cuerpo += f" · {lead['producto']}"
        send_push(titulo, cuerpo, data={"tipo": "lead", "leadId": ref[1].id})
        return jsonify({"ok": True, "id": ref[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/leads/financiacion", methods=["GET"])
def list_financing_leads():
    """Solicitudes de financiación PENDIENTES para la app (pestaña Financiación). Trae datos de
    clientes → protegido por TRACK_SECRET (no se expone `leads` al cliente por seguridad)."""
    if db is None:
        return jsonify([]), 200
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify([]), 403
    out = []
    try:
        # 1 solo filtro (sin índice compuesto); el estado se filtra en memoria.
        for d in db.collection("leads").where("tipo", "==", "financiacion").stream():
            v = d.to_dict() or {}
            if str(v.get("estado", "nuevo")) != "nuevo":
                continue
            ca = v.get("createdAt")
            out.append({
                "id": d.id,
                "nombre": v.get("nombre", ""),
                "telefono": v.get("contacto", ""),
                "opcion": (v.get("extra") or {}).get("entidad", ""),
                "producto": v.get("producto", ""),
                "ts": ca.timestamp() if hasattr(ca, "timestamp") else 0,
            })
        out.sort(key=lambda x: x.get("ts", 0), reverse=True)
    except Exception as e:
        print("list_financing_leads err:", e)
    return jsonify(out), 200


@app.route("/api/leads/handled", methods=["POST"])
def mark_lead_handled():
    """Marca una solicitud como contactada (sale de la lista/badge de la app)."""
    if db is None:
        return jsonify({"ok": False}), 200
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify({"ok": False}), 403
    lid = str((request.get_json(silent=True) or {}).get("id") or "").strip()
    if lid:
        try:
            db.collection("leads").document(lid).update({"estado": "contactado"})
        except Exception as e:
            print("mark_lead_handled err:", e)
    return jsonify({"ok": True}), 200


@app.route("/api/orders/pendientes", methods=["GET"])
def list_orders_pending():
    """Compras/pedidos NO archivados para la app (pestaña Compras). Datos de clientes →
    protegido por TRACK_SECRET."""
    if db is None:
        return jsonify([]), 200
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify([]), 403
    out = []
    try:
        docs = db.collection("orders").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(50).stream()
        for d in docs:
            v = d.to_dict() or {}
            if v.get("archivado"):
                continue
            items = v.get("items") or []
            resumen = ", ".join(f"{i.get('qty', 1)}× {i.get('title', '')}" for i in items)
            cli = v.get("cliente") or {}
            ca = v.get("createdAt")
            out.append({
                "id": d.id,
                "nombre": cli.get("nombre", ""),
                "contacto": cli.get("contacto", ""),
                "resumen": resumen,
                "total": v.get("totalUsd", 0),
                "metodo": v.get("metodo", ""),
                "estado": v.get("estado", ""),
                "entrega": v.get("entrega", ""),
                "direccion": cli.get("direccion", ""),
                "ts": ca.timestamp() if hasattr(ca, "timestamp") else 0,
            })
    except Exception as e:
        print("list_orders_pending err:", e)
    return jsonify(out), 200


@app.route("/api/orders/archived", methods=["POST"])
def archive_order():
    """Archiva un pedido (sale de la lista/badge de la app). No toca el estado del pago."""
    if db is None:
        return jsonify({"ok": False}), 200
    if not TRACK_SECRET or request.headers.get("X-Track-Secret") != TRACK_SECRET:
        return jsonify({"ok": False}), 403
    oid = str((request.get_json(silent=True) or {}).get("id") or "").strip()
    if oid:
        try:
            db.collection("orders").document(oid).update({"archivado": True})
        except Exception as e:
            print("archive_order err:", e)
    return jsonify({"ok": True}), 200


@app.route("/meta-feed.csv")
def meta_feed_csv():
    """Feed de productos para el catalogo de Meta (origen de datos por URL).
    Lee SIEMPRE fresco de Firestore para que el stock este al dia."""
    if db is None:
        return Response("Firestore no inicializado", status=503, mimetype="text/plain")
    items = []
    for doc in db.collection("products").stream():
        d = doc.to_dict()
        d["id"] = doc.id
        items.append(d)
    return Response(
        build_feed_csv(items),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=meta-feed.csv"},
    )


# =====================  CHECKOUT / ÓRDENES  =====================

def _price_usd(prod):
    """Precio del producto como entero USD (los precios en Firestore son strings)."""
    digits = "".join(ch for ch in str(prod.get("price", "")) if ch.isdigit())
    return int(digits) if digits else 0


def _fetch_product(pid):
    """Lee una VARIANTE fresca de `productos` por su dirección 'modelSlug|design|variantId'.
    Devuelve lo que la orden necesita: tipo/título del modelo + precio/stock/color de la variante."""
    parts = str(pid or "").split("|")
    if len(parts) != 3:
        return None
    model_slug, design, variant_id = parts
    design = design or "colores"
    vsnap = db.collection("productos").document(model_slug).collection(design).document(variant_id).get()
    if not vsnap.exists:
        return None
    v = vsnap.to_dict() or {}
    msnap = db.collection("productos").document(model_slug).get()
    m = (msnap.to_dict() or {}) if msnap.exists else {}
    return {
        "id": pid,
        "productType": m.get("productType", ""),
        "title": m.get("title", ""),
        "availability": v.get("availability", ""),
        "price": v.get("price", ""),
        "color": v.get("colorName", ""),
        "acabado": v.get("acabado", ""),
    }


def _notify_shop(message):
    """Avisa al local por WhatsApp. Best-effort: si falla, no rompe la orden."""
    try:
        send_message(SHOP_WHATSAPP, message)
    except Exception as e:
        print("Aviso WhatsApp falló:", e)


@app.route("/api/orders", methods=["POST"])
def create_order():
    """Crea una orden de cascos/indumentaria/accesorios. Recalcula SIEMPRE el precio
    desde Firestore (nunca confía en el importe que manda el navegador). Para Mercado
    Pago crea la preferencia y devuelve el init_point; para transferencia/efectivo deja
    la orden pendiente y avisa al local."""
    if db is None:
        return jsonify({"error": "Base de datos no disponible"}), 503
    data = request.get_json(silent=True) or {}
    # Honeypot anti-spam.
    if str(data.get("website") or "").strip():
        return jsonify({"ok": True}), 200

    cliente = data.get("cliente") or {}
    nombre = str(cliente.get("nombre") or "").strip()
    contacto = str(cliente.get("contacto") or "").strip()
    entrega = data.get("entrega") if data.get("entrega") in ("retiro", "envio") else "retiro"
    metodo = data.get("metodo")
    if metodo not in ("transferencia", "efectivo", "mercadopago"):
        return jsonify({"error": "Método de pago inválido"}), 400
    if not nombre or not contacto:
        return jsonify({"error": "Nombre y contacto son obligatorios"}), 400
    if entrega == "envio" and not str(cliente.get("direccion") or "").strip():
        return jsonify({"error": "Falta la dirección de envío"}), 400

    # Recalcular precios desde Firestore (fuente de verdad).
    order_items = []
    subtotal = 0
    for it in (data.get("items") or []):
        pid = str(it.get("id") or "").strip()
        try:
            qty = int(it.get("qty") or 0)
        except (TypeError, ValueError):
            qty = 0
        if not pid or qty < 1:
            continue
        prod = _fetch_product(pid)
        if not prod:
            return jsonify({"error": f"Producto no encontrado: {pid}"}), 400
        if str(prod.get("productType", "")).lower() == "motos":
            return jsonify({"error": "Las motos no se compran online"}), 400
        if str(prod.get("availability", "")).lower() != "in stock":
            return jsonify({"error": f"Sin stock: {prod.get('title', pid)}"}), 409
        price = _price_usd(prod)
        if price <= 0:
            return jsonify({"error": f"Producto sin precio: {prod.get('title', pid)}"}), 400
        qty = min(qty, 99)
        subtotal += price * qty
        order_items.append({
            "id": pid, "title": prod.get("title", ""), "size": it.get("size"), "qty": qty,
            "priceUsd": price, "color": prod.get("color", ""), "acabado": prod.get("acabado", ""),
        })
    if not order_items:
        return jsonify({"error": "El carrito está vacío"}), 400

    # El envío lo cobra la transportadora contra entrega: no se suma al pago online.
    shipping = 0
    base = subtotal + shipping
    surcharge = round(base * MP_SURCHARGE_PCT / 100) if metodo == "mercadopago" else 0
    total_usd = base + surcharge
    estado = "reservado" if metodo == "efectivo" else "pendiente_pago"

    order = {
        "items": order_items,
        "cliente": {
            "nombre": nombre[:120], "contacto": contacto[:120],
            "direccion": str(cliente.get("direccion") or "").strip()[:200],
            "ciudad": str(cliente.get("ciudad") or "").strip()[:120],
        },
        "entrega": entrega, "metodo": metodo,
        "subtotalUsd": subtotal, "envioUsd": shipping, "recargoUsd": surcharge, "totalUsd": total_usd,
        "estado": estado, "createdAt": firestore.SERVER_TIMESTAMP,
    }
    ref = db.collection("orders").add(order)
    order_id = ref[1].id

    _notify_shop(_order_summary_msg(order, order_id))
    _items_txt = ", ".join(f"{i['qty']}× {i['title']}" for i in order["items"])

    if metodo != "mercadopago":
        # Transferencia/efectivo: el pedido queda anotado y hay que actuar → push al toque.
        _metodo_txt = {"transferencia": "Transferencia", "efectivo": "Efectivo"}.get(metodo, metodo)
        send_push("🧾 Nuevo pedido", f"{_items_txt} · {_metodo_txt} · USD {total_usd}", data={"tipo": "order", "orderId": order_id})
        return jsonify({"ok": True, "orderId": order_id, "metodo": metodo, "estado": estado, "totalUsd": total_usd}), 201

    # Mercado Pago: crear la preferencia (Checkout Pro). MP cobra en pesos.
    if mp_sdk is None:
        return jsonify({"error": "Mercado Pago no está configurado"}), 503
    tasa = get_usd_to_uyu()
    total_uyu = round(total_usd * tasa, 2)
    preference = {
        "items": [{
            "title": f"Compra en Motos Punta ({len(order_items)} art.)",
            "quantity": 1, "unit_price": total_uyu, "currency_id": "UYU",
        }],
        "payer": {"name": nombre},
        "external_reference": order_id,
        "back_urls": {
            "success": f"{SITE_URL}/checkout/exito",
            "failure": f"{SITE_URL}/checkout/error",
            "pending": f"{SITE_URL}/checkout/pendiente",
        },
        "auto_return": "approved",
        "notification_url": f"{BACKEND_URL}/api/mp/webhook",
        "statement_descriptor": "MOTOSPUNTA",
    }
    try:
        result = mp_sdk.preference().create(preference)
        resp = result.get("response", {}) or {}
        init_point = resp.get("init_point") or resp.get("sandbox_init_point")
        if not init_point:
            print("MP sin init_point:", resp)
            return jsonify({"error": "No se pudo iniciar el pago"}), 502
        db.collection("orders").document(order_id).update({"mpPreferenceId": resp.get("id"), "tasaUyu": tasa, "totalUyu": total_uyu})
        return jsonify({"ok": True, "orderId": order_id, "metodo": metodo, "initPoint": init_point}), 201
    except Exception as e:
        print("Error creando preferencia MP:", e)
        return jsonify({"error": "No se pudo iniciar el pago"}), 502


def _order_summary_msg(order, order_id):
    lines = [f"• {i['qty']}x {i['title']}" + (f" (T{i['size']})" if i.get("size") else "") for i in order["items"]]
    entrega = "Envío a domicilio" if order["entrega"] == "envio" else "Retiro en el local"
    metodo = {"transferencia": "Transferencia", "efectivo": "Efectivo (reserva)", "mercadopago": "Mercado Pago"}.get(order["metodo"], order["metodo"])
    c = order["cliente"]
    extra = f"\n{c['direccion']}" if order["entrega"] == "envio" and c.get("direccion") else ""
    return (
        "🛒 Nuevo pedido web\n\n" + "\n".join(lines) +
        f"\n\nCliente: {c['nombre']} ({c['contacto']})" + extra +
        f"\n{entrega} · {metodo}\nTotal: USD {order['totalUsd']}\nEstado: {order['estado']}\nOrden #{order_id}"
    )


@app.route("/api/mp/webhook", methods=["POST"])
def mp_webhook():
    """Notificación de Mercado Pago. Consulta el pago por API (eso valida su autenticidad),
    actualiza el estado de la orden y avisa al local si quedó aprobado. Siempre responde 200
    para que MP no reintente en loop."""
    if mp_sdk is None or db is None:
        return "", 200
    data = request.get_json(silent=True) or {}
    payment_id = None
    if data.get("type") == "payment":
        payment_id = (data.get("data") or {}).get("id")
    payment_id = payment_id or request.args.get("data.id") or request.args.get("id")
    if not payment_id:
        return "", 200
    try:
        pay = mp_sdk.payment().get(payment_id)
        info = pay.get("response", {}) or {}
        status = info.get("status")
        order_id = info.get("external_reference")
        if order_id:
            nuevo = {
                "approved": "pagado", "rejected": "rechazado", "cancelled": "cancelado",
                "refunded": "reembolsado", "in_process": "pendiente_pago", "pending": "pendiente_pago",
            }.get(status, "pendiente_pago")
            db.collection("orders").document(order_id).update({
                "estado": nuevo, "mpPaymentId": str(payment_id), "mpStatus": status,
            })
            if status == "approved":
                _notify_shop(f"✅ Pago confirmado por Mercado Pago — Orden #{order_id}.")
                send_push("💰 Pago confirmado (Mercado Pago)", f"Orden #{order_id} — pago aprobado", data={"tipo": "payment", "orderId": order_id})
    except Exception as e:
        print("Webhook MP error:", e)
    return "", 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)