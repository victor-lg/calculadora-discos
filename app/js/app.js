// Interfaz: traslada lo que hace la persona al estado en memoria y pinta el
// modelo de vista tal cual, siempre con textContent (nunca innerHTML).
import {
  estadoInicial,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  escribirTrabajo,
  terminarEdicion,
  anadirPorcentaje,
  quitarPorcentaje,
  alternarDisco,
  modeloVista,
} from './vista.js';
import { leerPorcentajes, leerDiscos, leerAjustes, guardarCambios } from './almacenamiento.js';

function almacenLocal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const almacen = almacenLocal();
let estado = estadoInicial(leerPorcentajes(almacen), leerDiscos(almacen), leerAjustes(almacen));

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// FR-11: el peso cuyo campo tiene el foco ('trabajo' o 'barra'), o null.
function pesoConFoco() {
  const id = document.activeElement?.id;
  if (id === 'trabajo') return 'trabajo';
  return id === 'peso-barra' ? 'barra' : null;
}

// SPEC-CALC-003 FR-03 y FR-04: los modos y las fichas de barra están en el
// HTML; los tipos de disco y sus puntos se crean una vez al arrancar.
function montarOpciones() {
  // FR-11: en iOS, tocar otro control no siempre quita el foco del campo
  // (ADR-0005 §3), así que el cambio de modo o de barra termina su edición.
  for (const input of document.querySelectorAll('input[name="modo"]')) {
    input.addEventListener('change', () => actualizar(elegirModo(estado, input.value, pesoConFoco())));
  }
  for (const input of document.querySelectorAll('input[name="barra"]')) {
    input.addEventListener('change', () => actualizar(elegirBarra(estado, input.value, pesoConFoco())));
  }
  // SPEC-CALC-002 FR-02: cada tipo se habilita o deshabilita al tocarlo.
  for (const d of modeloVista(estado).discos) {
    const label = crear('label', 'disco');
    label.dataset.cent = String(d.cent);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'disco';
    input.value = String(d.cent);
    input.addEventListener('change', () => actualizar(alternarDisco(estado, d.cent)));
    const dibujo = crear('span', 'dibujo-disco');
    dibujo.setAttribute('aria-hidden', 'true');
    label.append(input, dibujo, crear('span', 'peso-disco', d.nombre));
    $('lista-discos').append(label);
    const punto = crear('i', null);
    punto.dataset.cent = String(d.cent);
    $('puntos-discos').append(punto);
  }
}

// Solo se escribe lo que cambia: en iOS, cambiar el contenido bajo el dedo
// entre el toque y el clic hace que el clic no llegue, y el fin de edición de
// un peso repinta justo en ese momento (blur del campo).
function cambiarTexto(el, valor) {
  if (el.textContent !== valor) el.textContent = valor;
}

function cambiarAtributo(el, nombre, valor) {
  if (el.getAttribute(nombre) !== valor) el.setAttribute(nombre, valor);
}

function mostrar(el, visible) {
  if (el.hidden === visible) el.hidden = !visible;
}

function texto(id, valor) {
  const el = $(id);
  cambiarTexto(el, valor ?? '');
  mostrar(el, Boolean(valor));
}

function valorCampo(id, valor) {
  const el = $(id);
  if (el.value !== valor) el.value = valor;
}

// SPEC-CALC-003 FR-02: el campo crece con el texto (la copia invisible de
// estilos.css) y, si el número no cabe, se reduce hasta caber.
function ajustarPeso({ forzar = false } = {}) {
  const auto = $('trabajo-auto');
  const input = $('trabajo');
  if (!forzar && auto.dataset.texto === input.value) return;
  auto.dataset.texto = input.value;
  auto.style.removeProperty('font-size');
  let tamano = parseFloat(getComputedStyle(auto).fontSize);
  // WebKit suma 1 px de cursor a scrollWidth aunque el texto quepa.
  while (input.scrollWidth > input.clientWidth + 1 && tamano > 16) {
    tamano -= 2;
    auto.style.fontSize = `${tamano}px`;
  }
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

// La parte de arriba se actualiza en su sitio, sin reconstruir ningún control:
// así se puede repintar al terminar una edición sin perder el toque siguiente.
function pintarArriba(v) {
  for (const input of document.querySelectorAll('input[name="modo"]')) input.checked = input.value === v.modo;
  for (const input of document.querySelectorAll('input[name="barra"]')) input.checked = input.value === v.barra;
  for (const f of v.fichas) {
    const ficha = document.querySelector(`input[name="barra"][value="${f.id}"]`).closest('.ficha');
    cambiarTexto(ficha.querySelector('.peso-ficha'), f.peso);
  }
  cambiarTexto($('resumen-carga'), v.resumenCarga);
  mostrar($('barras'), v.mostrarBarras);
  mostrar($('nota-maquina'), !v.mostrarBarras);
  $('collarines').checked = v.collarines;
  mostrar($('campo-peso-barra'), v.barraEditable);
  valorCampo('peso-barra', v.pesoBarraTexto);
  texto('error-barra', v.errorBarra);
  cambiarAtributo($('peso-barra'), 'aria-invalid', String(Boolean(v.errorBarra)));

  valorCampo('trabajo', v.trabajo);
  ajustarPeso();
  cambiarAtributo($('trabajo'), 'aria-invalid', String(Boolean(v.errorTrabajo)));

  for (const d of v.discos) {
    const cent = String(d.cent);
    document.querySelector(`input[name="disco"][value="${cent}"]`).checked = d.habilitado;
    document.querySelector(`#puntos-discos [data-cent="${cent}"]`).classList.toggle('apagado', !d.habilitado);
  }
  cambiarTexto($('cuenta-discos'), v.cuentaDiscos ?? '');
  cambiarAtributo($('boton-discos'), 'aria-label', v.anuncioDiscos);

  // SPEC-CALC-003 FR-05: los avisos generales, en el orden del HTML.
  texto('error-trabajo', v.errorTrabajo);
  texto('indicacion-trabajo', v.indicacionTrabajo);
  texto('aviso-peso-barra', v.avisoPesoBarra);
  texto('indicacion-porcentajes', v.indicacionPorcentajes);
  texto('indicacion-discos', v.indicacionDiscos);
  texto('aviso-barra', v.avisoBarra);
  texto('aviso-guardado', v.avisoGuardado);
}

function pintar() {
  const v = modeloVista(estado);
  pintarArriba(v);

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
  $('nuevo-porcentaje').setAttribute('aria-invalid', String(Boolean(v.errorPorcentaje)));

  $('series').replaceChildren(...v.series.map(pintarSerie));
}

// FR-10: cualquier cambio recalcula al momento. FR-11 y SPEC-CALC-002 FR-08:
// cada dato guardado se guarda cuando cambia, y los pesos, al terminar de
// editarlos (SPEC-CALC-002 FR-09 si falla).
function actualizar(nuevo) {
  estado = guardarCambios(almacen, estado, nuevo);
  pintar();
}

// FR-11: termina la edición de un peso y lo guarda. Las series usan lo escrito,
// así que solo se repinta la parte de arriba (resumen de Carga, fichas y
// avisos): el blur llega con el toque siguiente, y reconstruir las listas se
// comería el clic en el control tocado.
function terminar(peso) {
  estado = guardarCambios(almacen, estado, terminarEdicion(estado, peso));
  pintarArriba(modeloVista(estado));
}

// SPEC-CALC-003 FR-03 y FR-04: cada panel se pliega y despliega con su botón,
// que anuncia su estado. Devuelve si queda desplegado.
function alternarPanel(boton) {
  const desplegado = boton.getAttribute('aria-expanded') !== 'true';
  boton.setAttribute('aria-expanded', String(desplegado));
  $(boton.getAttribute('aria-controls')).hidden = !desplegado;
  return desplegado;
}

function enlazarPaneles() {
  // SPEC-CALC-001 FR-02 y FR-11 (AC-45): plegar el panel Carga termina la
  // edición del peso que tiene el foco, sin descartar lo escrito. Se mira el
  // foco antes de plegar: al ocultarse, el campo de la barra lo perdería.
  $('boton-carga').addEventListener('click', (e) => {
    const peso = pesoConFoco();
    if (!alternarPanel(e.currentTarget) && peso) terminar(peso);
  });
  $('boton-discos').addEventListener('click', (e) => alternarPanel(e.currentTarget));
}

// SPEC-CALC-003 FR-02: no deja teclear más de 6 caracteres, pero un texto
// pegado o arrastrado se conserva entero y se valida.
const MAX_TRABAJO = 6;

function enlazarCampos() {
  $('trabajo').addEventListener('beforeinput', (e) => {
    if (!e.inputType.startsWith('insert') || e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') return;
    const el = e.target;
    const quedan = el.value.length - (el.selectionEnd - el.selectionStart);
    if (quedan + (e.data ?? '').length > MAX_TRABAJO) e.preventDefault();
  });
  $('trabajo').addEventListener('input', (e) => actualizar(escribirTrabajo(estado, e.target.value)));
  $('peso-barra').addEventListener('input', (e) => {
    actualizar(escribirPesoBarra(estado, e.target.value));
  });
  // FR-11: salir del campo termina su edición, aunque no se haya tecleado nada.
  $('trabajo').addEventListener('blur', () => terminar('trabajo'));
  $('peso-barra').addEventListener('blur', () => terminar('barra'));
  $('collarines').addEventListener('change', (e) => actualizar({ ...estado, collarines: e.target.checked }));
  $('nuevo-porcentaje').addEventListener('input', (e) => {
    actualizar({ ...estado, textoPorcentaje: e.target.value });
  });
  $('form-porcentaje').addEventListener('submit', (e) => {
    e.preventDefault();
    actualizar(anadirPorcentaje(estado));
  });
}

// FR-11, ADR-0005 §3: pasar a segundo plano termina la edición del peso que
// tiene el foco; manda visibilitychange y pagehide es el respaldo.
function terminarAlSalir() {
  const peso = pesoConFoco();
  if (peso) terminar(peso);
}

montarOpciones();
enlazarCampos();
enlazarPaneles();
pintar();
window.addEventListener('resize', () => ajustarPeso({ forzar: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') terminarAlSalir();
});
window.addEventListener('pagehide', terminarAlSalir);

// ADR-0001 §3.2: se pide almacenamiento persistente, sin depender del resultado.
navigator.storage?.persist?.().catch(() => {});

// ADR-0001 §3.3: service worker propio para funcionar sin conexión (NFR-01).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
