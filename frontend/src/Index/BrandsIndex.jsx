import React, { useState, useEffect, useRef } from 'react';

function BrandsIndex({products}) {
    const [hoveredOption, setHoveredOption] = useState(0);
    const [brands, setBrands] = useState([])
    const wallpaperProducts = products.filter(product => product.wallpaper !== "No");
    const hoverTimeout = useRef(null);
    const toggleOption = (index) => {
        if (hoveredOption !== index) {
            setHoveredOption(index);
        }
    }
  const fetchBrands = async () => {
      if (!brands[0]){
                try {
        const response = await fetch('/api/brands')
        const data = await response.json()
        setBrands(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }
          }

    useEffect(() => {
        if (!brands[0]){
            fetchBrands()
        }
    }, [])
 const handleMouseOver = (index) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      setHoveredOption(index);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

    return (
    <section id="Brands">
      {brands.map((Brand, index) => {
        const firstProduct = products.find(prod => prod.brand === Brand.brand);
        return (
          <div
            key={index}
            onMouseOver={() => handleMouseOver(index)}
            onMouseLeave={handleMouseLeave}
            className={hoveredOption === index ? "BrOption BrandsOption" : "BrOption BrandsOptionNot"}
            style={{ backgroundImage: `linear-gradient(${Brand.bgDark}, #bdbdbd)` }}
          >
            <img
              className="BrandLogo"
              src={`./src/assets/logos/${Brand.brand}.png`}
              alt={Brand.brand}
            />
            {firstProduct && (
              <img className="BrandProductImage" src={firstProduct.imageLink} alt={firstProduct.name} />
            )}
            <a href={`/ecomm/Brand/${Brand.brand}`}>Ver todas las opciones</a>
          </div>
        );
      })}
    </section>
  );
}
export default BrandsIndex;