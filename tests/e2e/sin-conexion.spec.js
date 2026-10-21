// Service worker y red (NFR-01, NFR-02). Solo en Chromium: es el único
// navegador donde Playwright ve el tráfico del service worker (ADR-0001 §3.7).
import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test.skip(({ browserName }) => browserName !== 'chromium', 'El tráfico del service worker solo se ve en Chromium');

const series = (page) => page.locator('#series > li');

async function esperarServiceWorker(page) {
  await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready;
    return registro.active.state;
  });
}

test('SPEC-CALC-001/AC-12 sin conexión, la app se abre y reproduce AC-01', async ({ page, context }) => {
  await page.goto('./');
  await esperarServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Series de calentamiento' })).toBeVisible();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await page.getByLabel('Peso de trabajo (kg)').fill('100');
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '70 %', '90 %']);
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);
  await expect(series(page).locator('.discos strong')).toHaveText(['10', '25', '25 + 10']);
  await expect(series(page).locator('.peso-discos')).toHaveText([
    '10 kg por lado', '25 kg por lado', '35 kg por lado',
  ]);
  await expect(series(page).locator('.redondeo')).toHaveCount(0);
});

test('SPEC-CALC-001/AC-13 todas las peticiones van al propio origen y sin datos de la persona', async ({ page, context, baseURL }) => {
  const origen = new URL(baseURL).origin;
  // Se captura todo en el momento: tras cerrar la página ya no se pueden leer las cabeceras.
  const capturas = [];
  context.on('request', (r) => {
    capturas.push(r.allHeaders().then((cabeceras) => ({
      url: r.url(),
      cuerpo: r.postData(),
      cabeceras: JSON.stringify(cabeceras),
      delServiceWorker: r.serviceWorker() !== null,
    })));
  });

  // Uso completo: primera carga, calcular, cambiar porcentajes y cerrar.
  await page.goto('./');
  await esperarServiceWorker(page);
  await page.getByLabel('Recta pequeña').check();
  await page.getByLabel('Peso de la barra (kg)').fill('7,35');
  await page.getByLabel('Peso de trabajo (kg)').fill('487,35');
  await page.getByLabel('Nuevo porcentaje').fill('47');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await page.getByRole('button', { name: 'Quitar 70 %' }).click();
  await page.getByLabel('Un punto').check();
  await page.getByLabel('Dos lados sin barra').check();
  await expect(series(page)).toHaveCount(3);
  await page.reload();
  await page.close();
  const peticiones = await Promise.all(capturas);

  const introducidos = ['7,35', '7.35', '7%2C35', '487', '487,35', '487.35', '487%2C35',
    'dos-lados', 'un-punto', 'recta'];
  expect(peticiones.length).toBeGreaterThan(0);
  for (const r of peticiones) {
    const url = new URL(r.url);
    expect(url.origin, r.url).toBe(origen);
    expect(r.cuerpo, r.url).toBeNull();
    for (const dato of introducidos) {
      expect(r.url, dato).not.toContain(dato);
      expect(r.cabeceras, `${r.url} ${dato}`).not.toContain(dato);
    }
    expect(url.search, r.url).not.toMatch(/\b47\b/);
  }
  // Las peticiones de precarga del service worker también se han comprobado.
  expect(peticiones.some((r) => r.delServiceWorker)).toBe(true);
});
