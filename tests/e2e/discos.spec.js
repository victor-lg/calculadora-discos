// Recorridos de SPEC-CALC-002 que necesitan un navegador real: tocar los tipos,
// arranque de cero, vuelta de segundo plano y fallo al guardar.
import { test, expect } from '@playwright/test';

const CLAVE_DISCOS = 'calculadora-discos:v1:discos';
const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';
const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
const AVISO_GUARDAR = 'No se ha podido guardar: se mantendrá hasta cerrar la app';
const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];

const trabajo = (page) => page.getByLabel('Peso de trabajo (kg)');
const disco = (page, nombre) => page.getByLabel(nombre, { exact: true });
const series = (page) => page.locator('#series > li');
const porcentajes = (page) => page.locator('#porcentajes > li > span');
const indicacionDiscos = (page) => page.locator('#indicacion-discos');
const avisoGuardado = (page) => page.locator('#aviso-guardado');

async function soloPorcentaje(page, valor) {
  while (await page.getByRole('button', { name: /^Quitar / }).count()) {
    await page.getByRole('button', { name: /^Quitar / }).first().click();
  }
  await page.getByLabel('Nuevo porcentaje').fill(String(valor));
  await page.getByRole('button', { name: 'Añadir' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  // Cada test parte de un almacenamiento vacío: Playwright le da un contexto propio.
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('SPEC-CALC-002/AC-01 los 7 tipos con su peso y su estado; tocar uno lo alterna', async ({ page }) => {
  await expect(page.locator('#lista-discos label')).toHaveText(NOMBRES);
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).toBeChecked();
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).toBeChecked();
  // No hay forma de añadir o quitar tipos ni de indicar cantidades.
  await expect(page.locator('#discos button, #discos input:not([type="checkbox"])')).toHaveCount(0);
});

test('SPEC-CALC-002/AC-08 sin tipos no hay series; al habilitar el de 10 kg aparecen', async ({ page }) => {
  await trabajo(page).fill('100');
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await expect(series(page)).toHaveCount(0);
  await expect(indicacionDiscos(page)).toBeVisible();

  await disco(page, '10 kg').click();
  await expect(indicacionDiscos(page)).toBeHidden();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '60 kg', '80 kg']);
  await expect(series(page).locator('.discos strong')).toHaveText(['10', '10 ×2', '10 ×3']);
  await expect(series(page).locator('.diferencia summary')).toHaveText(['−10 kg', '−10 kg']);
});

test('SPEC-CALC-002/AC-09 sin tipos, la indicación aparece junto a las demás', async ({ page }) => {
  // Con el peso de trabajo vacío: la primera vez es "100" (SPEC-CALC-001 FR-11).
  await trabajo(page).fill('');
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await expect(page.locator('#indicacion-trabajo')).toBeVisible();
  await expect(indicacionDiscos(page)).toHaveText('Habilita al menos un disco en Mis discos.');
  await expect(page.locator('#error-trabajo')).toBeHidden();

  await trabajo(page).fill('15');
  await expect(page.locator('#aviso-barra')).toBeVisible();
  await expect(indicacionDiscos(page)).toBeVisible();
  await expect(series(page)).toHaveCount(0);
});

test('SPEC-CALC-002/AC-10 deshabilitar y habilitar el de 25 kg recalcula al momento', async ({ page }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  const discos = series(page).locator('.discos strong');
  await expect(discos).toHaveText(['25 + 10']);
  await disco(page, '25 kg').click();
  await expect(discos).toHaveText(['20 + 15']);
  await disco(page, '25 kg').click();
  await expect(discos).toHaveText(['25 + 10']);
});

test('SPEC-CALC-002/AC-11 los tipos se recuperan al arrancar de cero, también ninguno', async ({ page }) => {
  // Con el peso de trabajo vacío, el cambio también se guarda. La primera vez
  // es "100" (SPEC-CALC-001 FR-11), así que se vacía antes.
  await trabajo(page).fill('');
  await expect(page.locator('#indicacion-trabajo')).toBeVisible();
  await disco(page, '25 kg').click();
  await disco(page, '1,25 kg').click();
  await page.reload();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect(disco(page, '1,25 kg')).not.toBeChecked();
  for (const nombre of NOMBRES.slice(1, 6)) await expect(disco(page, nombre)).toBeChecked();

  for (const nombre of NOMBRES.slice(1, 6)) await disco(page, nombre).click();
  await page.reload();
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).not.toBeChecked();
  await expect(indicacionDiscos(page)).toBeVisible();
});

test('SPEC-CALC-002/AC-11 datos guardados que faltan o no son válidos: los 7; [1.25,25]: solo esos', async ({ page }) => {
  for (const crudo of [null, '{roto', '[50]', '[25,25]', '["25"]', '25']) {
    await page.evaluate(([clave, valor]) => {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    }, [CLAVE_DISCOS, crudo]);
    await page.reload();
    for (const nombre of NOMBRES) await expect(disco(page, nombre), String(crudo)).toBeChecked();
  }
  await page.evaluate((clave) => localStorage.setItem(clave, '[1.25,25]'), CLAVE_DISCOS);
  await page.reload();
  await expect(page.locator('#lista-discos input:checked')).toHaveCount(2);
  await expect(disco(page, '25 kg')).toBeChecked();
  await expect(disco(page, '1,25 kg')).toBeChecked();
});

test('SPEC-CALC-002/AC-12 los tipos y los porcentajes se recuperan por separado', async ({ page }) => {
  await disco(page, '25 kg').click();
  await page.evaluate((clave) => localStorage.setItem(clave, '{roto'), CLAVE_PORCENTAJES);
  await page.reload();
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(disco(page, '25 kg')).not.toBeChecked();

  await page.evaluate(([discos, pcts]) => {
    localStorage.setItem(discos, '{roto');
    localStorage.setItem(pcts, '[50,75]');
  }, [CLAVE_DISCOS, CLAVE_PORCENTAJES]);
  await page.reload();
  for (const nombre of NOMBRES) await expect(disco(page, nombre)).toBeChecked();
  await expect(porcentajes(page)).toHaveText(['50 %', '75 %']);
});

// La prueba en el iPhone de ADR-0002 §5 completa este AC.
test('SPEC-CALC-002/AC-13 volver de otra app conserva los tipos sin recargar', async ({ page, context }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  await disco(page, '25 kg').click();
  await expect(series(page).locator('.discos strong')).toHaveText(['20 + 15']);
  await page.evaluate(() => { window.marcaSinRecarga = true; });

  const otra = await context.newPage();
  await otra.bringToFront();
  await page.bringToFront();
  await otra.close();
  await page.evaluate(() => {
    for (const tipo of ['visibilitychange', 'pagehide', 'pageshow', 'freeze', 'resume']) {
      const destino = tipo === 'visibilitychange' || tipo === 'freeze' || tipo === 'resume'
        ? document : window;
      destino.dispatchEvent(new Event(tipo));
    }
  });

  expect(await page.evaluate(() => window.marcaSinRecarga)).toBe(true);
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect(series(page).locator('.discos strong')).toHaveText(['20 + 15']);
});

test('SPEC-CALC-002/AC-14 si no se puede guardar, la app sigue y avisa hasta que todo coincide', async ({ page }) => {
  await soloPorcentaje(page, 90);
  await trabajo(page).fill('100');
  await expect(avisoGuardado(page)).toBeHidden();
  // El almacenamiento deja de poder guardar (como con la cuota llena).
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.romperAlmacen = (roto) => {
      Storage.prototype.setItem = roto
        ? () => { throw new DOMException('Lleno', 'QuotaExceededError'); }
        : original;
    };
    window.romperAlmacen(true);
  });

  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await expect(series(page).locator('.discos strong')).toHaveText(['20 + 15']);
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);

  // Deshacer el cambio quita el aviso aunque siga sin poder guardar.
  await disco(page, '25 kg').click();
  await expect(avisoGuardado(page)).toBeHidden();

  // Falla la lista; vuelve a poder guardar y se guardan los discos: el aviso sigue.
  await page.getByLabel('Nuevo porcentaje').fill('50');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(series(page).locator('.porcentaje')).toHaveText(['50 %', '90 %']);
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await page.evaluate(() => window.romperAlmacen(false));
  await disco(page, '25 kg').click();
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_DISCOS)).toBe('[20,15,10,5,2.5,1.25]');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  // Al guardarse también la lista, desaparece.
  await page.getByRole('button', { name: 'Quitar 50 %' }).click();
  await expect(avisoGuardado(page)).toBeHidden();
});

test('SPEC-CALC-002/AC-15 peso de trabajo, collarines y peso de la Z: aviso mientras no coinciden con lo guardado', async ({ page }) => {
  // Peso de trabajo guardado "100".
  await trabajo(page).fill('101');
  await trabajo(page).fill('100');
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_TRABAJO)).toBe('"100"');
  await page.reload();
  await expect(avisoGuardado(page)).toBeHidden();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Lleno', 'QuotaExceededError'); };
  });

  await trabajo(page).fill('105');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await trabajo(page).fill('100');
  await expect(avisoGuardado(page)).toBeHidden();

  await trabajo(page).fill('105');
  await trabajo(page).fill('');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await trabajo(page).fill('100');
  await expect(avisoGuardado(page)).toBeHidden();

  await page.getByLabel('Collarines de competición').check();
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  await page.getByLabel('Collarines de competición').uncheck();
  await expect(avisoGuardado(page)).toBeHidden();

  await page.getByLabel('Z', { exact: true }).check();
  await page.getByLabel('Peso de la barra (kg)').fill('8,5');
  await expect(avisoGuardado(page)).toHaveText(AVISO_GUARDAR);
  expect(await page.evaluate(() => localStorage.getItem('calculadora-discos:v1:peso-z'))).toBeNull();
});
