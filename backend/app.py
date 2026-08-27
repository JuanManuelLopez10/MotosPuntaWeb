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
PRODUCTOS_TREE_TTL = 300  # 5 min; la ficha y el listado comparten este cache. Ctrl+Shift+R lo fuerza.
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
        return jsonify({"ok": True, "id": ref[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

    if metodo != "mercadopago":
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
    except Exception as e:
        print("Webhook MP error:", e)
    return "", 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)