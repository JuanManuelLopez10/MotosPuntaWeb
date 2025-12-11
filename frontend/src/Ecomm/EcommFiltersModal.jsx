import { useSearchParams } from "react-router-dom"
import { useState } from "react"
import { addFilter } from "../functions"
import { resetFilters } from "../functions"
function EcommFiltersModal({products,setOpenFilters, Value, FilterType}){
    console.log("products:")
    console.log(products)
    const [searchParams, setSearchParams] = useSearchParams()
    const brands = products.map(product => product.brand)
    const brandsUnics = brands.filter((brand, index) => brands.indexOf(brand) === index)
    const styles = products.map(product => product.type)
    const stylesUnics = styles.filter((type, index) => styles.indexOf(type) === index)
    const colors = products.map(product => product.color)
    const colorsUnics = colors.filter((color, index) => colors.indexOf(color) === index)
    const sizes = ["xs","s", "m","l","xl","xxl"]
    const [preFilters, setPreFilters] = useState({})

  const handleFilterChange = (key, value) => {

      if(value===preFilters[key]){
          addFilter(key, "")
          setPreFilters({...preFilters, [key]: undefined})
      }else{
          addFilter(key, value)
          setPreFilters({...preFilters, [key]: value})
      }

  };
  const setFiltersOnUrl = () => {
      const newParams = new URLSearchParams(searchParams);
      const filters = ["brand", "color", "size", "MinPrice", "MaxPrice"]
      filters.map(filter => {
          if(preFilters[filter]!==undefined){
              newParams.set(filter, preFilters[filter])
          }else if(preFilters[filter]===undefined){
               newParams.delete(filter)
          }
      })

    setSearchParams(newParams);
  }

    return(
        <>
        <div id="EcommFiltersModal">
            <div id="EcommFiltersModalHeader">
                <h2>Filtros</h2>
                <button onClick={()=>{setOpenFilters(false)}} id="EcommFiltersModalHeaderExit">X</button>
            </div>
            <div id="EcommFiltersModalBody">
                <h3>Marcas</h3>
                <div className="FilterRow">
                    {
                        brandsUnics.map((Brand, index) => (
                            <button className={Brand===preFilters.brand ? "active" : ""} onClick={()=>{handleFilterChange("brand", Brand)}} key={index}>{Brand}</button>
                        ))
                    }
                </div>
                <h3>Estilos</h3>
                <div className="FilterRow">
                    {
                        stylesUnics.map((Brand, index) => (
                            <button className={Brand===preFilters.brand ? "active" : ""} onClick={()=>{handleFilterChange("type", Brand)}} key={index}>{Brand}</button>
                        ))
                    }
                </div>
                <h3>Colores</h3>
                <div className="FilterRow">
                    {
                        colorsUnics.map((Color, index) => (
                            <button className={Color===preFilters.color ? "active" : ""} onClick={()=>{handleFilterChange("color", Color)}} key={index}>{Color}</button>
                        ))
                    }
                </div>
                <div className="FilterInputDiv">
                <h3>Precio mínimo</h3>
                <input type="number"  value={preFilters.MinPrice} onChange={(e)=>{handleFilterChange("MinPrice", e.target.value)}}/>
                </div>
                <div className="FilterInputDiv">
                <h3>Precio máximo</h3>
                <input type="number"  value={preFilters.MaxPrice} onChange={(e)=>{handleFilterChange("MaxPrice", e.target.value)}}/>
                </div>
                {
                    products[0].productType!=="motos"&&
                    <>
                                    <h3>Tamaños</h3>
                <div className="FilterRow">
                    {
                        sizes.map((Size, index) => (
                            <button className={Size===preFilters.size ? "active" : ""} onClick={()=>{handleFilterChange("size", Size)}} key={index}>{Size.toUpperCase()}</button>
                        ))
                    }
                </div>
                </>
                }
                <div>
                    <button onClick={()=>{
                        resetFilters()
                        setFiltersOnUrl()
                        if (FilterType === "Brand") {
                            addFilter("brand", Value);
                        } else if (FilterType === "Clase") {
                            console.log("CLASE")
                            console.log(Value)
                            addFilter("type", Value);
                        }
                        }} className="BottomButton" >Limpiar filtros</button>
                    <button onClick={()=>{
                        setFiltersOnUrl()
                        setOpenFilters(false)}}
                         className="BottomButton">Filtrar</button>
                </div>
            </div>
        </div>
        </>
    )
}
export default EcommFiltersModal
