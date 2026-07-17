# Product

## Register

brand

## Platform

web

## Users

Personas en Maldonado y el este de Uruguay que quieren comprar una moto 0 km o
productos moteros (cascos, indumentaria, accesorios). Llegan en su mayoría desde el
celular, muchas veces desde Instagram (@motospunta), comparando modelos y precios y
queriendo resolver la consulta rápido y por WhatsApp. Contexto de decisión de compra
media-alta: la moto es una compra grande, así que necesitan confianza (concesionaria
real, con local físico), claridad de precio, y una idea concreta de la cuota antes de
dar el paso. Para cascos, indumentaria y accesorios el interés es más impulsivo y la
web por ahora solo los muestra (la venta se cierra por WhatsApp o en el local).

## Product Purpose

Es el sitio oficial de Motos Punta, una concesionaria de motos de Maldonado. Existe
para mostrar todo el catálogo (motos y equipamiento), dejar que el visitante estime la
cuota de una moto por sí mismo con un simulador, y convertir ese interés en una
conversación por WhatsApp o en datos de contacto que la concesionaria pueda seguir. El
éxito es simple: más consultas calificadas por WhatsApp y más leads de financiación,
sin que el visitante tenga que llamar ni ir al local para dar el primer paso.

## Positioning

La concesionaria de Maldonado donde tu próxima moto arranca con una cuota clara y un
WhatsApp de distancia: catálogo completo, precio a la vista y atención directa.

## Conversion & proof

- Primary CTA: "Consultar por WhatsApp" — presente en cada producto y como botón
  flotante fijo, siempre a `wa.me/59899673830` con un mensaje precargado que nombra el
  producto.
- Secondary CTA: el simulador de cuotas (para motos) y el formulario de contacto /
  solicitud de financiación, para quien todavía no está listo para escribir.
- La línea que el visitante recuerda a los 10 segundos: "Tu próxima moto, en Maldonado
  — con financiación clara y atención directa."
- Belief ladder: (1) esto es una concesionaria real y confiable, con local en
  Maldonado; (2) tienen la moto o el producto que busco, con el precio a la vista; (3)
  puedo estimar yo mismo la cuota, sin compromiso; (4) puedo avanzar por WhatsApp en un
  solo clic.
- Proof on hand: marcas que representan, con logos en `frontend/src/assets/logos/`
  (AGV, LS2, MT, CFMoto, Suzuki, TVS, QJ, Givi, Hevik, Nolan, Seventy, entre otras);
  Instagram público @motospunta; dirección y local físico en Arturo Santana esq. 19 de
  Abril, Maldonado.

## Brand Personality

Cercana pero profesional; deportiva y confiable. Habla como un vendedor que sabe de
motos y te trata de vos: directo, uruguayo, entusiasta pero sobrio, sin jerga de
marketing ni promesas infladas. Debe transmitir adrenalina contenida y seriedad de
concesionaria a la vez — la emoción de una moto nueva sostenida por la confianza de que
hay una empresa real detrás.

## Anti-references

Nada de degradados violeta/azul ni el look "SaaS genérico". Sin la fuente Inter por
defecto. Sin tarjetas dentro de tarjetas ni capas de bordes anidados. Sin aspecto de
plantilla comprada ni de constructor de sitios. Sin stock photos de gente sonriendo con
casco; el héroe es el producto real. Sin arcoíris de colores: el rojo es el único
acento y se usa con criterio.

## Design Principles

- Oscuro y premium, el rojo se gana su lugar: fondo negro/carbón, un solo acento rojo
  (el del logo) reservado para acción y énfasis, nunca decorativo.
- Mobile-first de verdad: se diseña primero para el celular, porque ahí entra la mayoría
  desde Instagram; el desktop es la ampliación, no al revés.
- El producto es el héroe: las fotos PNG de las motos y los cascos mandan sobre fondo
  oscuro; nada de relleno decorativo que compita con el producto.
- Una acción a un clic: desde cualquier pantalla se puede consultar por WhatsApp o
  estimar una cuota sin fricción.
- Un solo sistema: una tipografía de display condensada, una sans limpia, un único radio
  de esquina y una escala de espacios coherente en todo el sitio. La consistencia es lo
  que lo saca del "look de plantilla".

## Accessibility & Inclusion

Objetivo WCAG 2.1 AA. El rojo de acento se usa para superficies de acción y texto
grande, no para texto de cuerpo (se cuida el contraste del texto blanco/gris sobre
negro y del texto sobre el rojo). Todas las imágenes con `alt` descriptivo. Navegación
completa por teclado con foco visible. Se respeta `prefers-reduced-motion` (las
transiciones y reveals se apagan). Objetivos táctiles cómodos para uso a una mano en el
celular.
