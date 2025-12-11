import React, { useState } from 'react';
import OtherOptions from './FirstView/OtherOptions';

function FirstView({products}) {
    const [viewOptions, setViewOptions] = useState(false);
    const [otherOptions, setOtherOptions] = useState([]);



    if(products){
        const WallpaperProduct = products.find(product => product.wallpaper !== "No");
        const handleViewOptions = () => {
            const options = products.filter(prod=>prod.title===WallpaperProduct.title)
            setOtherOptions(options);
            setViewOptions(true);
        }
        return (
            <section id="FirstView">
                <div id="FirstViewContent" className={viewOptions?"FirstViewOptionsActive":""}>
                    <h2>{WallpaperProduct.title}</h2>
                    <img src={WallpaperProduct.imageLink} />
                    <button id="FirstViewMore" onClick={()=>{handleViewOptions()}} >Ver todas las opciones</button>
                </div>
                {
                    viewOptions&&
                <OtherOptions otherOptions={otherOptions} setViewOptions={setViewOptions} viewOptions={viewOptions} />
                }
                <div id="FirstViewRight">
                    <img src={`./src//assets/logos/${WallpaperProduct.brand}.png`} />
                    <p>{WallpaperProduct.description}</p>
                </div>


            </section>
        );
    }
}
export default FirstView;