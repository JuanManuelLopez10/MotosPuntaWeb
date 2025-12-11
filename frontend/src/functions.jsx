// if after 5 seconds the fetch is not completed, get products by frontend
import { collection, getDocs } from "firebase/firestore";
import { db } from "./Firebase";

const API_URL = "https://Jotaeme10.pythonanywhere.com";

const updateBackendProducts = async (data) => {
  try {
    await fetch(`${API_URL}/api/setProducts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log("✅ Backend actualizado con los productos de Firestore");
  } catch (error) {
    console.error("❌ Error actualizando backend:", error);
  }
};

const fetchProductsFromFirestore = async (setProducts) => {
    console.log("probando")
    try {
        const productsRef = collection(db, "products");
        const snapshot = await getDocs(productsRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(data);
        }
    catch (error)
    {
        console.error("Error al obtener productos:", error);
    }
};
export const fetchProducts = async (setProducts) => {
  const timeout = setTimeout(() => {
    console.warn("⚠️ Backend tardando, intento directo desde Firestore...");
    fetchProductsFromFirestore(async (data) => {
      setProducts(data);
      await updateBackendProducts(data);
    });
  }, 5000);

  try {
    const response = await fetch(`${API_URL}/api/products`);
    clearTimeout(timeout);
    if (!response.ok) {
      console.warn("Backend devolvió error, uso Firestore...");
      const data = await fetchProductsFromFirestore(setProducts);
      await updateBackendProducts(data);
      return;
    }
    const data = await response.json();
    setProducts(data);
  } catch (error) {
    console.error("Error fetching products:", error);
    const data = await fetchProductsFromFirestore(setProducts);
    await updateBackendProducts(data);
  }
};

export const addFilter = async (key, value) => {
    try{
        const response = await fetch(`${API_URL}/api/filter/${key}/${value}`)
        const data = await response.json()
    }
    catch(error){
        console.error("Error setting filters", error)
    }
}

export const getFilters = async () => {
    try{
        const response = await fetch('http://127.0.0.1:5000/api/getFilters')
        const data = await response.json()
        return data
    }
    catch(error){
        console.error("Error getting filters", error)
    }
}
export const getFilteredProducts = async (setFilteredProducts) => {
    try{
        const response = await fetch(`${API_URL}/api/getFilteredProducts`)
        const data = await response.json()
        setFilteredProducts(data)
    }
    catch(error){
        console.error("Error getting filtered products", error)
    }
}

export const resetFilters = async () => {
    try{
        const response = await fetch(`${API_URL}/api/resetFilters`)
        const data = await response.json()
        return data
    }
    catch(error){
        console.error("Error resetting filters", error)
    }
}
export const sortProducts = async (sort) => {
    try{
        const response = await fetch(`${API_URL}/api/sortBy/${sort}`)
        const data = await response.json()
        return data
    }
    catch(error){
        console.error("Error sorting products", error)
    }
}
export const getProductById = async (id) => {
    try{
        const response = await fetch(`${API_URL}/api/product/${id}`)
        const data = await response.json()
        return data
    }
    catch(error){
        console.error("Error getting product by id", error)
    }
}