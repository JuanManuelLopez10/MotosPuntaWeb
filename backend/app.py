from flask_cors import CORS
import json
from google.cloud import firestore
from google.oauth2 import service_account
import os
from flask import Flask, request, jsonify, send_from_directory
from whatsapp_bot import send_message

app = Flask(__name__)

credentials_json = os.getenv("GOOGLE_CREDENTIALS")

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
    print("⚠️ GOOGLE_CREDENTIALS_JSON no está definida, Firestore no se inicializará")
    db = None

CORS(app, origins=[
    "http://localhost:5174",
    "http://localhost:5177",
    "http://127.0.0.1:5173",
    "https://motos-punta-web-1xmx.vercel.app"
])

VERIFY_TOKEN = "motospunta_verify"
productos = []
filteredProducts = []
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
    with open("brands.json", "r", encoding="utf-8") as file:
        data = json.load(file)  # Carga el JSON como un diccionario de Python
    return jsonify(data)

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
    global productos
    if not productos:
        productos_ref = db.collection("products")
        docs = productos_ref.stream()
        productos= []
        print("Get by db")
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            productos.append(data)
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)