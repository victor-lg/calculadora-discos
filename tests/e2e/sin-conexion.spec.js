// Service worker y red (NFR-01, NFR-02). Solo en Chromium: es el único
// navegador donde Playwright ve el tráfico del service worker (ADR-0001 §3.7).
// Cada test arranca su propio servidor, que registra todo lo que llega al
// origen tal cual: método, URL, cabeceras en crudo (cookies incluidas) y cuerpo.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { arrancar } from './servidor.js';

test.use({ serviceWorkers: 'allow' });

test.skip(({ browserName }) => browserName !== 'chromium', 'El tráfico del service worker solo se ve en Chromium');

const series = (page) => page.locator('#series > li');

// NFR-02: las únicas peticiones son para descargar o actualizar la app, es
// decir, los ficheros que precarga el service worker y el propio sw.js.
const sw = readFileSync(new URL('../../app/sw.js', import.meta.url), 'utf8');
const RUTAS_DE_LA_APP = new Set([
  '/sw.js',
  ...[...sw.match(/const FICHEROS = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)]
    .map((m) => (m[1] === './' ? '/' : `/${m[1]}`)),
]);

// Cabeceras que ponen Chromium y WebKit en este recorrido; cualquier otra
// (por ejemplo, una inventada por la app) hace fallar AC-13.
const CABECERAS_DEL_NAVEGADOR = new Set([
  'accept', 'accept-encoding', 'accept-language', 'cache-control', 'connection', 'host',
  'origin', 'pragma', 'priority', 'referer', 'sec-ch-ua', 'sec-ch-ua-mobile',
  'sec-ch-ua-platform', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user',
  'service-worker', 'upgrade-insecure-requests', 'user-agent',
]);

// Valores introducidos en el recorrido de AC-13, completos y en sus formas
// codificadas. El puerto efímero solo aparece en Host, Origin y Referer, que se
// comprueban aparte y no se escanean. No se buscan fragmentos cortos porque
// podrían coincidir con la versión del navegador en user-agent o sec-ch-ua.
const INTRODUCIDOS = ['7,35', '7.35', '7%2C35', '487,35', '487.35', '487%2C35', '48735',
  'dos-lados', 'un-punto', 'recta'];

// Comprueba una petición: URL de la lista cerrada y cabeceras permitidas, con
// Host, Origin y Referer iguales al propio origen.
function comprobarPeticion(urlTexto, cabeceras, origen) {
  const url = new URL(urlTexto, origen);
  expect(url.origin, urlTexto).toBe(origen);
  expect(url.search, urlTexto).toBe('');
  expect(url.hash, urlTexto).toBe('');
  expect(RUTAS_DE_LA_APP.has(url.pathname), urlTexto).toBe(true);
  for (const [nombre, valor] of cabeceras) {
    const n = nombre.toLowerCase();
    expect(CABECERAS_DEL_NAVEGADOR.has(n), `${urlTexto} ${n}`).toBe(true);
    if (n === 'host') {
      expect(valor, urlTexto).toBe(new URL(origen).host);
    } else if (n === 'origin') {
      expect(valor, urlTexto).toBe(origen);
    } else if (n === 'referer') {
      const referer = new URL(valor);
      expect(referer.origin, urlTexto).toBe(origen);
      expect(referer.search + referer.hash, urlTexto).toBe('');
      expect(RUTAS_DE_LA_APP.has(referer.pathname), `${urlTexto} referer ${valor}`).toBe(true);
    } else {
      for (const dato of INTRODUCIDOS) expect(valor, `${urlTexto} ${n} ${dato}`).not.toContain(dato);
      expect(valor, `${urlTexto} ${n}`).not.toMatch(/\b47\b/);
    }
  }
}

function pares(rawHeaders) {
  const lista = [];
  for (let i = 0; i < rawHeaders.length; i += 2) lista.push([rawHeaders[i], rawHeaders[i + 1]]);
  return lista;
}

let servidor;
let llegadas;

test.beforeEach(async () => {
  llegadas = [];
  servidor = await arrancar((p) => llegadas.push(p));
});

test.afterEach(async () => {
  await servidor.cerrar();
});

async function esperarServiceWorker(page) {
  await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready;
    return registro.active.state;
  });
}

test('SPEC-CALC-001/AC-12 sin conexión, la app se abre y reproduce AC-01', async ({ context }) => {
  const primera = await context.newPage();
  await primera.goto(servidor.base);
  await esperarServiceWorker(primera);
  await primera.close();

  // Arranque de cero sin conexión: página nueva, y nada debe llegar al origen.
  await context.setOffline(true);
  const antes = llegadas.length;
  const page = await context.newPage();
  await page.goto(servidor.base);
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
  expect(llegadas.slice(antes)).toEqual([]);
});

test('SPEC-CALC-001/AC-13 todas las peticiones van al propio origen y sin datos de la persona', async ({ context }) => {
  const origen = new URL(servidor.base).origin;
  // Lo que ve el navegador: sirve para detectar peticiones a otros orígenes,
  // que nunca llegarían a nuestro servidor.
  const vistas = [];
  context.on('request', (r) => {
    vistas.push({
      url: r.url(),
      metodo: r.method(),
      cuerpo: r.postData(),
      // headers() se lee al momento; las cabeceras completas, incluidas las de
      // cookies, se comprueban en lo que llega al servidor.
      cabeceras: Object.entries(r.headers()),
      delServiceWorker: r.serviceWorker() !== null,
    });
  });
  const sockets = [];

  // Uso completo: primera carga, calcular, cambiar porcentajes y cerrar.
  const page = await context.newPage();
  page.on('websocket', (ws) => sockets.push(ws.url()));
  await page.goto(servidor.base);
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
  expect(page.url()).toBe(servidor.base);
  expect(await context.cookies()).toEqual([]);
  await page.close();
  await context.close();

  expect(sockets).toEqual([]);

  // Navegador: todo al propio origen, solo GET, sin cuerpo, a la lista cerrada
  // de ficheros y con las cabeceras permitidas. Cubre también las peticiones
  // que aún no hubieran llegado al servidor al cerrar.
  expect(vistas.length).toBeGreaterThan(0);
  for (const r of vistas) {
    expect(r.metodo, r.url).toBe('GET');
    expect(r.cuerpo, r.url).toBeNull();
    comprobarPeticion(r.url, r.cabeceras, origen);
  }
  // Las peticiones de precarga del service worker también se han visto.
  expect(vistas.some((r) => r.delServiceWorker)).toBe(true);

  // Origen: lo mismo sobre lo que llega de verdad, con las cabeceras en crudo,
  // y sin cookies.
  expect(llegadas.length).toBeGreaterThan(0);
  for (const p of llegadas) {
    expect(p.metodo, p.url).toBe('GET');
    expect(p.cuerpo, p.url).toBe('');
    const cabeceras = pares(p.cabeceras);
    expect(cabeceras.map(([n]) => n.toLowerCase()), p.url).not.toContain('cookie');
    comprobarPeticion(p.url, cabeceras, origen);
  }
});
