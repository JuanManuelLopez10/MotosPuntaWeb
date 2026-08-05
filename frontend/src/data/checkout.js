// Configuración de pago y entrega del checkout. Editá estos valores con los datos reales
// (los marcados con AJUSTAR). Más adelante el recargo y la tasa también podrán vivir en el
// backend; por ahora, esto alcanza para el checkout.
export const CHECKOUT = {
  // Recargo de Mercado Pago que se traslada a quien paga con tarjeta (%). AJUSTAR según tu
  // plan de MP (ronda 5-6% con acreditación inmediata en Uruguay).
  mpSurchargePct: 6,

  // Datos bancarios para la opción "transferencia" (se le muestran al cliente).
  bank: {
    banco: "Scotiabank",
    titular: "Motos Punta SRL",
    cuentaUsd: "791464402",
    cuentaUyu: "791464401",
    nota: "Si transferís desde otro banco, agregá un 0 adelante (ej. 0791464402 en dólares o 0791464401 en pesos).",
  },
};
