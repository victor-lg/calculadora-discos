// Regresión visual de SPEC-CALC-003 (VIC-31): una captura de referencia de la
// pantalla entera en cada estado principal que recorren los E2E, a 390 px de
// ancho (§5) y en la vista sin dibujo de FR-14. El dibujo 3D no se compara
// píxel a píxel (§11). Sin tolerancias ni máscaras: las opciones de
// toHaveScreenshot están en playwright.config.js. Las referencias
// (capturas.spec.js-snapshots/) se generan con la imagen de Playwright de
// tests.yml, nunca en el PC, y las aprueba Víctor en el PR que las añade o las
// cambia. Estos tests fijan el estado que capturan, no prueban sus AC: por eso
// los títulos no los citan como SPEC-XXX-NNN/AC-NN.
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, botonCarga, botonDiscos, cargarFuentes, FUENTES_CARGADAS,
  porcentajesDeSeries, anadirPorcentaje, quitarSerie, quitarTodas,
} from './pantalla.js';
import { analizarConAxe } from './axe.js';

const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];

const tarjeta = (page, porcentaje) => page.locator('#series > li', { has: page.locator('.porcentaje', { hasText: `${porcentaje} %` }) });
const disco = (page, nombre) => page.getByLabel(nombre, { exact: true });
const abrir = (page) => page.getByRole('button', { name: 'Añadir porcentaje' });
const campo = (page) => page.getByLabel('Nuevo porcentaje');
const avisoBorrado = (page) => page.locator('#aviso-borrado');

// La pantalla entera, con las fuentes de la app ya cargadas: con las de
// reserva, el texto ocupa otro ancho (§11).
async function capturar(page, nombre) {
  expect(await cargarFuentes(page)).toEqual(FUENTES_CARGADAS);
  await expect(page).toHaveScreenshot(nombre, { fullPage: true });
}

// Cada test parte de la app recién abierta a 390 px, sin nada guardado.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  expect(await page.evaluate(() => localStorage.length), 'nada guardado al abrir').toBe(0);
  await analizarConAxe(page);
});

test('al abrir: los paneles plegados y las tarjetas del 40, 70 y 90 % (SPEC-CALC-003 AC-01)', async ({ page }) => {
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await capturar(page, 'al-abrir.png');
});

test('los paneles Carga y Mis discos desplegados (SPEC-CALC-003 AC-03 y AC-04)', async ({ page }) => {
  for (const boton of [botonCarga(page), botonDiscos(page)]) {
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await analizarConAxe(page);
  }
  await expect(page.locator('#lista-discos label')).toHaveText(NOMBRES);
  await capturar(page, 'paneles-desplegados.png');
});

test('los discos de 25 y 1,25 kg deshabilitados (SPEC-CALC-003 AC-04)', async ({ page }) => {
  await botonDiscos(page).click();
  await analizarConAxe(page);
  for (const nombre of ['25 kg', '1,25 kg']) {
    await disco(page, nombre).click();
    await expect(disco(page, nombre)).not.toBeChecked();
    await analizarConAxe(page);
  }
  await expect(page.locator('#cuenta-discos')).toHaveText('5 de 7');
  await capturar(page, 'discos-deshabilitados.png');
});

test('los tres avisos generales (SPEC-CALC-003 AC-05)', async ({ page }) => {
  // Las series se quitan desde su tarjeta: antes de vaciar el peso y de
  // deshabilitar los discos, que las quitan de la pantalla.
  await quitarTodas(page);
  await analizarConAxe(page);
  await botonDiscos(page).click();
  await analizarConAxe(page);
  for (const nombre of NOMBRES) {
    await disco(page, nombre).uncheck();
    await analizarConAxe(page);
  }
  await trabajo(page).fill('');
  await expect(page.locator('#avisos > .aviso:not([hidden])')).toHaveText([
    'Escribe el peso de trabajo.',
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
  ]);
  await expect(avisoBorrado(page)).toBeHidden();
  await analizarConAxe(page);
  await capturar(page, 'avisos-generales.png');
});

test('con 105 kg, la explicación del 70 % desplegada (SPEC-CALC-003 AC-06)', async ({ page }) => {
  await trabajo(page).fill('105');
  const marca = tarjeta(page, 70).getByRole('button', { name: '1 kg menos que el objetivo. Ver detalle' });
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  await analizarConAxe(page);
  await marca.click();
  await expect(marca).toHaveAttribute('aria-expanded', 'true');
  await expect(tarjeta(page, 70).locator('.detalle')).toHaveText(
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
  await analizarConAxe(page);
  await capturar(page, 'explicacion-desplegada.png');
});

test('con los collarines, "+ collarín de 2,5 kg" en el 70 % (SPEC-CALC-003 AC-07)', async ({ page }) => {
  await botonCarga(page).click();
  await analizarConAxe(page);
  await page.getByRole('switch', { name: 'Collarines de competición' }).check();
  await expect(tarjeta(page, 70)).toContainText('+ collarín de 2,5 kg');
  await analizarConAxe(page);
  await capturar(page, 'collarines.png');
});

test('en el modo Un punto, con 500 kg y el 100 %, el aviso de capacidad (SPEC-CALC-003 AC-18)', async ({ page }) => {
  await botonCarga(page).click();
  await analizarConAxe(page);
  await quitarTodas(page);
  await analizarConAxe(page);
  await anadirPorcentaje(page, '100');
  await expect(porcentajesDeSeries(page)).toHaveText(['100 %']);
  await analizarConAxe(page);
  await trabajo(page).fill('500');
  await analizarConAxe(page);
  await page.getByLabel('Un punto').check();
  await expect(tarjeta(page, 100).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm.');
  await expect(avisoBorrado(page)).toBeHidden();
  await analizarConAxe(page);
  await capturar(page, 'capacidad.png');
});

test('el campo de añadir abierto (SPEC-CALC-003 AC-14)', async ({ page }) => {
  await abrir(page).click();
  await expect(campo(page)).toBeFocused();
  await analizarConAxe(page);
  await capturar(page, 'anadir-abierto.png');
});

test('el campo de añadir con el error de 0 (SPEC-CALC-003 AC-14)', async ({ page }) => {
  await abrir(page).click();
  await expect(campo(page)).toBeFocused();
  await analizarConAxe(page);
  await campo(page).pressSequentially('0');
  await expect(campo(page)).toHaveValue('0');
  await analizarConAxe(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#error-porcentaje')).toHaveText('Escribe un porcentaje entre 1 y 100.');
  await analizarConAxe(page);
  await capturar(page, 'anadir-con-error.png');
});

test('el aviso de "Deshacer" con el foco, tras borrar el 70 % con el teclado (SPEC-CALC-003 AC-12)', async ({ page }) => {
  // El aviso dura 5 s (FR-08). Su plazo se controla con el reloj de la página
  // (§11): se para antes de capturar, para que no caduque a mitad. Con el
  // reloj parado axe se cuelga (ADR-0008 §3.2): se analiza antes, también
  // tras la recarga con el reloj ya instalado.
  const conElAviso = async () => {
    await expect(page.locator('#texto-borrado')).toHaveText('Serie del 70 % borrada');
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeFocused();
  };
  await page.clock.install();
  await page.reload();
  await analizarConAxe(page);
  await quitarSerie(page, 70);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await conElAviso();
  await analizarConAxe(page);
  // Como en pararReloj (anadir-borrar.spec.js): 1 s por delante, para que el
  // reloj, que sigue corriendo, no lo haya pasado al pararlo. Si el salto
  // llegara a los 5 s, el aviso se cerraría y conElAviso fallaría.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await conElAviso();
  await capturar(page, 'aviso-deshacer.png');
  await conElAviso();
});
