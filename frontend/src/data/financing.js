// Opciones de financiación de Motos Punta. Editá acá los requisitos/condiciones y los
// `criteria` (que alimentan el checklist de elegibilidad). La pantalla /financiacion se
// arma sola. (Los requisitos los confirma cada entidad al momento de la solicitud.)

export const FINANCING = [
  {
    id: "bbva",
    name: "BBVA",
    tagline: "El plazo más largo, en unidades indexadas.",
    facts: [
      { label: "Cuotas", value: "Hasta 60" },
      { label: "Moneda", value: "Unidades indexadas" },
      { label: "Edad mínima", value: "20 años" },
    ],
    requirements: [
      "Sueldo líquido mayor a $25.000",
      "Ser mayor de 20 años",
      "No estar en el Clearing",
      "1 año de antigüedad laboral. También cuenta si tenés más de 4 meses en el trabajo actual y, entre el anterior y el actual, no dejaste de trabajar ningún mes y sumás 1 año entre ambos.",
      "Extranjeros: solo sirve la cédula que dice “Residencia legal”.",
    ],
    criteria: { edadMin: 20, sueldoMin: 25000, antiguedadMin: 12, clearingProhibido: true },
  },
  {
    id: "bbva-tasa-0",
    name: "BBVA",
    badge: "Tasa 0%",
    tagline: "Sin intereses, con comisión bancaria.",
    facts: [
      { label: "Cuotas", value: "Hasta 36" },
      { label: "Tasa", value: "0%" },
      { label: "Aprobación", value: "~1 día" },
    ],
    requirements: [
      "Sueldo líquido mínimo de $40.000",
      "No estar en el Clearing",
      "Extranjeros: solo sirve la cédula que dice “Residencia legal”.",
    ],
    notes: [
      "Comisión bancaria del 6% del valor a financiar si la moto cuesta menos de USD 7.000, o del 3% si cuesta más de USD 7.000.",
      "La aprobación suele demorar 1 día desde que se envía la documentación.",
    ],
    criteria: { sueldoMin: 40000, clearingProhibido: true },
  },
  {
    id: "santander-creditel",
    name: "Santander y Creditel",
    tagline: "Crédito en dólares.",
    facts: [
      { label: "Moneda", value: "Dólares" },
      { label: "Aprobación", value: "3 a 4 días" },
      { label: "Edad mínima", value: "25 años" },
    ],
    requirements: [
      "Ser mayor de 25 años",
      "No estar en el Clearing",
      "Sueldo mayor a $20.000",
      "Antigüedad laboral de 6 meses como mínimo",
      "Número de cédula inferior a 6.000.000",
      "Extranjeros: solo sirve la cédula que dice “Residencia legal”.",
    ],
    criteria: { edadMin: 25, sueldoMin: 20000, antiguedadMin: 6, clearingProhibido: true, cedulaMenor6M: true },
  },
  {
    id: "creditos-directos",
    name: "Créditos Directos",
    tagline: "Rango de edad más amplio.",
    facts: [
      { label: "Edad", value: "21 a 70 años" },
      { label: "Antigüedad", value: "6 meses" },
    ],
    requirements: [
      "Tener entre 21 y 70 años",
      "Contar con 6 meses de antigüedad laboral",
      "Percibir un ingreso líquido mínimo de $25.000",
      "Extranjeros: solo sirve la cédula que dice “Residencia legal”.",
    ],
    criteria: { edadMin: 21, edadMax: 70, sueldoMin: 25000, antiguedadMin: 6 },
  },
  {
    id: "anda",
    name: "Anda",
    tagline: "Con opción aun estando en el Clearing.",
    facts: [
      { label: "Antigüedad", value: "6 meses" },
      { label: "Sueldo mínimo", value: "$20.000" },
    ],
    requirements: [
      "6 meses de antigüedad laboral",
      "Sueldo líquido de al menos $20.000",
      "La empresa donde trabajás tiene que estar afiliada a Anda",
    ],
    notes: [
      "Si estás en el Clearing: necesitás al menos 1 año y medio de antigüedad, y te financian el monto de un sueldo hasta en 12 cuotas.",
    ],
    criteria: { sueldoMin: 20000, antiguedadMin: 6, empresaAnda: true, andaClearing: true },
  },
  {
    id: "cash",
    name: "Cash",
    tagline: "Requisitos mínimos.",
    facts: [
      { label: "Antigüedad", value: "6 meses" },
      { label: "Edad mínima", value: "21 años" },
    ],
    requirements: [
      "Al menos 6 meses de antigüedad laboral",
      "Ser mayor de 21 años",
    ],
    criteria: { edadMin: 21, antiguedadMin: 6 },
  },
];

// Preguntas del checklist de elegibilidad.
export const ELIGIBILITY_QUESTIONS = [
  { key: "edad", label: "Edad", type: "number", suffix: "años" },
  { key: "sueldo", label: "Sueldo líquido mensual", type: "number", suffix: "$" },
  { key: "antiguedad", label: "Antigüedad laboral (en meses)", type: "number", suffix: "meses" },
  { key: "clearing", label: "¿Estás en el Clearing?", type: "bool" },
  { key: "cedulaMenor6M", label: "¿Tu N° de cédula es menor a 6.000.000?", type: "bool" },
  { key: "empresaAnda", label: "¿Tu empresa está afiliada a Anda?", type: "bool" },
  { key: "extranjero", label: "¿Sos extranjero/a?", type: "bool" },
  { key: "residenciaLegal", label: "¿Tu cédula dice “Residencia legal”?", type: "bool", dependsOn: "extranjero" },
];

// Evalúa una opción contra las respuestas. Devuelve { status, fails }:
//  - "ok": cumple todos los criterios respondidos.
//  - "no": hay al menos un requisito que no cumple (fails lo detalla).
//  - "incompleto": faltan datos para confirmar.
export function evaluate(option, a = {}) {
  const c = option.criteria || {};
  const fails = [];
  const missing = new Set();
  const has = (k) => a[k] !== undefined && a[k] !== "" && a[k] !== null;
  const num = (k) => Number(a[k]);

  const clean = (n) => n.toLocaleString("es-UY");

  if (c.edadMin != null || c.edadMax != null) {
    if (!has("edad")) missing.add("edad");
    else {
      if (c.edadMin != null && num("edad") < c.edadMin) fails.push(`Requiere ${c.edadMin} años o más`);
      if (c.edadMax != null && num("edad") > c.edadMax) fails.push(`Requiere hasta ${c.edadMax} años`);
    }
  }
  if (c.sueldoMin != null) {
    if (!has("sueldo")) missing.add("sueldo");
    else if (num("sueldo") < c.sueldoMin) fails.push(`Requiere sueldo de $${clean(c.sueldoMin)} o más`);
  }
  if (c.cedulaMenor6M) {
    if (!has("cedulaMenor6M")) missing.add("cedulaMenor6M");
    else if (!a.cedulaMenor6M) fails.push("Requiere cédula menor a 6.000.000");
  }
  if (c.empresaAnda) {
    if (!has("empresaAnda")) missing.add("empresaAnda");
    else if (!a.empresaAnda) fails.push("Tu empresa debe estar afiliada a Anda");
  }

  if (c.andaClearing) {
    // Anda: si está en Clearing pide 18 meses; si no, los meses base del criterio.
    if (!has("clearing") || !has("antiguedad")) {
      if (!has("clearing")) missing.add("clearing");
      if (!has("antiguedad")) missing.add("antiguedad");
    } else {
      const min = a.clearing ? 18 : (c.antiguedadMin ?? 6);
      if (num("antiguedad") < min) {
        fails.push(a.clearing ? "Con Clearing: requiere 18 meses de antigüedad" : `Requiere ${min} meses de antigüedad`);
      }
    }
  } else {
    if (c.clearingProhibido) {
      if (!has("clearing")) missing.add("clearing");
      else if (a.clearing) fails.push("No podés estar en el Clearing");
    }
    if (c.antiguedadMin != null) {
      if (!has("antiguedad")) missing.add("antiguedad");
      else if (num("antiguedad") < c.antiguedadMin) fails.push(`Requiere ${c.antiguedadMin} meses de antigüedad`);
    }
  }

  // Extranjeros: en todas las entidades la cédula debe decir "Residencia legal".
  if (!has("extranjero")) {
    // no lo marcamos como faltante crítico; si no respondió, no bloquea.
  } else if (a.extranjero) {
    if (!has("residenciaLegal")) missing.add("residenciaLegal");
    else if (!a.residenciaLegal) fails.push("Extranjeros: la cédula debe decir “Residencia legal”");
  }

  if (fails.length) return { status: "no", fails };
  if (missing.size) return { status: "incompleto", fails: [] };
  return { status: "ok", fails: [] };
}
