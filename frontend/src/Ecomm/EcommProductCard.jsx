
function EcommProductCard({product}){
    return(
        <a href={`/product/${product.id}`} className="EcommProductCard">
            <img src={product.imageLink}/>
            <div className="EcommProductCardTitle">
                <h3>{product.title.toUpperCase()}
                    {
                        product.productType!=="motos"&&
                        <span>  {product.pattern}</span>
                    }
                </h3>

            </div>
            <p className="EcommProductCardPrice">{product.price}</p>
        </a>
    )
}
export default EcommProductCard