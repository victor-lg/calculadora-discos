// Inventario de discos (SPEC-CALC-002): cálculo con los tipos habilitados,
// datos guardados y fallo al guardar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, modeloVista, alternarDisco, anadirPorcentaje, quitarPorcentaje, TEXTOS } from '../../app/js/vista.js';
import { calcularSerie, repartirDiscos, objetivoCent, DISCOS_CENT } from '../../app/js/calculo.js';
import {
  CLAVE_DISCOS,
  CLAVE_PORCENTAJES,
  leerDiscos,
  leerPorcentajes,
  guardarDiscos,
  guardarCambios,
} from '../../app/js/almacenamiento.js';

const kg = (...pesos) => pesos.map((p) => Math.round(p * 100));
const SIN_25 = kg(20, 15, 10, 5, 2.5, 1.25);

function vista({ modo = 'barra', barra = '20', pesoBarra = {}, trabajo, porcentajes, discos }) {
  return modeloVista({
    ...estadoInicial(porcentajes, discos),
    modo,
    barra,
    pesoBarra: { recta: '', z: '', ...pesoBarra },
    trabajo,
  });
}

function serie(opciones) {
  const v = vista(opciones);
  assert.equal(v.series.length, 1);
  return v.series[0];
}

class AlmacenFalso {
  constructor(datos = {}) {
    this.datos = new Map(Object.entries(datos));
    this.lleno = false;
  }
  getItem(clave) {
    return this.datos.has(clave) ? this.datos.get(clave) : null;
  }
  setItem(clave, valor) {
    if (this.lleno) throw new Error('QuotaExceededError');
    this.datos.set(clave, String(valor));
  }
}

// --- Cálculo (FR-03, FR-04, FR-05) ---

test('SPEC-CALC-002/AC-01 la vista muestra los 7 tipos con su estado y tocar uno lo alterna', () => {
  let e = estadoInicial([40]);
  const nombres = (v) => v.discos.map((d) => [d.nombre, d.habilitado]);
  assert.deepEqual(nombres(modeloVista(e)), [
    ['25 kg', true], ['20 kg', true], ['15 kg', true], ['10 kg', true],
    ['5 kg', true], ['2,5 kg', true], ['1,25 kg', true],
  ]);
  e = alternarDisco(e, 2500);
  assert.equal(modeloVista(e).discos[0].habilitado, false);
  assert.deepEqual(e.discos, SIN_25);
  e = alternarDisco(e, 2500);
  assert.equal(modeloVista(e).discos[0].habilitado, true);
  assert.deepEqual(e.discos, DISCOS_CENT);
});

test('SPEC-CALC-002/AC-02 sin el de 25 kg, 90 % de 100 kg con barra de 20: 20 + 15 por lado', () => {
  const s = serie({ trabajo: '100', porcentajes: [90], discos: SIN_25 });
  assert.equal(s.total, '90 kg');
  assert.equal(s.discos, '20 + 15');
  assert.equal(s.pesoDiscos, '35 kg por lado');
  assert.equal(s.aviso, null);
});

test('SPEC-CALC-002/AC-03 solo 25 y 20: la mejor combinación, no la voraz', () => {
  const discos = kg(25, 20);
  const dos = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [80], discos });
  assert.deepEqual([dos.total, dos.discos, dos.aviso], ['80 kg', '20 + 20', null]);
  const uno = serie({ modo: 'un-punto', trabajo: '100', porcentajes: [40], discos });
  assert.deepEqual([uno.total, uno.discos, uno.aviso], ['40 kg', '20 + 20', null]);
  assert.equal(uno.etiquetaDiscos, 'Discos en el único punto');
});

test('SPEC-CALC-002/AC-04 menos discos y, si empatan, el disco más grande', () => {
  const a = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [60], discos: kg(25, 15, 10, 5) });
  assert.equal(a.discos, '25 + 5');
  const b = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [80], discos: kg(25, 20, 5) });
  assert.equal(b.discos, '20 + 20');
});

test('SPEC-CALC-002/AC-05 solo 20 y 10, 70 % de 100 kg: carga 60 kg y avisa', () => {
  const s = serie({ trabajo: '100', porcentajes: [70], discos: kg(20, 10) });
  assert.equal(s.total, '60 kg');
  assert.equal(s.discos, '20');
  assert.equal(s.aviso, 'Redondeo: objetivo 70 kg, diferencia −10 kg');
});

test('SPEC-CALC-002/AC-06 solo el de 25 kg: el mínimo es 25 kg en los tres modos', () => {
  const discos = kg(25);
  const barra = serie({ trabajo: '100', porcentajes: [40], discos });
  assert.equal(barra.mensaje, 'Solo barra (20 kg) · 0 kg por lado');
  assert.equal(barra.objetivo, 'Objetivo: 40 kg');
  assert.equal(barra.aviso, null);

  const dos = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [40], discos });
  assert.equal(dos.mensaje, 'Peso por lado demasiado pequeño: el disco mínimo es de 25 kg');
  assert.equal(dos.objetivo, 'Objetivo: 40 kg');
  assert.deepEqual([dos.total, dos.aviso], [null, null]);

  const uno = serie({ modo: 'un-punto', trabajo: '100', porcentajes: [20], discos });
  assert.equal(uno.mensaje, 'Peso demasiado pequeño: el disco mínimo es de 25 kg');
  assert.equal(uno.objetivo, 'Objetivo: 20 kg');
  assert.deepEqual([uno.total, uno.aviso], [null, null]);

  const justo = serie({ modo: 'un-punto', trabajo: '100', porcentajes: [25], discos });
  assert.deepEqual([justo.total, justo.discos, justo.aviso], ['25 kg', '25', null]);
});

test('SPEC-CALC-002/AC-07 frontera con disco mínimo de 5 kg en el modo Barra', () => {
  const discos = kg(25, 20, 15, 10, 5);
  const justo = serie({ trabajo: '60', porcentajes: [50], discos });
  assert.deepEqual([justo.total, justo.discos, justo.aviso], ['30 kg', '5', null]);
  const corto = serie({ trabajo: '59,98', porcentajes: [50], discos });
  assert.equal(corto.mensaje, 'Solo barra (20 kg) · 0 kg por lado');
  assert.equal(corto.objetivo, 'Objetivo: 29,99 kg');
  assert.equal(corto.aviso, null);
});

test('SPEC-CALC-002/AC-08 sin tipos no hay series; al habilitar el de 10 kg aparecen', () => {
  const sin = { ...estadoInicial([40, 70, 90], []), trabajo: '100' };
  const v = modeloVista(sin);
  assert.deepEqual(v.series, []);
  assert.equal(v.indicacionDiscos, TEXTOS.habilitarDiscos);

  const con = modeloVista(alternarDisco(sin, 1000));
  assert.equal(con.indicacionDiscos, null);
  assert.deepEqual(con.series.map((s) => [s.total, s.discos, s.aviso]), [
    ['40 kg', '10', null],
    ['60 kg', '10 + 10', 'Redondeo: objetivo 70 kg, diferencia −10 kg'],
    ['80 kg', '10 + 10 + 10', 'Redondeo: objetivo 90 kg, diferencia −10 kg'],
  ]);
});

test('SPEC-CALC-002/AC-09 sin tipos, la indicación se suma a las demás', () => {
  const casos = [
    [{ trabajo: '', porcentajes: [40] }, (v) => {
      assert.equal(v.indicacionTrabajo, TEXTOS.rellenarTrabajo);
      assert.equal(v.errorTrabajo, null);
    }],
    [{ trabajo: '100', porcentajes: [] }, (v) => {
      assert.equal(v.indicacionPorcentajes, TEXTOS.anadirPorcentajes);
    }],
    [{ trabajo: '15', porcentajes: [40] }, (v) => {
      assert.equal(v.avisoBarra, TEXTOS.trabajoInferiorBarra);
    }],
    [{ trabajo: '0', porcentajes: [40] }, (v) => {
      assert.match(v.errorTrabajo ?? '', /mayor que 0/);
    }],
    [{ barra: 'z', pesoBarra: { z: '0' }, trabajo: '50', porcentajes: [40] }, (v) => {
      assert.match(v.errorBarra ?? '', /^El peso de la barra/);
    }],
  ];
  for (const [opciones, comprobar] of casos) {
    const v = vista({ ...opciones, discos: [] });
    comprobar(v);
    assert.equal(v.indicacionDiscos, TEXTOS.habilitarDiscos, JSON.stringify(opciones));
    assert.deepEqual(v.series, [], JSON.stringify(opciones));
  }
});

test('SPEC-CALC-002/AC-10 deshabilitar y volver a habilitar el de 25 kg recalcula al momento', () => {
  let e = { ...estadoInicial([90]), trabajo: '100' };
  assert.equal(modeloVista(e).series[0].discos, '25 + 10');
  e = alternarDisco(e, 2500);
  assert.equal(modeloVista(e).series[0].discos, '20 + 15');
  e = alternarDisco(e, 2500);
  assert.equal(modeloVista(e).series[0].discos, '25 + 10');
});

// Mejor combinación por fuerza bruta, implementada aparte: recorre todas las
// cantidades de cada tipo y se queda con el mayor peso, luego con menos discos
// y luego con el disco más grande (SPEC-CALC-002 FR-04).
function ganaA(a, b) {
  if (a.length !== b.length) return a.length < b.length;
  const k = a.findIndex((d, i) => d !== b[i]);
  return k !== -1 && a[k] > b[k];
}

function fuerzaBruta(maxCent, tipos) {
  let mejor = [];
  let mejorPeso = 0;
  const recorrer = (i, elegidos, peso) => {
    if (i === tipos.length) {
      if (peso === 0) return;
      const ordenados = [...elegidos].sort((x, y) => y - x);
      if (peso > mejorPeso || (peso === mejorPeso && ganaA(ordenados, mejor))) {
        mejor = ordenados;
        mejorPeso = peso;
      }
      return;
    }
    for (let n = 0; peso + n * tipos[i] <= maxCent; n++) {
      recorrer(i + 1, [...elegidos, ...Array(n).fill(tipos[i])], peso + n * tipos[i]);
    }
  };
  recorrer(0, [], 0);
  return mejor;
}

test('SPEC-CALC-002/AC-04 la combinación coincide con la fuerza bruta para todos los subconjuntos', () => {
  let casos = 0;
  for (let mascara = 1; mascara < 1 << DISCOS_CENT.length; mascara++) {
    const tipos = DISCOS_CENT.filter((_, i) => mascara & (1 << i));
    for (let maxCent = 0; maxCent <= 5000; maxCent += 125) {
      casos++;
      assert.deepEqual(repartirDiscos(maxCent, tipos), fuerzaBruta(maxCent, tipos), `${tipos} ${maxCent}`);
    }
  }
  assert.ok(casos > 5000);
});

test('SPEC-CALC-002/AC-02 con cualquier subconjunto, la carga es la mayor posible sin pasar del objetivo', () => {
  const barras = [2000, 1500, 850, 0];
  for (let mascara = 1; mascara < 1 << DISCOS_CENT.length; mascara++) {
    const tipos = DISCOS_CENT.filter((_, i) => mascara & (1 << i));
    // Pesos alcanzables con estos tipos, en centésimas, hasta 500 kg.
    const alcanzable = new Uint8Array(50001);
    alcanzable[0] = 1;
    for (let p = 1; p <= 50000; p++) alcanzable[p] = tipos.some((t) => t <= p && alcanzable[p - t]) ? 1 : 0;
    for (let trabajoCent = 101; trabajoCent <= 50000; trabajoCent += 997) {
      for (const porcentaje of [7, 40, 70, 99]) {
        for (const modo of ['barra', 'dos-lados', 'un-punto']) {
          for (const barraCent of modo === 'barra' ? barras : [0]) {
            const s = calcularSerie({ modo, barraCent, trabajoCent, porcentaje, tipos });
            const objetivo = objetivoCent(trabajoCent, porcentaje);
            const lados = modo === 'un-punto' ? 1 : 2;
            const base = modo === 'barra' ? barraCent : 0;
            const maxCent = objetivo < base ? 0 : Math.floor((objetivo - base) / lados);
            let mayor = maxCent;
            while (mayor > 0 && !alcanzable[mayor]) mayor--;
            if (mayor === 0) {
              assert.equal(s.minimo, true);
              assert.ok(maxCent < tipos[tipos.length - 1]);
              continue;
            }
            assert.equal(s.discosCent, mayor);
            assert.equal(s.cargado, base + lados * mayor);
            for (const d of s.discos) assert.ok(tipos.includes(d));
            for (let i = 1; i < s.discos.length; i++) assert.ok(s.discos[i - 1] >= s.discos[i]);
          }
        }
      }
    }
  }
});

test('SPEC-CALC-002/FR-04 solo el de 1,25 kg y 500 kg en Un punto: 400 discos, sin límite', () => {
  const s = calcularSerie({ modo: 'un-punto', barraCent: 0, trabajoCent: 50000, porcentaje: 99, tipos: [125] });
  assert.equal(s.discos.length, 396);
  const todo = repartirDiscos(50000, [125]);
  assert.equal(todo.length, 400);
});

// --- Datos guardados (FR-08) ---

test('SPEC-CALC-002/AC-11 la primera vez los 7 tipos están habilitados', () => {
  assert.deepEqual(leerDiscos(new AlmacenFalso()), DISCOS_CENT);
});

test('SPEC-CALC-002/AC-11 se recuperan los tipos guardados, también ninguno', () => {
  const almacen = new AlmacenFalso();
  assert.equal(guardarDiscos(almacen, kg(20, 15, 10, 5, 2.5)), true);
  assert.equal(almacen.getItem(CLAVE_DISCOS), '[20,15,10,5,2.5]');
  assert.deepEqual(leerDiscos(almacen), kg(20, 15, 10, 5, 2.5));
  guardarDiscos(almacen, []);
  assert.deepEqual(leerDiscos(almacen), []);
});

test('SPEC-CALC-002/AC-11 con el peso de trabajo vacío, el cambio se guarda igual', () => {
  const almacen = new AlmacenFalso();
  const antes = estadoInicial([40, 70, 90]);
  assert.equal(antes.trabajo, '');
  guardarCambios(almacen, antes, alternarDisco(antes, 2500));
  assert.deepEqual(leerDiscos(almacen), SIN_25);
});

test('SPEC-CALC-002/AC-11 datos de los tipos que faltan, rotos o no válidos: los 7', () => {
  const casos = ['[50]', '[25,25]', '["25"]', '{"25":true}', '25', 'null', '{roto', '[25,null]',
    '[2.50001]', '[-25]', '[[25]]', '"[25]"', '[true]'];
  for (const crudo of casos) {
    assert.deepEqual(leerDiscos(new AlmacenFalso({ [CLAVE_DISCOS]: crudo })), DISCOS_CENT, crudo);
  }
  const roto = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(leerDiscos(roto), DISCOS_CENT);
  assert.deepEqual(leerDiscos(null), DISCOS_CENT);
});

test('SPEC-CALC-002/AC-11 la lista 1,25 y 25, en ese orden, habilita solo esos dos', () => {
  assert.deepEqual(leerDiscos(new AlmacenFalso({ [CLAVE_DISCOS]: '[1.25,25]' })), kg(25, 1.25));
});

test('SPEC-CALC-002/AC-12 los tipos y los porcentajes se recuperan por separado', () => {
  const a = new AlmacenFalso({ [CLAVE_DISCOS]: '[20,15,10,5,2.5,1.25]', [CLAVE_PORCENTAJES]: '{roto' });
  assert.deepEqual(leerPorcentajes(a), [40, 70, 90]);
  assert.deepEqual(leerDiscos(a), SIN_25);
  const b = new AlmacenFalso({ [CLAVE_DISCOS]: '{roto', [CLAVE_PORCENTAJES]: '[50,75]' });
  assert.deepEqual(leerPorcentajes(b), [50, 75]);
  assert.deepEqual(leerDiscos(b), DISCOS_CENT);
  // Guardar uno no toca la entrada del otro (ADR-0002 §3.2).
  const c = new AlmacenFalso({ [CLAVE_PORCENTAJES]: '[50]' });
  guardarDiscos(c, kg(25));
  assert.equal(c.getItem(CLAVE_PORCENTAJES), '[50]');
});

// --- Fallo al guardar (FR-09; SPEC-CALC-001/FR-11 lo aplica a la lista) ---

// Punto de partida de AC-14: barra de 20 kg, 100 kg, 90 %, sin aviso y sin poder guardar.
function partida() {
  const almacen = new AlmacenFalso();
  let estado = { ...estadoInicial([90]), trabajo: '100' };
  assert.equal(modeloVista(estado).avisoGuardado, null);
  almacen.lleno = true;
  const cambiar = (f) => {
    estado = guardarCambios(almacen, estado, f(estado));
    return modeloVista(estado);
  };
  return { almacen, cambiar };
}

const conTexto = (texto) => (e) => ({ ...e, textoPorcentaje: texto });

test('SPEC-CALC-002/AC-14 SPEC-CALC-001/FR-11 si no se puede guardar, sigue con lo que hay en memoria y avisa', () => {
  let p = partida();
  let v = p.cambiar((e) => alternarDisco(e, 2500));
  assert.equal(v.discos[0].habilitado, false);
  assert.equal(v.series[0].discos, '20 + 15');
  assert.equal(v.avisoGuardado, 'No se ha podido guardar: se mantendrá hasta cerrar la app');
  assert.equal(p.almacen.getItem(CLAVE_DISCOS), null);

  p = partida();
  v = p.cambiar((e) => anadirPorcentaje(conTexto('50')(e)));
  assert.deepEqual(v.series.map((s) => s.porcentaje), ['90 %', '50 %']);
  assert.equal(v.avisoGuardado, TEXTOS.falloGuardar);

  p = partida();
  v = p.cambiar((e) => quitarPorcentaje(e, 0));
  assert.deepEqual(v.series, []);
  assert.equal(v.avisoGuardado, TEXTOS.falloGuardar);
});

test('SPEC-CALC-002/AC-14 SPEC-CALC-001/FR-11 el aviso sigue hasta que los dos datos coinciden con lo guardado', () => {
  // Falla los discos; después se guarda la lista, pero el aviso sigue.
  let p = partida();
  p.cambiar((e) => alternarDisco(e, 2500));
  p.almacen.lleno = false;
  let v = p.cambiar((e) => anadirPorcentaje(conTexto('50')(e)));
  assert.equal(p.almacen.getItem(CLAVE_PORCENTAJES), '[90,50]');
  assert.equal(v.avisoGuardado, TEXTOS.falloGuardar);
  v = p.cambiar((e) => alternarDisco(e, 2500));
  assert.equal(p.almacen.getItem(CLAVE_DISCOS), '[25,20,15,10,5,2.5,1.25]');
  assert.equal(v.avisoGuardado, null);

  // Deshacer el cambio que falló quita el aviso aunque siga sin poder guardar.
  p = partida();
  assert.equal(p.cambiar((e) => alternarDisco(e, 2500)).avisoGuardado, TEXTOS.falloGuardar);
  assert.equal(p.cambiar((e) => alternarDisco(e, 2500)).avisoGuardado, null);

  // Falla la lista; después se guardan los discos, pero el aviso sigue.
  p = partida();
  p.cambiar((e) => anadirPorcentaje(conTexto('50')(e)));
  p.almacen.lleno = false;
  v = p.cambiar((e) => alternarDisco(e, 2500));
  assert.equal(p.almacen.getItem(CLAVE_DISCOS), '[20,15,10,5,2.5,1.25]');
  assert.equal(v.avisoGuardado, TEXTOS.falloGuardar);
});

test('SPEC-CALC-002/FR-09 SPEC-CALC-001/FR-11 guardar devuelve si se ha podido y nunca lanza', () => {
  const lleno = new AlmacenFalso();
  lleno.lleno = true;
  assert.equal(guardarDiscos(lleno, DISCOS_CENT), false);
  assert.equal(guardarDiscos(null, DISCOS_CENT), false);
  assert.equal(guardarDiscos(new AlmacenFalso(), DISCOS_CENT), true);
});
