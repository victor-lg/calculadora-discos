// Recorridos de la interfaz que necesitan un navegador real.
import { test, expect } from '@playwright/test';

const CLAVE = 'calculadora-discos:v1:porcentajes';
const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
const CLAVE_RECTA = 'calculadora-discos:v1:peso-recta';
const CLAVE_Z = 'calculadora-discos:v1:peso-z';
const CLAVE_COLLARINES = 'calculadora-discos:v1:collarines';

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

const barra = (page, nombre) => page.getByLabel(nombre, { exact: true });

test('SPEC-CALC-001/AC-04 las olímpicas de 20 y 15 kg no permiten cambiar su peso', async ({ page }) => {
  const radios = page.locator('input[name="barra"]');
  await expect(radios).toHaveCount(4);
  await expect(page.locator('#lista-barras label.opcion')).toHaveText([
    'Olímpica 20 kg', 'Olímpica 15 kg', 'Recta', 'Z',
  ]);
  for (const [nombre, fijo] of [['Olímpica 20 kg', '20 kg'], ['Olímpica 15 kg', '15 kg']]) {
    await barra(page, nombre).check();
    await expect(pesoBarra(page)).toBeHidden();
    await expect(page.locator('#peso-barra-fijo')).toHaveText(`Peso de la barra: ${fijo}`);
  }
  for (const nombre of ['Recta', 'Z']) {
    await barra(page, nombre).check();
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
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '50 %', '70 %', '90 %']);

  await page.getByRole('button', { name: 'Quitar 70 %' }).click();
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '50 %', '90 %']);

  await barra(page, 'Olímpica 15 kg').check();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '52,5 kg', '92,5 kg']);
  await expect(series(page).locator('.discos strong')).toHaveText(['10 + 2,5', '15 + 2,5 + 1,25', '25 + 10 + 2,5 + 1,25']);

  await page.getByLabel('Collarines de competición').check();
  await expect(series(page).locator('.discos strong')).toHaveText(['10', '15 + 1,25', '25 + 10 + 1,25']);
  await expect(series(page).locator('.collarin')).toHaveCount(3);

  await page.getByLabel('Collarines de competición').uncheck();
  await expect(series(page).locator('.collarin')).toHaveCount(0);
  await barra(page, 'Recta').check();
  await expect(series(page).locator('.discos strong')).toHaveText(['15', '20 + 1,25', '25 + 15 + 1,25']);

  await pesoBarra(page).fill('12,5');
  await expect(series(page).locator('.discos strong')).toHaveText(['10 + 2,5 + 1,25', '20', '25 + 15']);

  await page.getByLabel('Un punto').check();
  await expect(series(page).locator('.total')).toHaveText(['41,25 kg', '52,5 kg', '93,75 kg']);

  await page.getByLabel('Dos lados sin barra').check();
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '52,5 kg', '92,5 kg']);
});

test('SPEC-CALC-001/AC-11 al arrancar de cero se recupera lo guardado, y el modo y la barra no', async ({ page }) => {
  // La primera vez: 40/70/90, "100" con las series de AC-01, Barra, 20 kg, sin collarines y recta y Z de 10 kg.
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(trabajo(page)).toHaveValue('100');
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);
  await expect(series(page).locator('.discos strong')).toHaveText(['10', '25', '25 + 10']);
  await expect(page.getByLabel('Barra', { exact: true })).toBeChecked();
  await expect(barra(page, 'Olímpica 20 kg')).toBeChecked();
  await expect(page.getByLabel('Collarines de competición')).not.toBeChecked();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('10');
  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('10');

  await quitarTodos(page);
  await anadir(page, '50');
  await anadir(page, '75');
  await trabajo(page).fill('102,5');
  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('8,5');
  await page.getByLabel('Collarines de competición').check();
  await page.getByLabel('Dos lados sin barra').check();
  await page.reload();

  await expect(porcentajes(page)).toHaveText(['50 %', '75 %']);
  await expect(trabajo(page)).toHaveValue('102,5');
  await expect(page.getByLabel('Barra', { exact: true })).toBeChecked();
  await expect(barra(page, 'Olímpica 20 kg')).toBeChecked();
  await expect(page.getByLabel('Collarines de competición')).toBeChecked();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('8,5');
  await expect(page.locator('#aviso-guardado')).toBeHidden();

  await quitarTodos(page);
  await page.reload();
  await expect(porcentajes(page)).toHaveCount(0);
  await expect(page.locator('#indicacion-porcentajes')).toBeVisible();
});

test('SPEC-CALC-001/AC-33 datos guardados que faltan, rotos o no válidos: cada uno por separado', async ({ page }) => {
  const guardar = (datos) => page.evaluate((d) => {
    localStorage.clear();
    for (const [clave, valor] of Object.entries(d)) localStorage.setItem(clave, valor);
  }, datos);

  for (const crudo of [null, '{roto', '[150]', '[40.5]', '["40"]']) {
    await guardar(crudo === null ? {} : { [CLAVE]: crudo });
    await page.reload();
    await expect(porcentajes(page), String(crudo)).toHaveText(['40 %', '70 %', '90 %']);
    await expect(trabajo(page)).toHaveValue('100');
    await expect(page.locator('#error-trabajo')).toBeHidden();
  }

  await guardar({ [CLAVE]: '[90,40,40]' });
  await page.reload();
  await expect(porcentajes(page)).toHaveText(['40 %', '90 %']);

  for (const crudo of ['"abc"', '"600"', '{roto']) {
    await guardar({ [CLAVE_TRABAJO]: crudo });
    await page.reload();
    await expect(trabajo(page), crudo).toHaveValue('100');
  }

  await guardar({ [CLAVE_RECTA]: '60', [CLAVE_Z]: '8.5', [CLAVE_COLLARINES]: '{roto' });
  await page.reload();
  await expect(page.getByLabel('Collarines de competición')).not.toBeChecked();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('10');
  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('8,5');

  await guardar({ [CLAVE]: '{roto', [CLAVE_TRABAJO]: '"102,5"', [CLAVE_COLLARINES]: 'true' });
  await page.reload();
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(trabajo(page)).toHaveValue('102,5');
  await expect(page.getByLabel('Collarines de competición')).toBeChecked();
});

// FR-11: la app pasa a segundo plano y vuelve, con el foco donde estuviera.
async function segundoPlano(page) {
  await page.evaluate(() => {
    for (const estado of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    delete document.visibilityState;
  });
}

// "Cierra la app y la vuelve a abrir" (SPEC-CALC-001 §5): pasa antes a
// segundo plano, y vuelve en un arranque de cero.
async function cerrarYAbrir(page) {
  await segundoPlano(page);
  await page.reload();
}

const guardado = (page, clave) => page.evaluate((c) => localStorage.getItem(c), clave);

// Elige una barra o un modo sin quitar el foco del campo, como pasa a veces en
// iOS al tocar otro control (ADR-0005 §3).
const elegirSinFoco = (page, nombre, valor) => page.evaluate(([n, v]) => {
  const radio = document.querySelector(`input[name="${n}"][value="${v}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change'));
}, [nombre, valor]);

test('SPEC-CALC-001/AC-34 solo se guarda un peso válido, al terminar de editarlo', async ({ page }) => {
  await trabajo(page).fill('105');
  await trabajo(page).blur();
  await trabajo(page).fill('');
  await trabajo(page).blur();
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('105');

  await trabajo(page).fill('100,12');
  await trabajo(page).blur();
  await trabajo(page).fill('100,123');
  await trabajo(page).blur();
  await expect(trabajo(page)).toHaveValue('100,123');
  await expect(page.locator('#error-trabajo')).toHaveText('El peso de trabajo admite como máximo dos decimales.');
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('100,12');

  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();
  await pesoBarra(page).fill('0,5');
  await pesoBarra(page).blur();
  await cerrarYAbrir(page);
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
});

test('SPEC-CALC-001/AC-42 borrar tecla a tecla no guarda los pasos intermedios', async ({ page }) => {
  await trabajo(page).fill('105');
  await trabajo(page).blur();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"105"');
  await trabajo(page).focus();
  await trabajo(page).press('End');
  for (let i = 0; i < 3; i++) {
    await trabajo(page).press('Backspace');
    expect(await guardado(page, CLAVE_TRABAJO)).toBe('"105"');
  }
  await expect(trabajo(page)).toHaveValue('');
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('105');

  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();
  await pesoBarra(page).focus();
  await pesoBarra(page).press('End');
  for (let i = 0; i < 3; i++) await pesoBarra(page).press('Backspace');
  await expect(pesoBarra(page)).toHaveValue('');
  expect(await guardado(page, CLAVE_RECTA)).toBe('7.5');
  await cerrarYAbrir(page);
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
});

test('SPEC-CALC-001/AC-43 pasar a segundo plano termina la edición sin cambiar el campo', async ({ page }) => {
  await trabajo(page).fill('105');
  expect(await guardado(page, CLAVE_TRABAJO)).toBeNull();
  await segundoPlano(page);
  await expect(trabajo(page)).toBeFocused();
  await expect(trabajo(page)).toHaveValue('105');
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"105"');

  // Vuelve con el foco en el campo, sigue escribiendo y sale.
  await trabajo(page).fill('108');
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"105"');
  await trabajo(page).blur();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"108"');

  await trabajo(page).fill('');
  await segundoPlano(page);
  await expect(trabajo(page)).toHaveValue('');
  await expect(page.locator('#indicacion-trabajo')).toHaveText('Escribe el peso de trabajo.');
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('108');

  // A mitad de borrado, se guarda el valor válido de ese momento.
  await trabajo(page).fill('1');
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('1');

  await trabajo(page).fill('100,12');
  await trabajo(page).blur();
  await trabajo(page).focus();
  await trabajo(page).fill('100,123');
  await cerrarYAbrir(page);
  await expect(trabajo(page)).toHaveValue('100,12');

  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('8');
  await segundoPlano(page);
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
  await pesoBarra(page).fill('0,5');
  await segundoPlano(page);
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await expect(page.locator('#error-barra')).toBeVisible();
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
});

test('SPEC-CALC-001/AC-43 pagehide también termina la edición', async ({ page }) => {
  await trabajo(page).fill('105');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"105"');
});

test('SPEC-CALC-001/AC-44 cambiar de barra o de modo termina la edición aunque el campo conserve el foco', async ({ page }) => {
  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();

  await pesoBarra(page).fill('8');
  await elegirSinFoco(page, 'barra', 'z');
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('8');

  await pesoBarra(page).fill('9');
  await elegirSinFoco(page, 'modo', 'dos-lados');
  expect(await guardado(page, CLAVE_RECTA)).toBe('9');
  await page.getByLabel('Barra', { exact: true }).check();
  await expect(pesoBarra(page)).toHaveValue('9');

  // Vaciar sin salir y elegir la Z: al volver, el confirmado.
  await pesoBarra(page).fill('9,');
  await pesoBarra(page).fill('');
  await elegirSinFoco(page, 'barra', 'z');
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('9');
  await expect(page.locator('#error-barra')).toBeHidden();

  await pesoBarra(page).fill('7,');
  await elegirSinFoco(page, 'barra', 'z');
  expect(await guardado(page, CLAVE_RECTA)).toBe('7');
  await cerrarYAbrir(page);
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7');

  // Tocar la ficha ya elegida no descarta el texto.
  await pesoBarra(page).fill('0,5');
  await barra(page, 'Recta').click();
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await expect(page.locator('#error-barra')).toBeVisible();
});

test('SPEC-CALC-001/AC-44 con el foco en el peso de trabajo, el modo y la barra terminan su edición; los collarines no', async ({ page }) => {
  await trabajo(page).fill('110');
  await elegirSinFoco(page, 'modo', 'dos-lados');
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"110"');

  await trabajo(page).fill('111');
  await elegirSinFoco(page, 'barra', '15');
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"111"');

  await trabajo(page).fill('');
  await elegirSinFoco(page, 'modo', 'barra');
  await expect(trabajo(page)).toHaveValue('');
  await expect(page.locator('#indicacion-trabajo')).toHaveText('Escribe el peso de trabajo.');
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"111"');

  // Los demás controles no terminan la edición si el campo conserva el foco.
  await trabajo(page).fill('112');
  await page.evaluate(() => {
    const c = document.getElementById('collarines');
    c.checked = true;
    c.dispatchEvent(new Event('change'));
  });
  await expect(trabajo(page)).toBeFocused();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"111"');
  await trabajo(page).blur();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"112"');
});

test('SPEC-CALC-001/AC-22 volver de otra app conserva todo el estado sin recargar', async ({ page, context }) => {
  await barra(page, 'Z').check();
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
  await expect(barra(page, 'Z')).toBeChecked();
  await expect(pesoBarra(page)).toHaveValue('8,5');
  await expect(trabajo(page)).toHaveValue('50');
  await expect(porcentajes(page)).toHaveText(['40 %', '70 %', '90 %']);
  expect(await series(page).allTextContents()).toEqual(antes);
});

test('SPEC-CALC-001/AC-32 el campo conserva exactamente lo tecleado', async ({ page }) => {
  await quitarTodos(page);
  await anadir(page, '70');

  // La primera vez el campo trae "100" (FR-11): se vacía antes de teclear.
  await trabajo(page).fill('');
  await trabajo(page).pressSequentially('102.5');
  await expect(trabajo(page)).toHaveValue('102.5');
  await expect(series(page).locator('.diferencia summary')).toHaveText('−1,75 kg');
  await series(page).locator('.diferencia summary').click();
  await expect(series(page).locator('.diferencia p')).toHaveText(
    'El 70 % de 102,5 kg son 71,75 kg. Con tus discos, lo más cercano sin pasarte es 70 kg: 1,75 kg menos.',
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

test('SPEC-CALC-001/AC-40 al volver a una barra, el campo muestra su último peso válido', async ({ page }) => {
  await trabajo(page).fill('100');
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('10');
  await pesoBarra(page).fill('7,50');
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('8.5');
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('8,5');

  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('0,5');
  await expect(page.locator('#error-barra')).toHaveText(
    'Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo.',
  );
  await expect(series(page)).toHaveCount(0);
  await barra(page, 'Z').check();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await expect(page.locator('#error-barra')).toBeHidden();

  await pesoBarra(page).fill('0,5');
  await page.getByLabel('Dos lados sin barra').check();
  await page.getByLabel('Barra', { exact: true }).check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await expect(page.locator('#error-barra')).toBeHidden();
  await expect(series(page)).toHaveCount(3);

  // Al arrancar de cero, cada barra muestra su último peso válido guardado.
  await page.reload();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('8,5');
});

test('SPEC-CALC-001/AC-02 la marca "−1 kg" va junto al porcentaje y abre la explicación', async ({ page }) => {
  await quitarTodos(page);
  await anadir(page, '70');
  await trabajo(page).fill('105');
  const cabecera = series(page).locator('.cabecera');
  await expect(cabecera.locator('.porcentaje + .diferencia summary')).toHaveText('−1 kg');
  await expect(series(page).locator('.diferencia p')).toBeHidden();
  await cabecera.locator('.diferencia summary').click();
  await expect(series(page).locator('.diferencia p')).toHaveText(
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
});

test('SPEC-CALC-001/AC-35 SPEC-CALC-001/AC-39 discos agrupados y aviso de capacidad en pantalla', async ({ page }) => {
  await quitarTodos(page);
  await anadir(page, '100');
  await trabajo(page).fill('120');
  await expect(series(page).locator('.discos')).toHaveText('Por lado: 25 ×2');
  await expect(series(page)).not.toContainText('kg por lado');
  await expect(series(page).locator('.capacidad')).toHaveCount(0);

  await trabajo(page).fill('500');
  await page.getByLabel('Un punto').check();
  await expect(series(page).locator('.discos')).toHaveText('Total en discos: 25 ×20');
  await expect(series(page).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm.');
});
