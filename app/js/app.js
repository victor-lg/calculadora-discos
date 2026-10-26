// Interfaz: traslada lo que hace la persona al estado en memoria y pinta el
// modelo de vista tal cual, siempre con textContent (nunca innerHTML).
import {
  MODOS,
  BARRAS,
  estadoInicial,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  anadirPorcentaje,
  quitarPorcentaje,
  alternarDisco,
  modeloVista,
} from './vista.js';
import { leerPorcentajes, leerDiscos, guardarCambios } from './almacenamiento.js';

function almacenLocal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const almacen = almacenLocal();
let estado = estadoInicial(leerPorcentajes(almacen), leerDiscos(almacen));

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function opcion(nombreGrupo, valor, texto, alCambiar, tipo = 'radio') {
  const label = crear('label', 'opcion');
  const input = document.createElement('input');
  input.type = tipo;
  input.name = nombreGrupo;
  input.value = valor;
  input.addEventListener('change', () => alCambiar(valor));
  label.append(input, crear('span', null, texto));
  return label;
}

function montarOpciones() {
  for (const m of MODOS) {
    $('modos').append(opcion('modo', m.id, m.nombre, (modo) => actualizar(elegirModo(estado, modo))));
  }
  for (const b of BARRAS) {
    $('lista-barras').append(opcion('barra', b.id, b.nombre, (barra) => actualizar(elegirBarra(estado, barra))));
  }
  // SPEC-CALC-002 FR-02: cada tipo se habilita o deshabilita al tocarlo.
  for (const d of modeloVista(estado).discos) {
    $('lista-discos').append(opcion('disco', String(d.cent), d.nombre, () => {
      actualizar(alternarDisco(estado, d.cent));
    }, 'checkbox'));
  }
}

function texto(id, valor) {
  const el = $(id);
  el.textContent = valor ?? '';
  el.hidden = !valor;
}

function valorCampo(id, valor) {
  const el = $(id);
  if (el.value !== valor) el.value = valor;
}

function pintarSerie(s) {
  const li = crear('li', 'serie');
  const cabecera = crear('div', 'cabecera');
  const izquierda = crear('div', null);
  izquierda.append(crear('span', 'porcentaje', s.porcentaje));
  // FR-06: la diferencia junto al porcentaje, con una explicación que se puede abrir.
  if (s.diferencia) {
    const detalle = crear('details', 'diferencia');
    detalle.append(crear('summary', null, s.diferencia), crear('p', null, s.detalleDiferencia));
    izquierda.append(detalle);
  }
  cabecera.append(izquierda, crear('span', 'total', s.total));
  li.append(cabecera);
  // FR-09: sin discos, la línea y su explicación, siempre visible.
  if (s.linea) li.append(crear('p', 'linea', s.linea), crear('p', 'explicacion', s.explicacion));
  if (s.discos) {
    const discos = crear('p', 'discos');
    discos.append(crear('span', 'etiqueta', `${s.etiquetaDiscos}: `), crear('strong', null, s.discos.join(' + ')));
    li.append(discos);
  }
  if (s.collarin) li.append(crear('p', 'collarin', s.collarin));
  if (s.avisoCapacidad) li.append(crear('p', 'capacidad', s.avisoCapacidad));
  return li;
}

function pintar() {
  const v = modeloVista(estado);

  for (const input of document.querySelectorAll('input[name="modo"]')) input.checked = input.value === v.modo;
  for (const input of document.querySelectorAll('input[name="barra"]')) input.checked = input.value === v.barra;
  for (const input of document.querySelectorAll('input[name="disco"]')) {
    input.checked = v.discos.find((d) => String(d.cent) === input.value).habilitado;
  }

  $('barras').hidden = !v.mostrarBarras;
  texto('peso-barra-fijo', v.pesoBarraFijo && `Peso de la barra: ${v.pesoBarraFijo}`);
  $('campo-peso-barra').hidden = !v.barraEditable;
  $('collarines').checked = v.collarines;
  valorCampo('peso-barra', v.pesoBarraTexto);
  texto('error-barra', v.errorBarra);
  $('peso-barra').setAttribute('aria-invalid', String(Boolean(v.errorBarra)));

  valorCampo('trabajo', v.trabajo);
  texto('error-trabajo', v.errorTrabajo);
  texto('indicacion-trabajo', v.indicacionTrabajo);
  $('trabajo').setAttribute('aria-invalid', String(Boolean(v.errorTrabajo)));

  $('porcentajes').replaceChildren(...v.porcentajes.map((p, i) => {
    const li = crear('li', null);
    const quitar = crear('button', 'quitar', '×');
    quitar.type = 'button';
    quitar.setAttribute('aria-label', `Quitar ${p}`);
    quitar.addEventListener('click', () => {
      actualizar(quitarPorcentaje(estado, i));
    });
    li.append(crear('span', null, p), quitar);
    return li;
  }));
  valorCampo('nuevo-porcentaje', v.textoPorcentaje);
  texto('error-porcentaje', v.errorPorcentaje);
  texto('indicacion-porcentajes', v.indicacionPorcentajes);
  $('nuevo-porcentaje').setAttribute('aria-invalid', String(Boolean(v.errorPorcentaje)));

  texto('aviso-barra', v.avisoBarra);
  texto('indicacion-discos', v.indicacionDiscos);
  texto('aviso-guardado', v.avisoGuardado);
  $('series').replaceChildren(...v.series.map(pintarSerie));
}

// FR-10: cualquier cambio recalcula al momento. FR-11 y SPEC-CALC-002 FR-08:
// la lista y los discos se guardan en cada cambio (FR-09 si falla).
function actualizar(nuevo) {
  estado = guardarCambios(almacen, estado, nuevo);
  pintar();
}

function enlazarCampos() {
  $('trabajo').addEventListener('input', (e) => actualizar({ ...estado, trabajo: e.target.value }));
  $('peso-barra').addEventListener('input', (e) => {
    actualizar(escribirPesoBarra(estado, e.target.value));
  });
  $('collarines').addEventListener('change', (e) => actualizar({ ...estado, collarines: e.target.checked }));
  $('nuevo-porcentaje').addEventListener('input', (e) => {
    actualizar({ ...estado, textoPorcentaje: e.target.value });
  });
  $('form-porcentaje').addEventListener('submit', (e) => {
    e.preventDefault();
    actualizar(anadirPorcentaje(estado));
  });
}

montarOpciones();
enlazarCampos();
pintar();

// ADR-0001 §3.2: se pide almacenamiento persistente, sin depender del resultado.
navigator.storage?.persist?.().catch(() => {});

// ADR-0001 §3.3: service worker propio para funcionar sin conexión (NFR-01).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
