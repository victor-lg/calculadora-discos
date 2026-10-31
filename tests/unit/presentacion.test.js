// Textos de la presentación (SPEC-CALC-003) a través del modelo de vista: el
// resumen y las fichas del panel Carga, el resumen de Mis discos y los avisos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial,
  modeloVista,
  elegirModo,
  elegirBarra,
  escribirPesoBarra,
  terminarEdicion,
  alternarDisco,
  MODOS,
  TEXTOS,
} from '../../app/js/vista.js';

const inicial = () => estadoInicial([40, 70, 90]);
const fichas = (v) => v.fichas.map((f) => `${f.nombre} ${f.peso}`);

test('SPEC-CALC-003/AC-03 el resumen y las fichas de Carga en el modo Barra', () => {
  let e = inicial();
  let v = modeloVista(e);
  assert.equal(v.resumenCarga, 'Barra · Olímpica 20 kg');
  assert.deepEqual(fichas(v), ['Olímpica 20 kg', 'Olímpica 15 kg', 'Recta 10 kg', 'Z 10 kg']);
  assert.deepEqual(MODOS.map((m) => m.nombre), ['Barra', 'Dos lados', 'Un punto']);

  e = { ...e, collarines: true };
  assert.equal(modeloVista(e).resumenCarga, 'Barra · Olímpica 20 kg · collarines');

  e = elegirBarra(e, 'z');
  assert.equal(modeloVista(e).resumenCarga, 'Barra · Z 10 kg · collarines');
  v = modeloVista(escribirPesoBarra(e, '0,5'));
  assert.equal(v.errorBarra, TEXTOS.errorBarra);
  assert.equal(v.resumenCarga, 'Barra · Z 10 kg · collarines');
});

test('SPEC-CALC-003/AC-03 la Z escrita sin salir del campo cambia el resumen y su ficha, no la recta', () => {
  const e = elegirBarra({ ...inicial(), collarines: true }, 'z');
  let v = modeloVista(escribirPesoBarra(e, '8,5'));
  assert.equal(v.resumenCarga, 'Barra · Z 8,5 kg · collarines');
  assert.deepEqual(fichas(v).slice(2), ['Recta 10 kg', 'Z 8,5 kg']);
  // Borrado sin haber salido: los dos vuelven al confirmado.
  v = modeloVista(escribirPesoBarra(escribirPesoBarra(e, '8,5'), ''));
  assert.equal(v.resumenCarga, 'Barra · Z 10 kg · collarines');
  assert.deepEqual(fichas(v).slice(2), ['Recta 10 kg', 'Z 10 kg']);
});

test('SPEC-CALC-003/AC-03 el resumen en los modos de máquina', () => {
  assert.equal(modeloVista(elegirModo(inicial(), 'dos-lados')).resumenCarga, 'Dos lados · máquina');
  assert.equal(modeloVista(elegirModo(inicial(), 'un-punto')).resumenCarga, 'Un punto · máquina');
  // Las fichas conservan el peso de cada barra para cuando se vuelva al modo Barra.
  const e = elegirModo(elegirBarra(inicial(), 'recta'), 'un-punto');
  assert.deepEqual(fichas(modeloVista(e)).slice(2), ['Recta 10 kg', 'Z 10 kg']);
});

test('SPEC-CALC-003/AC-04 el resumen de Mis discos y su anuncio', () => {
  let e = inicial();
  let v = modeloVista(e);
  assert.equal(v.cuentaDiscos, null);
  assert.equal(v.anuncioDiscos, 'Mis discos: 7 de 7 habilitados');

  e = alternarDisco(alternarDisco(e, 2500), 125);
  v = modeloVista(e);
  assert.equal(v.cuentaDiscos, '5 de 7');
  assert.equal(v.anuncioDiscos, 'Mis discos: 5 de 7 habilitados');
  assert.deepEqual(v.discos.filter((d) => !d.habilitado).map((d) => d.nombre), ['25 kg', '1,25 kg']);

  for (const d of v.discos) if (d.habilitado) e = alternarDisco(e, d.cent);
  assert.equal(modeloVista(e).cuentaDiscos, '0 de 7');
});

test('SPEC-CALC-003/AC-05 SPEC-CALC-003/AC-25 el aviso general del peso de la barra', () => {
  const e = elegirBarra(inicial(), 'z');
  assert.equal(modeloVista(e).avisoPesoBarra, null);
  const mal = escribirPesoBarra(e, '0,5');
  let v = modeloVista(mal);
  assert.equal(v.avisoPesoBarra, 'Revisa el peso de la barra en Carga.');
  assert.deepEqual(v.series, []);
  // Plegar el panel termina la edición sin descartar el texto (SPEC-CALC-001 AC-45).
  v = modeloVista(terminarEdicion(mal, 'barra'));
  assert.equal(v.pesoBarraTexto, '0,5');
  assert.equal(v.avisoPesoBarra, TEXTOS.revisarBarra);

  v = modeloVista(escribirPesoBarra(mal, '8,5'));
  assert.equal(v.avisoPesoBarra, null);
  assert.equal(v.series.length, 3);
  // Las olímpicas y los modos de máquina no tienen campo: nunca hay aviso.
  assert.equal(modeloVista(elegirModo(mal, 'dos-lados')).avisoPesoBarra, null);
});

test('SPEC-CALC-001/AC-45 al terminar la edición, el resumen pasa al confirmado solo si lo escrito es válido', () => {
  const recta = { ...elegirBarra(inicial(), 'recta'), barraConfirmada: { recta: 750, z: 1000 } };
  const conTexto = (texto) => escribirPesoBarra({ ...recta, pesoBarra: { recta: '7,5', z: '10' } }, texto);

  let e = terminarEdicion(conTexto('0,5'), 'barra');
  assert.equal(e.barraConfirmada.recta, 750);
  assert.equal(modeloVista(e).resumenCarga, 'Barra · Recta 7,5 kg');
  assert.equal(modeloVista(e).pesoBarraTexto, '0,5');
  // Al elegir la Z y volver a la recta, el texto no válido se descarta.
  e = elegirBarra(elegirBarra(e, 'z'), 'recta');
  assert.equal(modeloVista(e).pesoBarraTexto, '7,5');

  e = terminarEdicion(conTexto('8'), 'barra');
  assert.equal(e.barraConfirmada.recta, 800);
  assert.equal(modeloVista(e).resumenCarga, 'Barra · Recta 8 kg');
});
