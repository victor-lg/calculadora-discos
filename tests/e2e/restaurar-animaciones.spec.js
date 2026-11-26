// SPEC-CALC-004 FR-05: las tarjetas al restaurar y al deshacer. Como pide su
// §11, solo con el dibujo 3D activo: se comprueba antes y el test falla si no
// lo está, para no pasar en falso por la vista de SPEC-CALC-003 FR-14.
import { test, expect as esperar } from '@playwright/test';
import { trabajo, porcentajesDeSeries, vigilarEntradas, entradas, series, tarjeta, aviso, deshacer } from './pantalla.js';
import { analizarConAxe } from './axe.js';

// En la CI, sin GPU, cada dibujo se pinta por software (como en dibujo.spec.js).
const expect = esperar.configure({ timeout: 20_000 });

const restaurar = (page) => page.getByRole('button', { name: 'Volver a 40, 70 y 90 %', exact: true });
const dibujo = (page, porcentaje) => tarjeta(page, porcentaje).locator('.dibujo');
const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';

// Antes de abrir la app: anota las transiciones y animaciones CSS de cada
// tarjeta ("50 % opacity"), y los dibujos que empiezan a animarse.
const vigilarMovimientos = (page) => page.addInitScript(() => {
  window.movimientos = [];
  window.animados = [];
  const anotar = (e) => {
    const li = e.target.closest?.('#series > li');
    if (li) window.movimientos.push(`${li.querySelector('.porcentaje').textContent} ${e.propertyName ?? e.animationName}`);
  };
  for (const tipo of ['transitionrun', 'animationstart']) document.addEventListener(tipo, anotar, true);
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => ms.forEach(({ target: l }) => {
      if (l.dataset.animando === 'true') window.animados.push(l.closest('li')?.querySelector('.porcentaje')?.textContent);
    })).observe(document.getElementById('series'), { subtree: true, attributes: true, attributeFilter: ['data-animando'] });
  });
});
const movimientos = (page) => page.evaluate(() => [...window.movimientos].sort());
const olvidarMovimientos = (page) => page.evaluate(() => { window.movimientos = []; });
const animados = (page) => page.evaluate(() => window.animados.splice(0));

// Lo que se mueve en una tarjeta que desaparece como una borrada
// (SPEC-CALC-003 FR-08, estilos.css .se-cierra): opacidad, altura y margen,
// sin desplazamiento (transform).
const desaparece = (p) => [`${p} % height`, `${p} % margin-bottom`, `${p} % opacity`];

// Abre la app con la lista `lista` guardada y el dibujo 3D activo.
async function abrirCon(page, lista) {
  await page.goto('/');
  await page.evaluate(([c, l]) => localStorage.setItem(c, JSON.stringify(l)), [CLAVE_PORCENTAJES, lista]);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dibujo', '3d');
  await analizarConAxe(page);
}

// La carga que expone cada dibujo (SPEC-CALC-003 FR-16), por porcentaje.
const cargas = (page) => page.locator('#series > li:not([data-desaparece]) .dibujo').evaluateAll((ls) => ls.map((l) => l.dataset.discos));

test.beforeEach(async ({ page }) => {
  await vigilarEntradas(page);
  await vigilarMovimientos(page);
  await page.setViewportSize({ width: 390, height: 844 });
});

test('SPEC-CALC-004/AC-10 con 40, 50 y 70, el 90 entra, el 50 se funde y cierra su hueco y el 40 y el 70 no se mueven', async ({ page }) => {
  await abrirCon(page, [40, 50, 70]);
  await expect(dibujo(page, 70)).toHaveAttribute('data-animando', 'false');
  const antes = await cargas(page);
  await olvidarMovimientos(page);
  await entradas(page);
  await animados(page);

  await restaurar(page).click();
  // La del 50 se queda mientras se funde: la altura de la lista no cambia de golpe.
  await expect(page.locator('#series > li[data-desaparece]')).toHaveCount(1);
  expect(await entradas(page)).toEqual(['90 % 0→1']);
  await expect.poll(() => movimientos(page)).toEqual(desaparece(50));
  await expect(series(page)).toHaveCount(3);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(dibujo(page, 90)).toHaveAttribute('data-discos', '2500,1000');
  expect(await animados(page)).toEqual([]);
  expect((await cargas(page)).slice(0, 2)).toEqual([antes[0], antes[2]]);
  // Nada más se ha movido.
  expect(await movimientos(page)).toEqual(desaparece(50));
  await olvidarMovimientos(page);
  // El aviso caduca a los 5 s en tiempo real: aquí no se analiza con axe
  // (ADR-0008 §3.1). El estado restaurado con el aviso lo analiza
  // SPEC-CALC-004/AC-03 en restaurar.spec.js, y las tarjetas con su dibujo,
  // dibujo.spec.js.
  await expect(aviso(page)).toContainText('Porcentajes restaurados');

  await deshacer(page).click();
  expect(await entradas(page)).toEqual(['50 % 0→1']);
  await expect.poll(() => movimientos(page)).toEqual(desaparece(90));
  await expect(series(page)).toHaveCount(3);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %']);
  expect(await cargas(page)).toEqual(antes);
  expect(await animados(page)).toEqual([]);
  await analizarConAxe(page);
});

// FR-05: la que entra con "Deshacer" entra como añadida, también si la del
// mismo porcentaje aún se estaba fundiendo: no hay dos tarjetas del 50 %. Con
// el reloj parado y las transiciones en pausa, el fundido no termina antes de
// pulsar "Deshacer".
test('SPEC-CALC-004/AC-10 "Deshacer" mientras el 50 se funde deja una sola tarjeta del 50 %', async ({ page }) => {
  await abrirCon(page, [40, 50, 70]);
  await page.clock.install();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dibujo', '3d');
  // ADR-0008 §3.2: con el reloj parado, analyze() no funciona: se analiza antes.
  await analizarConAxe(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await restaurar(page).click();
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  await expect(page.locator('#series > li[data-desaparece]')).toHaveCount(1);
  await entradas(page);
  await deshacer(page).click();
  await expect(page.locator('#series > li[data-valor="50"]')).toHaveCount(1);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
  expect(await entradas(page)).toEqual(['50 % 0→1']);
  // La que se funde es la del 90.
  await expect(page.locator('#series > li[data-desaparece] .porcentaje')).toHaveText(['90 %']);
});

test('SPEC-CALC-004/AC-10 con "Reducir movimiento", nada se anima al restaurar ni al deshacer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrirCon(page, [40, 50, 70]);
  const enCurso = () => page.evaluate(() => document.getAnimations().length + window.movimientos.length);
  await olvidarMovimientos(page);
  await entradas(page);
  await animados(page);

  await restaurar(page).click();
  expect(await enCurso()).toBe(0);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await deshacer(page).click();
  expect(await enCurso()).toBe(0);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %']);
  // Las que entran no piden animación, y ningún dibujo se anima.
  expect(await entradas(page)).toEqual([]);
  expect(await animados(page)).toEqual([]);
  await analizarConAxe(page);
});

test.describe('SPEC-CALC-004/AC-11 sin series por el peso de trabajo vacío', () => {
  // Con el reloj controlado, como SPEC-CALC-003/AC-15 en dibujo.spec.js: al
  // escribir "1" las tarjetas aparecen y su dibujo espera 400 ms (FR-11).
  async function sinPeso(page, lista) {
    await abrirCon(page, lista);
    await page.clock.install();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-dibujo', '3d');
    await trabajo(page).fill('');
    await expect(series(page)).toHaveCount(0);
    // ADR-0008 §3.2: con el reloj parado, analyze() no funciona: se analiza antes.
    await analizarConAxe(page);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await entradas(page);
    await animados(page);
  }

  // Al escribir 100, aparecen las tarjetas `esperadas` sin entrada y con el
  // dibujo quieto.
  async function escribir100(page, esperadas) {
    await trabajo(page).pressSequentially('100');
    await expect(porcentajesDeSeries(page)).toHaveText(esperadas);
    expect(await entradas(page)).toEqual([]);
    expect(await animados(page)).toEqual([]);
    for (const p of esperadas) await expect(dibujo(page, parseInt(p, 10))).toHaveAttribute('data-animando', 'false');
  }

  test('con 50 y 80, restaurar no muestra tarjetas; al escribir 100, aparecen 40, 70 y 90 sin entrada', async ({ page }) => {
    await sinPeso(page, [50, 80]);
    await restaurar(page).click();
    await expect(aviso(page)).toContainText('Porcentajes restaurados');
    await expect(series(page)).toHaveCount(0);
    await escribir100(page, ['40 %', '70 %', '90 %']);
  });

  test('con 50 y 80, si antes de escribir 100 se deshace, aparecen 50 y 80 sin entrada', async ({ page }) => {
    await sinPeso(page, [50, 80]);
    await restaurar(page).click();
    await deshacer(page).click();
    await expect(series(page)).toHaveCount(0);
    await escribir100(page, ['50 %', '80 %']);
  });

  test('con la lista vacía, restaurar y escribir 100 muestra las tres sin entrada', async ({ page }) => {
    await sinPeso(page, []);
    await restaurar(page).click();
    await expect(series(page)).toHaveCount(0);
    await escribir100(page, ['40 %', '70 %', '90 %']);
  });
});

test('SPEC-CALC-004/AC-13 con la lista vacía, las tres entran al restaurar y se funden al deshacer', async ({ page }) => {
  await abrirCon(page, []);
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
  await entradas(page);
  await olvidarMovimientos(page);
  await animados(page);

  await restaurar(page).click();
  expect(await entradas(page)).toEqual(['40 % 0→1', '70 % 0→1', '90 % 0→1']);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  for (const p of [40, 70, 90]) await expect(dibujo(page, p)).toHaveAttribute('data-animando', 'false');
  expect(await animados(page)).toEqual([]);
  expect(await movimientos(page)).toEqual([]);
  // Sin axe hasta después de "Deshacer", como en AC-10.
  await expect(aviso(page)).toContainText('Porcentajes restaurados');

  await deshacer(page).click();
  await expect(page.locator('#series > li[data-desaparece]')).toHaveCount(3);
  await expect.poll(() => movimientos(page)).toEqual([...desaparece(40), ...desaparece(70), ...desaparece(90)]);
  await expect(series(page)).toHaveCount(0);
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
  await analizarConAxe(page);
});
