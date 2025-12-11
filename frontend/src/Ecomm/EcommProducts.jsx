import EcommProductCard from "./EcommProductCard";

function EcommProducts({products, urlClass}){

    return(
        <div id="EcommProducts" >
                {
                    products.map((product, index)=>{
                        if (product.availability!=="No" && product.imageLink){
                            return(
                                <EcommProductCard product={product} key={index}/>
                            )
                        }

                })
            }

        </div>
    )
}
export default EcommProducts
