// Modelo de vista: a partir del estado en memoria, decide qué se muestra y con
// qué textos. La interfaz lo pinta tal cual, sin lógica propia.
import { analizarPeso, analizarPesoBarra, analizarPorcentaje } from './entrada.js';
import { calcularSerie, excesoMangaMm, COLLARIN_CENT, DISCOS_CENT } from './calculo.js';
import { formatearKg } from './formato.js';

export const MODOS = Object.freeze([
  Object.freeze({ id: 'barra', nombre: 'Barra' }),
  Object.freeze({ id: 'dos-lados', nombre: 'Dos lados' }),
  Object.freeze({ id: 'un-punto', nombre: 'Un punto' }),
]);

// FR-02: catálogo fijo. `cent` es null cuando el peso lo escribe la persona.
// FR-16: `mangaDmm` es la manga útil de cada lado, en décimas de milímetro.
// SPEC-CALC-003 FR-03: el nombre se muestra seguido del peso.
export const BARRAS = Object.freeze([
  Object.freeze({ id: '20', nombre: 'Olímpica', cent: 2000, mangaDmm: 3750 }),
  Object.freeze({ id: '15', nombre: 'Olímpica', cent: 1500, mangaDmm: 2800 }),
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
  // SPEC-CALC-003 FR-03, FR-04 y FR-05: textos propios de la presentación.
  resumenBarra: (nombre, peso, collarines) => `Barra · ${nombre} ${peso} kg${collarines ? ' · collarines' : ''}`,
  resumenMaquina: { 'dos-lados': 'Dos lados · máquina', 'un-punto': 'Un punto · máquina' },
  cuentaDiscos: (n, total) => `${n} de ${total}`,
  anuncioDiscos: (n, total) => `Mis discos: ${n} de ${total} habilitados`,
  revisarBarra: 'Revisa el peso de la barra en Carga.',
  // SPEC-CALC-003 FR-06: D diferencia, n repeticiones y W peso del disco.
  anuncioDiferencia: (d) => `${d} kg menos que el objetivo. Ver detalle`,
  anuncioDisco: (n, w) => (n === 1 ? `1 disco de ${w} kg` : `${n} discos de ${w} kg`),
};

// FR-04: ordenados de menor a mayor y sin repetidos.
const ordenarSinRepetidos = (lista) => [...new Set(lista)].sort((a, b) => a - b);

// FR-11: valores de la primera vez, o si el dato guardado falta, no se puede
// leer o no es válido.
const TRABAJO_INICIAL = '100';

// FR-11: al arrancar de cero, modo Barra y olímpica de 20 kg, con lo que se
// haya recuperado (`ajustes`, de almacenamiento.js) o los valores de la primera
// vez: peso de trabajo "100", recta y Z de 10 kg (FR-02) y sin collarines (FR-15).
// `discos` son los tipos habilitados, en centésimas y de mayor a menor
// (SPEC-CALC-002 FR-08). `guardados` es el último valor que se guardó bien de
// cada dato: al arrancar de cero, el valor con el que arranca (SPEC-CALC-002 FR-09).
// `barraConfirmada` es el peso confirmado de la recta y de la Z (FR-02), y
// `trabajoConfirmado`, el texto confirmado del peso de trabajo (FR-11).
// `finales` cuenta los finales de edición de cada peso: guardarCambios solo
// escribe un peso cuando termina su edición (almacenamiento.js).
export function estadoInicial(porcentajes, discos = DISCOS_CENT, {
  trabajo = TRABAJO_INICIAL,
  recta = PESO_BARRA_INICIAL_CENT,
  z = PESO_BARRA_INICIAL_CENT,
  collarines = false,
} = {}) {
  const barraConfirmada = { recta, z };
  const estado = {
    modo: 'barra',
    barra: '20',
    pesoBarra: textosBarra(barraConfirmada),
    barraConfirmada,
    trabajo,
    trabajoConfirmado: trabajo,
    finales: { trabajo: 0, recta: 0, z: 0 },
    porcentajes: ordenarSinRepetidos(porcentajes),
    discos: [...discos],
    collarines,
    textoPorcentaje: '',
    errorPorcentaje: null,
  };
  return {
    ...estado,
    guardados: { porcentajes: estado.porcentajes, discos: estado.discos, trabajo, recta, z, collarines },
  };
}

// FR-02: el campo de la recta y el de la Z muestran su peso confirmado con
// el formato de FR-14.
function textosBarra(barraConfirmada) {
  return { recta: formatearKg(barraConfirmada.recta), z: formatearKg(barraConfirmada.z) };
}

// FR-11: termina la edición de un peso, `campo` 'trabajo' o 'barra' (el de la
// recta o la Z elegida). Si lo escrito es válido, pasa a ser el confirmado; si
// no, el confirmado no cambia. Lo que muestra el campo no cambia nunca.
export function terminarEdicion(estado, campo) {
  if (campo === 'trabajo') {
    const valido = analizarPeso(estado.trabajo).estado === 'ok';
    return {
      ...estado,
      trabajoConfirmado: valido ? estado.trabajo : estado.trabajoConfirmado,
      finales: { ...estado.finales, trabajo: estado.finales.trabajo + 1 },
    };
  }
  const barra = estado.barra;
  // Sin la recta o la Z elegida en el modo Barra, el campo no se ve.
  if (campo !== 'barra' || estado.modo !== 'barra' || !(barra in estado.barraConfirmada)) return estado;
  const cent = analizarPesoBarra(estado.pesoBarra[barra]);
  return {
    ...estado,
    barraConfirmada: cent === null ? estado.barraConfirmada : { ...estado.barraConfirmada, [barra]: cent },
    finales: { ...estado.finales, [barra]: estado.finales[barra] + 1 },
  };
}

// FR-02, FR-11: cambiar de modo o de barra termina la edición del peso que
// tiene el foco (`foco`: 'trabajo', 'barra' o null). Después, el campo de cada
// barra vuelve a mostrar su peso confirmado: lo vacío o no válido se descarta.
// Elegir la barra que ya está elegida no es cambiar de barra.
export function elegirModo(estado, modo, foco = null) {
  const e = foco ? terminarEdicion(estado, foco) : estado;
  return { ...e, modo, pesoBarra: textosBarra(e.barraConfirmada) };
}

export function elegirBarra(estado, barra, foco = null) {
  if (barra === estado.barra) return estado;
  const e = foco ? terminarEdicion(estado, foco) : estado;
  return { ...e, barra, pesoBarra: textosBarra(e.barraConfirmada) };
}

// FR-02, FR-03: lo tecleado se conserva tal cual. Las series se calculan con
// ello (FR-10), pero solo se confirma al terminar la edición (FR-11).
export function escribirPesoBarra(estado, texto) {
  return { ...estado, pesoBarra: { ...estado.pesoBarra, [estado.barra]: texto } };
}

export function escribirTrabajo(estado, texto) {
  return { ...estado, trabajo: texto };
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

// SPEC-CALC-002 FR-09: el aviso se muestra mientras algún dato no coincida con
// lo último guardado bien. El peso de trabajo se compara por su texto y los
// pesos de barra, por su valor; de los pesos cuenta el confirmado, así que el
// aviso no cambia mientras se escribe.
function coincideConGuardado(estado) {
  const g = estado.guardados;
  return iguales(estado.porcentajes, g.porcentajes)
    && iguales(estado.discos, g.discos)
    && estado.trabajoConfirmado === g.trabajo
    && estado.barraConfirmada.recta === g.recta
    && estado.barraConfirmada.z === g.z
    && estado.collarines === g.collarines;
}

function barraElegida(estado) {
  return BARRAS.find((b) => b.id === estado.barra);
}

// FR-08: cada tipo una vez, de mayor a menor, con "×n" si se repite.
// SPEC-CALC-003 FR-06: con su tipo (el color del punto) y su anuncio.
function gruposDiscos(discos) {
  const grupos = [];
  for (const d of discos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.cent === d) ultimo.n++;
    else grupos.push({ cent: d, n: 1 });
  }
  return grupos.map(({ cent, n }) => ({
    cent,
    peso: formatearKg(cent),
    veces: n > 1 ? `×${n}` : null,
    anuncio: TEXTOS.anuncioDisco(n, formatearKg(cent)),
  }));
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
    valor: porcentaje,
    porcentaje: `${porcentaje} %`,
    total: null,
    diferencia: null,
    anuncioDiferencia: null,
    detalleDiferencia: null,
    linea: null,
    explicacion: null,
    etiquetaDiscos: null,
    discos: null,
    grupos: null,
    collarin: null,
    avisoCapacidad: null,
  };
  // FR-09: sin discos ni collarines, y sin diferencia.
  if (s.minimo) return { ...serie, ...serieSinDiscos(estado, barraCent, s.objetivo, porcentaje) };
  serie.total = `${formatearKg(s.cargado)} kg`;
  serie.etiquetaDiscos = estado.modo === 'un-punto' ? TEXTOS.totalEnDiscos : TEXTOS.porLado;
  serie.grupos = gruposDiscos(s.discos);
  serie.discos = serie.grupos.map((g) => (g.veces ? `${g.peso} ${g.veces}` : g.peso));
  if (s.collarines) serie.collarin = TEXTOS.collarin;
  if (s.diferencia !== 0) {
    serie.diferencia = `${formatearKg(s.diferencia)} kg`;
    serie.anuncioDiferencia = TEXTOS.anuncioDiferencia(formatearKg(-s.diferencia));
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
    resumenCarga: null,
    fichas: [],
    collarines: estado.collarines,
    trabajo: estado.trabajo,
    errorTrabajo: null,
    indicacionTrabajo: null,
    errorBarra: null,
    avisoPesoBarra: null,
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
    // SPEC-CALC-003 FR-04: el resumen del panel Mis discos.
    cuentaDiscos: estado.discos.length === DISCOS_CENT.length
      ? null
      : TEXTOS.cuentaDiscos(estado.discos.length, DISCOS_CENT.length),
    anuncioDiscos: TEXTOS.anuncioDiscos(estado.discos.length, DISCOS_CENT.length),
    // SPEC-CALC-002 FR-06: además de las demás indicaciones, avisos o errores.
    indicacionDiscos: estado.discos.length === 0 ? TEXTOS.habilitarDiscos : null,
    avisoGuardado: coincideConGuardado(estado) ? null : TEXTOS.falloGuardar,
    series: [],
  };

  const trabajo = analizarPeso(estado.trabajo);
  if (trabajo.estado === 'vacio') vista.indicacionTrabajo = TEXTOS.rellenarTrabajo;
  if (trabajo.estado === 'invalido') vista.errorTrabajo = TEXTOS.errorTrabajo[trabajo.causa];

  let barraCent = 0;
  if (enBarra) barraCent = barraEditable ? analizarPesoBarra(vista.pesoBarraTexto) : barra.cent;
  // FR-02: vacío o no válido, el mismo mensaje. SPEC-CALC-003 FR-05: y un
  // aviso general, esté el panel Carga plegado o desplegado.
  if (barraCent === null) {
    vista.errorBarra = TEXTOS.errorBarra;
    vista.avisoPesoBarra = TEXTOS.revisarBarra;
  }

  // SPEC-CALC-003 FR-03: la recta o la Z elegida, con el peso del campo si es
  // válido y, si no, el confirmado; la otra, con su confirmado.
  const pesoFicha = (b) => {
    if (b.cent !== null) return b.cent;
    const escrito = b.id === estado.barra ? analizarPesoBarra(estado.pesoBarra[b.id]) : null;
    return escrito ?? estado.barraConfirmada[b.id];
  };
  vista.fichas = BARRAS.map((b) => ({ id: b.id, nombre: b.nombre, peso: `${formatearKg(pesoFicha(b))} kg` }));
  vista.resumenCarga = enBarra
    ? TEXTOS.resumenBarra(barra.nombre, formatearKg(pesoFicha(barra)), estado.collarines)
    : TEXTOS.resumenMaquina[estado.modo];

  // FR-12: mientras el peso de barra no es válido, tampoco se muestra el aviso.
  if (trabajo.estado !== 'ok' || barraCent === null) return vista;

  // FR-12: solo si el peso de trabajo es estrictamente menor que la barra.
  if (enBarra && trabajo.cent < barraCent) vista.avisoBarra = TEXTOS.trabajoInferiorBarra;

  // SPEC-CALC-002 FR-06: sin ningún tipo habilitado no hay series.
  if (estado.discos.length === 0) return vista;
  vista.series = estado.porcentajes.map((p) => modeloSerie(estado, barra, barraCent, trabajo.cent, p));
  return vista;
}
