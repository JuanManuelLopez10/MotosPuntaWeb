import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [Products, setProducts] = useState(undefined)

  const fetchProducts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/products')
        const data = await response.json()
        setProducts(data)
        console.log(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }
    useEffect(() => {
        if (!Products){
            fetchProducts()
        }
    }, [])

  return (
    <>
        <h1>MotosPunta Web</h1>
    </>
  )
}

export default App
