// Interfaz: traslada lo que hace la persona al estado en memoria y pinta el
// modelo de vista tal cual, siempre con textContent (nunca innerHTML).
import {
  estadoInicial,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  escribirTrabajo,
  terminarEdicion,
  cambiarCollarines,
  abrirAnadir,
  cancelarAnadir,
  escribirPorcentaje,
  anadirPorcentaje,
  borrarSerie,
  deshacerBorrado,
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
    // Se ve el peso sin "kg" (referencia visual de §11); se anuncia con él.
    const peso = crear('span', 'peso-disco', d.peso);
    peso.append(crear('span', 'oculto', ' kg'));
    label.append(input, dibujo, peso);
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

// SPEC-CALC-003 FR-05: un aviso general, con su icono delante.
function aviso(id, valor) {
  const el = $(id);
  cambiarTexto(el.querySelector('.texto-aviso'), valor ?? '');
  mostrar(el, Boolean(valor));
}

// FR-06: la cifra en grande y " kg" en pequeño y en gris (referencia visual
// de §11).
function conUnidad(el, texto) {
  const cifra = texto.replace(/ kg$/, '');
  el.append(cifra);
  if (cifra !== texto) el.append(crear('small', null, ' kg'));
  return el;
}

function valorCampo(id, valor) {
  const el = $(id);
  if (el.value !== valor) el.value = valor;
}

// SPEC-CALC-003 FR-02: el campo crece con el texto (la copia invisible de
// estilos.css) y, si el número no cabe junto a "kg", se reduce hasta caber. Se
// compara el ancho de la copia con el sitio que queda, no el desbordamiento
// del campo: en iOS el campo desborda unos píxeles aunque el número quepa, y
// reducir la letra no lo corrige, así que el número acababa en el mínimo.
function ajustarPeso({ forzar = false } = {}) {
  const auto = $('trabajo-auto');
  const input = $('trabajo');
  if (!forzar && auto.dataset.texto === input.value) return;
  auto.dataset.texto = input.value;
  auto.style.removeProperty('font-size');
  const campo = auto.parentElement;
  const disponible = campo.clientWidth - campo.querySelector('.unidad').getBoundingClientRect().width
    - parseFloat(getComputedStyle(campo).columnGap);
  // Mientras se mide, la copia toma su ancho natural, sin encogerse.
  auto.classList.add('midiendo');
  const ancho = () => auto.getBoundingClientRect().width;
  let tamano = parseFloat(getComputedStyle(auto).fontSize);
  if (ancho() > disponible) {
    tamano = Math.max(16, Math.floor((tamano * disponible) / ancho()));
    auto.style.fontSize = `${tamano}px`;
    while (ancho() > disponible && tamano > 16) {
      tamano -= 1;
      auto.style.fontSize = `${tamano}px`;
    }
  }
  auto.classList.remove('midiendo');
}

// SPEC-CALC-003 FR-06: los porcentajes cuya explicación de la diferencia está
// desplegada. Se conserva al repintar las tarjetas.
const desplegadas = new Set();

// Las series de la última vez que se pintaron las tarjetas.
let seriesPintadas = null;

// FR-06: la marca se despliega y se pliega en su sitio, sin repintar la tarjeta.
function alternarDiferencia(marca, valor) {
  const desplegada = marca.getAttribute('aria-expanded') !== 'true';
  if (desplegada) desplegadas.add(valor);
  else desplegadas.delete(valor);
  marca.setAttribute('aria-expanded', String(desplegada));
  $(marca.getAttribute('aria-controls')).hidden = !desplegada;
}

// SPEC-CALC-003 FR-06 y FR-14: la tarjeta de una serie, solo con texto. Las
// líneas van en la columna de texto y, debajo, a todo el ancho, la explicación
// de la diferencia y el aviso de capacidad. FR-08: la tarjeta va sobre el fondo
// de borrar y lleva el botón "Quitar la serie del P %".
function pintarSerie(s) {
  const item = crear('li', 'deslizable');
  const fondo = $('plantilla-borrar').content.firstElementChild.cloneNode(true);
  const li = crear('div', 'serie');
  const columna = crear('div', 'texto');
  const cabecera = crear('div', 'cabecera');
  cabecera.append(crear('span', 'porcentaje', s.porcentaje));
  columna.append(cabecera, conUnidad(crear('span', 'total'), s.total));
  li.append(columna);
  if (s.diferencia) {
    const id = `detalle-${s.valor}`;
    const desplegada = desplegadas.has(s.valor);
    const marca = crear('button', 'diferencia');
    marca.type = 'button';
    marca.setAttribute('aria-label', s.anuncioDiferencia);
    marca.setAttribute('aria-expanded', String(desplegada));
    marca.setAttribute('aria-controls', id);
    marca.append(crear('span', 'pastilla', s.diferencia));
    marca.addEventListener('click', () => alternarDiferencia(marca, s.valor));
    cabecera.append(marca);
    const detalle = crear('p', 'detalle', s.detalleDiferencia);
    detalle.id = id;
    detalle.hidden = !desplegada;
    li.append(detalle);
  }
  // FR-09: sin discos, la línea y su explicación, siempre visible.
  if (s.linea) columna.append(crear('p', 'linea', s.linea), crear('p', 'explicacion', s.explicacion));
  if (s.grupos) {
    const discos = crear('ul', 'discos');
    for (const g of s.grupos) {
      const item = crear('li', null);
      item.dataset.cent = String(g.cent);
      // Se ve el punto, el peso y "×n"; se anuncia "n discos de W kg".
      const visible = crear('span', 'disco-serie');
      visible.setAttribute('aria-hidden', 'true');
      visible.append(crear('i', 'punto'), crear('span', 'cifra', g.peso));
      if (g.veces) visible.append(crear('em', 'veces', g.veces));
      item.append(visible, crear('span', 'oculto', g.anuncio));
      discos.append(item);
    }
    columna.append(crear('p', 'etiqueta', s.etiquetaDiscos), discos);
  }
  if (s.collarin) columna.append(crear('p', 'collarin', s.collarin));
  if (s.avisoCapacidad) li.append(crear('p', 'capacidad', s.avisoCapacidad));
  const quitar = crear('button', 'quitar', s.quitar);
  quitar.type = 'button';
  quitar.addEventListener('click', () => borrar(s.valor, { foco: true }));
  li.append(quitar);
  item.append(fondo, li);
  enlazarGesto(item, li, quitar, s.valor);
  return item;
}

// SPEC-CALC-003 FR-08: umbral del gesto (fracción del ancho), duración de la
// pulsación larga y lo que tiene que moverse el dedo para que cuente.
const UMBRAL_BORRAR = 0.35;
const PULSACION_LARGA_MS = 500;
const MOVIMIENTO_PX = 10;
// Lo que pueden tardar como mucho la salida de lado y el cierre del hueco
// (estilos.css, .sale y .se-cierra).
const SALIDA_MS = 400;
const CIERRE_MS = 450;

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// FR-08 y FR-13: la tarjeta que se borra con el gesto cierra su hueco
// (altura, margen y opacidad, estilos.css .se-cierra) y después se llama a
// `despues`: las de debajo suben sin saltar. Si la transición no termina (por
// ejemplo, porque otro cambio repinta las tarjetas), se sigue igual. Una
// tarjeta que ya se está cerrando no vuelve a empezar.
function cerrarHueco(item, despues) {
  if (item.classList.contains('se-cierra')) return;
  let hecho = false;
  const terminar = () => {
    if (hecho) return;
    hecho = true;
    despues();
  };
  item.style.height = `${item.offsetHeight}px`;
  item.getBoundingClientRect();
  item.classList.add('se-cierra');
  item.style.height = '0px';
  item.addEventListener('transitionend', (e) => {
    if (e.target === item && e.propertyName === 'height') terminar();
  });
  setTimeout(terminar, CIERRE_MS);
}

// FR-08: el botón "Quitar" que mostró una pulsación larga, hasta que se toca
// fuera de él.
let quitarMostrado = null;

function ocultarQuitar() {
  quitarMostrado?.classList.remove('mostrado');
  quitarMostrado = null;
}

// FR-08: deslizar a la izquierda borra pasado el umbral; mantener pulsada la
// tarjeta sin moverla muestra "Quitar". Deslizar en vertical sigue desplazando
// la página (touch-action: pan-y en estilos.css).
function enlazarGesto(item, tarjeta, quitar, valor) {
  let inicio = null;
  let desliza = false;
  let larga = false;
  let reloj = null;
  let ancho = 0;
  let dx = 0;

  const colocar = (x) => { tarjeta.style.transform = x ? `translateX(${x}px)` : ''; };
  const fin = () => {
    clearTimeout(reloj);
    inicio = null;
    desliza = false;
    item.classList.remove('arrastra', 'listo');
  };

  tarjeta.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || e.target === quitar) return;
    inicio = { x: e.clientX, y: e.clientY };
    desliza = false;
    larga = false;
    dx = 0;
    ancho = tarjeta.getBoundingClientRect().width;
    reloj = setTimeout(() => {
      larga = true;
      ocultarQuitar();
      quitar.classList.add('mostrado');
      quitarMostrado = quitar;
    }, PULSACION_LARGA_MS);
  });

  tarjeta.addEventListener('pointermove', (e) => {
    // Tras la pulsación larga, mover el dedo no hace nada más.
    if (!inicio || larga) return;
    const mx = e.clientX - inicio.x;
    const my = e.clientY - inicio.y;
    if (!desliza) {
      if (Math.abs(my) > MOVIMIENTO_PX && Math.abs(my) >= Math.abs(mx)) {
        fin();
        return;
      }
      if (Math.abs(mx) <= MOVIMIENTO_PX) return;
      clearTimeout(reloj);
      desliza = true;
      tarjeta.setPointerCapture(e.pointerId);
      tarjeta.classList.remove('vuelve');
      item.classList.add('arrastra');
    }
    // Durante el gesto la tarjeta sigue al dedo, también con "Reducir
    // movimiento" (FR-13).
    dx = Math.min(0, mx);
    colocar(dx);
    item.classList.toggle('listo', -dx > ancho * UMBRAL_BORRAR);
  });

  const soltar = () => {
    if (!inicio) return;
    const borra = desliza && -dx > ancho * UMBRAL_BORRAR;
    const deslizaba = desliza;
    fin();
    // Tras el gesto o la pulsación larga no se activa nada de la tarjeta.
    if (deslizaba || larga) suprimirClic(tarjeta);
    if (borra) {
      item.classList.add('arrastra', 'listo');
      if (sinMovimiento()) borrar(valor);
      else {
        // La tarjeta sale de lado y después cierra su hueco y se borra. Si la
        // salida no termina, se sigue igual.
        const cerrar = () => cerrarHueco(item, () => borrar(valor));
        tarjeta.classList.add('sale');
        colocar(-ancho);
        tarjeta.addEventListener('transitionend', (e) => {
          if (e.target === tarjeta && e.propertyName === 'transform') cerrar();
        });
        setTimeout(cerrar, SALIDA_MS);
      }
    } else if (deslizaba) {
      if (!sinMovimiento()) tarjeta.classList.add('vuelve');
      colocar(0);
    }
  };
  tarjeta.addEventListener('pointerup', soltar);
  tarjeta.addEventListener('pointercancel', () => {
    fin();
    colocar(0);
  });
  // FR-08: durante la pulsación no aparece el menú del sistema.
  tarjeta.addEventListener('contextmenu', (e) => e.preventDefault());
}

// El clic que sigue al gesto o a la pulsación larga no llega a la tarjeta. En
// táctil, el clic puede llegar en otra tarea; si no llega, se deja de esperar.
function suprimirClic(tarjeta) {
  const parar = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };
  tarjeta.addEventListener('click', parar, { capture: true, once: true });
  setTimeout(() => tarjeta.removeEventListener('click', parar, { capture: true }), SALIDA_MS);
}

// FR-08: borra la serie y muestra el aviso. Tras borrar con el botón "Quitar",
// el foco pasa a "Deshacer".
function borrar(valor, { foco = false } = {}) {
  ocultarQuitar();
  actualizar(borrarSerie(estado, valor));
  if (foco) $('deshacer').focus();
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
  aviso('error-trabajo', v.errorTrabajo);
  aviso('indicacion-trabajo', v.indicacionTrabajo);
  aviso('aviso-peso-barra', v.avisoPesoBarra);
  aviso('indicacion-porcentajes', v.indicacionPorcentajes);
  aviso('indicacion-discos', v.indicacionDiscos);
  aviso('aviso-barra', v.avisoBarra);
  aviso('aviso-guardado', v.avisoGuardado);
}

function pintar() {
  const v = modeloVista(estado);
  pintarArriba(v);

  // SPEC-CALC-003 FR-09: el botón o el campo de añadir.
  mostrar($('abrir-anadir'), !v.anadiendo);
  mostrar($('form-porcentaje'), v.anadiendo);
  valorCampo('nuevo-porcentaje', v.textoPorcentaje);
  $('porcentaje-auto').dataset.texto = v.textoPorcentaje || $('nuevo-porcentaje').placeholder;
  texto('error-porcentaje', v.errorPorcentaje);
  cambiarAtributo($('nuevo-porcentaje'), 'aria-invalid', String(Boolean(v.errorPorcentaje)));

  // FR-08: si el foco está en el aviso cuando desaparece, pasa al botón de
  // añadir o, si está abierto, a su campo. Si está en otro sitio, no se mueve.
  const focoEnAviso = $('aviso-borrado').contains(document.activeElement);
  cambiarTexto($('texto-borrado'), v.avisoBorrado ?? '');
  mostrar($('aviso-borrado'), Boolean(v.avisoBorrado));
  if (focoEnAviso && !v.avisoBorrado) $(v.anadiendo ? 'nuevo-porcentaje' : 'abrir-anadir').focus();

  // FR-06: una tarjeta que desaparece o se queda sin diferencia vuelve plegada.
  for (const valor of desplegadas) {
    if (!v.series.some((s) => s.valor === valor && s.diferencia)) desplegadas.delete(valor);
  }
  // Las tarjetas solo se reconstruyen si cambian: así no se pierde el control
  // que tiene el foco o el dedo cuando cambia otra cosa (por ejemplo, el campo
  // de añadir se cierra al llevar el foco a "Quitar").
  const firma = JSON.stringify(v.series);
  if (firma !== seriesPintadas) {
    seriesPintadas = firma;
    $('series').replaceChildren(...v.series.map(pintarSerie));
  }
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

// Solo cuenta lo que inserta texto: Intro (insertLineBreak, sin datos) tiene
// que seguir confirmando aunque lo pegado pase del límite.
function limitar(campo, maximo) {
  campo.addEventListener('beforeinput', (e) => {
    if (!e.inputType.startsWith('insert') || e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') return;
    if (!e.data) return;
    const quedan = campo.value.length - (campo.selectionEnd - campo.selectionStart);
    if (quedan + e.data.length > maximo) e.preventDefault();
  });
}

function enlazarCampos() {
  limitar($('trabajo'), MAX_TRABAJO);
  $('trabajo').addEventListener('input', (e) => actualizar(escribirTrabajo(estado, e.target.value)));
  $('peso-barra').addEventListener('input', (e) => {
    actualizar(escribirPesoBarra(estado, e.target.value));
  });
  // FR-11: salir del campo termina su edición, aunque no se haya tecleado nada.
  $('trabajo').addEventListener('blur', () => terminar('trabajo'));
  $('peso-barra').addEventListener('blur', () => terminar('barra'));
  $('collarines').addEventListener('change', (e) => actualizar(cambiarCollarines(estado, e.target.checked)));
  $('deshacer').addEventListener('click', () => actualizar(deshacerBorrado(estado)));
  // FR-08: el botón "Quitar" que mostró la pulsación larga se oculta al tocar
  // fuera de él.
  document.addEventListener('pointerdown', (e) => {
    if (quitarMostrado && e.target !== quitarMostrado) ocultarQuitar();
  }, { capture: true });
}

// SPEC-CALC-003 FR-09: no deja teclear más de 3 caracteres, pero lo pegado o
// arrastrado se conserva entero y se valida.
const MAX_PORCENTAJE = 3;

// FR-09: Intro y "Añadir" confirman, también al perder el foco. Una misma
// confirmación añade una sola vez: con el campo cerrado no hay nada que confirmar.
function confirmarAnadir() {
  if (!estado.anadiendo) return;
  actualizar(anadirPorcentaje(estado));
}

// FR-09: al cerrarse con Intro, "Añadir", Escape o "✕", el foco vuelve al
// botón de añadir.
function enfocarSiCerrado() {
  if (!estado.anadiendo) $('abrir-anadir').focus();
}

function enlazarAnadir() {
  const campo = $('nuevo-porcentaje');
  const form = $('form-porcentaje');
  $('abrir-anadir').addEventListener('click', () => {
    actualizar(abrirAnadir(estado));
    campo.focus();
  });
  limitar(campo, MAX_PORCENTAJE);
  campo.addEventListener('input', () => actualizar(escribirPorcentaje(estado, campo.value)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    confirmarAnadir();
    enfocarSiCerrado();
  });
  const cancelar = () => {
    actualizar(cancelarAnadir(estado));
    enfocarSiCerrado();
  };
  $('cancelar-anadir').addEventListener('click', cancelar);
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelar();
  });
  // Tocar "✕", "Añadir" o el resto de la caja no quita el foco al campo: así
  // cancelar prevalece y confirmar no pasa dos veces. Fuera de los botones, el
  // toque lleva al campo. Si aun así el toque en un botón le quita el foco, se
  // espera a su clic.
  // En iOS, el foco cambia con los eventos de ratón que siguen al pointerup, así
  // que no se olvida al levantar el dedo, sino con el clic o con el teclado.
  let botonPulsado = false;
  document.addEventListener('pointerdown', (e) => {
    botonPulsado = Boolean(e.target.closest?.('#form-porcentaje button'));
  }, { capture: true });
  for (const tipo of ['click', 'keydown']) {
    document.addEventListener(tipo, () => { botonPulsado = false; });
  }
  form.addEventListener('mousedown', (e) => {
    if (e.target === campo) return;
    e.preventDefault();
    if (!e.target.closest('button')) campo.focus();
  });
  // Perder el foco porque la persona toca otra cosa confirma; pasar a segundo
  // plano o bloquear el teléfono, no. Moverse entre el campo y sus botones
  // tampoco.
  form.addEventListener('focusout', (e) => {
    if (form.contains(e.relatedTarget) || botonPulsado) return;
    if (document.visibilityState === 'hidden' || !document.hasFocus()) return;
    confirmarAnadir();
  });
  // En iOS, tocar fuera de un campo no siempre le quita el foco (ADR-0005 §3).
  document.addEventListener('pointerdown', (e) => {
    if (estado.anadiendo && !form.contains(e.target)) confirmarAnadir();
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
enlazarAnadir();
enlazarPaneles();
pintar();
window.addEventListener('resize', () => ajustarPeso({ forzar: true }));
// FR-02: la primera medida puede hacerse con la fuente de reserva, más ancha;
// al llegar Barlow, el número se vuelve a medir.
document.fonts?.addEventListener('loadingdone', () => ajustarPeso({ forzar: true }));
document.fonts?.ready.then(() => ajustarPeso({ forzar: true }));
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
