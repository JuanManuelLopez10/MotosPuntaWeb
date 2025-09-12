from flask_cors import CORS

from flask import Flask, jsonify
from google.cloud import firestore

app = Flask(__name__)

db = firestore.Client.from_service_account_json("fscredentials.json")

CORS(app, resources={r"/api/*": {"origins": "*"}})

productos = []

@app.route("/api/products")
def get_productos():
    productos_ref = db.collection("products")
    docs = productos_ref.stream()
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        productos.append(data)
    return jsonify(productos)

if __name__ == "__main__":
    app.run(debug=True, port=5000)