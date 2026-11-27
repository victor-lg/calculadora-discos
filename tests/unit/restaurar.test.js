// Volver a los porcentajes habituales (SPEC-CALC-004) a través del modelo de
// vista: cuándo se ve el botón, restaurar, el aviso con "Deshacer" y lo que lo
// cierra. Las series y los tiempos los prueban los E2E.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial,
  modeloVista,
  restaurarPorcentajes,
  deshacerBorrado,
  borrarSerie,
  cerrarAviso,
  abrirAnadir,
  escribirPorcentaje,
  anadirPorcentaje,
  escribirTrabajo,
  escribirPesoBarra,
  elegirModo,
  elegirBarra,
  cambiarCollarines,
  alternarDisco,
} from '../../app/js/vista.js';
import { guardarCambios } from '../../app/js/almacenamiento.js';

const RESTAURADOS = 'Porcentajes restaurados';
const lista = (e) => e.porcentajes;
const aviso = (e) => modeloVista(e).avisoBorrado;
const conBoton = (e) => modeloVista(e).restaurar !== null;
// SPEC-CALC-003 FR-09: abre el campo de añadir y escribe `texto`.
const escribir = (e, texto) => escribirPorcentaje(abrirAnadir(e), texto);

test('SPEC-CALC-004/AC-01 con 40, 70 y 90 no hay botón; al borrar el 70 aparece y al deshacer deja de verse', () => {
  let e = estadoInicial([40, 70, 90]);
  assert.equal(conBoton(e), false);
  e = borrarSerie(e, 70);
  assert.equal(modeloVista(e).restaurar, 'Volver a 40, 70 y 90 %');
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(conBoton(e), false);
});

test('SPEC-CALC-004/AC-02 el botón se ve con la lista vacía, con 40, 70, 90 y 100 y con 40 y 70 sin discos', () => {
  const vacia = escribirTrabajo(estadoInicial([]), '');
  assert.equal(conBoton(vacia), true);
  assert.equal(modeloVista(vacia).indicacionTrabajo, 'Escribe el peso de trabajo.');
  assert.equal(modeloVista(vacia).indicacionPorcentajes, 'Añade al menos un porcentaje.');
  assert.equal(conBoton(estadoInicial([40, 70, 90, 100])), true);
  assert.equal(conBoton(estadoInicial([40, 70], [])), true);
  assert.deepEqual(modeloVista(estadoInicial([40, 70], [])).series, []);
  assert.equal(conBoton(escribir(estadoInicial([40, 70]), '')), true);
  // Otro orden de lo mismo no es otra lista: se ordena al arrancar (SPEC-CALC-001 FR-04).
  assert.equal(conBoton(estadoInicial([90, 40, 70])), false);
});

test('SPEC-CALC-004/AC-03 con 50 y 80, restaurar deja 40, 70 y 90 con el aviso y "Deshacer" vuelve a 50 y 80', () => {
  let e = restaurarPorcentajes(estadoInicial([50, 80]));
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.deepEqual(modeloVista(e).series.map((s) => s.porcentaje), ['40 %', '70 %', '90 %']);
  assert.equal(aviso(e), RESTAURADOS);
  assert.equal(conBoton(e), false);
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [50, 80]);
  assert.equal(aviso(e), null);
  assert.equal(conBoton(e), true);
  // Sin aviso, "Deshacer" ya no hace nada.
  assert.equal(deshacerBorrado(e), e);
});

test('SPEC-CALC-004/AC-03 la lista restaurada y la deshecha se guardan', () => {
  const datos = new Map();
  const almacen = { getItem: (c) => datos.get(c) ?? null, setItem: (c, v) => datos.set(c, String(v)) };
  const inicial = estadoInicial([50, 80]);
  const restaurado = guardarCambios(almacen, inicial, restaurarPorcentajes(inicial));
  assert.equal(datos.get('calculadora-discos:v1:porcentajes'), '[40,70,90]');
  guardarCambios(almacen, restaurado, deshacerBorrado(restaurado));
  assert.equal(datos.get('calculadora-discos:v1:porcentajes'), '[50,80]');
});

test('SPEC-CALC-004/AC-04 con la lista vacía, "Deshacer" la deja vacía', () => {
  let e = restaurarPorcentajes(estadoInicial([]));
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(aviso(e), RESTAURADOS);
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), []);
  assert.deepEqual(modeloVista(e).series, []);
  assert.equal(modeloVista(e).indicacionPorcentajes, 'Añade al menos un porcentaje.');
});

test('SPEC-CALC-004/AC-05 al cumplirse el plazo el aviso se cierra y la lista sigue siendo 40, 70 y 90', () => {
  const e = cerrarAviso(restaurarPorcentajes(estadoInicial([50, 80])));
  assert.equal(aviso(e), null);
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.deepEqual(lista(deshacerBorrado(e)), [40, 70, 90]);
});

test('SPEC-CALC-004/AC-05 añadir el 50 cierra el aviso y se queda en la lista', () => {
  const e = anadirPorcentaje(escribir(restaurarPorcentajes(estadoInicial([50, 80])), '50'));
  assert.deepEqual(lista(e), [40, 50, 70, 90]);
  assert.equal(aviso(e), null);
  assert.deepEqual(lista(deshacerBorrado(e)), [40, 50, 70, 90]);
});

test('SPEC-CALC-004/AC-05 un intento de añadir el 70, "150" o vacío no cierra el aviso', () => {
  const restaurado = restaurarPorcentajes(estadoInicial([50, 80]));
  const casos = [['70', 'Ya tienes una serie del 70 %.'], ['150', 'Escribe un porcentaje entre 1 y 100.'], ['', null]];
  for (const [texto, mensaje] of casos) {
    const e = anadirPorcentaje(escribir(restaurado, texto));
    assert.equal(e.errorPorcentaje, mensaje, texto);
    assert.equal(aviso(e), RESTAURADOS, texto);
    assert.deepEqual(lista(e), [40, 70, 90], texto);
  }
});

test('SPEC-CALC-004/AC-05 borrar el 70 sustituye el aviso y su "Deshacer" devuelve 40, 70 y 90', () => {
  let e = borrarSerie(restaurarPorcentajes(estadoInicial([50, 80])), 70);
  assert.equal(aviso(e), 'Serie del 70 % borrada');
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 70, 90]);
});

test('SPEC-CALC-004/AC-05 teclear un peso, cambiar los collarines, un disco, el modo o la barra cierran el aviso', () => {
  const restaurado = restaurarPorcentajes(estadoInicial([50, 80]));
  const acciones = [
    (e) => escribirTrabajo(e, '105'),
    (e) => escribirPesoBarra(e, '12'),
    (e) => cambiarCollarines(e, true),
    (e) => alternarDisco(e, 2500),
    (e) => elegirModo(e, 'dos-lados'),
    (e) => elegirBarra(e, '15'),
  ];
  for (const accion of acciones) {
    const e = accion(restaurado);
    assert.equal(aviso(e), null, accion.toString());
    assert.deepEqual(lista(deshacerBorrado(e)), [40, 70, 90], accion.toString());
  }
});

test('SPEC-CALC-004/AC-06 restaurar tras borrar el 70 sustituye el aviso y su "Deshacer" devuelve 40 y 90', () => {
  let e = borrarSerie(estadoInicial([40, 70, 90]), 70);
  assert.equal(conBoton(e), true);
  e = restaurarPorcentajes(e);
  assert.equal(aviso(e), RESTAURADOS);
  assert.deepEqual(lista(e), [40, 70, 90]);
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 90]);
  assert.equal(aviso(e), null);
});

test('SPEC-CALC-004/AC-07 con 40 y 70 y "90" en el campo, se añade el 90 y no hay aviso', () => {
  const e = restaurarPorcentajes(escribir(estadoInicial([40, 70]), '90'));
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(e.anadiendo, false);
  assert.equal(aviso(e), null);
  assert.equal(conBoton(e), false);
});

test('SPEC-CALC-004/AC-07 con "90" en el campo y el aviso de un borrado, restaurar no lo cambia', () => {
  // El 90 completa el esquema: no cambia nada más (FR-02), tampoco el aviso.
  const borrado = borrarSerie(estadoInicial([40, 70, 90]), 90);
  const e = restaurarPorcentajes(escribir(borrado, '90'));
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(aviso(e), 'Serie del 90 % borrada');
});

test('SPEC-CALC-004/AC-07 con "55" en el campo, se restaura y "Deshacer" devuelve 40, 55 y 70', () => {
  let e = restaurarPorcentajes(escribir(estadoInicial([40, 70]), '55'));
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(e.anadiendo, false);
  assert.equal(aviso(e), RESTAURADOS);
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 55, 70]);
});

test('SPEC-CALC-004/AC-07 con "150" en el campo, sigue abierto con su mensaje y se restaura', () => {
  const e = restaurarPorcentajes(escribir(estadoInicial([40, 70]), '150'));
  assert.equal(e.anadiendo, true);
  assert.equal(e.textoPorcentaje, '150');
  assert.equal(modeloVista(e).errorPorcentaje, 'Escribe un porcentaje entre 1 y 100.');
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(aviso(e), RESTAURADOS);
});

test('SPEC-CALC-004/AC-08 sin poder guardar, el aviso de fallo sale al restaurar y sigue al deshacer', () => {
  const almacen = { getItem: () => null, setItem: () => { throw new Error('lleno'); } };
  // La última lista que se guardó bien es 40, 50, 70 y 90: ni la restaurada ni
  // la de antes coinciden con ella (SPEC-CALC-002 FR-09).
  const guardada = estadoInicial([40, 50, 70, 90]);
  const inicial = guardarCambios(almacen, guardada, { ...guardada, porcentajes: [50, 80] });
  const restaurado = guardarCambios(almacen, inicial, restaurarPorcentajes(inicial));
  assert.equal(modeloVista(restaurado).avisoGuardado, 'No se ha podido guardar: se mantendrá hasta cerrar la app');
  assert.deepEqual(modeloVista(restaurado).series.map((s) => s.porcentaje), ['40 %', '70 %', '90 %']);
  const deshecho = guardarCambios(almacen, restaurado, deshacerBorrado(restaurado));
  assert.deepEqual(modeloVista(deshecho).series.map((s) => s.porcentaje), ['50 %', '80 %']);
  assert.equal(modeloVista(deshecho).avisoGuardado, 'No se ha podido guardar: se mantendrá hasta cerrar la app');
});

test('SPEC-CALC-004/AC-12 "Deshacer" con el campo abierto lo deja abierto con lo escrito y sin mensaje', () => {
  const restaurado = restaurarPorcentajes(estadoInicial([50, 80]));
  for (const texto of ['55', '70', '150']) {
    let e = escribir(restaurado, texto);
    // "70" y "150" muestran su mensaje al confirmarlos.
    if (texto !== '55') e = anadirPorcentaje(e);
    e = deshacerBorrado(e);
    assert.deepEqual(lista(e), [50, 80], texto);
    assert.equal(e.anadiendo, true, texto);
    assert.equal(e.textoPorcentaje, texto, texto);
    assert.equal(modeloVista(e).errorPorcentaje, null, texto);
    assert.equal(aviso(e), null, texto);
  }
  // Al confirmar después, el 55 y el 70 se añaden y "150" vuelve a dar su mensaje.
  assert.deepEqual(lista(anadirPorcentaje(deshacerBorrado(escribir(restaurado, '55')))), [50, 55, 80]);
  assert.deepEqual(lista(anadirPorcentaje(deshacerBorrado(escribir(restaurado, '70')))), [50, 70, 80]);
  const otraVez = anadirPorcentaje(deshacerBorrado(escribir(restaurado, '150')));
  assert.equal(otraVez.errorPorcentaje, 'Escribe un porcentaje entre 1 y 100.');
});
