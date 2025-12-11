function OtherOptions({otherOptions, setViewOptions}) {
            return(
                <div id="OtherOptions">
                        <div id="OtherOptionsHeader">
                            <button id="OtherOptionsHeaderExit" onClick={()=>{setViewOptions(false)}}>X</button>
                        </div>
                        <div id="OtherOptionsBody">
                            {
                                otherOptions.map((item, index)=>(
                                    <div key={index} id="OtherOptionsBodyCard">
                                        <img src={item.imageLink}/>
                                        <p>{item.title}</p>
                                    </div>
                                    ))
                            }
                        </div>
                    </div>
                )

}
export default OtherOptions;