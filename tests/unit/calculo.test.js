// Reglas de cálculo y formato sobre muchas entradas (FR-05, FR-06, FR-07, FR-09, FR-14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objetivoCent, calcularSerie, excesoMangaMm, COLLARIN_CENT, DISCOS_CENT } from '../../app/js/calculo.js';
import { analizarPeso, analizarPesoBarra } from '../../app/js/entrada.js';
import { formatearKg } from '../../app/js/formato.js';

test('FR-05: el objetivo se redondea a dos decimales con la mitad hacia arriba', () => {
  assert.equal(objetivoCent(251, 50), 126); // 1,255 → 1,26
  assert.equal(objetivoCent(10111, 70), 7078); // 70,777 → 70,78
  assert.equal(objetivoCent(10001, 40), 4000); // 40,004 → 40
  assert.equal(objetivoCent(9999, 40), 4000); // 39,996 → 40
  assert.equal(objetivoCent(10500, 70), 7350);
});

test('FR-03: análisis del peso escrito', () => {
  assert.deepEqual(analizarPeso('102,5'), { estado: 'ok', cent: 10250 });
  assert.deepEqual(analizarPeso('102.5'), { estado: 'ok', cent: 10250 });
  assert.deepEqual(analizarPeso('100,10'), { estado: 'ok', cent: 10010 });
  assert.deepEqual(analizarPeso('0,01'), { estado: 'ok', cent: 1 });
  assert.deepEqual(analizarPeso('500'), { estado: 'ok', cent: 50000 });
  assert.deepEqual(analizarPeso(''), { estado: 'vacio' });
  // v0.4: espacios alrededor y separador suelto al principio o al final.
  assert.deepEqual(analizarPeso(' 100 '), { estado: 'ok', cent: 10000 });
  assert.deepEqual(analizarPeso('100.'), { estado: 'ok', cent: 10000 });
  assert.deepEqual(analizarPeso('.5'), { estado: 'ok', cent: 50 });
  assert.deepEqual(analizarPeso(' ,25 '), { estado: 'ok', cent: 25 });
  for (const t of [' ', ',', '.', ' . ', '\t', '\u00a0', '\n']) {
    assert.deepEqual(analizarPeso(t), { estado: 'vacio' }, JSON.stringify(t));
  }
  for (const t of ['0', '0,00', '0,', ',0', ',00', '500,01', '100,123', '1.000', '1,000', 'abc',
    '-5', '1e2', '1.000,5', '100kg', '10 0', '100,5,', '100,,', ',,', '.,', ',5,', '1 ,5', '1, 5']) {
    assert.equal(analizarPeso(t).estado, 'invalido', JSON.stringify(t));
  }
});

test('FR-14: formato con coma, hasta dos decimales y sin ceros finales', () => {
  assert.equal(formatearKg(7350), '73,5');
  assert.equal(formatearKg(4000), '40');
  assert.equal(formatearKg(4125), '41,25');
  assert.equal(formatearKg(1), '0,01');
  assert.equal(formatearKg(-100), '−1');
  assert.equal(formatearKg(-75), '−0,75');
  assert.equal(formatearKg(0), '0');
});

// Comprobación exhaustiva sobre una rejilla de pesos, porcentajes, barras y modos.
test('FR-06, FR-07 y FR-09: la carga es la mayor posible sin pasar del objetivo', () => {
  const barras = [2000, 1500, 850, 750, 1, 50000];
  let casos = 0;
  for (let trabajoCent = 1; trabajoCent <= 50000; trabajoCent += 37) {
    for (const porcentaje of [1, 7, 33, 40, 50, 70, 85, 99]) {
      for (const modo of ['barra', 'dos-lados', 'un-punto']) {
        for (const barraCent of modo === 'barra' ? barras : [0]) {
          casos++;
          const s = calcularSerie({ modo, barraCent, trabajoCent, porcentaje });
          const objetivo = objetivoCent(trabajoCent, porcentaje);
          const lados = modo === 'un-punto' ? 1 : 2;
          const paso = 125 * lados;
          const base = modo === 'barra' ? barraCent : 0;
          assert.equal(s.objetivo, objetivo);
          if (s.minimo) {
            // FR-09: no cabe ni un disco de 1,25 kg (por lado).
            assert.ok(objetivo < base + paso);
            continue;
          }
          const suma = s.discos.reduce((a, b) => a + b, 0);
          assert.equal(suma, s.discosCent);
          assert.equal(s.discosCent % 125, 0);
          assert.equal(s.cargado, base + lados * s.discosCent);
          assert.ok(s.cargado <= objetivo);
          assert.ok(s.cargado + paso > objetivo);
          assert.equal(s.diferencia, s.cargado - objetivo);
          // Orden de mayor a menor y solo discos del juego.
          for (let i = 1; i < s.discos.length; i++) assert.ok(s.discos[i - 1] >= s.discos[i]);
          for (const d of s.discos) assert.ok(DISCOS_CENT.includes(d));
          // Voraz: tras los de 25 kg, no se puede repetir un disco que sume otro del juego.
          const sin25 = s.discos.filter((d) => d !== 2500).reduce((a, b) => a + b, 0);
          assert.ok(sin25 < 2500 + 2000);
        }
      }
    }
  }
  assert.ok(casos > 50000);
});

test('FR-03: el motivo de un peso no válido es la primera regla que se cumple', () => {
  for (const t of ['100,123', '1.000', '1,000', ',123', '100,120']) {
    assert.equal(analizarPeso(t).causa, 'decimales', JSON.stringify(t));
  }
  for (const t of ['abc', '-5', '1e2', '1.000,5', '100kg', '10 0', '100,5,', '100,,', ',,', '.,', ',5,', '1 ,5', '1, 5']) {
    assert.equal(analizarPeso(t).causa, 'formato', JSON.stringify(t));
  }
  for (const t of ['0', '0,00', '0,', ',0', ',00', '500,01', '600']) {
    assert.equal(analizarPeso(t).causa, 'rango', JSON.stringify(t));
  }
});

test('FR-02: el peso de la recta y de la Z va de 1 a 50 kg', () => {
  assert.equal(analizarPesoBarra('1'), 100);
  assert.equal(analizarPesoBarra('50'), 5000);
  assert.equal(analizarPesoBarra(' 7,5 '), 750);
  for (const t of ['0,99', '50,01', '', ',', '0', 'abc', '10,123']) {
    assert.equal(analizarPesoBarra(t), null, JSON.stringify(t));
  }
});

// FR-15: con collarines, la carga es la mayor posible sin pasar del objetivo
// contando la barra y los dos collarines; sin discos, tampoco hay collarines.
test('FR-15: con collarines, la carga es la mayor posible sin pasar del objetivo', () => {
  for (let trabajoCent = 1; trabajoCent <= 50000; trabajoCent += 53) {
    for (const porcentaje of [7, 40, 50, 70, 99, 100]) {
      for (const barraCent of [2000, 1500, 850, 100]) {
        const s = calcularSerie({ modo: 'barra', barraCent, trabajoCent, porcentaje, collarines: true });
        const objetivo = objetivoCent(trabajoCent, porcentaje);
        const base = barraCent + 2 * COLLARIN_CENT;
        if (s.minimo) {
          assert.ok(objetivo < base + 2 * 125);
          continue;
        }
        assert.equal(s.collarines, true);
        assert.equal(s.cargado, base + 2 * s.discosCent);
        assert.ok(s.cargado <= objetivo);
        assert.ok(s.cargado + 2 * 125 > objetivo);
      }
    }
  }
});

test('FR-15: en Dos lados y Un punto los collarines no tienen efecto', () => {
  for (const modo of ['dos-lados', 'un-punto']) {
    for (const porcentaje of [10, 40, 70, 100]) {
      const sin = calcularSerie({ modo, barraCent: 0, trabajoCent: 10000, porcentaje });
      const con = calcularSerie({ modo, barraCent: 0, trabajoCent: 10000, porcentaje, collarines: true });
      assert.deepEqual({ ...con, collarines: false }, { ...sin, collarines: false });
      if (!con.minimo) assert.equal(con.collarines, false);
    }
  }
});

test('FR-16: el exceso sobre la manga se redondea hacia arriba al milímetro', () => {
  assert.equal(excesoMangaMm(Array(20).fill(2500), 3100), 230);
  assert.equal(excesoMangaMm(Array(15).fill(2000), 3100), 28); // 337,5 − 310 = 27,5
  assert.equal(excesoMangaMm([...Array(8).fill(2500), 1500], 3750), 0);
  // Los 7 tipos suman 130,5 mm.
  assert.equal(excesoMangaMm([2500, 2000, 1500, 1000, 500, 250, 125], 1305), 0);
  assert.equal(excesoMangaMm([2500, 2000, 1500, 1000, 500, 250, 125], 1300), 1); // 0,5 mm → 1
  assert.equal(excesoMangaMm([], 2000), 0);
});
