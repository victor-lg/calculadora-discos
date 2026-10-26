// Modelo de vista: a partir del estado en memoria, decide qué se muestra y con
// qué textos. La interfaz lo pinta tal cual, sin lógica propia.
import { analizarPeso, analizarPesoBarra, analizarPorcentaje } from './entrada.js';
import { calcularSerie, excesoMangaMm, COLLARIN_CENT, DISCOS_CENT } from './calculo.js';
import { formatearKg } from './formato.js';

export const MODOS = Object.freeze([
  Object.freeze({ id: 'barra', nombre: 'Barra' }),
  Object.freeze({ id: 'dos-lados', nombre: 'Dos lados sin barra' }),
  Object.freeze({ id: 'un-punto', nombre: 'Un punto' }),
]);

// FR-02: catálogo fijo. `cent` es null cuando el peso lo escribe la persona.
// FR-16: `mangaDmm` es la manga útil de cada lado, en décimas de milímetro.
export const BARRAS = Object.freeze([
  Object.freeze({ id: '20', nombre: 'Olímpica 20 kg', cent: 2000, mangaDmm: 3750 }),
  Object.freeze({ id: '15', nombre: 'Olímpica 15 kg', cent: 1500, mangaDmm: 2800 }),
  Object.freeze({ id: 'recta', nombre: 'Recta', cent: null, mangaDmm: 2000 }),
  Object.freeze({ id: 'z', nombre: 'Z', cent: null, mangaDmm: 2000 }),
]);
// FR-16: la máquina de los modos Dos lados y Un punto.
const MANGA_MAQUINA_DMM = 3100;
// FR-02: la primera vez, la recta y la Z pesan 10 kg.
const PESO_BARRA_INICIAL_CENT = 1000;

export const TEXTOS = {
  rellenarTrabajo: 'Escribe el peso de trabajo.',
  // FR-03: el primer motivo que se cumple (entrada.js).
  errorTrabajo: {
    decimales: 'El peso de trabajo admite como máximo dos decimales.',
    formato: 'Escribe el peso solo con cifras y, si hace falta, una coma decimal.',
    rango: 'El peso de trabajo debe estar entre 0 y 500 kg.',
  },
  errorBarra: 'Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo.',
  errorPorcentaje: 'Escribe un porcentaje entre 1 y 100.',
  porcentajeRepetido: (p) => `Ya tienes una serie del ${p} %.`,
  anadirPorcentajes: 'Añade al menos un porcentaje.',
  trabajoInferiorBarra: 'El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.',
  habilitarDiscos: 'Habilita al menos un disco en Mis discos.',
  falloGuardar: 'No se ha podido guardar: se mantendrá hasta cerrar la app',
  // FR-06: P porcentaje, W peso de trabajo, O objetivo, C cargado y D diferencia.
  detalleDiferencia: (p, w, o, c, d) =>
    `El ${p} % de ${w} kg son ${o} kg. Con tus discos, lo más cercano sin pasarte es ${c} kg: ${d} kg menos.`,
  // FR-08.
  porLado: 'Por lado',
  totalEnDiscos: 'Total en discos',
  collarin: '+ collarín de 2,5 kg',
  // FR-09: P porcentaje, O objetivo, B barra, F lo que falta e Y el disco más
  // pequeño (SPEC-CALC-002 FR-05).
  soloBarra: 'Solo la barra',
  sinDiscos: 'Sin discos',
  menosQueBarra: (p, o, b) => `El ${p} % son ${o} kg, menos que la barra (${b} kg).`,
  faltaPorLado: (p, o, f, y) =>
    `El ${p} % son ${o} kg: faltan ${f} kg para poner el disco más pequeño (${y} kg) a cada lado.`,
  faltaConCollarin: (p, o, f, y) =>
    `El ${p} % son ${o} kg: faltan ${f} kg para poner el disco más pequeño (${y} kg) y el collarín a cada lado.`,
  faltaUnPunto: (p, o, f, y) =>
    `El ${p} % son ${o} kg: faltan ${f} kg para poner el disco más pequeño (${y} kg).`,
  // FR-16, sin "Se dibujan los que caben.": esta interfaz no dibuja la carga.
  noCaben: (x) => `No caben en la manga: faltan ${x} cm.`,
};

// FR-04: ordenados de menor a mayor y sin repetidos.
const ordenarSinRepetidos = (lista) => [...new Set(lista)].sort((a, b) => a - b);

// FR-11: al arrancar de cero, modo Barra, olímpica de 20 kg y peso de trabajo
// vacío; la recta y la Z, 10 kg (FR-02), sin collarines (FR-15).
// `discos` son los tipos habilitados, en centésimas y de mayor a menor
// (SPEC-CALC-002 FR-08). `guardados` es el último valor que se guardó bien de
// cada dato: al arrancar de cero, el valor con el que arranca (SPEC-CALC-002 FR-09).
// `barraValida` es el último peso válido de la recta y de la Z (FR-02).
export function estadoInicial(porcentajes, discos = DISCOS_CENT) {
  const barraValida = { recta: PESO_BARRA_INICIAL_CENT, z: PESO_BARRA_INICIAL_CENT };
  const estado = {
    modo: 'barra',
    barra: '20',
    pesoBarra: textosBarra(barraValida),
    barraValida,
    trabajo: '',
    porcentajes: ordenarSinRepetidos(porcentajes),
    discos: [...discos],
    collarines: false,
    textoPorcentaje: '',
    errorPorcentaje: null,
  };
  return { ...estado, guardados: { porcentajes: estado.porcentajes, discos: estado.discos } };
}

// FR-02: el campo de la recta y el de la Z muestran su último peso válido con
// el formato de FR-14.
function textosBarra(barraValida) {
  return { recta: formatearKg(barraValida.recta), z: formatearKg(barraValida.z) };
}

// FR-02: al cambiar de modo o de barra, un peso de barra no válido se descarta
// y el campo vuelve a mostrar el último válido.
export function elegirModo(estado, modo) {
  return { ...estado, modo, pesoBarra: textosBarra(estado.barraValida) };
}

export function elegirBarra(estado, barra) {
  return { ...estado, barra, pesoBarra: textosBarra(estado.barraValida) };
}

// FR-02: lo tecleado se conserva tal cual; si es válido, pasa a ser el último
// peso válido de esa barra.
export function escribirPesoBarra(estado, texto) {
  const cent = analizarPesoBarra(texto);
  return {
    ...estado,
    pesoBarra: { ...estado.pesoBarra, [estado.barra]: texto },
    barraValida: cent === null ? estado.barraValida : { ...estado.barraValida, [estado.barra]: cent },
  };
}

// FR-04: si es válido y no está, lo añade en su sitio; si no, deja la lista
// como estaba y guarda el mensaje.
export function anadirPorcentaje(estado) {
  const r = analizarPorcentaje(estado.textoPorcentaje);
  // Vacío o solo espacios: la lista no cambia y no hay mensaje.
  if (r.estado === 'vacio') return { ...estado, errorPorcentaje: null };
  if (r.estado === 'invalido') return { ...estado, errorPorcentaje: TEXTOS.errorPorcentaje };
  if (estado.porcentajes.includes(r.valor)) {
    return { ...estado, errorPorcentaje: TEXTOS.porcentajeRepetido(r.valor) };
  }
  return {
    ...estado,
    porcentajes: ordenarSinRepetidos([...estado.porcentajes, r.valor]),
    textoPorcentaje: '',
    errorPorcentaje: null,
  };
}

export function quitarPorcentaje(estado, indice) {
  return { ...estado, porcentajes: estado.porcentajes.filter((_, i) => i !== indice) };
}

// SPEC-CALC-002 FR-02: tocar un tipo lo habilita o lo deshabilita.
export function alternarDisco(estado, cent) {
  const discos = estado.discos.includes(cent)
    ? estado.discos.filter((d) => d !== cent)
    : DISCOS_CENT.filter((d) => d === cent || estado.discos.includes(d));
  return { ...estado, discos };
}

const iguales = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function barraElegida(estado) {
  return BARRAS.find((b) => b.id === estado.barra);
}

// FR-08: cada tipo una vez, de mayor a menor, con "×n" si se repite.
function gruposDiscos(discos) {
  const grupos = [];
  for (const d of discos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.cent === d) ultimo.n++;
    else grupos.push({ cent: d, n: 1 });
  }
  return grupos.map(({ cent, n }) => (n > 1 ? `${formatearKg(cent)} ×${n}` : formatearKg(cent)));
}

// FR-09: la línea, el peso total y la explicación de una serie sin discos.
function serieSinDiscos(estado, barraCent, objetivo, porcentaje) {
  const tipos = estado.discos;
  const y = tipos[tipos.length - 1];
  const kg = formatearKg;
  const o = kg(objetivo);
  if (estado.modo === 'un-punto') {
    return { linea: TEXTOS.sinDiscos, total: '0 kg', explicacion: TEXTOS.faltaUnPunto(porcentaje, o, kg(y - objetivo), kg(y)) };
  }
  if (estado.modo === 'dos-lados') {
    return { linea: TEXTOS.sinDiscos, total: '0 kg', explicacion: TEXTOS.faltaPorLado(porcentaje, o, kg(2 * y - objetivo), kg(y)) };
  }
  const b = kg(barraCent);
  let explicacion;
  if (objetivo < barraCent) explicacion = TEXTOS.menosQueBarra(porcentaje, o, b);
  else if (estado.collarines) {
    explicacion = TEXTOS.faltaConCollarin(porcentaje, o, kg(barraCent + 2 * (y + COLLARIN_CENT) - objetivo), kg(y));
  } else explicacion = TEXTOS.faltaPorLado(porcentaje, o, kg(barraCent + 2 * y - objetivo), kg(y));
  return { linea: TEXTOS.soloBarra, total: `${b} kg`, explicacion };
}

function modeloSerie(estado, barra, barraCent, trabajoCent, porcentaje) {
  const s = calcularSerie({
    modo: estado.modo,
    barraCent,
    trabajoCent,
    porcentaje,
    tipos: estado.discos,
    collarines: estado.collarines,
  });
  const serie = {
    porcentaje: `${porcentaje} %`,
    total: null,
    diferencia: null,
    detalleDiferencia: null,
    linea: null,
    explicacion: null,
    etiquetaDiscos: null,
    discos: null,
    collarin: null,
    avisoCapacidad: null,
  };
  // FR-09: sin discos ni collarines, y sin diferencia.
  if (s.minimo) return { ...serie, ...serieSinDiscos(estado, barraCent, s.objetivo, porcentaje) };
  serie.total = `${formatearKg(s.cargado)} kg`;
  serie.etiquetaDiscos = estado.modo === 'un-punto' ? TEXTOS.totalEnDiscos : TEXTOS.porLado;
  serie.discos = gruposDiscos(s.discos);
  if (s.collarines) serie.collarin = TEXTOS.collarin;
  if (s.diferencia !== 0) {
    serie.diferencia = `${formatearKg(s.diferencia)} kg`;
    serie.detalleDiferencia = TEXTOS.detalleDiferencia(
      porcentaje,
      formatearKg(trabajoCent),
      formatearKg(s.objetivo),
      formatearKg(s.cargado),
      formatearKg(-s.diferencia),
    );
  }
  // FR-16: el exceso, en milímetros, se muestra en centímetros (FR-14).
  const exceso = excesoMangaMm(s.discos, estado.modo === 'barra' ? barra.mangaDmm : MANGA_MAQUINA_DMM);
  if (exceso > 0) serie.avisoCapacidad = TEXTOS.noCaben(formatearKg(exceso * 10));
  return serie;
}

export function modeloVista(estado) {
  const enBarra = estado.modo === 'barra';
  const barra = barraElegida(estado);
  const barraEditable = enBarra && barra.cent === null;

  const vista = {
    modo: estado.modo,
    barra: estado.barra,
    mostrarBarras: enBarra,
    barraEditable,
    pesoBarraTexto: barraEditable ? estado.pesoBarra[estado.barra] : '',
    pesoBarraFijo: enBarra && !barraEditable ? `${formatearKg(barra.cent)} kg` : null,
    collarines: estado.collarines,
    trabajo: estado.trabajo,
    errorTrabajo: null,
    indicacionTrabajo: null,
    errorBarra: null,
    avisoBarra: null,
    porcentajes: estado.porcentajes.map((p) => `${p} %`),
    textoPorcentaje: estado.textoPorcentaje,
    errorPorcentaje: estado.errorPorcentaje,
    indicacionPorcentajes: estado.porcentajes.length === 0 ? TEXTOS.anadirPorcentajes : null,
    discos: DISCOS_CENT.map((cent) => ({
      cent,
      nombre: `${formatearKg(cent)} kg`,
      habilitado: estado.discos.includes(cent),
    })),
    // SPEC-CALC-002 FR-06: además de las demás indicaciones, avisos o errores.
    indicacionDiscos: estado.discos.length === 0 ? TEXTOS.habilitarDiscos : null,
    // SPEC-CALC-002 FR-09: mientras algún dato no coincida con lo último guardado bien.
    avisoGuardado: iguales(estado.porcentajes, estado.guardados.porcentajes)
      && iguales(estado.discos, estado.guardados.discos) ? null : TEXTOS.falloGuardar,
    series: [],
  };

  const trabajo = analizarPeso(estado.trabajo);
  if (trabajo.estado === 'vacio') vista.indicacionTrabajo = TEXTOS.rellenarTrabajo;
  if (trabajo.estado === 'invalido') vista.errorTrabajo = TEXTOS.errorTrabajo[trabajo.causa];

  let barraCent = 0;
  if (enBarra) barraCent = barraEditable ? analizarPesoBarra(vista.pesoBarraTexto) : barra.cent;
  // FR-02: vacío o no válido, el mismo mensaje.
  if (barraCent === null) vista.errorBarra = TEXTOS.errorBarra;

  // FR-12: mientras el peso de barra no es válido, tampoco se muestra el aviso.
  if (trabajo.estado !== 'ok' || barraCent === null) return vista;

  // FR-12: solo si el peso de trabajo es estrictamente menor que la barra.
  if (enBarra && trabajo.cent < barraCent) vista.avisoBarra = TEXTOS.trabajoInferiorBarra;

  // SPEC-CALC-002 FR-06: sin ningún tipo habilitado no hay series.
  if (estado.discos.length === 0) return vista;
  vista.series = estado.porcentajes.map((p) => modeloSerie(estado, barra, barraCent, trabajo.cent, p));
  return vista;
}
