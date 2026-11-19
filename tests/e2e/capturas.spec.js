// Regresión visual de SPEC-CALC-003 (VIC-31): una captura de referencia de la
// pantalla entera en cada estado principal que recorren los E2E, en la vista
// sin dibujo de FR-14. El dibujo 3D no se compara píxel a píxel (§11).
// Sin tolerancias ni máscaras: las opciones de toHaveScreenshot están en
// playwright.config.js. Las referencias (capturas.spec.js-snapshots/) se
// generan con la imagen de Playwright de tests.yml, nunca en el PC, y las
// aprueba Víctor en el PR que las añade o las cambia.
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, botonCarga, botonDiscos, desplegarPaneles, cargarFuentes, FUENTES_CARGADAS,
  porcentajesDeSeries, anadirPorcentaje, botonQuitar, quitarTodas,
} from './pantalla.js';
import { analizarConAxe } from './axe.js';

const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];

const series = (page) => page.locator('#series > li');
const tarjeta = (page, porcentaje) => series(page).filter({ has: page.locator('.porcentaje', { hasText: `${porcentaje} %` }) });
const avisos = (page) => page.locator('#avisos > .aviso:not([hidden])');
const disco = (page, nombre) => page.getByLabel(nombre, { exact: true });
const abrir = (page) => page.getByRole('button', { name: 'Añadir porcentaje' });
const campo = (page) => page.getByLabel('Nuevo porcentaje');
const aviso = (page) => page.locator('#aviso-borrado');
const deshacer = (page) => page.getByRole('button', { name: 'Deshacer' });

// La pantalla entera, con las fuentes de la app ya cargadas: con las de
// reserva, el texto ocupa otro ancho (§11).
async function capturar(page, nombre) {
  expect(await cargarFuentes(page)).toEqual(FUENTES_CARGADAS);
  await expect(page).toHaveScreenshot(nombre, { fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-01 al abrir: los paneles plegados y las tarjetas del 40, 70 y 90 %', async ({ page }) => {
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await capturar(page, 'al-abrir.png');
});

test('SPEC-CALC-003/AC-03 SPEC-CALC-003/AC-04 los paneles Carga y Mis discos desplegados', async ({ page }) => {
  await desplegarPaneles(page);
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#lista-discos label')).toHaveText(NOMBRES);
  await analizarConAxe(page);
  await capturar(page, 'paneles-desplegados.png');
});

test('SPEC-CALC-003/AC-04 los discos de 25 y 1,25 kg deshabilitados', async ({ page }) => {
  await botonDiscos(page).click();
  for (const nombre of ['25 kg', '1,25 kg']) {
    await disco(page, nombre).click();
    await expect(disco(page, nombre)).not.toBeChecked();
  }
  await expect(page.locator('#cuenta-discos')).toHaveText('5 de 7');
  await analizarConAxe(page);
  await capturar(page, 'discos-deshabilitados.png');
});

test('SPEC-CALC-003/AC-05 los tres avisos generales', async ({ page }) => {
  await desplegarPaneles(page);
  await quitarTodas(page);
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await trabajo(page).fill('');
  await expect(avisos(page)).toHaveText([
    'Escribe el peso de trabajo.',
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
  ]);
  await analizarConAxe(page);
  await capturar(page, 'avisos-generales.png');
});

test('SPEC-CALC-003/AC-06 con 105 kg, la explicación del 70 % desplegada', async ({ page }) => {
  await trabajo(page).fill('105');
  const marca = tarjeta(page, 70).getByRole('button', { name: '1 kg menos que el objetivo. Ver detalle' });
  await marca.click();
  await expect(marca).toHaveAttribute('aria-expanded', 'true');
  await expect(tarjeta(page, 70).locator('.detalle')).toHaveText(
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
  await analizarConAxe(page);
  await capturar(page, 'explicacion-desplegada.png');
});

test('SPEC-CALC-003/AC-07 con los collarines, "+ collarín de 2,5 kg" en el 70 %', async ({ page }) => {
  await botonCarga(page).click();
  await page.getByRole('switch', { name: 'Collarines de competición' }).check();
  await expect(tarjeta(page, 70)).toContainText('+ collarín de 2,5 kg');
  await analizarConAxe(page);
  await capturar(page, 'collarines.png');
});

test('SPEC-CALC-003/AC-18 en el modo Un punto, con 500 kg y el 100 %, el aviso de capacidad', async ({ page }) => {
  await botonCarga(page).click();
  await quitarTodas(page);
  await anadirPorcentaje(page, '100');
  await trabajo(page).fill('500');
  await page.getByLabel('Un punto').check();
  await expect(series(page).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm.');
  await analizarConAxe(page);
  await capturar(page, 'capacidad.png');
});

test('SPEC-CALC-003/AC-14 el campo de añadir abierto', async ({ page }) => {
  await abrir(page).click();
  await expect(campo(page)).toBeFocused();
  await analizarConAxe(page);
  await capturar(page, 'anadir-abierto.png');
});

test('SPEC-CALC-003/AC-14 el campo de añadir con el error de 0', async ({ page }) => {
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#error-porcentaje')).toHaveText('Escribe un porcentaje entre 1 y 100.');
  await analizarConAxe(page);
  await capturar(page, 'anadir-con-error.png');
});

test('SPEC-CALC-003/AC-12 el aviso de "Deshacer" con el foco, tras borrar el 70 % con el teclado', async ({ page }) => {
  await botonQuitar(page, 70).focus();
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(deshacer(page)).toBeFocused();
  await analizarConAxe(page);
  await capturar(page, 'aviso-deshacer.png');
  // El aviso dura 5 s en tiempo real: si caducó durante la espera, la captura
  // no era del estado que dice su nombre.
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(deshacer(page)).toBeFocused();
});
