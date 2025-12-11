
import EcommFirstView from "./EcommFirstView";
import EcommFilters from "./EcommFilters";
import EcommProducts from "./EcommProducts";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchProducts, getFilteredProducts, addFilter, resetFilters } from "../functions";
import { useSearchParams } from "react-router-dom";
function Ecomm({products}) {

    const [searchParams, setSearchParams] = useSearchParams()
    const [filteredProducts, setFilteredProducts] = useState([])
    const [openFilters, setOpenFilters] = useState(false);
    const { FilterType, Value } = useParams();

    useEffect(() => {
        resetFilters();
        if (FilterType === "Brand") {
            addFilter("brand", Value);
        } else if (FilterType === "Clase") {
            console.log("CLASE")
            console.log(Value)
            addFilter("type", Value);
        }
        getFilteredProducts(setFilteredProducts);
    }, [FilterType, Value]);

    const reloadProducts = () => {
        if (FilterType === "Brand") {
            addFilter("brand", Value);
        } else if (FilterType === "Clase") {
            console.log("CLASE")
            console.log(Value)
            addFilter("type", Value);
        }
        getFilteredProducts(setFilteredProducts)
    }



    useEffect(()=>{

        getFilteredProducts(setFilteredProducts)
    }, [searchParams])

if ((FilterType !== undefined || Value !== undefined) && filteredProducts.length > 0) {
    if (filteredProducts[0].brand === Value) {
        return (
            <div id="Ecomm">
                <EcommFirstView products={filteredProducts} urlClass={Value} />
                <EcommFilters reloadProducts={reloadProducts} products={filteredProducts} FilterType={FilterType} urlClass={Value} />
                <EcommProducts products={filteredProducts} urlClass={Value} />
            </div>
        )
    }else if (filteredProducts[0].type===Value){
  return (
    <div id="Ecomm">
      <EcommFirstView products={filteredProducts} urlClass={Value} />
      <EcommFilters reloadProducts={reloadProducts} products={filteredProducts} FilterType={FilterType} urlClass={Value} />
      <EcommProducts products={filteredProducts} urlClass={Value} />
    </div>
  );
        }

}

}

export default Ecomm;
