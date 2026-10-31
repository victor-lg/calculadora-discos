// Textos de la presentación (SPEC-CALC-003) a través del modelo de vista: el
// resumen y las fichas del panel Carga, el resumen de Mis discos, los avisos y
// las tarjetas de las series.
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
  alternarDisco,
  cambiarCollarines,
  abrirAnadir,
  cancelarAnadir,
  escribirPorcentaje,
  anadirPorcentaje,
  borrarSerie,
  deshacerBorrado,
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

const serie = (e, porcentaje) => modeloVista(e).series.find((s) => s.valor === porcentaje);

test('SPEC-CALC-003/AC-06 la tarjeta del 70 % con 105 kg: marca, total, "Por lado", discos y explicación', () => {
  const s = serie(escribirTrabajo(inicial(), '105'), 70);
  assert.equal(s.porcentaje, '70 %');
  assert.equal(s.diferencia, '−1 kg');
  assert.equal(s.anuncioDiferencia, '1 kg menos que el objetivo. Ver detalle');
  assert.equal(s.total, '72,5 kg');
  assert.equal(s.etiquetaDiscos, 'Por lado');
  assert.deepEqual(s.grupos, [
    { cent: 2500, peso: '25', veces: null, anuncio: '1 disco de 25 kg' },
    { cent: 125, peso: '1,25', veces: null, anuncio: '1 disco de 1,25 kg' },
  ]);
  assert.equal(
    s.detalleDiferencia,
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
  assert.equal(s.collarin, null);
  assert.equal(s.linea, null);
});

test('SPEC-CALC-003/AC-07 sin discos, "×n" con su anuncio y el collarín', () => {
  const sola = serie(escribirTrabajo(inicial(), '40'), 40);
  assert.deepEqual([sola.linea, sola.total, sola.explicacion], [
    'Solo la barra', '20 kg', 'El 40 % son 16 kg, menos que la barra (20 kg).',
  ]);
  assert.deepEqual([sola.diferencia, sola.etiquetaDiscos, sola.grupos], [null, null, null]);

  const cien = serie(escribirTrabajo(estadoInicial([100]), '120'), 100);
  assert.deepEqual(cien.grupos, [{ cent: 2500, peso: '25', veces: '×2', anuncio: '2 discos de 25 kg' }]);
  assert.deepEqual(cien.discos, ['25 ×2']);

  assert.equal(serie({ ...inicial(), collarines: true }, 70).collarin, '+ collarín de 2,5 kg');
  assert.equal(serie(inicial(), 70).collarin, null);
});

const lista = (e) => e.porcentajes;
const confirmar = (e, texto) => anadirPorcentaje(escribirPorcentaje(abrirAnadir(e), texto));

test('SPEC-CALC-003/AC-11 borrar el 70 % deja 40 y 90 con su aviso; "Deshacer" lo pone en su sitio', () => {
  let e = borrarSerie(inicial(), 70);
  assert.deepEqual(lista(e), [40, 90]);
  assert.equal(modeloVista(e).avisoBorrado, 'Serie del 70 % borrada');
  assert.deepEqual(modeloVista(e).series.map((s) => s.quitar), ['Quitar la serie del 40 %', 'Quitar la serie del 90 %']);
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(modeloVista(e).avisoBorrado, null);
});

test('SPEC-CALC-003/AC-13 "Deshacer" no duplica un porcentaje que ya volvió a la lista', () => {
  let e = confirmar(borrarSerie(inicial(), 70), '70');
  assert.deepEqual(lista(e), [40, 70, 90]);
  // Añadir no cierra el aviso (decisión de Víctor, 2026-10-31).
  assert.equal(modeloVista(e).avisoBorrado, 'Serie del 70 % borrada');
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 70, 90]);
  assert.equal(modeloVista(e).avisoBorrado, null);
});

test('SPEC-CALC-003/AC-13 solo se deshace el último borrado', () => {
  let e = borrarSerie(borrarSerie(inicial(), 70), 40);
  assert.equal(modeloVista(e).avisoBorrado, 'Serie del 40 % borrada');
  e = deshacerBorrado(e);
  assert.deepEqual(lista(e), [40, 90]);
  // Sin aviso, "Deshacer" ya no hace nada.
  assert.deepEqual(lista(deshacerBorrado(e)), [40, 90]);
});

test('SPEC-CALC-003/AC-13 activar los collarines cierra el aviso y la lista sigue sin el 70', () => {
  const e = cambiarCollarines(borrarSerie(inicial(), 70), true);
  assert.equal(modeloVista(e).avisoBorrado, null);
  assert.deepEqual(lista(deshacerBorrado(e)), [40, 90]);
});

// SPEC-CALC-003 FR-08: el aviso dura hasta la siguiente acción que cambie algo.
test('SPEC-CALC-003/AC-12 teclear en un peso, cambiar el modo, la barra o los discos cierran el aviso', () => {
  const borrada = borrarSerie(inicial(), 70);
  const acciones = [
    (e) => escribirTrabajo(e, '105'),
    (e) => escribirPesoBarra(elegirBarra(e, 'z'), '8'),
    (e) => elegirModo(e, 'un-punto'),
    (e) => elegirBarra(e, '15'),
    (e) => alternarDisco(e, 2500),
    (e) => borrarSerie(e, 40),
  ];
  for (const accion of acciones) {
    const v = modeloVista(accion(borrada));
    assert.notEqual(v.avisoBorrado, 'Serie del 70 % borrada', accion.toString());
  }
  // Terminar la edición de un peso, abrir el campo de añadir o escribir en él
  // no cambian nada: el aviso sigue.
  for (const accion of [(e) => terminarEdicion(e, 'trabajo'), abrirAnadir, (e) => escribirPorcentaje(abrirAnadir(e), '5')]) {
    assert.equal(modeloVista(accion(borrada)).avisoBorrado, 'Serie del 70 % borrada', accion.toString());
  }
});

test('SPEC-CALC-003/AC-14 confirmar cierra el campo si añade o está vacío, y lo deja abierto con el mensaje si no', () => {
  let e = confirmar(inicial(), '50');
  assert.deepEqual(lista(e), [40, 50, 70, 90]);
  assert.equal(e.anadiendo, false);

  e = confirmar(inicial(), '');
  assert.equal(e.anadiendo, false);
  assert.equal(e.errorPorcentaje, null);

  e = confirmar(inicial(), '0');
  assert.equal(e.anadiendo, true);
  assert.equal(modeloVista(e).errorPorcentaje, 'Escribe un porcentaje entre 1 y 100.');
  // El mensaje desaparece en cuanto cambia lo escrito.
  assert.equal(escribirPorcentaje(e, '05').errorPorcentaje, null);

  e = confirmar(inicial(), '1000');
  assert.equal(e.anadiendo, true);
  assert.equal(e.errorPorcentaje, 'Escribe un porcentaje entre 1 y 100.');

  e = confirmar(inicial(), '70');
  assert.equal(e.anadiendo, true);
  assert.equal(e.errorPorcentaje, 'Ya tienes una serie del 70 %.');
  assert.deepEqual(lista(e), [40, 70, 90]);
});

test('SPEC-CALC-003/AC-14 cancelar cierra el campo sin cambiar la lista y se vuelve a abrir vacío', () => {
  let e = cancelarAnadir(escribirPorcentaje(abrirAnadir(inicial()), '30'));
  assert.equal(e.anadiendo, false);
  assert.deepEqual(lista(e), [40, 70, 90]);
  e = abrirAnadir(e);
  assert.equal(modeloVista(e).textoPorcentaje, '');
  assert.equal(modeloVista(e).errorPorcentaje, null);
  // Cerrar el campo con un error y volver a abrirlo también lo deja vacío.
  e = abrirAnadir(cancelarAnadir(confirmar(inicial(), '0')));
  assert.equal(e.errorPorcentaje, null);
  assert.equal(e.textoPorcentaje, '');
});
