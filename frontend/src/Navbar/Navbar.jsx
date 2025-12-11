import { BsSearch, BsList, BsX } from "react-icons/bs";
import { useState, useEffect } from 'react'
import NavbarMenu from "./components/NavbarMenu";


function Navbar ({data}){
    const [MenuState, setMenuState] = useState(false)
    const [MenuOptions, setMenuOptions] = useState([])
    const OpenMenu = async () => {
        setMenuState(!MenuState)
        if (MenuOptions.length === 0){
            try {
            const response = await fetch('http://127.0.0.1:5000/api/classes')
            const data = await response.json()
            setMenuOptions(data)
            }
            catch (error) {
                console.error('Error fetching products:', error)
            }
        }

        }

    return(
        <>
    <nav>
        <BsSearch id="searchButton"/>
        <a id="NavbarLogo" href="/"><img src="https://iili.io/Fn2FeZG.png" alt="Motos Punta" /></a>
        <button id="MenuButton" onClick={OpenMenu}> {
            MenuState ?
            <>
            <span id="MenuText" >MENU</span><BsX id="MenuSVG"/>
            </>
            :
            <>
                <span id="MenuText" >MENU</span><BsList id="MenuSVG"/>
            </>
            } </button>
    </nav>
                {
                MenuState &&
                <NavbarMenu MenuState={MenuState} data={data} MenuOptions={MenuOptions}/>
            }
        </>
    )
    }
export default Navbar;