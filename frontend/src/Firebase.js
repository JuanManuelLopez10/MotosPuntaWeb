import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjLrAKI5Z6daE9YWG_vv2USXa2gNY22v8",
  authDomain: "ecomm-motos-punta.firebaseapp.com",
  databaseURL: "https://ecomm-motos-punta-default-rtdb.firebaseio.com",
  projectId: "ecomm-motos-punta",
  storageBucket: "ecomm-motos-punta.appspot.com",
  messagingSenderId: "145661701250",
  appId: "1:145661701250:web:d55a763a8a99d19a77d89b"
};

// Inicializa la app
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
export const db = getFirestore(app);