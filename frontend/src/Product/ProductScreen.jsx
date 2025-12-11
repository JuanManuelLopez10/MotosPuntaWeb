import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getProductById } from "../functions";
function ProductScreen(){
    const {id} = useParams();
    const [product, setProduct] = useState({});
    useEffect(()=>{
        getProductById(id).then(product=>setProduct(product))
    }, [id])

    return(
        <div>
            <h1>{product.title}</h1>
        </div>
    )
}

export default ProductScreen
