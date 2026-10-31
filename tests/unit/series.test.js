// Series que muestra la app, a través del modelo de vista (textos incluidos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial,
  modeloVista,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  TEXTOS,
  BARRAS,
} from '../../app/js/vista.js';

function estado({ modo = 'barra', barra = '20', pesoBarra = {}, trabajo, porcentajes, discos, collarines = false }) {
  const inicial = estadoInicial(porcentajes, discos);
  return {
    ...inicial,
    modo,
    barra,
    pesoBarra: { ...inicial.pesoBarra, ...pesoBarra },
    trabajo,
    collarines,
  };
}

const vista = (opciones) => modeloVista(estado(opciones));

function serie(opciones) {
  const v = vista(opciones);
  assert.equal(v.series.length, 1);
  return v.series[0];
}

// Lo que se ve de una serie con discos: porcentaje, total, diferencia, etiqueta y discos.
const resumen = (s) => [s.porcentaje, s.total, s.diferencia, s.etiquetaDiscos, s.discos];
// Lo que se ve de una serie sin discos (FR-09).
const sinDiscos = (s) => [s.linea, s.total, s.explicacion, s.diferencia, s.discos, s.collarin];

test('SPEC-CALC-001/AC-01 olímpica de 20 kg, 100 kg y 40/70/90 sin diferencia', () => {
  const v = vista({ trabajo: '100', porcentajes: [40, 70, 90] });
  assert.deepEqual(v.series.map(resumen), [
    ['40 %', '40 kg', null, 'Por lado', ['10']],
    ['70 %', '70 kg', null, 'Por lado', ['25']],
    ['90 %', '90 kg', null, 'Por lado', ['25', '10']],
  ]);
  assert.equal(v.errorTrabajo, null);
  assert.equal(v.avisoBarra, null);
});

test('SPEC-CALC-001/AC-02 redondea hacia abajo y muestra la diferencia con su explicación', () => {
  const s = serie({ trabajo: '105', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '72,5 kg', '−1 kg', 'Por lado', ['25', '1,25']]);
  assert.equal(
    s.detalleDiferencia,
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
});

test('SPEC-CALC-001/AC-03 "Solo la barra" con su explicación y sin diferencia', () => {
  assert.deepEqual(sinDiscos(serie({ trabajo: '40', porcentajes: [40] })), [
    'Solo la barra', '20 kg', 'El 40 % son 16 kg, menos que la barra (20 kg).', null, null, null,
  ]);
  assert.deepEqual(sinDiscos(serie({ trabajo: '50', porcentajes: [42] })), [
    'Solo la barra', '20 kg',
    'El 42 % son 21 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.',
    null, null, null,
  ]);
});

test('SPEC-CALC-001/AC-04 la Z de 8,5 kg, 50 kg y 70 %', () => {
  const s = serie({ barra: 'z', pesoBarra: { z: '8,5' }, trabajo: '50', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '33,5 kg', '−1,5 kg', 'Por lado', ['10', '2,5']]);
});

test('SPEC-CALC-001/AC-04 las olímpicas de 20 y 15 kg tienen peso fijo y el catálogo no cambia', () => {
  for (const [barra, fijo] of [['20', '20 kg'], ['15', '15 kg']]) {
    const v = vista({ barra, trabajo: '100', porcentajes: [70] });
    assert.equal(v.barraEditable, false);
    assert.equal(v.fichas.find((f) => f.id === barra).peso, fijo);
  }
  for (const barra of ['recta', 'z']) {
    assert.equal(vista({ barra, trabajo: '100', porcentajes: [70] }).barraEditable, true);
  }
  assert.deepEqual(BARRAS.map((b) => b.id), ['20', '15', 'recta', 'z']);
  assert.ok(Object.isFrozen(BARRAS));
  assert.ok(BARRAS.every(Object.isFrozen));
  assert.throws(() => BARRAS.push({ id: 'otra', nombre: 'Otra', cent: 1000 }));
});

test('SPEC-CALC-001/AC-05 modo Dos lados: 100 kg y 70 %, sin peso de discos por lado', () => {
  const s = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '70 kg', null, 'Por lado', ['25', '10']]);
  // FR-08: ningún texto de la serie dice el peso de discos por lado (35 kg).
  assert.doesNotMatch(JSON.stringify(s), /35/);
});

test('SPEC-CALC-001/AC-06 modo Un punto: 60 kg y 70 %', () => {
  const s = serie({ modo: 'un-punto', trabajo: '60', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '41,25 kg', '−0,75 kg', 'Total en discos', ['25', '15', '1,25']]);
});

test('SPEC-CALC-001/AC-07 "Sin discos" en Dos lados y en Un punto', () => {
  assert.deepEqual(sinDiscos(serie({ modo: 'dos-lados', trabajo: '10', porcentajes: [10] })), [
    'Sin discos', '0 kg',
    'El 10 % son 1 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.',
    null, null, null,
  ]);
  assert.deepEqual(sinDiscos(serie({ modo: 'un-punto', trabajo: '10', porcentajes: [10] })), [
    'Sin discos', '0 kg',
    'El 10 % son 1 kg: faltan 0,25 kg para poner el disco más pequeño (1,25 kg).',
    null, null, null,
  ]);
});

test('SPEC-CALC-001/AC-08 peso de trabajo no válido: mensaje y sin series', () => {
  for (const [trabajo, mensaje] of [
    ['0', 'El peso de trabajo debe estar entre 0 y 500 kg.'],
    ['500,01', 'El peso de trabajo debe estar entre 0 y 500 kg.'],
    ['100,123', 'El peso de trabajo admite como máximo dos decimales.'],
  ]) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.errorTrabajo, mensaje, trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
});

test('SPEC-CALC-001/AC-08 500 y 0,01 se aceptan sin mensaje de error', () => {
  for (const trabajo of ['500', '0,01']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.errorTrabajo, null, trabajo);
    assert.equal(v.indicacionTrabajo, null, trabajo);
    assert.equal(v.series.length, 3, trabajo);
  }
});

test('SPEC-CALC-001/AC-08 peso de trabajo vacío: solo la indicación de rellenarlo', () => {
  const v = vista({ trabajo: '', porcentajes: [40, 70, 90] });
  assert.equal(v.series.length, 0);
  assert.equal(v.errorTrabajo, null);
  assert.equal(v.indicacionTrabajo, 'Escribe el peso de trabajo.');
});

test('SPEC-CALC-001/AC-09 85 y 87 %: se muestran las dos aunque carguen lo mismo', () => {
  const [a, b] = vista({ trabajo: '100', porcentajes: [85, 87] }).series;
  assert.deepEqual([a.porcentaje, a.total, a.diferencia], ['85 %', '85 kg', null]);
  assert.deepEqual([b.porcentaje, b.total, b.diferencia], ['87 %', '85 kg', '−2 kg']);
});

// Lo recuperado del almacenamiento lo cubre guardados.test.js.
test('SPEC-CALC-001/AC-11 FR-02, FR-15: al empezar, Barra, olímpica de 20 kg, "100", sin collarines y recta y Z de 10 kg', () => {
  const v = modeloVista(estadoInicial([50, 75]));
  assert.equal(v.trabajo, '100');
  assert.equal(v.modo, 'barra');
  assert.equal(v.barra, '20');
  assert.equal(v.collarines, false);
  assert.deepEqual(estadoInicial([]).pesoBarra, { recta: '10', z: '10' });
  assert.deepEqual(v.porcentajes, ['50 %', '75 %']);
});

test('SPEC-CALC-001/AC-14 peso de trabajo inferior a la barra: aviso y "Solo la barra"', () => {
  const v = vista({ trabajo: '15', porcentajes: [40, 70, 90] });
  assert.equal(v.avisoBarra, 'El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.');
  assert.deepEqual(v.series.map((s) => [s.linea, s.total, s.explicacion]), [
    ['Solo la barra', '20 kg', 'El 40 % son 6 kg, menos que la barra (20 kg).'],
    ['Solo la barra', '20 kg', 'El 70 % son 10,5 kg, menos que la barra (20 kg).'],
    ['Solo la barra', '20 kg', 'El 90 % son 13,5 kg, menos que la barra (20 kg).'],
  ]);
});

test('SPEC-CALC-001/AC-15 lista vacía: ninguna serie y "Añade al menos un porcentaje."', () => {
  const v = vista({ trabajo: '100', porcentajes: [] });
  assert.equal(v.series.length, 0);
  assert.equal(v.indicacionPorcentajes, 'Añade al menos un porcentaje.');
  assert.equal(vista({ trabajo: '100', porcentajes: [40] }).indicacionPorcentajes, null);
});

test('SPEC-CALC-001/AC-16 101,11 kg y 70 %: objetivo 70,78 kg', () => {
  const s = serie({ trabajo: '101,11', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '70 kg', '−0,78 kg', 'Por lado', ['25']]);
  assert.match(s.detalleDiferencia, /son 70,78 kg\./);
});

test('SPEC-CALC-001/AC-17 100,01 kg y 40 %: objetivo 40 kg sin diferencia', () => {
  const s = serie({ trabajo: '100,01', porcentajes: [40] });
  assert.deepEqual(resumen(s), ['40 %', '40 kg', null, 'Por lado', ['10']]);
  assert.equal(s.detalleDiferencia, null);
});

test('SPEC-CALC-001/AC-18 "102,5" y "102.5" dan el mismo resultado', () => {
  const coma = serie({ trabajo: '102,5', porcentajes: [70] });
  const punto = serie({ trabajo: '102.5', porcentajes: [70] });
  assert.deepEqual(coma, punto);
  assert.deepEqual(resumen(coma), ['70 %', '70 kg', '−1,75 kg', 'Por lado', ['25']]);
  assert.match(coma.detalleDiferencia, /son 71,75 kg\./);
});

test('SPEC-CALC-001/AC-19 peso de barra no válido o vacío: mensaje y sin series', () => {
  for (const barra of ['recta', 'z']) {
    for (const peso of ['0,99', '50,01', '10,123', '10,120', '1.000', '', ',', '   ']) {
      const v = vista({ barra, pesoBarra: { [barra]: peso }, trabajo: '100', porcentajes: [70] });
      const caso = `${barra} ${JSON.stringify(peso)}`;
      assert.equal(v.errorBarra, 'Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo.', caso);
      assert.equal(v.series.length, 0, caso);
    }
  }
});

test('SPEC-CALC-001/AC-19 peso de barra de 1 o de 50: series sin mensaje de error', () => {
  for (const barra of ['recta', 'z']) {
    for (const peso of ['1', '50']) {
      const v = vista({ barra, pesoBarra: { [barra]: peso }, trabajo: '100', porcentajes: [70] });
      assert.equal(v.errorBarra, null, `${barra} ${peso}`);
      assert.equal(v.series.length, 1, `${barra} ${peso}`);
    }
  }
});

test('SPEC-CALC-001/AC-19 la recta de "7,5" kg, 60 kg y 70 %', () => {
  const s = serie({ barra: 'recta', pesoBarra: { recta: '7,5' }, trabajo: '60', porcentajes: [70] });
  assert.deepEqual(resumen(s), ['70 %', '40 kg', '−2 kg', 'Por lado', ['15', '1,25']]);
});

test('SPEC-CALC-001/AC-20 Un punto, 2,51 kg y 50 %: objetivo 1,26 kg con la mitad hacia arriba', () => {
  const s = serie({ modo: 'un-punto', trabajo: '2,51', porcentajes: [50] });
  assert.deepEqual(resumen(s), ['50 %', '1,25 kg', '−0,01 kg', 'Total en discos', ['1,25']]);
  assert.match(s.detalleDiferencia, /son 1,26 kg\./);
});

test('SPEC-CALC-001/AC-21 99,99 kg y 40 %: "40 kg" sin ceros finales ni diferencia', () => {
  const s = serie({ trabajo: '99,99', porcentajes: [40] });
  assert.deepEqual(resumen(s), ['40 %', '40 kg', null, 'Por lado', ['10']]);
});

test('SPEC-CALC-001/AC-23 "100,10" y "100,1" dan el mismo resultado', () => {
  const a = serie({ trabajo: '100,10', porcentajes: [70] });
  const b = serie({ trabajo: '100,1', porcentajes: [70] });
  assert.deepEqual(a, b);
  assert.deepEqual(resumen(a), ['70 %', '70 kg', '−0,07 kg', 'Por lado', ['25']]);
  assert.match(a.detalleDiferencia, /son 70,07 kg\./);
});

test('SPEC-CALC-001/AC-23 "100,120" y "1.000" se rechazan con mensaje y sin series', () => {
  for (const trabajo of ['100,120', '1.000']) {
    const v = vista({ trabajo, porcentajes: [70] });
    assert.equal(v.errorTrabajo, 'El peso de trabajo admite como máximo dos decimales.', trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
});

test('SPEC-CALC-001/AC-25 peso de trabajo igual a la barra: sin aviso general', () => {
  const v = vista({ trabajo: '20', porcentajes: [40, 70, 90] });
  assert.equal(v.avisoBarra, null);
  assert.deepEqual(v.series.map((s) => [s.linea, s.explicacion]), [
    ['Solo la barra', 'El 40 % son 8 kg, menos que la barra (20 kg).'],
    ['Solo la barra', 'El 70 % son 14 kg, menos que la barra (20 kg).'],
    ['Solo la barra', 'El 90 % son 18 kg, menos que la barra (20 kg).'],
  ]);
});

test('SPEC-CALC-001/AC-26 frontera de "Solo la barra" con la olímpica de 20 kg y el 50 %', () => {
  const justo = serie({ trabajo: '45', porcentajes: [50] });
  assert.deepEqual(resumen(justo), ['50 %', '22,5 kg', null, 'Por lado', ['1,25']]);

  const debajo = serie({ trabajo: '44,98', porcentajes: [50] });
  assert.deepEqual(sinDiscos(debajo), [
    'Solo la barra', '20 kg',
    'El 50 % son 22,49 kg: faltan 0,01 kg para poner el disco más pequeño (1,25 kg) a cada lado.',
    null, null, null,
  ]);

  const igual = serie({ trabajo: '40', porcentajes: [50] });
  assert.equal(igual.linea, 'Solo la barra');
  assert.equal(igual.explicacion, 'El 50 % son 20 kg: faltan 2,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.');
});

const AC01 = (v) => v.series.map((s) => [...resumen(s), s.detalleDiferencia]);
const SERIES_AC01 = AC01(vista({ trabajo: '100', porcentajes: [40, 70, 90] }));

test('SPEC-CALC-001/AC-27 espacios y separador al final: las mismas series que AC-01', () => {
  for (const trabajo of [' 100 ', '100 ', '100,', '100.']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.errorTrabajo, null, JSON.stringify(trabajo));
    assert.deepEqual(AC01(v), SERIES_AC01, JSON.stringify(trabajo));
  }
});

test('SPEC-CALC-001/AC-27 ",5" y ".5" valen 0,5 kg en el modo Un punto', () => {
  for (const trabajo of [',5', '.5']) {
    const v = vista({ modo: 'un-punto', trabajo, porcentajes: [50] });
    assert.equal(v.errorTrabajo, null, trabajo);
    assert.equal(v.series[0].linea, 'Sin discos', trabajo);
    assert.equal(
      v.series[0].explicacion,
      'El 50 % son 0,25 kg: faltan 1 kg para poner el disco más pequeño (1,25 kg).',
      trabajo,
    );
  }
});

test('SPEC-CALC-001/AC-27 solo el separador o solo espacios: campo vacío, sin error', () => {
  for (const trabajo of [',', '.', ' , ', '   ']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.series.length, 0, JSON.stringify(trabajo));
    assert.equal(v.errorTrabajo, null, JSON.stringify(trabajo));
    assert.equal(v.indicacionTrabajo, TEXTOS.rellenarTrabajo, JSON.stringify(trabajo));
  }
});

test('SPEC-CALC-001/AC-27 ",0", ",123", "10 0", "100,5," y "100,,": su mensaje y sin series', () => {
  for (const [trabajo, mensaje] of [
    [',0', 'El peso de trabajo debe estar entre 0 y 500 kg.'],
    [',123', 'El peso de trabajo admite como máximo dos decimales.'],
    ['10 0', 'Escribe el peso solo con cifras y, si hace falta, una coma decimal.'],
    ['100,5,', 'Escribe el peso solo con cifras y, si hace falta, una coma decimal.'],
    ['100,,', 'Escribe el peso solo con cifras y, si hace falta, una coma decimal.'],
  ]) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.errorTrabajo, mensaje, trabajo);
    assert.equal(v.indicacionTrabajo, null, trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
});

test('SPEC-CALC-001/AC-28 la Z escrita como " 8,5 ": el resultado de AC-04', () => {
  const s = serie({ barra: 'z', pesoBarra: { z: ' 8,5 ' }, trabajo: '50', porcentajes: [70] });
  assert.deepEqual(s, serie({ barra: 'z', pesoBarra: { z: '8,5' }, trabajo: '50', porcentajes: [70] }));
  assert.equal(s.total, '33,5 kg');
});

test('SPEC-CALC-001/AC-28 la recta escrita como "7,": 42 kg sin diferencia', () => {
  const v = vista({ barra: 'recta', pesoBarra: { recta: '7,' }, trabajo: '60', porcentajes: [70] });
  assert.equal(v.errorBarra, null);
  assert.deepEqual(resumen(v.series[0]), ['70 %', '42 kg', null, 'Por lado', ['15', '2,5']]);
});

test('SPEC-CALC-001/AC-28 la recta escrita como ",5" (0,5 kg): mensaje y sin series', () => {
  const v = vista({ barra: 'recta', pesoBarra: { recta: ',5' }, trabajo: '60', porcentajes: [70] });
  assert.equal(v.errorBarra, TEXTOS.errorBarra);
  assert.equal(v.series.length, 0);
});

test('SPEC-CALC-001/AC-31 tabulador, espacio duro o salto de línea alrededor del peso', () => {
  for (const trabajo of ['\t100\t', '\u00a0100\u00a0', '\n100\n', '\r\n100\r\n']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.equal(v.errorTrabajo, null, JSON.stringify(trabajo));
    assert.deepEqual(AC01(v), SERIES_AC01, JSON.stringify(trabajo));
  }
});

test('SPEC-CALC-001/AC-32 el modelo de vista conserva exactamente lo tecleado', () => {
  const v = vista({ trabajo: '102.5', porcentajes: [70] });
  assert.equal(v.trabajo, '102.5');
  assert.match(v.series[0].detalleDiferencia, /^El 70 % de 102,5 kg son 71,75 kg\./);
  for (const trabajo of [' 100 ', '100,', ',5']) {
    assert.equal(vista({ trabajo, porcentajes: [70] }).trabajo, trabajo);
  }
  const z = vista({ barra: 'z', pesoBarra: { z: ' 8,5 ' }, trabajo: '50', porcentajes: [70] });
  assert.equal(z.pesoBarraTexto, ' 8,5 ');
});

test('SPEC-CALC-001/AC-35 "Por lado" y "25 ×2"; en Un punto, "Total en discos", "25 ×2" y "20"', () => {
  const barra = serie({ trabajo: '120', porcentajes: [100] });
  assert.deepEqual([barra.etiquetaDiscos, barra.discos], ['Por lado', ['25 ×2']]);
  const unPunto = serie({ modo: 'un-punto', trabajo: '100', porcentajes: [70] });
  assert.deepEqual([unPunto.etiquetaDiscos, unPunto.discos], ['Total en discos', ['25 ×2', '20']]);
});

test('SPEC-CALC-001/AC-36 con collarines, 100 kg: 70 % y 90 % llevan "+ collarín de 2,5 kg"', () => {
  const [s70, s90] = vista({ trabajo: '100', porcentajes: [70, 90], collarines: true }).series;
  assert.deepEqual(resumen(s70), ['70 %', '70 kg', null, 'Por lado', ['20', '2,5']]);
  assert.equal(s70.collarin, '+ collarín de 2,5 kg');
  assert.deepEqual(resumen(s90), ['90 %', '90 kg', null, 'Por lado', ['25', '5', '2,5']]);
  assert.equal(s90.collarin, '+ collarín de 2,5 kg');

  const s = serie({ trabajo: '105', porcentajes: [70], collarines: true });
  assert.deepEqual(resumen(s), ['70 %', '72,5 kg', '−1 kg', 'Por lado', ['20', '2,5', '1,25']]);
  assert.equal(s.collarin, '+ collarín de 2,5 kg');
});

test('SPEC-CALC-001/AC-37 frontera con collarines, olímpica de 20 kg y 50 %', () => {
  const justo = serie({ trabajo: '55', porcentajes: [50], collarines: true });
  assert.deepEqual(resumen(justo), ['50 %', '27,5 kg', null, 'Por lado', ['1,25']]);
  assert.equal(justo.collarin, '+ collarín de 2,5 kg');

  assert.deepEqual(sinDiscos(serie({ trabajo: '54,98', porcentajes: [50], collarines: true })), [
    'Solo la barra', '20 kg',
    'El 50 % son 27,49 kg: faltan 0,01 kg para poner el disco más pequeño (1,25 kg) y el collarín a cada lado.',
    null, null, null,
  ]);
  assert.equal(
    serie({ trabajo: '44', porcentajes: [50], collarines: true }).explicacion,
    'El 50 % son 22 kg: faltan 5,5 kg para poner el disco más pequeño (1,25 kg) y el collarín a cada lado.',
  );
});

test('SPEC-CALC-001/AC-38 en Dos lados los collarines no cuentan y se conservan al volver a Barra', () => {
  let e = estado({ trabajo: '100', porcentajes: [70], collarines: true });
  e = elegirModo(e, 'dos-lados');
  let s = modeloVista(e).series[0];
  assert.deepEqual(resumen(s), ['70 %', '70 kg', null, 'Por lado', ['25', '10']]);
  assert.equal(s.collarin, null);

  e = elegirModo(e, 'barra');
  const v = modeloVista(e);
  assert.equal(v.collarines, true);
  s = v.series[0];
  assert.deepEqual(s.discos, ['20', '2,5']);
  assert.equal(s.collarin, '+ collarín de 2,5 kg');
});

test('SPEC-CALC-001/AC-39 el aviso de capacidad aparece solo cuando los discos no caben', () => {
  // Esta interfaz no dibuja la carga: el aviso va sin "Se dibujan los que caben." (FR-16).
  const todos = serie({ modo: 'un-punto', trabajo: '500', porcentajes: [100] });
  assert.deepEqual(todos.discos, ['25 ×20']);
  assert.equal(todos.avisoCapacidad, 'No caben en la manga: faltan 23 cm.');

  const solo20 = serie({ modo: 'un-punto', trabajo: '300', porcentajes: [100], discos: [2000] });
  assert.deepEqual(solo20.discos, ['20 ×15']);
  assert.equal(solo20.avisoCapacidad, 'No caben en la manga: faltan 2,8 cm.');

  const caben = serie({ trabajo: '500', porcentajes: [90] });
  assert.deepEqual(caben.discos, ['25 ×8', '15']);
  assert.equal(caben.avisoCapacidad, null);
});

test('SPEC-CALC-001/AC-40 cada barra muestra su peso confirmado y descarta lo no válido', () => {
  // Se cambia de barra con el foco en su campo: eso termina la edición (FR-11).
  let e = estado({ trabajo: '100', porcentajes: [70] });
  e = escribirPesoBarra(elegirBarra(e, 'recta'), '7,50');
  e = escribirPesoBarra(elegirBarra(e, 'z', 'barra'), '8.5');

  e = elegirBarra(e, 'recta', 'barra');
  assert.equal(modeloVista(e).pesoBarraTexto, '7,5');
  e = elegirBarra(e, 'z');
  assert.equal(modeloVista(e).pesoBarraTexto, '8,5');

  // Un peso no válido se descarta al cambiar de barra…
  e = escribirPesoBarra(elegirBarra(e, 'recta'), '0,5');
  assert.equal(modeloVista(e).errorBarra, TEXTOS.errorBarra);
  e = elegirBarra(elegirBarra(e, 'z'), 'recta');
  let v = modeloVista(e);
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['7,5', null]);

  // …y al cambiar de modo.
  e = escribirPesoBarra(e, '0,5');
  e = elegirModo(elegirModo(e, 'dos-lados'), 'barra');
  v = modeloVista(e);
  assert.deepEqual([v.pesoBarraTexto, v.errorBarra], ['7,5', null]);
});

test('SPEC-CALC-001/AC-41 con un peso de barra no válido no se muestra el aviso de FR-12', () => {
  let e = elegirBarra(estado({ trabajo: '5', porcentajes: [40] }), 'z');
  e = escribirPesoBarra(e, '8,5');
  assert.equal(modeloVista(e).avisoBarra, TEXTOS.trabajoInferiorBarra);
  e = escribirPesoBarra(e, '0,5');
  const v = modeloVista(e);
  assert.equal(v.avisoBarra, null);
  assert.equal(v.errorBarra, TEXTOS.errorBarra);
});
