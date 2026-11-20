// Recorridos de SPEC-CALC-003: peso de trabajo, paneles Carga y Mis discos,
// avisos generales y tarjetas de las series en la vista de solo texto (FR-14);
// y SPEC-CALC-001 AC-45.
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, pesoBarra, barra, botonCarga, botonDiscos, desplegarPaneles, copiar, pegar,
  porcentajesDeSeries, anadirPorcentaje, botonQuitar, quitarSerie, quitarTodas, deslizar, series,
  tarjeta, disco, abrirSinDatos,
} from './pantalla.js';
import { analizarConAxe } from './axe.js';
import { instalarContraste } from './contraste.js';

const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
const CLAVE_RECTA = 'calculadora-discos:v1:peso-recta';
const NOMBRES = ['25 kg', '20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg', '1,25 kg'];
const REVISAR_BARRA = 'Revisa el peso de la barra en Carga.';

const resumenCarga = (page) => page.locator('#resumen-carga');
const avisos = (page) => page.locator('#avisos > .aviso:not([hidden])');
const guardado = (page, clave) => page.evaluate((c) => localStorage.getItem(c), clave);
const pesosFichas = (page) => page.locator('#lista-barras .ficha');

// Pliega el panel Carga sin quitar el foco del campo que lo tenga, como pasa a
// veces en iOS al tocar otro control (ADR-0005 §3).
const plegarCargaSinFoco = (page) => page.evaluate(() => document.getElementById('boton-carga').click());

// SPEC-CALC-002 FR-09: a partir de aquí, guardar falla.
const romperAlmacen = (page) => page.evaluate(() => {
  Storage.prototype.setItem = () => { throw new DOMException('Lleno', 'QuotaExceededError'); };
});

test.beforeEach(async ({ page }) => {
  await abrirSinDatos(page);
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
  await analizarConAxe(page);

  await campo.pressSequentially('7');
  await expect(campo).toHaveValue('102,55');
  await analizarConAxe(page);
  await campo.fill('');
  await campo.pressSequentially('1234567');
  await expect(campo).toHaveValue('123456');
  await analizarConAxe(page);

  await copiar(page, '100,125');
  await pegar(page, campo);
  await expect(campo).toHaveValue('100,125');
  await expect(avisos(page)).toHaveText(['El peso de trabajo admite como máximo dos decimales.']);
  await expect(series(page)).toHaveCount(0);
  expect(await campo.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await analizarConAxe(page);
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
  await analizarConAxe(page);

  await collarines.check();
  await expect(resumenCarga(page)).toHaveText('Barra · Olímpica 20 kg · collarines');
  await analizarConAxe(page);

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
  await analizarConAxe(page);

  await pesoBarra(page).fill('8,5');
  await expect(pesoBarra(page)).toBeFocused();
  await expect(resumenCarga(page)).toHaveText('Barra · Z 8,5 kg · collarines');
  await expect(pesosFichas(page)).toHaveText(['Olímpica 20 kg', 'Olímpica 15 kg', 'Recta 10 kg', 'Z 8,5 kg']);
  await analizarConAxe(page);
  await pesoBarra(page).fill('');
  await expect(resumenCarga(page)).toHaveText('Barra · Z 10 kg · collarines');
  await expect(pesosFichas(page).last()).toHaveText('Z 10 kg');
  await analizarConAxe(page);

  await page.getByRole('radio', { name: 'Dos lados' }).check();
  await expect(page.locator('#lista-barras')).toBeHidden();
  await expect(collarines).toBeHidden();
  await expect(pesoBarra(page)).toBeHidden();
  await expect(page.locator('#nota-maquina')).toHaveText('Los discos se cargan en el cuerno de la máquina.');
  await expect(resumenCarga(page)).toHaveText('Dos lados · máquina');
  await analizarConAxe(page);
  await page.getByRole('radio', { name: 'Un punto' }).check();
  await expect(resumenCarga(page)).toHaveText('Un punto · máquina');
  await analizarConAxe(page);

  await botonCarga(page).click();
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'false');
  await analizarConAxe(page);
  await botonDiscos(page).click();
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'true');
  await analizarConAxe(page);
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
  await analizarConAxe(page);
  for (const nombre of ['25 kg', '1,25 kg']) {
    await disco(page, nombre).click();
    await expect(disco(page, nombre)).not.toBeChecked();
    const peso = page.locator('.disco', { has: disco(page, nombre) }).locator('.peso-disco');
    await expect(peso).toHaveCSS('text-decoration-line', 'line-through');
    // Y su dibujo, en gris.
    const dibujo = page.locator('.disco', { has: disco(page, nombre) }).locator('.dibujo-disco');
    await expect(dibujo).toHaveCSS('filter', 'grayscale(1)');
    await analizarConAxe(page);
  }
  await expect(disco(page, '20 kg')).toBeChecked();
  await expect(page.locator('.disco', { has: disco(page, '20 kg') }).locator('.peso-disco'))
    .toHaveCSS('text-decoration-line', 'none');
  await expect(page.locator('#puntos-discos i.apagado')).toHaveCount(2);
  await expect(page.locator('#puntos-discos i[data-cent="2500"]')).toHaveClass(/apagado/);
  await expect(page.locator('#puntos-discos i[data-cent="125"]')).toHaveClass(/apagado/);
  await expect(page.locator('#cuenta-discos')).toHaveText('5 de 7');
  await expect(botonDiscos(page)).toHaveAccessibleName('Mis discos: 5 de 7 habilitados');
  await analizarConAxe(page);

  for (const nombre of ['20 kg', '15 kg', '10 kg', '5 kg', '2,5 kg']) await disco(page, nombre).click();
  await expect(page.locator('#cuenta-discos')).toHaveText('0 de 7');
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-05 los avisos generales: región anunciada y su orden', async ({ page }) => {
  await expect(page.locator('#avisos')).toHaveAttribute('aria-live', 'polite');
  // Sin avisos, la región no se quita del árbol de accesibilidad: así se
  // anuncia el primero que aparezca.
  await expect(avisos(page)).toHaveCount(0);
  await expect(page.locator('#avisos')).not.toHaveCSS('display', 'none');
  await desplegarPaneles(page);

  // Las series se quitan desde su tarjeta (FR-08), así que antes de
  // deshabilitar los tipos.
  await quitarTodas(page);
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await trabajo(page).fill('');
  await expect(avisos(page)).toHaveText([
    'Escribe el peso de trabajo.',
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
  ]);
  await analizarConAxe(page);

  // Z con 0,5, lista vacía, sin tipos y el aviso de fallo al guardar: el 50
  // se guarda y, al quitarlo, la lista vacía ya no se puede guardar. Para
  // quitarlo hace falta su tarjeta: con los tipos habilitados.
  await trabajo(page).fill('100');
  await trabajo(page).blur();
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await anadirPorcentaje(page, '50');
  await romperAlmacen(page);
  await quitarSerie(page, 50);
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await expect(avisos(page)).toHaveText([
    REVISAR_BARRA,
    'Añade al menos un porcentaje.',
    'Habilita al menos un disco en Mis discos.',
    'No se ha podido guardar: se mantendrá hasta cerrar la app',
  ]);
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-05 sin tipos y peso inferior a la barra: los dos avisos, en su orden', async ({ page }) => {
  await desplegarPaneles(page);
  for (const nombre of NOMBRES) await disco(page, nombre).click();
  await trabajo(page).fill('15');
  await expect(avisos(page)).toHaveText([
    'Habilita al menos un disco en Mis discos.',
    'El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.',
  ]);
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-25 con el panel plegado, el aviso general dice que hay que revisar la barra', async ({ page }) => {
  await botonCarga(page).click();
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await botonCarga(page).click();
  await expect(page.locator('#panel-carga')).toBeHidden();
  await expect(series(page)).toHaveCount(0);
  await expect(avisos(page)).toHaveText([REVISAR_BARRA]);
  await analizarConAxe(page);

  await botonCarga(page).click();
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await pesoBarra(page).fill('8,5');
  await expect(avisos(page)).toHaveCount(0);
  await expect(series(page)).toHaveCount(3);
  await analizarConAxe(page);
});

test('SPEC-CALC-001/AC-45 plegar Carga con el foco en el peso de trabajo lo guarda', async ({ page }) => {
  await botonCarga(page).click();
  await trabajo(page).fill('110');
  await plegarCargaSinFoco(page);
  await expect(trabajo(page)).toBeFocused();
  await expect(page.locator('#panel-carga')).toBeHidden();
  expect(await guardado(page, CLAVE_TRABAJO)).toBe('"110"');
  await analizarConAxe(page);
});

test('SPEC-CALC-001/AC-45 plegar Carga termina la edición de la barra sin descartar el texto', async ({ page }) => {
  await botonCarga(page).click();
  await barra(page, 'Recta').check();
  await pesoBarra(page).fill('7,5');
  await pesoBarra(page).blur();
  expect(await guardado(page, CLAVE_RECTA)).toBe('7.5');
  await analizarConAxe(page);

  await pesoBarra(page).fill('0,5');
  await plegarCargaSinFoco(page);
  await expect(page.locator('#panel-carga')).toBeHidden();
  await expect(pesoBarra(page)).toHaveValue('0,5');
  await expect(avisos(page)).toHaveText([REVISAR_BARRA]);
  await expect(resumenCarga(page)).toHaveText('Barra · Recta 7,5 kg');
  expect(await guardado(page, CLAVE_RECTA)).toBe('7.5');
  await analizarConAxe(page);

  await botonCarga(page).click();
  await barra(page, 'Z').check();
  await barra(page, 'Recta').check();
  await expect(pesoBarra(page)).toHaveValue('7,5');
  await analizarConAxe(page);

  // Ahora con un toque de verdad en el botón, que quita el foco al campo.
  await pesoBarra(page).fill('8');
  await botonCarga(page).click();
  await expect(resumenCarga(page)).toHaveText('Barra · Recta 8 kg');
  expect(await guardado(page, CLAVE_RECTA)).toBe('8');
  await analizarConAxe(page);
  await botonCarga(page).click();
  await expect(pesosFichas(page).nth(2)).toHaveText('Recta 8 kg');
  await analizarConAxe(page);
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
  await analizarConAxe(page);
});

// NFR-01 y NFR-02 de los controles de arriba. Las pruebas de toda la pantalla
// (AC-20 a AC-22) están en accesibilidad.spec.js.
test('SPEC-CALC-003 NFR-01 los controles de arriba miden al menos 44 × 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  const controles = page.locator([
    '#trabajo', '#boton-carga', '#boton-discos', '.segmento', '.ficha', '#collarines', '#peso-barra', '.disco',
  ].join(', '));
  const n = await controles.count();
  expect(n).toBe(1 + 2 + 3 + 4 + 1 + 1 + 7);
  await analizarConAxe(page);
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
  await analizarConAxe(page);
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).toBeChecked();
  await analizarConAxe(page);
});

test('SPEC-CALC-003 NFR-02 contraste de los textos, bordes de campo, interruptor y foco de arriba', async ({ page }) => {
  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await disco(page, '25 kg').click();
  await trabajo(page).focus();

  await instalarContraste(page);
  const fallos = await page.evaluate(() => {
    const { razon: contraste, fondo, textos, conDescendientes } = window.medidasContraste;
    const { fallos } = textos(conDescendientes(['.peso', '.plegable', '#avisos']));
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
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-06 la tarjeta del 70 % con 105 kg y su marca de diferencia', async ({ page }) => {
  await trabajo(page).fill('105');
  const t = tarjeta(page, 70);
  await expect(t.locator('.porcentaje')).toHaveText('70 %');
  await expect(t.locator('.total')).toHaveText('72,5 kg');
  await expect(t.locator('.etiqueta')).toHaveText('Por lado');
  await expect(t.locator('.disco-serie')).toHaveText(['25', '1,25']);
  // Cada disco con su punto de color, que es el de su tipo.
  const puntos = t.locator('.discos .punto');
  await expect(puntos).toHaveCount(2);
  const colores = await puntos.evaluateAll((ps) => ps.map((p) => getComputedStyle(p).backgroundColor));
  expect(colores).toEqual(['rgb(200, 16, 46)', 'rgb(195, 200, 207)']);
  await analizarConAxe(page);

  const marca = t.getByRole('button', { name: '1 kg menos que el objetivo. Ver detalle' });
  await expect(marca).toHaveText('−1 kg');
  // Plegada, en gris (--linea).
  const fondo = () => marca.locator('.pastilla').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await fondo()).toBe('rgb(43, 47, 53)');
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  const detalle = t.locator('.detalle');
  await expect(detalle).toBeHidden();
  await analizarConAxe(page);
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
  expect(await fondo()).toBe('rgb(255, 138, 42)');
  await analizarConAxe(page);

  await marca.click();
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  await expect(detalle).toBeHidden();
  await analizarConAxe(page);
});

// Decisión de presentación sin AC (FR-06 no dice qué pasa al repintar): la
// explicación no se cierra por cambios ajenos a la marca.
test('la explicación desplegada sigue abierta al repintar las tarjetas', async ({ page }) => {
  await trabajo(page).fill('105');
  await tarjeta(page, 70).locator('.diferencia').click();
  await quitarSerie(page, 40);
  await expect(tarjeta(page, 70).locator('.diferencia')).toHaveAttribute('aria-expanded', 'true');
  await expect(tarjeta(page, 70).locator('.detalle')).toBeVisible();
  await analizarConAxe(page);
  // Una tarjeta que se queda sin diferencia vuelve plegada.
  await trabajo(page).fill('100');
  await trabajo(page).fill('105');
  await expect(tarjeta(page, 70).locator('.diferencia')).toHaveAttribute('aria-expanded', 'false');
  await analizarConAxe(page);
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
  await analizarConAxe(page);

  await anadirPorcentaje(page, '100');
  await trabajo(page).fill('120');
  const t100 = tarjeta(page, 100);
  await expect(t100.locator('.disco-serie')).toHaveText('25×2');
  // Se ve "25" con "×2" y se anuncia "2 discos de 25 kg".
  await expect(t100.locator('.discos > li .oculto')).toHaveText('2 discos de 25 kg');
  await expect(t100.locator('.disco-serie')).toHaveAttribute('aria-hidden', 'true');
  const anunciado = await t100.locator('.discos').ariaSnapshot();
  expect(anunciado).toContain('2 discos de 25 kg');
  expect(anunciado).not.toContain('×2');
  await analizarConAxe(page);

  await trabajo(page).fill('100');
  await desplegarPaneles(page);
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await expect(tarjeta(page, 70).locator('.collarin')).toHaveText('+ collarín de 2,5 kg');
  await analizarConAxe(page);
});

test('SPEC-CALC-003 NFR-01 las marcas de diferencia miden al menos 44 × 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await trabajo(page).fill('105');
  const marcas = page.locator('.diferencia');
  const n = await marcas.count();
  expect(n).toBeGreaterThan(0);
  await analizarConAxe(page);
  for (let i = 0; i < n; i++) {
    const caja = await marcas.nth(i).boundingBox();
    expect(caja.width).toBeGreaterThanOrEqual(44);
    expect(caja.height).toBeGreaterThanOrEqual(44);
  }
});

// Mide el contraste de cada texto visible de las tarjetas frente a su fondo,
// con el mismo cálculo que el test de contraste de arriba. AC-21 mide la
// pantalla entera en accesibilidad.spec.js.
async function contrasteTarjetas(page) {
  await instalarContraste(page);
  return page.evaluate(() => window.medidasContraste.textos(document.querySelectorAll('#series *'), { sinOcultos: true }));
}

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
  await analizarConAxe(page);

  await trabajo(page).fill('40');
  await expect(tarjeta(page, 40).locator('.linea')).toHaveText('Solo la barra');
  r = await contrasteTarjetas(page);
  expect(r.fallos).toEqual([]);
  await analizarConAxe(page);
});
