// Recorridos de SPEC-CALC-003: peso de trabajo, paneles Carga y Mis discos,
// avisos generales y tarjetas de las series en la vista de solo texto (FR-14);
// y SPEC-CALC-001 AC-45.
import { test, expect } from '@playwright/test';
import {
  trabajo, pesoBarra, barra, botonCarga, botonDiscos, desplegarPaneles, copiar, pegar, discosDeSeries,
} from './pantalla.js';

const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
const CLAVE_RECTA = 'calculadora-discos:v1:peso-recta';
const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];
const REVISAR_BARRA = 'Revisa el peso de la barra en Carga.';

const series = (page) => page.locator('#series > li');
const resumenCarga = (page) => page.locator('#resumen-carga');
const avisos = (page) => page.locator('#avisos > .aviso:not([hidden])');
const disco = (page, nombre) => page.getByLabel(nombre, { exact: true });
const guardado = (page, clave) => page.evaluate((c) => localStorage.getItem(c), clave);
const pesosFichas = (page) => page.locator('#lista-barras .ficha');
const tarjeta = (page, porcentaje) => series(page).filter({ has: page.locator('.porcentaje', { hasText: `${porcentaje} %` }) });

// Pliega el panel Carga sin quitar el foco del campo que lo tenga, como pasa a
// veces en iOS al tocar otro control (ADR-0005 §3).
const plegarCargaSinFoco = (page) => page.evaluate(() => document.getElementById('boton-carga').click());

// SPEC-CALC-002 FR-09: a partir de aquí, guardar falla.
const romperAlmacen = (page) => page.evaluate(() => {
  Storage.prototype.setItem = () => { throw new DOMException('Lleno', 'QuotaExceededError'); };
});

async function quitarTodos(page) {
  while (await page.getByRole('button', { name: /^Quitar / }).count()) {
    await page.getByRole('button', { name: /^Quitar / }).first().click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('SPEC-CALC-003/AC-02 el peso de trabajo: etiqueta, "kg", 6 caracteres, teclado decimal y crece con el texto', async ({ page }) => {
  const campo = trabajo(page);
  await expect(campo).toHaveValue('100');
  await expect(page.locator('.peso-campo .unidad')).toHaveText('kg');
  await expect(campo).toHaveAttribute('inputmode', 'decimal');

  const ancho = async () => (await campo.boundingBox()).width;
  const antes = await ancho();
  await campo.fill('');
  await campo.pressSequentially('102,55');
  await expect(campo).toHaveValue('102,55');
  expect(await ancho()).toBeGreaterThan(antes);
  // El texto entero cabe en el campo, sin desplazarse ni recortarse (WebKit
  // suma 1 px de cursor a scrollWidth).
  expect(await campo.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  await campo.pressSequentially('7');
  await expect(campo).toHaveValue('102,55');
  await campo.fill('');
  await campo.pressSequentially('1234567');
  await expect(campo).toHaveValue('123456');

  await copiar(page, '100,125');
  await pegar(page, campo);
  await expect(campo).toHaveValue('100,125');
  await expect(avisos(page)).toHaveText(['El peso de trabajo admite como máximo dos decimales.']);
  await expect(series(page)).toHaveCount(0);
  expect(await campo.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test('SPEC-CALC-003/AC-03 el panel Carga: resumen, modos, fichas, collarines y peso de la barra', async ({ page }) => {
  await expect(resumenCarga(page)).toHaveText('Barra · Olímpica 20 kg');
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#panel-carga')).toBeHidden();

  await botonCarga(page).click();
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#modos .segmento')).toHaveText(['Barra', 'Dos lados', 'Un punto']);
  await expect(page.getByRole('radio', { name: 'Barra', exact: true })).toBeChecked();
  await expect(pesosFichas(page)).toHaveText(['Olímpica 20 kg', 'Olímpica 15 kg', 'Recta 10 kg', 'Z 10 kg']);
  await expect(barra(page, 'Olímpica 20 kg')).toBeChecked();
  // Cada ficha con su miniatura; la elegida y el modo elegido, con el acento.
  await expect(pesosFichas(page).locator('svg')).toHaveCount(4);
  const acento = /rgb\(255, 138, 42\)/;
  await expect(pesosFichas(page).first()).toHaveCSS('box-shadow', acento);
  await expect(pesosFichas(page).nth(1)).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('#modos .segmento').first()).toHaveCSS('box-shadow', acento);
  await expect(page.locator('#modos .segmento').nth(1)).toHaveCSS('box-shadow', 'none');
  const collarines = page.getByRole('switch', { name: 'Collarines de competición' });
  await expect(collarines).not.toBeChecked();
  await expect(collarines).toHaveAccessibleDescription('2,5 kg cada uno; suman 5 kg en las series con discos');

  await collarines.check();
  await expect(resumenCarga(page)).toHaveText('Barra · Olímpica 20 kg · collarines');

  await barra(page, 'Z').check();
  await expect(pesoBarra(page)).toHaveValue('10');
  await expect(pesoBarra(page)).toHaveAttribute('inputmode', 'decimal');
  await pesoBarra(page).fill('0,5');
  await expect(page.locator('#error-barra')).toHaveText(
    'Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo.',
  );
  await expect(resumenCarga(page)).toHaveText('Barra · Z 10 kg · collarines');
  // A la vez, el mensaje bajo el campo y el aviso general.
  await expect(avisos(page)).toHaveText([REVISAR_BARRA]);

  await pesoBarra(page).fill('8,5');
  await expect(pesoBarra(page)).toBeFocused();
  await expect(resumenCarga(page)).toHaveText('Barra · Z 8,5 kg · collarines');
  await expect(pesosFichas(page)).toHaveText(['Olímpica 20 kg', 'Olímpica 15 kg', 'Recta 10 kg', 'Z 8,5 kg']);
  await pesoBarra(page).fill('');
  await expect(resumenCarga(page)).toHaveText('Barra · Z 10 kg · collarines');
  await expect(pesosFichas(page).last()).toHaveText('Z 10 kg');

  await page.getByRole('radio', { name: 'Dos lados' }).check();
  await expect(page.locator('#lista-barras')).toBeHidden();
  await expect(collarines).toBeHidden();
  await expect(pesoBarra(page)).toBeHidden();
  await expect(page.locator('#nota-maquina')).toHaveText('Los discos se cargan en el cuerno de la máquina.');
  await expect(resumenCarga(page)).toHaveText('Dos lados · máquina');
  await page.getByRole('radio', { name: 'Un punto' }).check();
  await expect(resumenCarga(page)).toHaveText('Un punto · máquina');

  await botonCarga(page).click();
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'false');
  await botonDiscos(page).click();
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'true');
});

test('SPEC-CALC-003/AC-04 el panel Mis discos: puntos, "N de 7", su anuncio y los tipos deshabilitados', async ({ page }) => {
  const puntos = page.locator('#puntos-discos i');
  await expect(puntos).toHaveCount(7);
  await expect(page.locator('#puntos-discos i.apagado')).toHaveCount(0);
  await expect(page.locator('#cuenta-discos')).toBeHidden();
  await expect(botonDiscos(page)).toHaveAccessibleName('Mis discos: 7 de 7 habilitados');
  await expect(page.locator('#panel-discos')).toBeHidden();

  await botonDiscos(page).click();
  await expect(page.locator('#lista-discos label')).toHaveText(NOMBRES);
  for (const nombre of ['25 kg', '1,25 kg']) {
    await disco(page, nombre).click();
    await expect(disco(page, nombre)).not.toBeChecked();
    const peso = page.locator('.disco', { has: disco(page, nombre) }).locator('.peso-disco');
    await expect(peso).toHaveCSS('text-decoration-line', 'line-through');
    // Y su dibujo, en gris.
    const dibujo = page.locator('.disco', { has: disco(page, nombre) }).locator('.dibujo-disco');
    await expect(dibujo).toHaveCSS('filter', 'grayscale(1)');
  }
  await expect(disco(page, '20 kg')).toBeChecked();
  await expect(page.locator('.disco', { has: disco(page, '20 kg') }).locator('.peso-disco'))
    .toHaveCSS('text-decoration-line', 'none');
  await expect(page.locator('#puntos-discos i.apagado')).toHaveCount(2);
  await expect(page.locator('#puntos-discos i[data-cent="2500"]')).toHaveClass(/apagado/);
  await expect(page.locator('#puntos-discos i[data-cent="125"]')).toHaveClass(/apagado/);
  await expect(page.locator('#cuenta-discos')).toHaveText('5 de 7');
  await expect(botonDiscos(page)).toHaveAccessibleName('Mis discos: 5 de 7 habilitados');

  for (const nombre of ['20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg']) await disco(page, nombre).click();
  await expect(page.locator('#cuenta-discos')).toHaveText('0 de 7');
});

test('SPEC-CALC-003/AC-05 los avisos generales: región anunciada y su orden', async ({ page }) => {
  await expect(page.locator('#avisos')).toHaveAttribute('aria-live', 'polite');
  // Sin avisos, la región no se quita del árbol de accesibilidad: así se
  // anuncia el primero que aparezca.
  await expect(avisos(page)).toHaveCount(0);
  await expect(page.locator('#avisos')).not.toHaveCSS('display', 'none');
  await desplegarPaneles(page);

  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await quitarTodos(page);
  await trabajo(page).fill('');
  await expect(avisos(page)).toHaveText([
    'Escribe el peso de trabajo.',
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
  ]);

  // Z con 0,5, lista vacía, sin tipos y el aviso de fallo al guardar: el 50
  // se guarda y, al quitarlo, la lista vacía ya no se puede guardar.
  await trabajo(page).fill('100');
  await trabajo(page).blur();
  await page.getByLabel('Nuevo porcentaje').fill('50');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await romperAlmacen(page);
  await page.getByRole('button', { name: 'Quitar 50 %' }).click();
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await expect(avisos(page)).toHaveText([
    REVISAR_BARRA,
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
    'No se ha podido guardar: se mantendrá hasta cerrar la app',
  ]);
});

test('SPEC-CALC-003/AC-05 sin tipos y peso inferior a la barra: los dos avisos, en su orden', async ({ page }) => {
  await desplegarPaneles(page);
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await trabajo(page).fill('15');
  await expect(avisos(page)).toHaveText([
    'Habilita al menos un disco en Mis discos.',
    'El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.',
  ]);
});

test('SPEC-CALC-003/AC-25 con el panel plegado, el aviso general dice que hay que revisar la barra', async ({ page }) => {
  await botonCarga(page).click();
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await botonCarga(page).click();
  await expect(page.locator('#panel-carga')).toBeHidden();
  await expect(series(page)).toHaveCount(0);
  await expect(avisos(page)).toHaveText([REVISAR_BARRA]);

  await botonCarga(page).click();
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await pesoBarra(page).fill('8,5');
  await expect(avisos(page)).toHaveCount(0);
  await expect(series(page)).toHaveCount(3);
});

test('SPEC-CALC-001/AC-45 plegar Carga con el foco en el peso de trabajo lo guarda', async ({ page }) => {
  await botonCarga(page).click();
  await trabajo(page).fill('110');
  await plegarCargaSinFoco(page);
  await expect(trabajo(page)).toBeFocused();
  await expect(page.locator('#panel-carga')).toBeHidden();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"110"');
});

test('SPEC-CALC-001/AC-45 plegar Carga termina la edición de la barra sin descartar el texto', async ({ page }) => {
  await botonCarga(page).click();
  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();
  expect(await guardado(page, CLAVE_RECTA)).toBe('7.5');

  await pesoBarra(page).fill('0,5');
  await plegarCargaSinFoco(page);
  await expect(page.locator('#panel-carga')).toBeHidden();
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await expect(avisos(page)).toHaveText([REVISAR_BARRA]);
  await expect(resumenCarga(page)).toHaveText('Barra · Recta 7,5 kg');
  expect(await guardado(page, CLAVE_RECTA)).toBe('7.5');

  await botonCarga(page).click();
  await barra(page, 'Z').check();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');

  // Ahora con un toque de verdad en el botón, que quita el foco al campo.
  await pesoBarra(page).fill('8');
  await botonCarga(page).click();
  await expect(resumenCarga(page)).toHaveText('Barra · Recta 8 kg');
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
  await botonCarga(page).click();
  await expect(pesosFichas(page).nth(2)).toHaveText('Recta 8 kg');
});

test('SPEC-CALC-001/AC-45 con la recta en 8 sin salir del campo, plegar la deja guardada en 8 kg', async ({ page }) => {
  await botonCarga(page).click();
  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();
  await pesoBarra(page).fill('8');
  await plegarCargaSinFoco(page);
  await expect(resumenCarga(page)).toHaveText('Barra · Recta 8 kg');
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
});

// NFR-01 y NFR-02 de lo que añade este PR. Las pruebas de toda la pantalla
// (AC-20 a AC-22) van en el último PR de VIC-11.
test('SPEC-CALC-003 NFR-01 los controles de arriba miden al menos 44 × 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  const controles = page.locator([
    '#trabajo', '#boton-carga', '#boton-discos', '.segmento', '.ficha', '#collarines', '#peso-barra', '.disco',
  ].join(', '));
  const n = await controles.count();
  expect(n).toBe(1 + 2 + 3 + 4 + 1 + 1 + 7);
  for (let i = 0; i < n; i++) {
    const caja = await controles.nth(i).boundingBox();
    const quien = await controles.nth(i).evaluate((el) => el.id || el.textContent);
    expect(caja.width, quien).toBeGreaterThanOrEqual(44);
    expect(caja.height, quien).toBeGreaterThanOrEqual(44);
  }
});

test('SPEC-CALC-003 NFR-01 el toque en cualquier punto de un modo, una ficha o un disco llega a su control', async ({ page }) => {
  await desplegarPaneles(page);
  // Un tipo deshabilitado tiene el dibujo con opacidad y filtro.
  await disco(page, '25 kg').click();
  const tapados = await page.evaluate(() => {
    const tapados = [];
    for (const input of document.querySelectorAll('.segmento input, .ficha input, .disco input')) {
      const r = input.getBoundingClientRect();
      for (const fy of [0.15, 0.35, 0.5, 0.85]) {
        const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * fy);
        if (e !== input) tapados.push(`${input.value} a ${fy}: ${e.tagName}`);
      }
    }
    return tapados;
  });
  expect(tapados).toEqual([]);
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).toBeChecked();
});

test('SPEC-CALC-003 NFR-02 contraste de los textos, bordes de campo, interruptor y foco de arriba', async ({ page }) => {
  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await disco(page, '25 kg').click();
  await trabajo(page).focus();

  const fallos = await page.evaluate(() => {
    const rgb = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => {
      const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contraste = (a, b) => {
      const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const fondo = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (rgb(c)[3] !== 0) return c;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const fallos = [];
    const zona = ['.peso', '.plegable', '#avisos'].flatMap((s) => [...document.querySelectorAll(s)]);
    for (const raiz of zona) {
      for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
        const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!propio || !visible(el)) continue;
        const s = getComputedStyle(el);
        const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
        const r = contraste(s.color, fondo(el));
        if (r < (grande ? 3 : 4.5)) fallos.push(`${el.textContent.trim()}: ${r.toFixed(2)}`);
      }
    }
    const borde = (el, lado, pseudo) => {
      const s = getComputedStyle(el, pseudo);
      return contraste(s[`border${lado}Color`], fondo(el.parentElement));
    };
    const peso = document.querySelector('.peso-campo');
    const barraInput = document.getElementById('peso-barra');
    const interruptor = document.getElementById('collarines');
    const noTexto = {
      'línea del peso con el foco': borde(peso, 'Bottom'),
      'borde del peso de la barra (con error)': borde(barraInput, 'Top'),
      'pista del interruptor': borde(interruptor, 'Top', '::before'),
      'foco (acento)': contraste(getComputedStyle(document.documentElement).getPropertyValue('--acento').trim()
        .replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`),
      getComputedStyle(document.querySelector('.plegable')).backgroundColor),
    };
    for (const [nombre, r] of Object.entries(noTexto)) if (r < 3) fallos.push(`${nombre}: ${r.toFixed(2)}`);
    return fallos;
  });
  expect(fallos).toEqual([]);
});

test('SPEC-CALC-003/AC-06 la tarjeta del 70 % con 105 kg y su marca de diferencia', async ({ page }) => {
  await trabajo(page).fill('105');
  const t = tarjeta(page, 70);
  await expect(t.locator('.porcentaje')).toHaveText('70 %');
  await expect(t.locator('.total')).toHaveText('72,5 kg');
  await expect(t.locator('.etiqueta')).toHaveText('Por lado');
  await expect.poll(async () => (await discosDeSeries(page))[1]).toBe('25 + 1,25');
  // Cada disco con su punto de color, que es el de su tipo.
  const puntos = t.locator('.discos .punto');
  await expect(puntos).toHaveCount(2);
  const colores = await puntos.evaluateAll((ps) => ps.map((p) => getComputedStyle(p).backgroundColor));
  expect(colores).toEqual(['rgb(200, 16, 46)', 'rgb(195, 200, 207)']);

  const marca = t.getByRole('button', { name: '1 kg menos que el objetivo. Ver detalle' });
  await expect(marca).toHaveText('−1 kg');
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  const detalle = t.locator('.detalle');
  await expect(detalle).toBeHidden();
  const plegada = (await t.boundingBox()).height;

  await marca.click();
  await expect(marca).toHaveAttribute('aria-expanded', 'true');
  await expect(detalle).toHaveText(
    'El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.',
  );
  // Dentro de la tarjeta, que crece para contenerla.
  const caja = await t.boundingBox();
  const cajaDetalle = await detalle.boundingBox();
  expect(caja.height).toBeGreaterThan(plegada);
  expect(cajaDetalle.y).toBeGreaterThanOrEqual(caja.y);
  expect(cajaDetalle.y + cajaDetalle.height).toBeLessThanOrEqual(caja.y + caja.height);
  // La marca toma el color de acento.
  const fondoMarca = await marca.locator('.pastilla').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fondoMarca).toBe('rgb(255, 138, 42)');

  await marca.click();
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  await expect(detalle).toBeHidden();
});

test('SPEC-CALC-003/AC-06 la explicación desplegada sigue abierta al repintar las tarjetas', async ({ page }) => {
  await trabajo(page).fill('105');
  await tarjeta(page, 70).locator('.diferencia').click();
  await page.getByRole('button', { name: 'Quitar 40 %' }).click();
  await expect(tarjeta(page, 70).locator('.diferencia')).toHaveAttribute('aria-expanded', 'true');
  await expect(tarjeta(page, 70).locator('.detalle')).toBeVisible();
  // Una tarjeta que se queda sin diferencia vuelve plegada.
  await trabajo(page).fill('100');
  await trabajo(page).fill('105');
  await expect(tarjeta(page, 70).locator('.diferencia')).toHaveAttribute('aria-expanded', 'false');
});

test('SPEC-CALC-003/AC-07 "Solo la barra", "×n" con su anuncio y el collarín', async ({ page }) => {
  await trabajo(page).fill('40');
  const t40 = tarjeta(page, 40);
  await expect(t40.locator('.linea')).toHaveText('Solo la barra');
  await expect(t40.locator('.total')).toHaveText('20 kg');
  await expect(t40.locator('.explicacion')).toHaveText('El 40 % son 16 kg, menos que la barra (20 kg).');
  await expect(t40.locator('.explicacion')).toBeVisible();
  await expect(t40.locator('.diferencia')).toHaveCount(0);
  await expect(t40).not.toContainText('Por lado');

  await page.getByLabel('Nuevo porcentaje').fill('100');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await trabajo(page).fill('120');
  const t100 = tarjeta(page, 100);
  await expect(t100.locator('.disco-serie')).toHaveText('25×2');
  // Se ve "25" con "×2" y se anuncia "2 discos de 25 kg".
  await expect(t100.locator('.discos > li .oculto')).toHaveText('2 discos de 25 kg');
  await expect(t100.locator('.disco-serie')).toHaveAttribute('aria-hidden', 'true');
  const anunciado = await t100.locator('.discos').ariaSnapshot();
  expect(anunciado).toContain('2 discos de 25 kg');
  expect(anunciado).not.toContain('×2');

  await trabajo(page).fill('100');
  await desplegarPaneles(page);
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await expect(tarjeta(page, 70).locator('.collarin')).toHaveText('+ collarín de 2,5 kg');
});

test('SPEC-CALC-003 NFR-01 las marcas de diferencia miden al menos 44 × 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await trabajo(page).fill('105');
  const marcas = page.locator('.diferencia');
  const n = await marcas.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const caja = await marcas.nth(i).boundingBox();
    expect(caja.width).toBeGreaterThanOrEqual(44);
    expect(caja.height).toBeGreaterThanOrEqual(44);
  }
});

// Mide el contraste de cada texto visible de las tarjetas frente a su fondo,
// con el mismo cálculo que el test de contraste de arriba. AC-21 (PR 4 de
// VIC-11) medirá la pantalla entera.
const contrasteTarjetas = (page) => page.evaluate(() => {
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => {
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contraste = (a, b) => {
    const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const fondo = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (rgb(c)[3] !== 0) return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    && !el.closest('.oculto');
  const fallos = [];
  let medidos = 0;
  for (const el of document.querySelectorAll('#series *')) {
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!propio || !visible(el)) continue;
    const s = getComputedStyle(el);
    const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    const r = contraste(s.color, fondo(el));
    medidos++;
    if (r < (grande ? 3 : 4.5)) fallos.push(`${el.textContent.trim()}: ${r.toFixed(2)}`);
  }
  return { fallos, medidos };
});

test('SPEC-CALC-003 NFR-02 contraste de las tarjetas: marca plegada y desplegada, explicación, collarín y "Solo la barra"', async ({ page }) => {
  await desplegarPaneles(page);
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await trabajo(page).fill('105');
  // El 70 % con la marca desplegada y el 90 % con la suya plegada.
  await tarjeta(page, 70).locator('.diferencia').click();
  await expect(tarjeta(page, 70).locator('.detalle')).toBeVisible();
  await expect(tarjeta(page, 90).locator('.diferencia')).toHaveAttribute('aria-expanded', 'false');
  await expect(series(page).locator('.collarin')).not.toHaveCount(0);
  let r = await contrasteTarjetas(page);
  expect(r.fallos).toEqual([]);
  expect(r.medidos).toBeGreaterThan(10);

  await trabajo(page).fill('40');
  await expect(tarjeta(page, 40).locator('.linea')).toHaveText('Solo la barra');
  r = await contrasteTarjetas(page);
  expect(r.fallos).toEqual([]);
});
