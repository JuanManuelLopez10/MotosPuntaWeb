import React, { useState } from "react";


function NavbarMenu({MenuState, MenuOptions, data}){
    const [SelectedOption, setSelectedOption] = useState(undefined);
    const [PreviewImage, setPreviewImage] = useState(undefined);
    const getFirstImage = (bikeType) => {
        const product = data.find(item => item.type === bikeType);
        console.log(product)
        product && setPreviewImage(product.imageLink);

    }

    if(MenuOptions.classes !== undefined){
    return(
        <div id="NavbarMenu" className={MenuState ? "NavbarMenuActive" : "NavbarMenuInactive"}>
            <div id="ClassesMenu" className={SelectedOption!==undefined?"ClassesMenuReduced":"ClassesMenuFull"} >
                {
                    MenuOptions.classes.map((item, index) => (
                        <button key={index} className={SelectedOption === item ? "ClassButtonSelected" : "ClassButton"} onClick={() => setSelectedOption(item)}>{item.toUpperCase()}</button>
                    ))
                }
                <button>CONTACTO</button>
                <button>FINANCIACIONES</button>
            </div>

            {
                    SelectedOption!==undefined&&
                <div id="TypesMenu">
                {
                    MenuOptions.types.map((Option, index)=>{
                        if(Option.class===SelectedOption){
                            return(
                                <a onMouseOver={()=>{getFirstImage(Option.bikeType)}} href={`/ecomm/Clase/${Option.bikeType}`} key={index}>{Option.bikeType}</a>
                            )
                    }})
                }
                </div>
            }
            {
                PreviewImage!==undefined&&
                <div id="TypePreview">
                    <img src={PreviewImage}/>
                </div>
            }

        </div>
        )
    }
}
export default NavbarMenu;