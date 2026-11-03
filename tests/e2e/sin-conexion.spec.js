// Service worker y red (NFR-01, NFR-02). Solo en Chromium: es el único
// navegador donde Playwright ve el tráfico del service worker (ADR-0001 §3.7).
// Cada test arranca su propio servidor, que registra todo lo que llega al
// origen tal cual: método, URL, cabeceras en crudo (cookies incluidas) y cuerpo.
import { test, expect } from '@playwright/test';
import {
  trabajo, pesoBarra, barra, desplegarPaneles, discosDeSeries, anadirPorcentaje, quitarSerie,
  cargarFuentes, FUENTES_CARGADAS,
} from './pantalla.js';
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

// Valores introducidos en el recorrido de AC-13, completos, en sus formas
// codificadas y en formas cortas (el peso en céntimos u otra codificación).
// Los discos habilitados del recorrido (15, 10, 5 y 2,5 kg) se buscan como
// lista, en kg y en centésimas, y por su par menos habitual; de los
// deshabilitados (25, 20 y 1,25 kg), el de 1,25, el único con una forma
// propia que no aparece en cabeceras normales.
// Se buscan en todas las cabeceras salvo Host, Origin y Referer, que se
// comprueban aparte, y salvo user-agent y sec-ch-ua*, donde la versión del
// navegador podría contenerlos sin que haya fuga. Esas cabeceras, como todas,
// tienen que coincidir además con un valor del recorrido de referencia.
const INTRODUCIDOS = ['7,35', '7.35', '7%2C35', '487,35', '487.35', '487%2C35', '48735',
  '735', '487', '8,65', '8.65', '8%2C65', '865', 'dos-lados', 'un-punto', 'recta', 'peso-z',
  '15,10,5,2.5', '15%2C10', '1500,1000', '1500%2C1000', '%5B15', '2.5', '2%2C5',
  '1.25', '1%2C25'];
const esDeVersion = (n) => n === 'user-agent' || n.startsWith('sec-ch-ua');

// Tiempo que se sigue observando tras cerrar la página, con el contexto y el
// servidor vivos: cubre peticiones aplazadas, un fetch con keepalive al
// ocultarla y el trabajo posterior del service worker.
const MARGEN_TRAS_CERRAR_MS = 3000;

// Valores de cada cabecera vistos en el recorrido de referencia, sin datos.
function valoresDeReferencia(peticiones) {
  const valores = new Map();
  for (const { cabeceras } of peticiones) {
    for (const [nombre, valor] of cabeceras) {
      const n = nombre.toLowerCase();
      if (!valores.has(n)) valores.set(n, new Set());
      valores.get(n).add(valor);
    }
  }
  return valores;
}

// Comprueba una petición: URL de la lista cerrada y cabeceras permitidas, con
// Host, Origin y Referer iguales al propio origen, y las demás con un valor de
// la referencia y sin datos de la persona.
function comprobarPeticion(urlTexto, cabeceras, origen, referencia) {
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
      expect([...(referencia.get(n) ?? [])], `${urlTexto} ${n}`).toContain(valor);
      if (esDeVersion(n)) continue;
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
  // SPEC-CALC-003 §11 (AC-24): también las fuentes salen de la caché.
  expect(await cargarFuentes(page)).toEqual(FUENTES_CARGADAS);

  await trabajo(page).fill('100');
  await expect(series(page).locator('.porcentaje')).toHaveText(['40 %', '70 %', '90 %']);
  await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);
  await expect.poll(() => discosDeSeries(page)).toEqual(['10', '25', '25 + 10']);
  await expect(series(page).locator('.diferencia')).toHaveCount(0);
  expect(llegadas.slice(antes)).toEqual([]);
});

// Uso completo: primera carga, calcular (si `conDatos`), recargar y cerrar.
// Tras cerrar sigue observando un margen con el contexto y el servidor vivos.
async function recorrido(context, base, conDatos, sockets) {
  const page = await context.newPage();
  page.on('websocket', (ws) => sockets.push(ws.url()));
  await page.goto(base);
  await esperarServiceWorker(page);
  if (conDatos) {
    await desplegarPaneles(page);
    await barra(page, 'Recta').check();
    await pesoBarra(page).fill('7,35');
    await barra(page, 'Z').check();
    await pesoBarra(page).fill('8,65');
    await page.getByLabel('Collarines de competición').check();
    await trabajo(page).fill('487,35');
    await anadirPorcentaje(page, '47');
    await quitarSerie(page, 70);
    await page.getByLabel('Un punto').check();
    await page.getByLabel('Dos lados').check();
    // SPEC-CALC-002: deshabilitar y habilitar tipos, hasta dejar 15, 10, 5 y 2,5 kg.
    for (const nombre of ['25 kg', '20 kg', '1,25 kg', '10 kg', '10 kg']) {
      await page.getByLabel(nombre, { exact: true }).click();
    }
    await expect(page.locator('#lista-discos input:checked')).toHaveCount(4);
    await expect(series(page)).toHaveCount(3);
  }
  await page.reload();
  expect(page.url()).toBe(base);
  // ADR-0004: lo guardado vuelve tras el arranque de cero, sin salir del dispositivo.
  if (conDatos) {
    await desplegarPaneles(page);
    await expect(trabajo(page)).toHaveValue('487,35');
    await expect(page.getByLabel('Collarines de competición')).toBeChecked();
    await barra(page, 'Recta').check();
    await expect(pesoBarra(page)).toHaveValue('7,35');
    await barra(page, 'Z').check();
    await expect(pesoBarra(page)).toHaveValue('8,65');
  }
  await page.close();
  await new Promise((r) => setTimeout(r, MARGEN_TRAS_CERRAR_MS));
}

test('SPEC-CALC-001/AC-13 todas las peticiones van al propio origen y sin datos de la persona', async ({ context }) => {
  // Hace dos recorridos completos con el dibujo 3D activo (ADR-0003 §4), que en
  // la CI se pinta por software y pasa de 90 s: tiene 240 s (decisión de Víctor
  // del 2026-11-03, PR #33).
  test.setTimeout(240_000);
  const origen = new URL(servidor.base).origin;
  // Recorrido de referencia, sin datos, en otro origen (otro puerto), así que
  // con su propio service worker y su propio almacenamiento.
  const llegadasReferencia = [];
  const servidorReferencia = await arrancar((p) => llegadasReferencia.push(p));
  const origenReferencia = new URL(servidorReferencia.base).origin;

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

  // Se separa por fase, no por origen: así una petición del recorrido con datos
  // al origen de referencia también se comprueba, y falla.
  let vistasReferencia;
  let vistasConDatos;
  let llegadasReferenciaTrasRecorrido;
  try {
    await recorrido(context, servidorReferencia.base, false, sockets);
    vistasReferencia = vistas.slice();
    llegadasReferenciaTrasRecorrido = llegadasReferencia.length;
    await recorrido(context, servidor.base, true, sockets);
    vistasConDatos = vistas.slice(vistasReferencia.length);
    expect(await context.cookies()).toEqual([]);
  } finally {
    await context.close();
    await servidorReferencia.cerrar();
  }

  expect(sockets).toEqual([]);

  // La referencia solo vale si todo fue a su propio origen, y durante el
  // recorrido con datos no le llega nada.
  expect(vistasReferencia.length).toBeGreaterThan(0);
  expect(llegadasReferencia.length).toBeGreaterThan(0);
  for (const r of vistasReferencia) expect(new URL(r.url).origin, r.url).toBe(origenReferencia);
  expect(llegadasReferencia.length).toBe(llegadasReferenciaTrasRecorrido);

  // Navegador: todo al propio origen, solo GET, sin cuerpo, a la lista cerrada
  // de ficheros y con las cabeceras permitidas. Cubre también las peticiones
  // que aún no hubieran llegado al servidor al cerrar.
  const referenciaVistas = valoresDeReferencia(vistasReferencia);
  expect(vistasConDatos.length).toBeGreaterThan(0);
  for (const r of vistasConDatos) {
    expect(r.metodo, r.url).toBe('GET');
    expect(r.cuerpo, r.url).toBeNull();
    comprobarPeticion(r.url, r.cabeceras, origen, referenciaVistas);
  }
  // Las peticiones de precarga del service worker también se han visto.
  expect(vistasConDatos.some((r) => r.delServiceWorker)).toBe(true);

  // Origen: lo mismo sobre lo que llega de verdad, con las cabeceras en crudo,
  // y sin cookies.
  const referenciaLlegadas = valoresDeReferencia(llegadasReferencia.map((p) => ({ cabeceras: pares(p.cabeceras) })));
  expect(llegadas.length).toBeGreaterThan(0);
  for (const p of llegadas) {
    expect(p.metodo, p.url).toBe('GET');
    expect(p.cuerpo, p.url).toBe('');
    const cabeceras = pares(p.cabeceras);
    expect(cabeceras.map(([n]) => n.toLowerCase()), p.url).not.toContain('cookie');
    comprobarPeticion(p.url, cabeceras, origen, referenciaLlegadas);
  }
});
