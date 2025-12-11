function MainProductCard({product}){
    return(
        <div className="MainProductCard">
            <img src={product.imageLink} />
            <h3>{product.title}</h3>
        </div>
        )
    }

export default MainProductCard;
