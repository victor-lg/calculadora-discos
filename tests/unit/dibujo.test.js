// Qué dibuja cada tarjeta (SPEC-CALC-003 FR-07), a través del modelo de vista:
// el equipo, los discos que caben, el collarín y la etiqueta accesible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discosQueCaben } from '../../app/js/calculo.js';
import { estadoInicial, modeloVista, escribirTrabajo, elegirModo, elegirBarra, cambiarCollarines } from '../../app/js/vista.js';

function series({ trabajo, porcentajes, modo = 'barra', barra = '20', collarines = false }) {
  let e = estadoInicial(porcentajes);
  e = escribirTrabajo(e, trabajo);
  if (modo !== 'barra') e = elegirModo(e, modo);
  if (barra !== '20') e = elegirBarra(e, barra);
  if (collarines) e = cambiarCollarines(e, true);
  return modeloVista(e).series;
}
const dibujo = (opciones) => series(opciones)[0].dibujo;

test('SPEC-CALC-003/AC-09 la etiqueta de cada dibujo: 90 % de 100, 40 % de 40 y 100 % de 120', () => {
  assert.equal(dibujo({ trabajo: '100', porcentajes: [90] }).etiqueta, 'Carga: 25 + 10 kg');
  assert.equal(dibujo({ trabajo: '40', porcentajes: [40] }).etiqueta, 'Sin discos');
  assert.equal(dibujo({ trabajo: '120', porcentajes: [100] }).etiqueta, 'Carga: 2 de 25 kg');
  // Las tres series de la primera vez llevan dibujo, con la olímpica de 20 kg.
  const v = series({ trabajo: '100', porcentajes: [40, 70, 90] });
  assert.deepEqual(v.map((s) => s.dibujo.etiqueta), ['Carga: 10 kg', 'Carga: 25 kg', 'Carga: 25 + 10 kg']);
  assert.deepEqual(v.map((s) => s.dibujo.equipo), ['20', '20', '20']);
});

test('SPEC-CALC-003/AC-09 los decimales llevan coma y los repetidos "n de W" en cualquier posición', () => {
  // SPEC-CALC-001 AC-02: el 70 % de 105 kg son 25 y 1,25 por lado.
  assert.equal(dibujo({ trabajo: '105', porcentajes: [70] }).etiqueta, 'Carga: 25 + 1,25 kg');
  // 2 × 25 + 20 + 2,5 = 72,5 por lado.
  assert.equal(dibujo({ trabajo: '165', porcentajes: [100] }).etiqueta, 'Carga: 2 de 25 + 20 + 2,5 kg');
});

test('SPEC-CALC-003/AC-10 en Un punto solo se dibujan los que caben en 310 mm, con el aviso de capacidad', () => {
  const [s] = series({ modo: 'un-punto', trabajo: '500', porcentajes: [100] });
  assert.equal(s.discos.join(), '25 ×20');
  assert.equal(s.dibujo.equipo, 'maquina');
  assert.deepEqual(s.dibujo.discos, Array(11).fill(2500));
  assert.equal(s.dibujo.etiqueta, 'Carga: 11 de 25 kg');
  assert.equal(s.avisoCapacidad, 'No caben en la manga: faltan 23 cm.');
  assert.equal(s.avisoCapacidadDibujo, 'No caben en la manga: faltan 23 cm. Se dibujan los que caben.');
});

test('SPEC-CALC-003/AC-10 el de 1,25 no se dibuja aunque cabría en los 13 mm que quedan', () => {
  const [s] = series({ modo: 'un-punto', trabajo: '301,25', porcentajes: [100] });
  assert.equal(s.discos.join(), '25 ×12,1,25');
  assert.equal(s.dibujo.etiqueta, 'Carga: 11 de 25 kg');
  assert.deepEqual(discosQueCaben([...Array(12).fill(2500), 125], 3100), Array(11).fill(2500));
});

test('SPEC-CALC-003 FR-07 se dibujan en orden hasta el primero que no cabe', () => {
  assert.deepEqual(discosQueCaben([], 3750), []);
  // 13 × 27 = 351 y 13 × 27 + 22,5 = 373,5 caben en 375; el de 2,5 ya no.
  assert.deepEqual(discosQueCaben([...Array(13).fill(2500), 2000, 250], 3750), [...Array(13).fill(2500), 2000]);
  // Justo en el límite, cabe: 200 mm de la recta = 8 × 21 + 16 + 16.
  assert.deepEqual(discosQueCaben([1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 500, 500], 2000).length, 10);
  assert.deepEqual(discosQueCaben([1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 500, 500, 125], 2000).length, 10);
});

test('SPEC-CALC-003 FR-07 el collarín se dibuja si la serie lo lleva, y la máquina no lo lleva', () => {
  const conCollarines = series({ trabajo: '100', porcentajes: [20, 70], collarines: true });
  // El 20 % de 100 kg no llega a la barra: sin discos y sin collarín.
  assert.deepEqual(conCollarines.map((s) => [s.dibujo.discos, s.dibujo.collarin]), [[[], false], [[2000, 250], true]]);
  const maquina = series({ modo: 'dos-lados', trabajo: '100', porcentajes: [70], collarines: true });
  assert.deepEqual([maquina[0].dibujo.equipo, maquina[0].dibujo.collarin], ['maquina', false]);
});

test('SPEC-CALC-003 FR-07 cada barra dibuja su equipo y su manga útil', () => {
  // 2 × 25 + 20 + 15 + 10 = 120,5 mm: caben en todas.
  for (const barra of ['20', '15', 'recta', 'z']) {
    assert.equal(dibujo({ trabajo: '200', porcentajes: [100], barra }).equipo, barra);
  }
  // En la recta (200 mm) caben 7 discos de 25 (189 mm): de 8, se dibujan 7.
  assert.equal(dibujo({ trabajo: '360', porcentajes: [100], barra: 'recta' }).etiqueta, 'Carga: 7 de 25 kg');
  assert.equal(dibujo({ trabajo: '410', porcentajes: [100], barra: 'recta' }).etiqueta, 'Carga: 7 de 25 kg');
});
