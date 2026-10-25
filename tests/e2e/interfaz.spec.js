// Recorridos de la interfaz que necesitan un navegador real.
import { test, expect } from '@playwright/test';

const CLAVE = 'calculadora-discos:v1:porcentajes';

const trabajo = (page) => page.getByLabel('Peso de trabajo (kg)');
const pesoBarra = (page) => page.getByLabel('Peso de la barra (kg)');
const nuevoPorcentaje = (page) => page.getByLabel('Nuevo porcentaje');
const series = (page) => page.locator('#series > li');
const porcentajes = (page) => page.locator('#porcentajes > li > span');

async function anadir(page, texto) {
  await nuevoPorcentaje(page).fill(texto);
  await page.getByRole('button', { name: 'Añadir' }).click();
}

async function quitarTodos(page) {
  while (await page.getByRole('button', { name: /^Quitar / }).count()) {
    await page.getByRole('button', { name: /^Quitar / }).first().click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  // Cada test parte de un almacenamiento vacío (contexto propio de Playwright):
  // así ningún test hereda tipos de disco deshabilitados de otro.
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('SPEC-CALC-001/AC-04 las barras de 20 y 15 kg no permiten cambiar su peso', async ({ page }) => {
  const radios = page.locator('input[name="barra"]');
  await expect(radios).toHaveCount(4);
  await expect(page.locator('#barras label.opcion')).toHaveText([
    'Barra de 20 kg', 'Barra de 15 kg', 'Recta pequeña', 'Barra Z',
  ]);
  for (const [nombre, fijo] of [['Barra de 20 kg', '20 kg'], ['Barra de 15 kg', '15 kg']]) {
    await page.getByLabel(nombre).check();
    await expect(pesoBarra(page)).toBeHidden();
    await expect(page.locator('#peso-barra-fijo')).toHaveText(`Peso de la barra: ${fijo}`);
  }
  for (const nombre of ['Recta pequeña', 'Barra Z']) {
    await page.getByLabel(nombre).check();
    await expect(pesoBarra(page)).toBeVisible();
    await expect(pesoBarra(page)).toBeEditable();
  }
  // El catálogo no se puede ampliar ni reducir: no hay controles para ello.
  await expect(page.locator('#barras button')).toHaveCount(0);
});

test('SPEC-CALC-001/AC-10 las series se actualizan al momento con cada cambio', async ({ page }) => {
  await expect(page.getByRole('button', { name: /calcular/i })).toHaveCount(0);

  await trabajo(page).fill('100');
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);

  await trabajo(page).fill('105');
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '72,5 kg', '92,5 kg']);

  await anadir(page, '50');
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '70 %', '90 %', '50 %']);

  await page.getByRole('button', { name: 'Quitar 70 %' }).click();
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '90 %', '50 %']);

  await page.getByLabel('Barra de 15 kg').check();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '92,5 kg', '52,5 kg']);

  await page.getByLabel('Un punto').check();
  await expect(series(page).locator('.total')).toHaveText(['41,25 kg', '93,75 kg', '52,5 kg']);

  await page.getByLabel('Dos lados sin barra').check();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '92,5 kg', '52,5 kg']);
});

test('SPEC-CALC-001/AC-11 la lista se recupera al arrancar de cero, también vacía', async ({ page }) => {
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);

  await quitarTodos(page);
  await anadir(page, '50');
  await anadir(page, '75');
  await trabajo(page).fill('100');
  await page.getByLabel('Un punto').check();
  await page.reload();
  await expect(porcentajes(page)).toHaveText(['50 %', '75 %']);

  // Al arrancar de cero: Barra, 20 kg y peso vacío con la indicación, sin error.
  await expect(page.getByLabel('Barra', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Barra de 20 kg')).toBeChecked();
  await expect(trabajo(page)).toHaveValue('');
  await expect(page.locator('#indicacion-trabajo')).toBeVisible();
  await expect(page.locator('#error-trabajo')).toBeHidden();

  await quitarTodos(page);
  await page.reload();
  await expect(porcentajes(page)).toHaveCount(0);
  await expect(page.locator('#indicacion-porcentajes')).toBeVisible();
});

test('SPEC-CALC-001/AC-11 datos guardados que faltan, rotos o no válidos: 40, 70 y 90', async ({ page }) => {
  for (const crudo of [null, '{roto', '[150]', '["40"]']) {
    await page.evaluate(([clave, valor]) => {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    }, [CLAVE, crudo]);
    await page.reload();
    await expect(porcentajes(page), String(crudo)).toHaveText(['40 %', '70 %', '90 %']);
    await expect(trabajo(page)).toHaveValue('');
    await expect(page.locator('#error-trabajo')).toBeHidden();
  }
});

test('SPEC-CALC-001/AC-22 volver de otra app conserva todo el estado sin recargar', async ({ page, context }) => {
  await page.getByLabel('Barra Z').check();
  await pesoBarra(page).fill('8,5');
  await trabajo(page).fill('50');
  const antes = await series(page).allTextContents();
  expect(antes).toHaveLength(3);
  await page.evaluate(() => { window.marcaSinRecarga = true; });

  // Pasar a otra pestaña y volver, y los eventos de ciclo de vida de iOS.
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
  await expect(page.getByLabel('Barra', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Barra Z')).toBeChecked();
  await expect(pesoBarra(page)).toHaveValue('8,5');
  await expect(trabajo(page)).toHaveValue('50');
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  expect(await series(page).allTextContents()).toEqual(antes);
});

test('SPEC-CALC-001/AC-32 el campo conserva exactamente lo tecleado', async ({ page }) => {
  await quitarTodos(page);
  await anadir(page, '70');

  await trabajo(page).pressSequentially('102.5');
  await expect(trabajo(page)).toHaveValue('102.5');
  await expect(series(page).locator('.redondeo')).toHaveText(
    'Redondeo: objetivo 71,75 kg, diferencia −1,75 kg',
  );

  for (const texto of [' 100 ', '100,', ',5']) {
    await trabajo(page).fill('');
    await trabajo(page).pressSequentially(texto);
    await expect(trabajo(page)).toHaveValue(texto);
    await expect(page.locator('#error-trabajo')).toBeHidden();
  }
});

test('SPEC-CALC-001/AC-30 añadir un porcentaje vacío no cambia nada ni muestra mensaje', async ({ page }) => {
  await anadir(page, '0');
  await expect(page.locator('#error-porcentaje')).toBeVisible();
  await anadir(page, '   ');
  await expect(page.locator('#error-porcentaje')).toBeHidden();
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
});
