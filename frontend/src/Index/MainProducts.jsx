import MainProductCard from "./MainProducts/MainProductCard";
import { useState } from "react";
function MainProducts({products}){
    const MainProducts = products.filter(prod=>prod.hotProduct!=="No")
    const [selectedProduct, setSelectedProduct] = useState(0)
    const deleteDuplicates = () => {
        const uniqueProducts = []
        MainProducts.forEach(product => {
            if (!uniqueProducts.some(p => p.id === product.id)) {
                uniqueProducts.push(product)
            }
        })
        return uniqueProducts
    }
    const uniqueProducts = deleteDuplicates()
    return(
        <section id="MainProducts">
            <h2>PRODUCTOS DESTACADOS</h2>
            <div id="MainProductsContainer">
                <div id="MainProductsContainerInner">
                {
                    uniqueProducts.map((product, index)=>{
                        return(
                            <MainProductCard product={product} key={index}/>
                        )
                })
            }
                </div>
            </div>

        </section>
    )

}

export default MainProducts;