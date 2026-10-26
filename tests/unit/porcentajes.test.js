// Lista de porcentajes: validación al añadir, orden y almacenamiento (FR-04, FR-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, anadirPorcentaje, quitarPorcentaje, modeloVista } from '../../app/js/vista.js';
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

const ERROR = 'Escribe un porcentaje entre 1 y 100.';

test('SPEC-CALC-001/AC-09 0, 101 y 40,5 no se añaden y muestran el mensaje', () => {
  const inicial = estadoInicial([40, 70, 90]);
  for (const texto of ['0', '101', '40,5']) {
    const e = anadir(inicial, texto);
    assert.deepEqual(e.porcentajes, [40, 70, 90], texto);
    assert.equal(e.errorPorcentaje, ERROR, texto);
  }
});

test('SPEC-CALC-001/AC-09 1, 99 y 100 se añaden sin mensaje de error', () => {
  let e = estadoInicial([]);
  e = anadir(e, '1');
  e = anadir(e, '99');
  e = anadir(e, '100');
  assert.deepEqual(e.porcentajes, [1, 99, 100]);
  assert.equal(e.errorPorcentaje, null);
  assert.equal(e.textoPorcentaje, '');
});

test('SPEC-CALC-001/AC-09 se muestran ordenados de menor a mayor', () => {
  let e = estadoInicial([]);
  e = anadir(e, '90');
  e = anadir(e, '40');
  assert.deepEqual(e.porcentajes, [40, 90]);
  assert.deepEqual(modeloVista({ ...e, trabajo: '100' }).porcentajes, ['40 %', '90 %']);
});

test('SPEC-CALC-001/AC-09 un porcentaje que ya está no se añade y muestra el mensaje', () => {
  const inicial = estadoInicial([70]);
  for (const texto of ['70', ' 70 ']) {
    const e = anadir(inicial, texto);
    assert.deepEqual(e.porcentajes, [70], JSON.stringify(texto));
    assert.equal(e.errorPorcentaje, 'Ya tienes una serie del 70 %.', JSON.stringify(texto));
  }
});

test('SPEC-CALC-001/AC-24 "40,0" y "40.0" no se añaden y muestran el mensaje', () => {
  const inicial = estadoInicial([]);
  for (const texto of ['40,0', '40.0']) {
    const e = anadir(inicial, texto);
    assert.deepEqual(e.porcentajes, [], texto);
    assert.equal(e.errorPorcentaje, ERROR, texto);
  }
});

test('quitar un porcentaje quita solo esa posición', () => {
  const e = quitarPorcentaje(estadoInicial([40, 70, 90]), 1);
  assert.deepEqual(e.porcentajes, [40, 90]);
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

test('SPEC-CALC-001/AC-29 sin 40 en la lista, " 40 " se añade como 40 % sin mensaje', () => {
  const e = anadir(estadoInicial([70]), ' 40 ');
  assert.deepEqual(e.porcentajes, [40, 70]);
  assert.equal(e.errorPorcentaje, null);
});

test('SPEC-CALC-001/AC-29 "40,", ",5" y "4 0" no se añaden y muestran el mensaje', () => {
  for (const texto of ['40,', ',5', '4 0']) {
    const e = anadir(estadoInicial([70]), texto);
    assert.deepEqual(e.porcentajes, [70], texto);
    assert.equal(e.errorPorcentaje, ERROR, texto);
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

test('SPEC-CALC-001/AC-31 sin 40 en la lista, 40 con un tabulador o un espacio duro detrás se añade como 40 %', () => {
  for (const texto of ['40\t', '40\u00a0']) {
    const e = anadir(estadoInicial([90]), texto);
    assert.deepEqual(e.porcentajes, [40, 90], JSON.stringify(texto));
    assert.equal(e.errorPorcentaje, null, JSON.stringify(texto));
  }
});
