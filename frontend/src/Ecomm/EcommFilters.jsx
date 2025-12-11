import { useState, useEffect } from "react"
import { BsSearch, BsList, BsX } from "react-icons/bs";
import EcommFiltersModal from "./EcommFiltersModal";
import { useSearchParams } from "react-router-dom";
import { sortProducts } from "../functions";

function EcommFilters({products, urlClass, filterProducts, FilterType, reloadProducts}){
    const WindowOrientation = window.innerWidth>window.innerHeight ? "landscape" : "portrait"
    const colors = products.map(product => product.color)
    const colorsUnics = colors.filter((color, index) => colors.indexOf(color) === index)
    const brands = products.map(product => product.brand)
    const brandsUnics = brands.filter((brand, index) => brands.indexOf(brand) === index)
    const [openFilters, setOpenFilters] = useState(false)
    const [searchValue, setSearchValue] = useState("")
//     const [SortSelected, setSortSelected] = useState(undefined)
//
//     useEffect(()=>{
//         sortProducts(SortSelected)
//         reloadProducts()
//     }, [SortSelected])

    const sortOptions = [
        {value: "price-asc", label: "Precio ascendente"},
        {value: "price-desc", label: "Precio descendente"},
        {value: "name-asc", label: "Nombre ascendente"},
        {value: "name-desc", label: "Nombre descendente"},
    ]
    return(
        <>
            <div id="EcommFilters">
                <button onClick={()=>{setOpenFilters(!openFilters)}} >Filtros</button>
{/*                 <select onChange={(e)=>{ */}
{/*                     setSortSelected(e.target.value) */}
{/*                     }}> */}
{/*                     <option value="">Ordenar por</option> */}
{/*                     { */}
{/*                         sortOptions.map((option, index)=>( */}
{/*                             <option key={index} value={option.value} onClick={()=>{setSortSelected(option.value)}}>{option.label}</option> */}
{/*                         )) */}
{/*                     } */}
{/*                 </select> */}
{/*                 <button onClick={()=>{setOpenSearch(!openSearch)}} >Ordenar por</button> */}

                {
                    openFilters &&
                    <EcommFiltersModal filterProducts={filterProducts} setOpenFilters={setOpenFilters} FilterType={FilterType}
                    products={products} Value={urlClass} />
                }
            </div>
        </>
    )
}
export default EcommFilters