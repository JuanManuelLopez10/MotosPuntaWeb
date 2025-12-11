import os
import requests
from dotenv import load_dotenv

# Carga variables del archivo .env
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

def send_message(to, message):
    """
    Envía un mensaje de texto por WhatsApp Cloud API.
    """
    if not TOKEN:
        return {"error": "El TOKEN no está cargado desde el .env"}

    if not PHONE_NUMBER_ID:
        return {"error": "El PHONE_NUMBER_ID no está cargado desde el .env"}

    url = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }

    data = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }

    response = requests.post(url, headers=headers, json=data)
    try:
        return response.json()
    except:
        return {"error": "No se pudo interpretar la respuesta de Meta", "raw": response.text}