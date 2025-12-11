function EcommFirstView({products,urlClass}) {
    console.log(products)
    return (
        <div id="EcommFirstView">
            <img src={products[0].imageLink} />
            <h2>{urlClass.toUpperCase()}</h2>
        </div>
    );
}

export default EcommFirstView;

