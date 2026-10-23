// Series que muestra la app, a través del modelo de vista (textos incluidos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, modeloVista, TEXTOS, BARRAS } from '../../app/js/vista.js';

function vista({ modo = 'barra', barra = '20', pesoBarra = {}, trabajo, porcentajes }) {
  const estado = {
    ...estadoInicial(porcentajes),
    modo,
    barra,
    pesoBarra: { recta: '', z: '', ...pesoBarra },
    trabajo,
  };
  return modeloVista(estado);
}

function serie(opciones) {
  const v = vista(opciones);
  assert.equal(v.series.length, 1);
  return v.series[0];
}

const SOLO_BARRA_20 = 'Solo barra (20 kg) · 0 kg por lado';

test('SPEC-CALC-001/AC-01 barra de 20 kg, 100 kg y 40/70/90 sin aviso de redondeo', () => {
  const v = vista({ trabajo: '100', porcentajes: [40, 70, 90] });
  assert.deepEqual(
    v.series.map((s) => [s.porcentaje, s.total, s.etiquetaDiscos, s.discos, s.pesoDiscos, s.aviso]),
    [
      ['40 %', '40 kg', 'Discos por lado', '10', '10 kg por lado', null],
      ['70 %', '70 kg', 'Discos por lado', '25', '25 kg por lado', null],
      ['90 %', '90 kg', 'Discos por lado', '25 + 10', '35 kg por lado', null],
    ],
  );
  assert.equal(v.errorTrabajo, null);
  assert.equal(v.avisoBarra, null);
});

test('SPEC-CALC-001/AC-02 redondea hacia abajo y avisa del objetivo y la diferencia', () => {
  const s = serie({ trabajo: '105', porcentajes: [70] });
  assert.equal(s.total, '72,5 kg');
  assert.equal(s.discos, '25 + 1,25');
  assert.equal(s.pesoDiscos, '26,25 kg por lado');
  assert.equal(s.aviso, 'Redondeo: objetivo 73,5 kg, diferencia −1 kg');
});

test('SPEC-CALC-001/AC-03 "Solo barra" con el objetivo y sin diferencia', () => {
  for (const [trabajo, pct, objetivo] of [['40', 40, '16'], ['50', 42, '21']]) {
    const s = serie({ trabajo, porcentajes: [pct] });
    assert.equal(s.mensaje, SOLO_BARRA_20);
    assert.equal(s.objetivo, `Objetivo: ${objetivo} kg`);
    assert.equal(s.aviso, null);
    assert.equal(s.total, null);
  }
});

test('SPEC-CALC-001/AC-04 barra Z de 8,5 kg, 50 kg y 70 %', () => {
  const s = serie({ barra: 'z', pesoBarra: { z: '8,5' }, trabajo: '50', porcentajes: [70] });
  assert.equal(s.total, '33,5 kg');
  assert.equal(s.discos, '10 + 2,5');
  assert.equal(s.pesoDiscos, '12,5 kg por lado');
  assert.equal(s.aviso, 'Redondeo: objetivo 35 kg, diferencia −1,5 kg');
});

test('SPEC-CALC-001/AC-04 las barras de 20 y 15 kg tienen peso fijo y el catálogo no cambia', () => {
  for (const [barra, fijo] of [['20', '20 kg'], ['15', '15 kg']]) {
    const v = vista({ barra, trabajo: '100', porcentajes: [70] });
    assert.equal(v.barraEditable, false);
    assert.equal(v.pesoBarraFijo, fijo);
  }
  for (const barra of ['recta', 'z']) {
    assert.equal(vista({ barra, trabajo: '100', porcentajes: [70] }).barraEditable, true);
  }
  assert.deepEqual(BARRAS.map((b) => b.id), ['20', '15', 'recta', 'z']);
  assert.ok(Object.isFrozen(BARRAS));
  assert.ok(BARRAS.every(Object.isFrozen));
  assert.throws(() => BARRAS.push({ id: 'otra', nombre: 'Otra', cent: 1000 }));
});

test('SPEC-CALC-001/AC-05 modo Dos lados: 100 kg y 70 %', () => {
  const s = serie({ modo: 'dos-lados', trabajo: '100', porcentajes: [70] });
  assert.equal(s.total, '70 kg');
  assert.equal(s.etiquetaDiscos, 'Discos por lado');
  assert.equal(s.discos, '25 + 10');
  assert.equal(s.pesoDiscos, '35 kg por lado');
  assert.equal(s.aviso, null);
});

test('SPEC-CALC-001/AC-06 modo Un punto: 60 kg y 70 %', () => {
  const s = serie({ modo: 'un-punto', trabajo: '60', porcentajes: [70] });
  assert.equal(s.total, '41,25 kg');
  assert.equal(s.etiquetaDiscos, 'Discos en el único punto');
  assert.equal(s.discos, '25 + 15 + 1,25');
  assert.equal(s.pesoDiscos, '41,25 kg de discos');
  assert.equal(s.aviso, 'Redondeo: objetivo 42 kg, diferencia −0,75 kg');
});

test('SPEC-CALC-001/AC-07 peso demasiado pequeño en Dos lados y en Un punto', () => {
  for (const [modo, mensaje] of [
    ['dos-lados', 'Peso por lado demasiado pequeño: el disco mínimo es de 1,25 kg'],
    ['un-punto', 'Peso demasiado pequeño: el disco mínimo es de 1,25 kg'],
  ]) {
    const s = serie({ modo, trabajo: '10', porcentajes: [10] });
    assert.equal(s.mensaje, mensaje);
    assert.equal(s.objetivo, 'Objetivo: 1 kg');
    assert.equal(s.total, null);
    assert.equal(s.aviso, null);
    assert.equal(s.discos, null);
  }
});

test('SPEC-CALC-001/AC-08 peso de trabajo no válido: mensaje y sin series', () => {
  for (const trabajo of ['0', '500,01', '100,123']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.match(v.errorTrabajo ?? '', /^El peso de trabajo .+\.$/, trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
  assert.match(vista({ trabajo: '0', porcentajes: [40] }).errorTrabajo, /mayor que 0/);
  assert.match(vista({ trabajo: '500,01', porcentajes: [40] }).errorTrabajo, /500 kg/);
  assert.match(vista({ trabajo: '100,123', porcentajes: [40] }).errorTrabajo, /dos decimales/);
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
  assert.equal(v.indicacionTrabajo, TEXTOS.rellenarTrabajo);
});

test('SPEC-CALC-001/AC-09 porcentajes repetidos: dos series iguales del 70 %', () => {
  const v = vista({ trabajo: '100', porcentajes: [70, 70] });
  assert.equal(v.series.length, 2);
  for (const s of v.series) {
    assert.deepEqual([s.porcentaje, s.total, s.discos], ['70 %', '70 kg', '25']);
  }
});

test('SPEC-CALC-001/AC-09 85 y 87 %: se muestran las dos aunque carguen lo mismo', () => {
  const [a, b] = vista({ trabajo: '100', porcentajes: [85, 87] }).series;
  assert.deepEqual([a.porcentaje, a.total, a.aviso], ['85 %', '85 kg', null]);
  assert.equal(b.porcentaje, '87 %');
  assert.equal(b.total, '85 kg');
  assert.equal(b.aviso, 'Redondeo: objetivo 87 kg, diferencia −2 kg');
});

test('SPEC-CALC-001/AC-11 arranque de cero: Barra, 20 kg y peso vacío sin error', () => {
  const v = modeloVista(estadoInicial([50, 75]));
  assert.equal(v.modo, 'barra');
  assert.equal(v.barra, '20');
  assert.equal(v.trabajo, '');
  assert.equal(v.indicacionTrabajo, TEXTOS.rellenarTrabajo);
  assert.equal(v.errorTrabajo, null);
  assert.deepEqual(v.porcentajes, ['50 %', '75 %']);
});

test('SPEC-CALC-001/AC-14 peso de trabajo inferior a la barra: aviso y "Solo barra"', () => {
  const v = vista({ trabajo: '15', porcentajes: [40, 70, 90] });
  assert.equal(v.avisoBarra, TEXTOS.trabajoInferiorBarra);
  assert.deepEqual(
    v.series.map((s) => [s.mensaje, s.objetivo, s.aviso]),
    [
      [SOLO_BARRA_20, 'Objetivo: 6 kg', null],
      [SOLO_BARRA_20, 'Objetivo: 10,5 kg', null],
      [SOLO_BARRA_20, 'Objetivo: 13,5 kg', null],
    ],
  );
});

test('SPEC-CALC-001/AC-15 lista vacía: ninguna serie y la indicación de añadir porcentajes', () => {
  const v = vista({ trabajo: '100', porcentajes: [] });
  assert.equal(v.series.length, 0);
  assert.equal(v.indicacionPorcentajes, TEXTOS.anadirPorcentajes);
  assert.equal(vista({ trabajo: '100', porcentajes: [40] }).indicacionPorcentajes, null);
});

test('SPEC-CALC-001/AC-16 101,11 kg y 70 %: objetivo 70,78 kg', () => {
  const s = serie({ trabajo: '101,11', porcentajes: [70] });
  assert.equal(s.total, '70 kg');
  assert.equal(s.discos, '25');
  assert.equal(s.aviso, 'Redondeo: objetivo 70,78 kg, diferencia −0,78 kg');
});

test('SPEC-CALC-001/AC-17 100,01 kg y 40 %: objetivo 40 kg sin aviso', () => {
  const s = serie({ trabajo: '100,01', porcentajes: [40] });
  assert.equal(s.total, '40 kg');
  assert.equal(s.discos, '10');
  assert.equal(s.aviso, null);
});

test('SPEC-CALC-001/AC-18 "102,5" y "102.5" dan el mismo resultado', () => {
  const coma = serie({ trabajo: '102,5', porcentajes: [70] });
  const punto = serie({ trabajo: '102.5', porcentajes: [70] });
  assert.deepEqual(coma, punto);
  assert.equal(coma.total, '70 kg');
  assert.equal(coma.discos, '25');
  assert.equal(coma.aviso, 'Redondeo: objetivo 71,75 kg, diferencia −1,75 kg');
});

test('SPEC-CALC-001/AC-19 peso de barra no válido: mensaje y sin series', () => {
  for (const barra of ['recta', 'z']) {
    for (const peso of ['0', '500,01', '100,123', '100,120', '1.000']) {
      const v = vista({ barra, pesoBarra: { [barra]: peso }, trabajo: '100', porcentajes: [70] });
      assert.match(v.errorBarra ?? '', /^El peso de la barra .+\.$/, `${barra} ${peso}`);
      assert.equal(v.series.length, 0, `${barra} ${peso}`);
    }
  }
});

test('SPEC-CALC-001/AC-19 peso de barra de 500 o 0,01: series sin mensaje de error', () => {
  for (const barra of ['recta', 'z']) {
    for (const peso of ['500', '0,01']) {
      const v = vista({ barra, pesoBarra: { [barra]: peso }, trabajo: '100', porcentajes: [70] });
      assert.equal(v.errorBarra, null, `${barra} ${peso}`);
      assert.equal(v.series.length, 1, `${barra} ${peso}`);
    }
  }
});

test('SPEC-CALC-001/AC-19 peso de barra vacío: solo la indicación de rellenarlo', () => {
  for (const barra of ['recta', 'z']) {
    const v = vista({ barra, trabajo: '100', porcentajes: [70] });
    assert.equal(v.series.length, 0);
    assert.equal(v.errorBarra, null);
    assert.equal(v.indicacionBarra, TEXTOS.rellenarBarra);
  }
});

test('SPEC-CALC-001/AC-19 recta pequeña de "7,5" kg, 60 kg y 70 %', () => {
  const s = serie({ barra: 'recta', pesoBarra: { recta: '7,5' }, trabajo: '60', porcentajes: [70] });
  assert.equal(s.total, '40 kg');
  assert.equal(s.discos, '15 + 1,25');
  assert.equal(s.pesoDiscos, '16,25 kg por lado');
  assert.equal(s.aviso, 'Redondeo: objetivo 42 kg, diferencia −2 kg');
});

test('SPEC-CALC-001/AC-20 Un punto, 2,51 kg y 50 %: objetivo 1,26 kg con la mitad hacia arriba', () => {
  const s = serie({ modo: 'un-punto', trabajo: '2,51', porcentajes: [50] });
  assert.equal(s.total, '1,25 kg');
  assert.equal(s.discos, '1,25');
  assert.equal(s.aviso, 'Redondeo: objetivo 1,26 kg, diferencia −0,01 kg');
});

test('SPEC-CALC-001/AC-21 99,99 kg y 40 %: "40 kg" sin ceros finales ni aviso', () => {
  const s = serie({ trabajo: '99,99', porcentajes: [40] });
  assert.equal(s.total, '40 kg');
  assert.equal(s.discos, '10');
  assert.equal(s.aviso, null);
});

test('SPEC-CALC-001/AC-23 "100,10" y "100,1" dan el mismo resultado', () => {
  const a = serie({ trabajo: '100,10', porcentajes: [70] });
  const b = serie({ trabajo: '100,1', porcentajes: [70] });
  assert.deepEqual(a, b);
  assert.equal(a.total, '70 kg');
  assert.equal(a.discos, '25');
  assert.equal(a.aviso, 'Redondeo: objetivo 70,07 kg, diferencia −0,07 kg');
});

test('SPEC-CALC-001/AC-23 "100,120" y "1.000" se rechazan con mensaje y sin series', () => {
  for (const trabajo of ['100,120', '1.000']) {
    const v = vista({ trabajo, porcentajes: [70] });
    assert.match(v.errorTrabajo ?? '', /dos decimales/, trabajo);
    assert.match(v.errorTrabajo ?? '', /separador de miles/, trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
});

test('SPEC-CALC-001/AC-25 peso de trabajo igual a la barra: sin aviso general', () => {
  const v = vista({ trabajo: '20', porcentajes: [40, 70, 90] });
  assert.equal(v.avisoBarra, null);
  assert.deepEqual(
    v.series.map((s) => [s.mensaje, s.objetivo]),
    [
      [SOLO_BARRA_20, 'Objetivo: 8 kg'],
      [SOLO_BARRA_20, 'Objetivo: 14 kg'],
      [SOLO_BARRA_20, 'Objetivo: 18 kg'],
    ],
  );
});

test('SPEC-CALC-001/AC-26 frontera de "Solo barra" con la barra de 20 kg y el 50 %', () => {
  const justo = serie({ trabajo: '45', porcentajes: [50] });
  assert.equal(justo.total, '22,5 kg');
  assert.equal(justo.discos, '1,25');
  assert.equal(justo.pesoDiscos, '1,25 kg por lado');
  assert.equal(justo.aviso, null);

  const debajo = serie({ trabajo: '44,98', porcentajes: [50] });
  assert.equal(debajo.mensaje, SOLO_BARRA_20);
  assert.equal(debajo.objetivo, 'Objetivo: 22,49 kg');
  assert.equal(debajo.aviso, null);
});

const AC01 = (v) => v.series.map((s) => [s.porcentaje, s.total, s.discos, s.pesoDiscos, s.aviso]);
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
    assert.equal(v.series[0].mensaje, 'Peso demasiado pequeño: el disco mínimo es de 1,25 kg', trabajo);
    assert.equal(v.series[0].objetivo, 'Objetivo: 0,25 kg', trabajo);
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

test('SPEC-CALC-001/AC-27 ",0", ",123", "10 0", "100,5," y "100,,": mensaje y sin series', () => {
  for (const trabajo of [',0', ',123', '10 0', '100,5,', '100,,']) {
    const v = vista({ trabajo, porcentajes: [40, 70, 90] });
    assert.match(v.errorTrabajo ?? '', /^El peso de trabajo .+\.$/, trabajo);
    assert.equal(v.indicacionTrabajo, null, trabajo);
    assert.equal(v.series.length, 0, trabajo);
  }
  assert.match(vista({ trabajo: ',0', porcentajes: [40] }).errorTrabajo, /mayor que 0/);
  assert.match(vista({ trabajo: ',123', porcentajes: [40] }).errorTrabajo, /dos decimales/);
  assert.match(vista({ trabajo: '100,5,', porcentajes: [40] }).errorTrabajo, /un separador/);
});

test('SPEC-CALC-001/AC-28 barra Z escrita como " 8,5 ": el resultado de AC-04', () => {
  const s = serie({ barra: 'z', pesoBarra: { z: ' 8,5 ' }, trabajo: '50', porcentajes: [70] });
  assert.deepEqual(s, serie({ barra: 'z', pesoBarra: { z: '8,5' }, trabajo: '50', porcentajes: [70] }));
  assert.equal(s.total, '33,5 kg');
});

test('SPEC-CALC-001/AC-28 recta pequeña escrita como "7,": 42 kg sin aviso', () => {
  const v = vista({ barra: 'recta', pesoBarra: { recta: '7,' }, trabajo: '60', porcentajes: [70] });
  assert.equal(v.errorBarra, null);
  const s = v.series[0];
  assert.equal(s.total, '42 kg');
  assert.equal(s.discos, '15 + 2,5');
  assert.equal(s.pesoDiscos, '17,5 kg por lado');
  assert.equal(s.aviso, null);
});

test('SPEC-CALC-001/AC-28 recta pequeña escrita como ",5": 3 kg y diferencia de −2 kg', () => {
  const s = serie({ barra: 'recta', pesoBarra: { recta: ',5' }, trabajo: '10', porcentajes: [50] });
  assert.equal(s.total, '3 kg');
  assert.equal(s.discos, '1,25');
  assert.equal(s.pesoDiscos, '1,25 kg por lado');
  assert.equal(s.aviso, 'Redondeo: objetivo 5 kg, diferencia −2 kg');
});

test('SPEC-CALC-001/AC-28 peso de barra "," o solo espacios: indicación, sin error', () => {
  for (const barra of ['recta', 'z']) {
    for (const peso of [',', '  ']) {
      const v = vista({ barra, pesoBarra: { [barra]: peso }, trabajo: '100', porcentajes: [70] });
      assert.equal(v.series.length, 0, `${barra} ${JSON.stringify(peso)}`);
      assert.equal(v.errorBarra, null, `${barra} ${JSON.stringify(peso)}`);
      assert.equal(v.indicacionBarra, TEXTOS.rellenarBarra, `${barra} ${JSON.stringify(peso)}`);
    }
  }
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
  assert.equal(v.series[0].aviso, 'Redondeo: objetivo 71,75 kg, diferencia −1,75 kg');
  for (const trabajo of [' 100 ', '100,', ',5']) {
    assert.equal(vista({ trabajo, porcentajes: [70] }).trabajo, trabajo);
  }
  const z = vista({ barra: 'z', pesoBarra: { z: ' 8,5 ' }, trabajo: '50', porcentajes: [70] });
  assert.equal(z.pesoBarraTexto, ' 8,5 ');
});
