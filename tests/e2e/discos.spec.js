// Recorridos de SPEC-CALC-002 que necesitan un navegador real: tocar los tipos,
// arranque de cero, vuelta de segundo plano y fallo al guardar.
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, pesoBarra, barra, recargar, discosDeSeries, porcentajesDeSeries,
  anadirPorcentaje, quitarSerie, quitarTodas, series, disco, abrirConPaneles, deshabilitarDisco,
} from './pantalla.js';
import { analizarConAxe } from './axe.js';
import { segundoPlano, volverDeOtraApp, romperAlmacen } from './ciclo-de-vida.js';

const CLAVE_DISCOS = 'calculadora-discos:v1:discos';
const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';
const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
const AVISO_GUARDAR = 'No se ha podido guardar: se mantendrá hasta cerrar la app';
const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];

// SPEC-CALC-003 FR-01: la lista de porcentajes son las tarjetas.
const porcentajes = porcentajesDeSeries;
const indicacionDiscos = (page) => page.locator('#indicacion-discos');
const avisoGuardado = (page) => page.locator('#aviso-guardado');

async function soloPorcentaje(page, valor) {
  await quitarTodas(page);
  await anadirPorcentaje(page, String(valor));
}

test.beforeEach(async ({ page }) => {
  await abrirConPaneles(page);
});

test('SPEC-CALC-002/AC-01 los 7 tipos con su peso y su estado; tocar uno lo alterna', async ({ page }) => {
  await expect(page.locator('#lista-discos label')).toHaveText(NOMBRES);
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).toBeChecked();
  await deshabilitarDisco(page, '25 kg');
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).toBeChecked();
  await analizarConAxe(page);
  // No hay forma de añadir o quitar tipos ni de indicar cantidades.
  await expect(page.locator('#discos button, #discos input:not([type="checkbox"])')).toHaveCount(0);
});

test('SPEC-CALC-002/AC-08 sin tipos no hay series; al habilitar el de 10 kg aparecen', async ({ page }) => {
  await trabajo(page).fill('100');
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await expect(series(page)).toHaveCount(0);
  await expect(indicacionDiscos(page)).toBeVisible();
  await analizarConAxe(page);

  await disco(page, '10 kg').click();
  await expect(indicacionDiscos(page)).toBeHidden();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '60 kg', '80 kg']);
  await expect.poll(() => discosDeSeries(page)).toEqual(['10', '10 ×2', '10 ×3']);
  await expect(series(page).locator('.diferencia')).toHaveText(['−10 kg', '−10 kg']);
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-09 sin tipos, la indicación aparece junto a las demás', async ({ page }) => {
  // Con el peso de trabajo vacío: la primera vez es "100" (SPEC-CALC-001 FR-11).
  await trabajo(page).fill('');
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await expect(page.locator('#indicacion-trabajo')).toBeVisible();
  await expect(indicacionDiscos(page)).toHaveText('Habilita al menos un disco en Mis discos.');
  await expect(page.locator('#error-trabajo')).toBeHidden();
  await analizarConAxe(page);

  await trabajo(page).fill('15');
  await expect(page.locator('#aviso-barra')).toBeVisible();
  await expect(indicacionDiscos(page)).toBeVisible();
  await expect(series(page)).toHaveCount(0);
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-10 deshabilitar y habilitar el de 25 kg recalcula al momento', async ({ page }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  const discos = () => discosDeSeries(page);
  await expect.poll(discos).toEqual(['25 + 10']);
  await analizarConAxe(page);
  await disco(page, '25 kg').click();
  await expect.poll(discos).toEqual(['20 + 15']);
  await analizarConAxe(page);
  await disco(page, '25 kg').click();
  await expect.poll(discos).toEqual(['25 + 10']);
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-11 los tipos se recuperan al arrancar de cero, también ninguno', async ({ page }) => {
  // Con el peso de trabajo vacío, el cambio también se guarda. La primera vez
  // es "100" (SPEC-CALC-001 FR-11), así que se vacía antes.
  await trabajo(page).fill('');
  await expect(page.locator('#indicacion-trabajo')).toBeVisible();
  await analizarConAxe(page);
  await disco(page, '25 kg').click();
  await disco(page, '1,25 kg').click();
  await recargar(page);
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect(disco(page, '1,25 kg')).not.toBeChecked();
  for (const nombre of NOMBRES.slice(1, 6)) await expect(disco(page, nombre)).toBeChecked();
  await analizarConAxe(page);

  for (const nombre of NOMBRES.slice(1, 6)) await disco(page, nombre).click();
  await recargar(page);
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).not.toBeChecked();
  await expect(indicacionDiscos(page)).toBeVisible();
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-11 datos guardados que faltan o no son válidos: los 7; [1.25,25]: solo esos', async ({ page }) => {
  for (const crudo of [null, '{roto', '[50]', '[25,25]', '["25"]', '25']) {
    await page.evaluate(([clave, valor]) => {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    }, [CLAVE_DISCOS, crudo]);
    await recargar(page);
    for (const nombre of NOMBRES) await expect(disco(page, nombre), String(crudo)).toBeChecked();
    await analizarConAxe(page);
  }
  await page.evaluate((clave) => localStorage.setItem(clave, '[1.25,25]'), CLAVE_DISCOS);
  await recargar(page);
  await expect(page.locator('#lista-discos input:checked')).toHaveCount(2);
  await expect(disco(page, '25 kg')).toBeChecked();
  await expect(disco(page, '1,25 kg')).toBeChecked();
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-12 los tipos y los porcentajes se recuperan por separado', async ({ page }) => {
  await disco(page, '25 kg').click();
  await page.evaluate((clave) => localStorage.setItem(clave, '{roto'), CLAVE_PORCENTAJES);
  await recargar(page);
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await analizarConAxe(page);

  await page.evaluate(([discos, pcts]) => {
    localStorage.setItem(discos, '{roto');
    localStorage.setItem(pcts, '[50,75]');
  }, [CLAVE_DISCOS, CLAVE_PORCENTAJES]);
  await recargar(page);
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).toBeChecked();
  await expect(porcentajes(page)).toHaveText(['50 %', '75 %']);
  await analizarConAxe(page);
});

// La prueba en el iPhone de ADR-0002 §5 completa este AC.
test('SPEC-CALC-002/AC-13 volver de otra app conserva los tipos sin recargar', async ({ page, context }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  await disco(page, '25 kg').click();
  await expect.poll(() => discosDeSeries(page)).toEqual(['20 + 15']);
  await analizarConAxe(page);

  await volverDeOtraApp(page, context);

  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect.poll(() => discosDeSeries(page)).toEqual(['20 + 15']);
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-14 si no se puede guardar, la app sigue y avisa hasta que todo coincide', async ({ page }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  // El almacenamiento deja de poder guardar (como con la cuota llena).
  await romperAlmacen(page);

  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect.poll(() => discosDeSeries(page)).toEqual(['20 + 15']);
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);

  // Deshacer el cambio quita el aviso aunque siga sin poder guardar.
  await disco(page, '25 kg').click();
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);

  // Falla la lista; vuelve a poder guardar y se guardan los discos: el aviso sigue.
  await anadirPorcentaje(page, '50');
  await expect(series(page).locator('.porcentaje')).toHaveText(['50 %', '90 %']);
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  await page.evaluate(() => window.romperAlmacen(false));
  await disco(page, '25 kg').click();
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_DISCOS)).toBe('[20,15,10,5,2.5,1.25]');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  // Al guardarse también la lista, desaparece.
  await quitarSerie(page, 50);
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
});

test('SPEC-CALC-002/AC-15 peso de trabajo, collarines y peso de la Z: el aviso compara lo confirmado', async ({ page }) => {
  // Peso de trabajo guardado "100".
  await trabajo(page).fill('101');
  await trabajo(page).blur();
  await trabajo(page).fill('100');
  await trabajo(page).blur();
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_TRABAJO)).toBe('"100"');
  await recargar(page);
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  await romperAlmacen(page);

  // Mientras se escribe, el aviso no aparece; al salir del campo, sí.
  await trabajo(page).fill('');
  await trabajo(page).pressSequentially('105');
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  await trabajo(page).blur();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  // "100" sin salir: el aviso sigue; al salir, desaparece.
  await trabajo(page).fill('100');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  await trabajo(page).blur();
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);

  // "105" y salir, después vaciar y salir: el aviso sigue.
  await trabajo(page).fill('105');
  await trabajo(page).blur();
  await trabajo(page).fill('');
  await trabajo(page).blur();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  // Ya se puede guardar: salir con el campo vacío reintenta "105".
  await page.evaluate(() => window.romperAlmacen(false));
  await trabajo(page).focus();
  await trabajo(page).blur();
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_TRABAJO)).toBe('"105"');

  // A segundo plano con el foco: aviso; ya se puede guardar y, con el foco, a Dos lados.
  await page.evaluate(() => window.romperAlmacen(true));
  await trabajo(page).fill('106');
  await segundoPlano(page);
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  await page.evaluate(() => window.romperAlmacen(false));
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="modo"][value="dos-lados"]');
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  });
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_TRABAJO)).toBe('"106"');
  await page.getByLabel('Barra', { exact: true }).check();

  await page.evaluate(() => window.romperAlmacen(true));
  await page.getByLabel('Collarines de competición').check();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  await page.getByLabel('Collarines de competición').uncheck();
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);

  // La Z con 8,5 kg y salir: aviso. Elegir la recta no la reintenta; volver, entrar y salir, sí.
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('8,5');
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  await pesoBarra(page).blur();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  expect(await page.evaluate(() => localStorage.getItem('calculadora-discos:v1:peso-z'))).toBeNull();
  await page.evaluate(() => window.romperAlmacen(false));
  await barra(page, 'Recta').check();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await analizarConAxe(page);
  await barra(page, 'Z').check();
  await pesoBarra(page).focus();
  await pesoBarra(page).blur();
  await expect(avisoGuardado(page)).toBeHidden();
  await analizarConAxe(page);
  expect(await page.evaluate(() => localStorage.getItem('calculadora-discos:v1:peso-z'))).toBe('8.5');
});
