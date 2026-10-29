// Datos guardados de ADR-0004 (SPEC-CALC-001 FR-11): peso de trabajo, pesos
// de la recta y de la Z y collarines; y su fallo al guardar (SPEC-CALC-002 FR-09).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial,
  modeloVista,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  escribirTrabajo,
  terminarEdicion,
  anadirPorcentaje,
  quitarPorcentaje,
  TEXTOS,
} from '../../app/js/vista.js';
import { DISCOS_CENT } from '../../app/js/calculo.js';
import {
  CLAVE_PORCENTAJES,
  CLAVE_DISCOS,
  CLAVE_TRABAJO,
  CLAVES_BARRA,
  CLAVE_COLLARINES,
  leerPorcentajes,
  leerDiscos,
  leerAjustes,
  guardarCambios,
} from '../../app/js/almacenamiento.js';

class AlmacenFalso {
  constructor(datos = {}) {
    this.datos = new Map(Object.entries(datos));
    this.lleno = false;
    this.escrituras = 0;
  }
  getItem(clave) {
    return this.datos.has(clave) ? this.datos.get(clave) : null;
  }
  setItem(clave, valor) {
    if (this.lleno) throw new Error('QuotaExceededError');
    this.escrituras++;
    this.datos.set(clave, String(valor));
  }
}

// Arranque de cero: lo mismo que hace app.js al cargar.
const arrancar = (almacen) => estadoInicial(leerPorcentajes(almacen), leerDiscos(almacen), leerAjustes(almacen));

// La app en marcha sobre un almacén: cada cambio pasa por guardarCambios, como en app.js.
function sesion(almacen) {
  let estado = arrancar(almacen);
  return {
    cambiar(f) {
      estado = guardarCambios(almacen, estado, f(estado));
      return modeloVista(estado);
    },
    get estado() { return estado; },
  };
}

const escribir = (texto) => (e) => escribirTrabajo(e, texto);
const escribirBarra = (texto) => (e) => escribirPesoBarra(e, texto);
// FR-11: salir del campo y pasar a segundo plano con el foco en él terminan la
// edición de ese peso (app.js llama a terminarEdicion en los dos casos).
const salir = (campo) => (e) => terminarEdicion(e, campo);
const segundoPlano = salir;
// Escribe un texto tecla a tecla, como lo haría la persona.
const teclear = (s, texto, f = escribir) => {
  let v;
  for (let i = 1; i <= texto.length; i++) v = s.cambiar(f(texto.slice(0, i)));
  return v;
};
// Borra con la tecla de retroceso hasta vaciar el campo; devuelve lo guardado
// en el almacenamiento en cada paso.
const borrar = (s, almacen, texto, clave, f = escribir) => {
  const pasos = [];
  for (let i = texto.length - 1; i >= 0; i--) {
    s.cambiar(f(texto.slice(0, i)));
    pasos.push(almacen.getItem(clave));
  }
  return pasos;
};
const conTexto = (texto) => (e) => anadirPorcentaje({ ...e, textoPorcentaje: texto });
const resumen = (v) => v.series.map((s) => [s.porcentaje, s.total, s.discos]);

// --- Arranque de cero (FR-11) ---

test('SPEC-CALC-001/AC-11 la primera vez: 40/70/90, "100" con las series de AC-01, Barra, 20 kg, sin collarines, recta y Z de 10 kg', () => {
  const almacen = new AlmacenFalso();
  const e = arrancar(almacen);
  const v = modeloVista(e);
  assert.deepEqual(v.porcentajes, ['40 %', '70 %', '90 %']);
  assert.equal(v.trabajo, '100');
  assert.deepEqual(resumen(v), [['40 %', '40 kg', ['10']], ['70 %', '70 kg', ['25']], ['90 %', '90 kg', ['25', '10']]]);
  assert.deepEqual([v.modo, v.barra, v.collarines], ['barra', '20', false]);
  assert.deepEqual(e.barraConfirmada, { recta: 1000, z: 1000 });
  assert.deepEqual(e.pesoBarra, { recta: '10', z: '10' });
  assert.equal(v.avisoGuardado, null);
  // ADR-0004 §3: el primer arranque no escribe nada.
  assert.equal(almacen.escrituras, 0);
});

test('SPEC-CALC-001/AC-11 se recuperan lista, peso, recta, Z y collarines; el modo vuelve a Barra con la de 20 kg', () => {
  const almacen = new AlmacenFalso();
  const s = sesion(almacen);
  s.cambiar((e) => quitarPorcentaje(e, 0));
  s.cambiar((e) => quitarPorcentaje(e, 0));
  s.cambiar((e) => quitarPorcentaje(e, 0));
  s.cambiar(conTexto('50'));
  s.cambiar(conTexto('75'));
  s.cambiar(escribir('102,5'));
  s.cambiar(salir('trabajo'));
  s.cambiar((e) => escribirPesoBarra(elegirBarra(e, 'recta'), '7,5'));
  s.cambiar((e) => escribirPesoBarra(elegirBarra(e, 'z', 'barra'), '8,5'));
  s.cambiar((e) => ({ ...e, collarines: true }));
  s.cambiar((e) => elegirModo(e, 'dos-lados', 'barra'));

  const e = arrancar(almacen);
  const v = modeloVista(e);
  assert.deepEqual(v.porcentajes, ['50 %', '75 %']);
  assert.equal(v.trabajo, '102,5');
  assert.deepEqual(e.barraConfirmada, { recta: 750, z: 850 });
  assert.equal(v.collarines, true);
  assert.deepEqual([v.modo, v.barra], ['barra', '20']);
  assert.equal(v.avisoGuardado, null);
  // Cada dato en su propia entrada (ADR-0004 §3).
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"102,5"');
  assert.equal(almacen.getItem(CLAVES_BARRA.recta), '7.5');
  assert.equal(almacen.getItem(CLAVES_BARRA.z), '8.5');
  assert.equal(almacen.getItem(CLAVE_COLLARINES), 'true');
});

test('SPEC-CALC-001/AC-11 sin porcentajes, al volver a abrir la lista sigue vacía', () => {
  const almacen = new AlmacenFalso();
  const s = sesion(almacen);
  for (let i = 0; i < 3; i++) s.cambiar((e) => quitarPorcentaje(e, 0));
  const v = modeloVista(arrancar(almacen));
  assert.deepEqual(v.porcentajes, []);
  assert.equal(v.indicacionPorcentajes, TEXTOS.anadirPorcentajes);
});

test('SPEC-CALC-001/AC-40 con la recta de 7,5 y la Z de 8,5 guardadas, cada barra muestra la suya al arrancar de cero', () => {
  const almacen = new AlmacenFalso({ [CLAVES_BARRA.recta]: '7.5', [CLAVES_BARRA.z]: '8.5' });
  let e = elegirBarra(arrancar(almacen), 'recta');
  assert.equal(modeloVista(e).pesoBarraTexto, '7,5');
  e = elegirBarra(e, 'z');
  assert.equal(modeloVista(e).pesoBarraTexto, '8,5');
  e = escribirPesoBarra(elegirBarra(e, 'recta'), '0,5');
  assert.equal(modeloVista(e).errorBarra, TEXTOS.errorBarra);
  e = elegirBarra(elegirBarra(e, 'z'), 'recta');
  let v = modeloVista(e);
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['7,5', null]);
  e = elegirModo(elegirModo(escribirPesoBarra(e, '0,5'), 'dos-lados'), 'barra');
  v = modeloVista(e);
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['7,5', null]);
});

// --- Datos guardados que faltan, ilegibles o no válidos (FR-11) ---

test('SPEC-CALC-001/AC-33 lista que falta, ilegible o con un porcentaje no válido: 40, 70 y 90', () => {
  for (const crudo of [undefined, '{roto', '[150]', '[40.5]', '[40,150]']) {
    const datos = crudo === undefined ? {} : { [CLAVE_PORCENTAJES]: crudo };
    assert.deepEqual(arrancar(new AlmacenFalso(datos)).porcentajes, [40, 70, 90], String(crudo));
  }
});

test('SPEC-CALC-001/AC-33 la lista guardada 90, 40 y 40 se recupera como 40 y 90', () => {
  assert.deepEqual(arrancar(new AlmacenFalso({ [CLAVE_PORCENTAJES]: '[90,40,40]' })).porcentajes, [40, 90]);
});

test('SPEC-CALC-001/AC-33 peso de trabajo que falta o no es válido: "100"', () => {
  const casos = [undefined, '"abc"', '"600"', '"0"', '""', '"100,123"', '"1.000"', '100', 'null', '{roto', '["100"]'];
  for (const crudo of casos) {
    const datos = crudo === undefined ? {} : { [CLAVE_TRABAJO]: crudo };
    assert.equal(arrancar(new AlmacenFalso(datos)).trabajo, '100', String(crudo));
  }
  // Un texto válido se recupera tal como se escribió (FR-11, FR-14).
  for (const texto of ['102,5', '102.5', ' 100 ', '100,', ',5', '500']) {
    const e = arrancar(new AlmacenFalso({ [CLAVE_TRABAJO]: JSON.stringify(texto) }));
    assert.equal(e.trabajo, texto);
  }
});

test('SPEC-CALC-001/AC-33 recta de 60 o ilegible: 10 kg, y la Z conserva la suya', () => {
  for (const crudo of ['60', '{roto', '0.5', '0', '7.555', '"7.5"', 'null', 'true', '[7.5]']) {
    const e = arrancar(new AlmacenFalso({ [CLAVES_BARRA.recta]: crudo, [CLAVES_BARRA.z]: '8.5' }));
    assert.deepEqual(e.barraConfirmada, { recta: 1000, z: 850 }, crudo);
    assert.deepEqual(e.pesoBarra, { recta: '10', z: '8,5' }, crudo);
  }
  // Los extremos de FR-02 valen.
  const e = arrancar(new AlmacenFalso({ [CLAVES_BARRA.recta]: '1', [CLAVES_BARRA.z]: '50' }));
  assert.deepEqual(e.barraConfirmada, { recta: 100, z: 5000 });
  assert.equal(arrancar(new AlmacenFalso({ [CLAVES_BARRA.z]: '8.55' })).barraConfirmada.z, 855);
});

test('SPEC-CALC-001/AC-33 collarines ilegibles o no válidos: desactivados', () => {
  for (const crudo of ['{roto', '"true"', '1', 'null']) {
    assert.equal(arrancar(new AlmacenFalso({ [CLAVE_COLLARINES]: crudo })).collarines, false, crudo);
  }
  assert.equal(arrancar(new AlmacenFalso({ [CLAVE_COLLARINES]: 'true' })).collarines, true);
});

test('SPEC-CALC-001/AC-33 con la lista ilegible se recuperan el peso "102,5" y los collarines', () => {
  const e = arrancar(new AlmacenFalso({
    [CLAVE_PORCENTAJES]: '{roto',
    [CLAVE_TRABAJO]: '"102,5"',
    [CLAVE_COLLARINES]: 'true',
  }));
  assert.deepEqual(e.porcentajes, [40, 70, 90]);
  assert.equal(e.trabajo, '102,5');
  assert.equal(e.collarines, true);
});

test('SPEC-CALC-001/AC-33 SPEC-CALC-002/AC-12 un almacenamiento que no se puede leer: todo a los valores de la primera vez', () => {
  const roto = { getItem() { throw new Error('SecurityError'); } };
  for (const almacen of [roto, null]) {
    const e = arrancar(almacen);
    assert.deepEqual([e.porcentajes, e.trabajo, e.barraConfirmada, e.collarines, e.discos],
      [[40, 70, 90], '100', { recta: 1000, z: 1000 }, false, DISCOS_CENT]);
  }
});

// --- Los pesos se guardan al terminar de editarlos (FR-11, ADR-0005) ---

test('SPEC-CALC-001/AC-34 "105", salir, borrar el campo y salir: al volver a abrir, "105"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  s.cambiar(escribir('105'));
  s.cambiar(salir('trabajo'));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"105"');
  s.cambiar(escribir(''));
  s.cambiar(salir('trabajo'));
  assert.equal(arrancar(almacen).trabajo, '105');
});

test('SPEC-CALC-001/AC-34 "100,12", salir, "100,123" y salir: el campo muestra "100,123" con su mensaje; al volver a abrir, "100,12"', () => {
  const almacen = new AlmacenFalso();
  const s = sesion(almacen);
  teclear(s, '100,12');
  s.cambiar(salir('trabajo'));
  s.cambiar(escribir('100,123'));
  const v = s.cambiar(salir('trabajo'));
  assert.equal(v.trabajo, '100,123');
  assert.equal(v.errorTrabajo, TEXTOS.errorTrabajo.decimales);
  assert.equal(arrancar(almacen).trabajo, '100,12');
});

test('SPEC-CALC-001/AC-34 recta de 7,5, salir, 0,5 y salir: al volver a abrir, 7,5 kg', () => {
  const almacen = new AlmacenFalso();
  const s = sesion(almacen);
  s.cambiar((e) => elegirBarra(e, 'recta'));
  teclear(s, '7,5', escribirBarra);
  s.cambiar(salir('barra'));
  teclear(s, '0,5', escribirBarra);
  s.cambiar(salir('barra'));
  const e = arrancar(almacen);
  assert.equal(e.barraConfirmada.recta, 750);
  assert.equal(modeloVista(elegirBarra(e, 'recta')).pesoBarraTexto, '7,5');
});

test('SPEC-CALC-001/AC-42 borrar "105" con retroceso hasta vaciarlo: lo guardado sigue siendo "105" en cada paso y al volver a abrir', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"105"' });
  const s = sesion(almacen);
  assert.deepEqual(borrar(s, almacen, '105', CLAVE_TRABAJO), ['"105"', '"105"', '"105"']);
  assert.equal(almacen.escrituras, 0);
  s.cambiar(segundoPlano('trabajo'));
  assert.equal(arrancar(almacen).trabajo, '105');
});

test('SPEC-CALC-001/AC-42 borrar la recta de 7,5 kg con retroceso hasta vaciarla: al volver a abrir, 7,5 kg', () => {
  const almacen = new AlmacenFalso({ [CLAVES_BARRA.recta]: '7.5' });
  const s = sesion(almacen);
  s.cambiar((e) => elegirBarra(e, 'recta'));
  assert.deepEqual(borrar(s, almacen, '7,5', CLAVES_BARRA.recta, escribirBarra), ['7.5', '7.5', '7.5']);
  s.cambiar(segundoPlano('barra'));
  assert.equal(arrancar(almacen).barraConfirmada.recta, 750);
});

test('SPEC-CALC-001/AC-43 "105" sin salir del campo y a segundo plano: se guarda "105" y el campo lo sigue mostrando', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  s.cambiar(escribir('105'));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"100"');
  assert.equal(s.cambiar(segundoPlano('trabajo')).trabajo, '105');
  assert.equal(arrancar(almacen).trabajo, '105');
});

test('SPEC-CALC-001/AC-43 campo vacío a segundo plano: sigue vacío con su indicación; al volver a abrir, "105"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"105"' });
  const s = sesion(almacen);
  borrar(s, almacen, '105', CLAVE_TRABAJO);
  const v = s.cambiar(segundoPlano('trabajo'));
  assert.deepEqual([v.trabajo, v.indicacionTrabajo], ['', TEXTOS.rellenarTrabajo]);
  assert.equal(arrancar(almacen).trabajo, '105');
});

test('SPEC-CALC-001/AC-43 borrar "105" hasta "1" y pasar a segundo plano: se guarda "1"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"105"' });
  const s = sesion(almacen);
  s.cambiar(escribir('10'));
  s.cambiar(escribir('1'));
  s.cambiar(segundoPlano('trabajo'));
  assert.equal(arrancar(almacen).trabajo, '1');
});

test('SPEC-CALC-001/AC-43 "105", segundo plano, vuelta con el foco, "108" y salir: se guarda "108"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  s.cambiar(escribir('105'));
  s.cambiar(segundoPlano('trabajo'));
  s.cambiar(escribir('10'));
  s.cambiar(escribir('108'));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"105"');
  s.cambiar(salir('trabajo'));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"108"');
});

test('SPEC-CALC-001/AC-43 "100,12" y, sin salir, "100,123" a segundo plano: al volver a abrir, "100"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  teclear(s, '100,123');
  s.cambiar(segundoPlano('trabajo'));
  assert.equal(arrancar(almacen).trabajo, '100');
  assert.equal(almacen.escrituras, 0);
});

test('SPEC-CALC-001/AC-43 recta a 8 en segundo plano: guardada 8 kg; con 0,5, el campo lo conserva y sigue 7,5 kg', () => {
  for (const [texto, guardado, error] of [['8', '8', null], ['0,5', '7.5', TEXTOS.errorBarra]]) {
    const almacen = new AlmacenFalso({ [CLAVES_BARRA.recta]: '7.5' });
    const s = sesion(almacen);
    s.cambiar((e) => elegirBarra(e, 'recta'));
    s.cambiar(escribirBarra(texto));
    const v = s.cambiar(segundoPlano('barra'));
    assert.deepEqual([v.pesoBarraTexto, v.errorBarra], [texto, error], texto);
    assert.equal(almacen.getItem(CLAVES_BARRA.recta), guardado, texto);
  }
});

// Con la recta guardada en 7,5 kg y elegida, como en AC-44.
function conRecta() {
  const almacen = new AlmacenFalso({ [CLAVES_BARRA.recta]: '7.5' });
  const s = sesion(almacen);
  s.cambiar((e) => elegirBarra(e, 'recta'));
  return { almacen, s };
}

test('SPEC-CALC-001/AC-44 recta a 8 y elegir la Z o pasar a Dos lados con el foco en el campo: la recta queda en 8 kg', () => {
  for (const cambio of [(e) => elegirBarra(e, 'z', 'barra'), (e) => elegirModo(e, 'dos-lados', 'barra')]) {
    const { almacen, s } = conRecta();
    s.cambiar(escribirBarra('8'));
    s.cambiar(cambio);
    assert.equal(almacen.getItem(CLAVES_BARRA.recta), '8');
    const v = s.cambiar((e) => elegirBarra(elegirModo(e, 'barra'), 'recta'));
    assert.equal(v.pesoBarraTexto, '8');
    assert.equal(arrancar(almacen).barraConfirmada.recta, 800);
  }
});

test('SPEC-CALC-001/AC-44 borrar la recta hasta "7," y vaciarla sin salir, y elegir la Z: al volver, "7,5" sin error', () => {
  const { almacen, s } = conRecta();
  borrar(s, almacen, '7,5', CLAVES_BARRA.recta, escribirBarra);
  s.cambiar((e) => elegirBarra(e, 'z', 'barra'));
  const v = s.cambiar((e) => elegirBarra(e, 'recta'));
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['7,5', null]);
  assert.equal(almacen.getItem(CLAVES_BARRA.recta), '7.5');
});

test('SPEC-CALC-001/AC-44 recta a "7," y elegir la Z: la recta queda guardada en 7 kg', () => {
  const { almacen, s } = conRecta();
  s.cambiar(escribirBarra('7,'));
  s.cambiar((e) => elegirBarra(e, 'z', 'barra'));
  assert.equal(almacen.getItem(CLAVES_BARRA.recta), '7');
});

test('SPEC-CALC-001/AC-44 con "0,5" en la recta elegida, tocar su ficha no descarta el texto', () => {
  const { s } = conRecta();
  s.cambiar(escribirBarra('0,5'));
  const v = s.cambiar((e) => elegirBarra(e, 'recta', 'barra'));
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['0,5', TEXTOS.errorBarra]);
});

test('SPEC-CALC-001/AC-44 con el foco en el peso de trabajo, "110" y cambiar de modo o de barra: se guarda "110"', () => {
  for (const cambio of [(e) => elegirModo(e, 'dos-lados', 'trabajo'), (e) => elegirBarra(e, '15', 'trabajo')]) {
    const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
    const s = sesion(almacen);
    s.cambiar(escribir('110'));
    assert.equal(s.cambiar(cambio).trabajo, '110');
    assert.equal(almacen.getItem(CLAVE_TRABAJO), '"110"');
  }
});

test('SPEC-CALC-001/AC-44 con el foco en el peso de trabajo, vaciarlo y pasar a Dos lados: sigue vacío y lo guardado no cambia', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  s.cambiar(escribir(''));
  const v = s.cambiar((e) => elegirModo(e, 'dos-lados', 'trabajo'));
  assert.deepEqual([v.trabajo, v.indicacionTrabajo], ['', TEXTOS.rellenarTrabajo]);
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"100"');
  assert.equal(almacen.escrituras, 0);
});

test('SPEC-CALC-001/AC-44 "110" y activar los collarines sin perder el foco: sigue guardado "100"; al salir, "110"', () => {
  const almacen = new AlmacenFalso({ [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  s.cambiar(escribir('110'));
  s.cambiar((e) => ({ ...e, collarines: true }));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"100"');
  s.cambiar(salir('trabajo'));
  assert.equal(almacen.getItem(CLAVE_TRABAJO), '"110"');
});

test('SPEC-CALC-001/FR-11 un dato solo se escribe cuando cambia, y sin tocar las demás entradas', () => {
  const almacen = new AlmacenFalso({ [CLAVE_PORCENTAJES]: '[50]', [CLAVE_DISCOS]: '[25]' });
  const s = sesion(almacen);
  s.cambiar((e) => elegirModo(e, 'un-punto'));
  s.cambiar((e) => elegirBarra(e, 'z'));
  s.cambiar(escribir('100'));
  s.cambiar(salir('trabajo'));
  assert.equal(almacen.escrituras, 0);
  s.cambiar(escribir('abc'));
  s.cambiar(salir('trabajo'));
  assert.equal(almacen.escrituras, 0);
  teclear(s, '101');
  assert.equal(almacen.escrituras, 0);
  s.cambiar(salir('trabajo'));
  // Varias detecciones del mismo final de edición escriben una sola vez (ADR-0005 §3).
  s.cambiar(segundoPlano('trabajo'));
  assert.equal(almacen.escrituras, 1);
  assert.equal(almacen.getItem(CLAVE_PORCENTAJES), '[50]');
  assert.equal(almacen.getItem(CLAVE_DISCOS), '[25]');
});

// --- Fallo al guardar (SPEC-CALC-002 FR-09) ---

// Punto de partida de SPEC-CALC-002 AC-14 y AC-15: barra de 20 kg, "100"
// guardado, 90 %, sin aviso y sin poder guardar.
function partida() {
  const almacen = new AlmacenFalso({ [CLAVE_PORCENTAJES]: '[90]', [CLAVE_TRABAJO]: '"100"' });
  const s = sesion(almacen);
  assert.equal(modeloVista(s.estado).avisoGuardado, null);
  almacen.lleno = true;
  return { almacen, s, cambiar: s.cambiar };
}

test('SPEC-CALC-002/AC-14 al cambiar el peso de trabajo a 105 kg y salir, se recalcula y aparece el aviso', () => {
  const p = partida();
  const v = teclear(p.s, '105');
  assert.deepEqual(v.series.map((s) => s.total), ['92,5 kg']);
  assert.equal(v.avisoGuardado, null);
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, TEXTOS.falloGuardar);
  assert.equal(p.almacen.getItem(CLAVE_TRABAJO), '"100"');
});

test('SPEC-CALC-002/AC-15 "105": sin aviso mientras se escribe; al salir, aparece; "100" y salir, desaparece', () => {
  const p = partida();
  assert.equal(teclear(p.s, '105').avisoGuardado, null);
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, TEXTOS.falloGuardar);
  p.cambiar(escribir('10'));
  p.cambiar(escribir('100'));
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, null);
});

test('SPEC-CALC-002/AC-15 se compara por texto: "100,0" no coincide con "100"', () => {
  const p = partida();
  p.cambiar(escribir('100,0'));
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, TEXTOS.falloGuardar);
  p.cambiar(escribir('100'));
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, null);
});

test('SPEC-CALC-002/AC-15 "105" y salir, después vaciar y salir: el aviso sigue', () => {
  const p = partida();
  p.cambiar(escribir('105'));
  p.cambiar(salir('trabajo'));
  p.cambiar(escribir(''));
  const v = p.cambiar(salir('trabajo'));
  assert.equal(v.trabajo, '');
  assert.equal(v.avisoGuardado, TEXTOS.falloGuardar);
});

test('SPEC-CALC-002/AC-15 "105" y salir, y "100" sin salir: el aviso sigue; al salir, desaparece', () => {
  const p = partida();
  p.cambiar(escribir('105'));
  p.cambiar(salir('trabajo'));
  p.cambiar(escribir('10'));
  assert.equal(p.cambiar(escribir('100')).avisoGuardado, TEXTOS.falloGuardar);
  assert.equal(p.cambiar(salir('trabajo')).avisoGuardado, null);
});

test('SPEC-CALC-002/AC-15 tras el fallo, entrar y salir sin cambiar nada, o con el campo vacío, guarda "105" y quita el aviso', () => {
  for (const texto of ['105', '']) {
    const p = partida();
    p.cambiar(escribir('105'));
    p.cambiar(salir('trabajo'));
    p.almacen.lleno = false;
    p.cambiar(escribir(texto));
    const v = p.cambiar(salir('trabajo'));
    assert.equal(v.avisoGuardado, null, texto);
    assert.equal(p.almacen.getItem(CLAVE_TRABAJO), '"105"', texto);
  }
});

test('SPEC-CALC-002/AC-15 "105" a segundo plano: aviso; ya se puede guardar y, con el foco, a Dos lados: se guarda y desaparece', () => {
  const p = partida();
  p.cambiar(escribir('105'));
  assert.equal(p.cambiar(segundoPlano('trabajo')).avisoGuardado, TEXTOS.falloGuardar);
  p.almacen.lleno = false;
  assert.equal(p.cambiar((e) => elegirModo(e, 'dos-lados', 'trabajo')).avisoGuardado, null);
  assert.equal(p.almacen.getItem(CLAVE_TRABAJO), '"105"');
});

test('SPEC-CALC-002/AC-15 tras el fallo, otro cambio guarda su dato pero no reintenta el peso de trabajo', () => {
  const p = partida();
  p.cambiar(escribir('105'));
  p.cambiar(salir('trabajo'));
  p.almacen.lleno = false;
  assert.equal(p.cambiar((e) => ({ ...e, collarines: true })).avisoGuardado, TEXTOS.falloGuardar);
  assert.equal(p.almacen.getItem(CLAVE_COLLARINES), 'true');
  assert.equal(p.almacen.getItem(CLAVE_TRABAJO), '"100"');
});

test('SPEC-CALC-002/AC-15 collarines: aviso al activarlos; al desactivarlos, desaparece', () => {
  const p = partida();
  assert.equal(p.cambiar((e) => ({ ...e, collarines: true })).avisoGuardado, TEXTOS.falloGuardar);
  assert.equal(p.cambiar((e) => ({ ...e, collarines: false })).avisoGuardado, null);
});

test('SPEC-CALC-002/AC-15 la Z con 8,5 kg y salir: aviso; elegir la recta no la reintenta; volver, entrar y salir, sí', () => {
  const p = partida();
  assert.equal(p.cambiar((e) => elegirBarra(e, 'z')).avisoGuardado, null);
  assert.equal(teclear(p.s, '8,5', escribirBarra).avisoGuardado, null);
  assert.equal(p.cambiar(salir('barra')).avisoGuardado, TEXTOS.falloGuardar);
  p.almacen.lleno = false;
  assert.equal(p.cambiar((e) => elegirBarra(e, 'recta')).avisoGuardado, TEXTOS.falloGuardar);
  p.cambiar((e) => elegirBarra(e, 'z'));
  assert.equal(p.cambiar(salir('barra')).avisoGuardado, null);
  assert.equal(p.almacen.getItem(CLAVES_BARRA.z), '8.5');
});

test('SPEC-CALC-002/AC-15 los pesos de barra se comparan por valor: "10,0" vuelve a coincidir con 10 kg', () => {
  const p = partida();
  p.cambiar((e) => elegirBarra(e, 'z'));
  p.cambiar(escribirBarra('8,5'));
  assert.equal(p.cambiar(salir('barra')).avisoGuardado, TEXTOS.falloGuardar);
  p.cambiar(escribirBarra('10,0'));
  assert.equal(p.cambiar(salir('barra')).avisoGuardado, null);
});
