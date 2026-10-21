// Lista de porcentajes: validación al añadir, orden y almacenamiento (FR-04, FR-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, anadirPorcentaje, quitarPorcentaje } from '../../app/js/vista.js';
import {
  CLAVE_PORCENTAJES,
  leerPorcentajes,
  guardarPorcentajes,
} from '../../app/js/almacenamiento.js';

function anadir(estado, texto) {
  return anadirPorcentaje({ ...estado, textoPorcentaje: texto });
}

class AlmacenFalso {
  constructor(datos = {}) {
    this.datos = new Map(Object.entries(datos));
  }
  getItem(clave) {
    return this.datos.has(clave) ? this.datos.get(clave) : null;
  }
  setItem(clave, valor) {
    this.datos.set(clave, String(valor));
  }
}

test('SPEC-CALC-001/AC-09 0, 100 y 40,5 no se añaden y se explica qué falla', () => {
  const inicial = estadoInicial([40, 70, 90]);
  for (const texto of ['0', '100', '40,5']) {
    const e = anadir(inicial, texto);
    assert.deepEqual(e.porcentajes, [40, 70, 90], texto);
    assert.ok(e.errorPorcentaje, texto);
  }
  assert.match(anadir(inicial, '0').errorPorcentaje, /entre 1 y 99/);
  assert.match(anadir(inicial, '100').errorPorcentaje, /entre 1 y 99/);
  assert.match(anadir(inicial, '40,5').errorPorcentaje, /entero/);
});

test('SPEC-CALC-001/AC-09 1 y 99 se añaden sin mensaje de error', () => {
  let e = estadoInicial([]);
  e = anadir(e, '1');
  e = anadir(e, '99');
  assert.deepEqual(e.porcentajes, [1, 99]);
  assert.equal(e.errorPorcentaje, null);
  assert.equal(e.textoPorcentaje, '');
});

test('SPEC-CALC-001/AC-09 se muestran en el orden en que se introducen', () => {
  let e = estadoInicial([]);
  e = anadir(e, '90');
  e = anadir(e, '40');
  assert.deepEqual(e.porcentajes, [90, 40]);
});

test('SPEC-CALC-001/AC-24 "40,0" y "40.0" no se añaden y se explica qué falla', () => {
  const inicial = estadoInicial([]);
  for (const texto of ['40,0', '40.0']) {
    const e = anadir(inicial, texto);
    assert.deepEqual(e.porcentajes, [], texto);
    assert.match(e.errorPorcentaje ?? '', /entero/, texto);
  }
});

test('quitar un porcentaje quita solo esa posición, aunque esté repetido', () => {
  const e = quitarPorcentaje(estadoInicial([70, 40, 70]), 2);
  assert.deepEqual(e.porcentajes, [70, 40]);
});

test('un intento válido después de uno fallido borra el mensaje', () => {
  const e = anadir(anadir(estadoInicial([]), '0'), '50');
  assert.deepEqual(e.porcentajes, [50]);
  assert.equal(e.errorPorcentaje, null);
});

test('SPEC-CALC-001/AC-11 la primera vez la lista es 40, 70 y 90', () => {
  assert.deepEqual(leerPorcentajes(new AlmacenFalso()), [40, 70, 90]);
});

test('SPEC-CALC-001/AC-11 se recupera la lista guardada, también vacía', () => {
  const almacen = new AlmacenFalso();
  guardarPorcentajes(almacen, [50, 75]);
  assert.equal(almacen.getItem(CLAVE_PORCENTAJES), '[50,75]');
  assert.deepEqual(leerPorcentajes(almacen), [50, 75]);
  guardarPorcentajes(almacen, []);
  assert.deepEqual(leerPorcentajes(almacen), []);
});

test('SPEC-CALC-001/AC-11 datos que no se pueden leer o no son válidos: 40, 70 y 90', () => {
  const casos = ['[150]', '{roto', '{"a":1}', '["40"]', '[40.5]', '[0]', 'null', '40', '[40,null]'];
  for (const crudo of casos) {
    const almacen = new AlmacenFalso({ [CLAVE_PORCENTAJES]: crudo });
    assert.deepEqual(leerPorcentajes(almacen), [40, 70, 90], crudo);
  }
  const roto = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(leerPorcentajes(roto), [40, 70, 90]);
});

test('guardar no rompe la app si el almacenamiento falla', () => {
  const lleno = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.doesNotThrow(() => guardarPorcentajes(lleno, [40]));
});

test('SPEC-CALC-001/AC-29 " 40 " se añade como 40 % sin mensaje', () => {
  const e = anadir(estadoInicial([]), ' 40 ');
  assert.deepEqual(e.porcentajes, [40]);
  assert.equal(e.errorPorcentaje, null);
});

test('SPEC-CALC-001/AC-29 "40,", ",5" y "4 0" no se añaden y se explica qué falla', () => {
  for (const texto of ['40,', ',5', '4 0']) {
    const e = anadir(estadoInicial([70]), texto);
    assert.deepEqual(e.porcentajes, [70], texto);
    assert.match(e.errorPorcentaje ?? '', /entero/, texto);
  }
});

test('SPEC-CALC-001/AC-30 porcentaje vacío o solo con espacios: nada cambia y sin mensaje', () => {
  for (const texto of ['', ' ', '   ', '\t', '\u00a0']) {
    const e = anadir(estadoInicial([40, 70]), texto);
    assert.deepEqual(e.porcentajes, [40, 70], JSON.stringify(texto));
    assert.equal(e.errorPorcentaje, null, JSON.stringify(texto));
  }
  // Tampoco queda el mensaje de un intento fallido anterior.
  const tras = anadir(anadir(estadoInicial([]), '0'), ' ');
  assert.equal(tras.errorPorcentaje, null);
});

test('SPEC-CALC-001/AC-31 40 con un tabulador o un espacio duro detrás se añade como 40 %', () => {
  for (const texto of ['40\t', '40\u00a0']) {
    const e = anadir(estadoInicial([]), texto);
    assert.deepEqual(e.porcentajes, [40], JSON.stringify(texto));
    assert.equal(e.errorPorcentaje, null, JSON.stringify(texto));
  }
});
