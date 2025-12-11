import { useState, useEffect } from 'react'
import Navbar from './Navbar/Navbar'
import Index from './Index/Index'
import Ecomm from './Ecomm/Ecomm'
import Footer from './Footer/Footer'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom" // ✅ ahora sí
import { db } from "./Firebase"
import { fetchProducts } from "./functions"
import ProductScreen from "./Product/ProductScreen"
import PolicityOfPrivacity from "./Politicy/PolicityOfPrivacity"

function App() {
  const [Products, setProducts] = useState(undefined)

  useEffect(() => {
    if (!Products){
        console.log("chau")
         fetchProducts(setProducts)
        }else{
      console.log("hola")
            }
  }, [])

  if (!Products) return <div>Cargando...</div>
    console.log(Products)
  return (
    <>
      <Navbar data={Products} />

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ecomm/:FilterType/:Value" element={<Ecomm />} />
        <Route path="/product/:id" element={<ProductScreen />} />
        <Route path="/policity" element={<PolicityOfPrivacity />} />
      </Routes>

      <Footer />
    </>
  )
}

export default App