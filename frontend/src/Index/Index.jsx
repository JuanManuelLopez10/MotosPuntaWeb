import React, { useState, useEffect } from "react";
import BrandsIndex from "./BrandsIndex";
import FirstView from "./FirstView";
import MainProducts from "./MainProducts";
import { fetchProducts } from "../functions";

function Index(){
    const [Products, setProducts] = useState([])
    const settt = (re) => {
        setProducts(re)
    }
    useEffect(() => {
        if (!Products[0]){
            fetchProducts(settt)
        }
    }, [])
            return(
        <>
        <div id="Index">
            {
                Products[1]&&
                <>
                            <FirstView products={Products}/>
            <BrandsIndex products={Products}/>
            <MainProducts products={Products}/>
                </>
            }

        </div>

        </>
        )

    }
export default Index;