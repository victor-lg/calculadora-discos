// Modelo de vista: a partir del estado en memoria, decide qué se muestra y con
// qué textos. La interfaz lo pinta tal cual, sin lógica propia.
import { analizarPeso, analizarPorcentaje } from './entrada.js';
import { calcularSerie, DISCOS_CENT } from './calculo.js';
import { formatearKg } from './formato.js';

export const MODOS = Object.freeze([
  Object.freeze({ id: 'barra', nombre: 'Barra' }),
  Object.freeze({ id: 'dos-lados', nombre: 'Dos lados sin barra' }),
  Object.freeze({ id: 'un-punto', nombre: 'Un punto' }),
]);

// FR-02: catálogo fijo. `cent` es null cuando el peso lo escribe la persona.
export const BARRAS = Object.freeze([
  Object.freeze({ id: '20', nombre: 'Barra de 20 kg', cent: 2000 }),
  Object.freeze({ id: '15', nombre: 'Barra de 15 kg', cent: 1500 }),
  Object.freeze({ id: 'recta', nombre: 'Recta pequeña', cent: null }),
  Object.freeze({ id: 'z', nombre: 'Barra Z', cent: null }),
]);

export const TEXTOS = {
  rellenarTrabajo: 'Escribe el peso de trabajo para ver las series.',
  rellenarBarra: 'Escribe el peso de la barra para ver las series.',
  anadirPorcentajes: 'Añade al menos un porcentaje para ver las series.',
  trabajoInferiorBarra:
    'El peso de trabajo es inferior a la barra: conviene elegir una barra más ligera o revisar el peso.',
  // SPEC-CALC-002 FR-05: Y es el tipo habilitado más pequeño.
  minimoDosLados: (y) => `Peso por lado demasiado pequeño: el disco mínimo es de ${y} kg`,
  minimoUnPunto: (y) => `Peso demasiado pequeño: el disco mínimo es de ${y} kg`,
  habilitarDiscos: 'Habilita al menos un disco para ver las series.',
  falloGuardar: 'No se ha podido guardar: se mantendrá hasta cerrar la app',
};

// FR-11: al arrancar de cero, modo Barra, barra de 20 kg y peso de trabajo vacío.
// `discos` son los tipos habilitados, en centésimas y de mayor a menor
// (SPEC-CALC-002 FR-08). `guardados` es el último valor que se guardó bien de
// cada dato: al arrancar de cero, el valor con el que arranca (SPEC-CALC-002 FR-09).
export function estadoInicial(porcentajes, discos = DISCOS_CENT) {
  const estado = {
    modo: 'barra',
    barra: '20',
    pesoBarra: { recta: '', z: '' },
    trabajo: '',
    porcentajes: [...porcentajes],
    discos: [...discos],
    textoPorcentaje: '',
    errorPorcentaje: null,
  };
  return { ...estado, guardados: { porcentajes: estado.porcentajes, discos: estado.discos } };
}

// FR-04: añade al final si es válido; si no, deja la lista como estaba y guarda el mensaje.
export function anadirPorcentaje(estado) {
  const r = analizarPorcentaje(estado.textoPorcentaje);
  // Vacío o solo espacios: la lista no cambia y no hay mensaje.
  if (r.estado === 'vacio') return { ...estado, errorPorcentaje: null };
  if (r.estado === 'invalido') return { ...estado, errorPorcentaje: r.mensaje };
  return {
    ...estado,
    porcentajes: [...estado.porcentajes, r.valor],
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

function textoDiscos(discos) {
  return discos.map(formatearKg).join(' + ');
}

function modeloSerie(estado, barraCent, trabajoCent, porcentaje) {
  const tipos = estado.discos;
  const s = calcularSerie({ modo: estado.modo, barraCent, trabajoCent, porcentaje, tipos });
  const serie = {
    porcentaje: `${porcentaje} %`,
    total: null,
    discos: null,
    etiquetaDiscos: null,
    pesoDiscos: null,
    aviso: null,
    mensaje: null,
    objetivo: null,
  };
  if (s.minimo) {
    // FR-09: el objetivo que salía, sin diferencia ni aviso de redondeo.
    const minimo = formatearKg(tipos[tipos.length - 1]);
    serie.mensaje = {
      barra: `Solo barra (${formatearKg(barraCent)} kg) · 0 kg por lado`,
      'dos-lados': TEXTOS.minimoDosLados(minimo),
      'un-punto': TEXTOS.minimoUnPunto(minimo),
    }[estado.modo];
    serie.objetivo = `Objetivo: ${formatearKg(s.objetivo)} kg`;
    return serie;
  }
  const unPunto = estado.modo === 'un-punto';
  serie.total = `${formatearKg(s.cargado)} kg`;
  serie.discos = textoDiscos(s.discos);
  serie.etiquetaDiscos = unPunto ? 'Discos en el único punto' : 'Discos por lado';
  serie.pesoDiscos = unPunto
    ? `${formatearKg(s.discosCent)} kg de discos`
    : `${formatearKg(s.discosCent)} kg por lado`;
  if (s.diferencia !== 0) {
    serie.aviso = `Redondeo: objetivo ${formatearKg(s.objetivo)} kg, diferencia ${formatearKg(s.diferencia)} kg`;
  }
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
    trabajo: estado.trabajo,
    errorTrabajo: null,
    indicacionTrabajo: null,
    errorBarra: null,
    indicacionBarra: null,
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
  if (trabajo.estado === 'invalido') vista.errorTrabajo = `El peso de trabajo ${trabajo.motivo}.`;

  let barraCent = 0;
  let barraLista = true;
  if (enBarra) {
    if (barraEditable) {
      const pb = analizarPeso(vista.pesoBarraTexto);
      if (pb.estado === 'vacio') vista.indicacionBarra = TEXTOS.rellenarBarra;
      if (pb.estado === 'invalido') vista.errorBarra = `El peso de la barra ${pb.motivo}.`;
      barraLista = pb.estado === 'ok';
      barraCent = barraLista ? pb.cent : 0;
    } else {
      barraCent = barra.cent;
    }
  }

  if (trabajo.estado !== 'ok' || !barraLista) return vista;

  // FR-12: solo si el peso de trabajo es estrictamente menor que la barra.
  if (enBarra && trabajo.cent < barraCent) vista.avisoBarra = TEXTOS.trabajoInferiorBarra;

  // SPEC-CALC-002 FR-06: sin ningún tipo habilitado no hay series.
  if (estado.discos.length === 0) return vista;
  vista.series = estado.porcentajes.map((p) => modeloSerie(estado, barraCent, trabajo.cent, p));
  return vista;
}
