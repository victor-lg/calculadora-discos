// El dibujo 3D de cada tarjeta (SPEC-CALC-003 FR-06, FR-07, FR-16) con un solo
// renderizador (ADR-0003). Estos E2E solo cuentan con el dibujo 3D activo: lo
// comprueban antes y fallan si no lo está, para no pasar en falso por la vista
// de FR-14 (SPEC-CALC-003 §11, ADR-0003 §4).
import { test, expect as esperar } from '@playwright/test';
import { trabajo, barra, desplegarPaneles, anadirPorcentaje, porcentajesDeSeries, deslizar } from './pantalla.js';

// En la CI, sin GPU, cada dibujo se pinta por software, y con varios tests a la
// vez puede tardar más de los 5 s de espera por defecto.
const expect = esperar.configure({ timeout: 20_000 });

const series = (page) => page.locator('#series > li');
const tarjeta = (page, porcentaje) => series(page).filter({ has: page.locator('.porcentaje', { hasText: `${porcentaje} %` }) });
const dibujo = (page, porcentaje) => tarjeta(page, porcentaje).locator('.dibujo');

// Cuenta los contextos WebGL que crea la página, y los guarda para poder
// retirarlos (WEBGL_lose_context).
async function vigilarContextos(page) {
  await page.addInitScript(() => {
    window.contextosWebGL = [];
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(tipo, ...resto) {
      const ctx = original.call(this, tipo, ...resto);
      if (/webgl/.test(tipo) && ctx && !window.contextosWebGL.includes(ctx)) window.contextosWebGL.push(ctx);
      return ctx;
    };
  });
}

// ADR-0003 §4: el dibujo 3D tiene que estar activo; si no, el test falla.
async function exigirDibujo3D(page) {
  await expect(page.locator('html')).toHaveAttribute('data-dibujo', '3d');
}

// Si el lienzo tiene algo pintado (algún píxel no transparente).
const pintado = (lienzo) => lienzo.evaluate((c) => {
  const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
  return false;
});

test.beforeEach(async ({ page }) => {
  await vigilarContextos(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await exigirDibujo3D(page);
});

test('SPEC-CALC-003/AC-08 con 360 px, texto y dibujo en una columna; con 390 px, en dos', async ({ page }) => {
  for (const [ancho, columnas] of [[390, 2], [360, 1], [390, 2]]) {
    await page.setViewportSize({ width: ancho, height: 844 });
    for (const t of await series(page).locator('.serie').all()) {
      await expect.poll(() => t.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length), `${ancho} px`).toBe(columnas);
      const texto = await t.locator('.texto').boundingBox();
      const lienzo = await t.locator('.dibujo').boundingBox();
      if (columnas === 2) {
        // El dibujo, a la derecha y en proporción 1 : 1,3 con el texto.
        expect(lienzo.x).toBeGreaterThanOrEqual(texto.x + texto.width);
        expect(lienzo.width / texto.width).toBeCloseTo(1.3, 1);
      } else {
        expect(lienzo.y).toBeGreaterThanOrEqual(texto.y + texto.height);
      }
      await expect.poll(() => pintado(t.locator('.dibujo'))).toBe(true);
    }
  }
});

test('SPEC-CALC-003/AC-09 cada tarjeta tiene un dibujo con su etiqueta accesible', async ({ page }) => {
  await expect(series(page).locator('.dibujo')).toHaveCount(3);
  await expect(page.getByRole('img', { name: 'Carga: 25 + 10 kg' })).toBeVisible();
  await expect(dibujo(page, 90)).toHaveAttribute('aria-label', 'Carga: 25 + 10 kg');
  for (const l of await series(page).locator('.dibujo').all()) expect(await pintado(l)).toBe(true);

  await trabajo(page).fill('40');
  await expect(dibujo(page, 40)).toHaveAttribute('aria-label', 'Sin discos');
  await expect.poll(() => pintado(dibujo(page, 40))).toBe(true);

  await trabajo(page).fill('120');
  await anadirPorcentaje(page, '100');
  await expect(dibujo(page, 100)).toHaveAttribute('aria-label', 'Carga: 2 de 25 kg');
  await expect.poll(() => pintado(dibujo(page, 100))).toBe(true);
});

test('SPEC-CALC-003/AC-10 en Un punto solo se dibujan los discos que caben en 310 mm', async ({ page }) => {
  await desplegarPaneles(page);
  await page.getByLabel('Un punto').check();
  await anadirPorcentaje(page, '100');
  await trabajo(page).fill('500');
  await expect(dibujo(page, 100)).toHaveAttribute('aria-label', 'Carga: 11 de 25 kg');
  // SPEC-CALC-001 FR-16: con el dibujo, el aviso dice que se dibujan los que caben.
  const capacidad = tarjeta(page, 100).locator('.capacidad');
  await expect(capacidad).toHaveText('No caben en la manga: faltan 23 cm. Se dibujan los que caben.');
  // A todo el ancho de la tarjeta, debajo del texto y del dibujo.
  const serie = await tarjeta(page, 100).locator('.serie').boundingBox();
  const caja = await capacidad.boundingBox();
  const lienzo = await dibujo(page, 100).boundingBox();
  expect(caja.width).toBeGreaterThan(serie.width - 40);
  expect(caja.y).toBeGreaterThanOrEqual(lienzo.y + lienzo.height);

  await trabajo(page).fill('301,25');
  await expect(tarjeta(page, 100).locator('.total')).toHaveText('301,25 kg');
  await expect(dibujo(page, 100)).toHaveAttribute('aria-label', 'Carga: 11 de 25 kg');
  await expect(dibujo(page, 100)).toHaveAttribute('data-discos', Array(11).fill('2500').join(','));
});

test('SPEC-CALC-003 FR-16 cada dibujo expone la carga que muestra, collarín incluido, y que no se anima', async ({ page }) => {
  await expect(dibujo(page, 90)).toHaveAttribute('data-discos', '2500,1000');
  await expect(dibujo(page, 90)).toHaveAttribute('data-collarin', 'false');
  await expect(dibujo(page, 90)).toHaveAttribute('data-equipo', '20');
  await desplegarPaneles(page);
  await page.getByLabel('Collarines de competición').check();
  await expect(dibujo(page, 70)).toHaveAttribute('data-discos', '2000,250');
  await expect(dibujo(page, 70)).toHaveAttribute('data-collarin', 'true');
  await barra(page, 'Z').check();
  await expect(dibujo(page, 70)).toHaveAttribute('data-equipo', 'z');
  await page.getByLabel('Dos lados').check();
  await expect(dibujo(page, 70)).toHaveAttribute('data-equipo', 'maquina');
  await expect(dibujo(page, 70)).toHaveAttribute('data-collarin', 'false');
  for (const l of await series(page).locator('.dibujo').all()) await expect(l).toHaveAttribute('data-animando', 'false');
});

// FR-16: lo que muestra cada dibujo, en el orden de las tarjetas. Cuando
// coincide, también se comprueba que el lienzo está pintado.
const estadoDibujos = (page) => series(page).evaluateAll((lis) => lis.map((li) => {
  const d = li.querySelector('.dibujo');
  return [li.querySelector('.porcentaje').textContent, d?.getAttribute('aria-label'), d?.dataset.discos, d?.dataset.collarin, d?.dataset.animando];
}));
async function comprobarDibujos(page, esperado) {
  await expect.poll(() => estadoDibujos(page)).toEqual(esperado.map(([p, etiqueta, discos]) => [p, etiqueta, discos, 'false', 'false']));
  for (const l of await series(page).locator('.dibujo').all()) expect(await pintado(l)).toBe(true);
}

test('SPEC-CALC-003 FR-07 FR-16 recorrido con el dibujo: cambiar el peso, borrar, deshacer y añadir', async ({ page }) => {
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['70 %', 'Carga: 25 kg', '2500'],
    ['90 %', 'Carga: 25 + 10 kg', '2500,1000'],
  ]);
  // SPEC-CALC-001 AC-02: con 105 kg cambian el 70 y el 90 %; el 40 % no.
  await trabajo(page).fill('105');
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['70 %', 'Carga: 25 + 1,25 kg', '2500,125'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
  // Borrar con el gesto, deslizando sobre el dibujo (FR-08).
  await deslizar(page, tarjeta(page, 70), 0.5);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
  // "Deshacer": la tarjeta vuelve con el dibujo ya cargado (FR-10).
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['70 %', 'Carga: 25 + 1,25 kg', '2500,125'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
  await anadirPorcentaje(page, '50');
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['50 %', 'Carga: 15 + 1,25 kg', '1500,125'],
    ['70 %', 'Carga: 25 + 1,25 kg', '2500,125'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
  await expect(page.locator('html')).toHaveAttribute('data-dibujo', '3d');
});

test('SPEC-CALC-003 FR-07 las fichas de barra muestran su miniatura en 3D', async ({ page }) => {
  await desplegarPaneles(page);
  const miniaturas = page.locator('#lista-barras .ficha .miniatura');
  await expect(miniaturas).toHaveCount(4);
  for (const m of await miniaturas.all()) {
    await expect(m).toBeVisible();
    await expect.poll(() => pintado(m)).toBe(true);
  }
  for (const svg of await page.locator('#lista-barras .ficha svg').all()) await expect(svg).toBeHidden();
  // Todas a la misma escala: el mismo lienzo y el mismo tamaño en pantalla.
  const tamanos = await miniaturas.evaluateAll((ls) => ls.map((l) => `${l.width}×${l.height} ${l.clientWidth}×${l.clientHeight}`));
  expect(new Set(tamanos).size).toBe(1);
});

test('ADR-0003 §5 con 20 series hay un solo contexto WebGL y todas las tarjetas tienen su dibujo', async ({ page }) => {
  // 40, 70 y 90, y 17 más: más que el límite de contextos de WebKit.
  for (const p of [5, 10, 15, 20, 25, 30, 35, 45, 50, 55, 60, 65, 75, 80, 85, 95, 100]) await anadirPorcentaje(page, String(p));
  await expect(porcentajesDeSeries(page)).toHaveCount(20);
  const lienzos = series(page).locator('.dibujo');
  await expect(lienzos).toHaveCount(20);
  for (const l of await lienzos.all()) {
    await l.scrollIntoViewIfNeeded();
    await expect(l).toHaveAttribute('aria-label', /^(Carga: .+ kg|Sin discos)$/);
    expect(await pintado(l)).toBe(true);
  }
  expect(await page.evaluate(() => window.contextosWebGL.length)).toBe(1);
});

test('SPEC-CALC-003 FR-08 el dibujo no recibe los toques: el gesto y la pulsación larga son de la tarjeta', async ({ page }) => {
  const caja = await dibujo(page, 70).boundingBox();
  const tocado = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y).className, { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 });
  expect(tocado).toBe('serie');
  // Mantener pulsado sobre el dibujo muestra "Quitar".
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Quitar la serie del 70 %' })).toBeVisible();
});

test('SPEC-CALC-003 FR-13 con "Reducir movimiento", el dibujo aparece sin transiciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await anadirPorcentaje(page, '50');
  await expect(dibujo(page, 50)).toHaveAttribute('aria-label', 'Carga: 15 kg');
  const animaciones = await tarjeta(page, 50).evaluate((li) => li.getAnimations({ subtree: true }).length);
  expect(animaciones).toBe(0);
});

// Provisional, hasta que el PR 3 de VIC-12 implemente FR-15 (AC-19), que lo
// sustituye: si el sistema retira el contexto gráfico, la app pasa a la vista
// de FR-14 hasta el siguiente arranque, y nunca se ve un dibujo que no
// corresponde al texto. No da FR-15 por cumplido.
test('provisional: al perder el contexto, la app pasa a la vista sin dibujo hasta el siguiente arranque', async ({ page }) => {
  await desplegarPaneles(page);
  await page.getByLabel('Un punto').check();
  await anadirPorcentaje(page, '100');
  await trabajo(page).fill('500');
  await expect(tarjeta(page, 100).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm. Se dibujan los que caben.');

  await page.evaluate(() => window.contextosWebGL[0].getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('html')).toHaveAttribute('data-dibujo', 'plano');
  await expect(page.locator('.dibujo, .miniatura')).toHaveCount(0);
  await expect(tarjeta(page, 100).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm.');
  for (const t of await series(page).locator('.serie').all()) {
    expect((await t.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(' ')).toHaveLength(1);
  }
  // Los cambios siguientes se pintan sin dibujo.
  await trabajo(page).fill('105');
  await expect(tarjeta(page, 100).locator('.total')).toHaveText('105 kg');
  await expect(page.locator('.dibujo')).toHaveCount(0);
  // Las fichas de barra vuelven a su dibujo plano.
  await page.getByLabel('Barra', { exact: true }).check();
  await expect(series(page)).toHaveCount(4);
  await expect(page.locator('.dibujo')).toHaveCount(0);
  for (const svg of await page.locator('#lista-barras .ficha svg').all()) await expect(svg).toBeVisible();
});

// SPEC-CALC-003 FR-11 a FR-13: la animación de la carga. Sus tiempos se prueban
// con el reloj controlado (§11): se instala antes de abrir la app y se para con
// los dibujos ya pintados. Desde entonces, los fotogramas solo pasan al
// avanzarlo.
const INICIO = [
  ['40 %', 'Carga: 10 kg', '1000'],
  ['70 %', 'Carga: 25 kg', '2500'],
  ['90 %', 'Carga: 25 + 10 kg', '2500,1000'],
];

async function pararReloj(page) {
  await page.clock.install();
  await page.reload();
  await exigirDibujo3D(page);
  // AC-16: al abrir la app, ningún dibujo tiene una animación en curso.
  await comprobarDibujos(page, INICIO);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

// Anota, por tarjeta, cada estado distinto que expone su dibujo (FR-16): los
// discos que se ven, de dentro afuera, y si se ve el collarín.
async function registrar(page) {
  await page.evaluate(() => {
    window.registro = {};
    const anotar = (l) => {
      const p = l.closest('li')?.querySelector('.porcentaje')?.textContent;
      if (!p) return;
      const e = `${l.dataset.discos}${l.dataset.collarin === 'true' ? ' +c' : ''}`;
      const r = (window.registro[p] ??= []);
      if (r.at(-1) !== e) r.push(e);
    };
    window.animados = new Set();
    document.querySelectorAll('#series .dibujo').forEach(anotar);
    new MutationObserver((ms) => ms.forEach(({ target: l }) => {
      anotar(l);
      if (l.dataset.animando === 'true') window.animados.add(l.closest('li')?.querySelector('.porcentaje')?.textContent);
    })).observe(document.getElementById('series'), { subtree: true, attributes: true, attributeFilter: ['data-discos', 'data-collarin', 'data-animando'] });
  });
}
const registro = (page) => page.evaluate(() => window.registro);
const animados = (page) => page.evaluate(() => [...window.animados].sort());

// Avanza el reloj a saltos de `paso` ms, un fotograma por salto, hasta que
// ningún dibujo tiene una animación en curso. En la CI cada fotograma se pinta
// por software: los saltos son tan largos como permite lo que se comprueba.
async function hastaQuePare(page, paso = 100) {
  for (let i = 0; i < 200; i++) {
    await page.clock.fastForward(paso);
    if (await page.locator('#series .dibujo[data-animando="true"]').count() === 0) return;
  }
  throw new Error('La animación no termina');
}

test('SPEC-CALC-003/AC-16 al cambiar de 100 a 105, el texto cambia al teclear y el dibujo espera 400 ms desde la última tecla', async ({ page }) => {
  await pararReloj(page);
  await registrar(page);
  await trabajo(page).focus();
  await page.keyboard.press('End');
  // "10": el texto cambia al momento; el dibujo no.
  await page.keyboard.press('Backspace');
  await expect(tarjeta(page, 70).locator('.total')).toHaveText('20 kg');
  await page.clock.runFor(300);
  // "105", 300 ms después: la espera vuelve a empezar, y la carga de "10"
  // nunca se dibuja.
  await page.keyboard.type('5');
  await expect(tarjeta(page, 70).locator('.total')).toHaveText('72,5 kg');
  await expect(tarjeta(page, 90).locator('.total')).toHaveText('92,5 kg');
  await page.clock.runFor(399);
  expect(await estadoDibujos(page)).toEqual(INICIO.map(([p, etiqueta, discos]) => [p, etiqueta, discos, 'false', 'false']));
  expect(await animados(page)).toEqual([]);
  // A los 400 ms empieza la animación de las tarjetas cuya carga cambia.
  await page.clock.runFor(20);
  await expect(dibujo(page, 70)).toHaveAttribute('data-animando', 'true');
  await hastaQuePare(page);
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['70 %', 'Carga: 25 + 1,25 kg', '2500,125'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
  // El 40 %, cuya carga no cambia, no se anima.
  expect(await animados(page)).toEqual(['70 %', '90 %']);
  expect((await registro(page))['70 %']).toEqual(['2500', '2500,125']);
});

test('SPEC-CALC-003/AC-17 si la carga cambia en plena animación, el dibujo acaba en la carga actual', async ({ page }) => {
  await pararReloj(page);
  await trabajo(page).fill('200');
  await page.clock.runFor(400 + 100);
  await expect(dibujo(page, 70)).toHaveAttribute('data-animando', 'true');
  // Más de 400 ms después del primer cambio, y con el 70 % animándose.
  await trabajo(page).fill('105');
  await page.clock.runFor(399);
  await expect(dibujo(page, 70)).toHaveAttribute('data-animando', 'true');
  await page.clock.runFor(20);
  await hastaQuePare(page);
  await expect(dibujo(page, 70)).toHaveAttribute('aria-label', 'Carga: 25 + 1,25 kg');
  await expect(dibujo(page, 70)).toHaveAttribute('data-discos', '2500,125');
  await expect(dibujo(page, 70)).toHaveAttribute('data-collarin', 'false');
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['70 %', 'Carga: 25 + 1,25 kg', '2500,125'],
    ['90 %', 'Carga: 25 + 10 + 1,25 kg', '2500,1000,125'],
  ]);
});

test('SPEC-CALC-003 FR-11 secuencia: sale el collarín, salen los discos de fuera adentro, entran del más pesado al más ligero y entra el collarín', async ({ page }) => {
  test.setTimeout(120_000);
  await pararReloj(page);
  await desplegarPaneles(page);
  await registrar(page);
  // Los collarines se dibujan al momento, sin la espera de los pesos.
  await page.getByLabel('Collarines de competición').check();
  await page.clock.runFor(20);
  await expect(dibujo(page, 90)).toHaveAttribute('data-animando', 'true');
  await hastaQuePare(page);
  await expect(dibujo(page, 90)).toHaveAttribute('aria-label', 'Carga: 25 + 5 + 2,5 kg');
  await registrar(page);
  // 90 %: de 25 + 5 + 2,5 con collarín (100 kg) a 25 + 10 + 1,25 con
  // collarín (110 kg). El de 25 se queda.
  await trabajo(page).fill('110');
  await page.clock.runFor(400);
  await hastaQuePare(page, 50);
  // Con solo el de 25, la tarjeta está un instante: el de 10 empieza a entrar
  // cuando el de 5 termina de salir, y pueden caer en el mismo fotograma.
  const visto = (await registro(page))['90 %'];
  expect(visto.filter((e) => e !== '2500')).toEqual([
    '2500,500,250 +c',
    '2500,500,250',
    '2500,500',
    '2500,1000',
    '2500,1000,125',
    '2500,1000,125 +c',
  ]);
  expect([-1, 3]).toContain(visto.indexOf('2500'));
  await expect(dibujo(page, 90)).toHaveAttribute('aria-label', 'Carga: 25 + 10 + 1,25 kg');
});

test('SPEC-CALC-003 FR-11 cada tarjeta que se anima empieza 90 ms después de la anterior', async ({ page }) => {
  await pararReloj(page);
  await trabajo(page).fill('105');
  await page.clock.runFor(400);
  // El 70 % empieza al momento; el 90 %, 90 ms después. El 40 % no cambia.
  await page.clock.runFor(40);
  await expect(dibujo(page, 70)).toHaveAttribute('data-discos', '2500,125');
  await expect(dibujo(page, 90)).toHaveAttribute('data-discos', '2500,1000');
  await page.clock.runFor(80);
  await expect(dibujo(page, 90)).toHaveAttribute('data-discos', '2500,1000,125');
  await expect(dibujo(page, 40)).toHaveAttribute('data-animando', 'false');
});

test('SPEC-CALC-003 FR-11 al cambiar de equipo, las tarjetas se vacían y se cargan de nuevo', async ({ page }) => {
  await pararReloj(page);
  await desplegarPaneles(page);
  await registrar(page);
  // 70 %: de 25 en la olímpica de 20 a 25 + 2,5 en la de 15. El de 25 no se
  // conserva: la tarjeta se vacía.
  await barra(page, 'Olímpica 15').check();
  await page.clock.runFor(20);
  await expect(dibujo(page, 70)).toHaveAttribute('data-equipo', '15');
  await hastaQuePare(page, 50);
  expect((await registro(page))['70 %']).toEqual(['2500', '', '2500', '2500,250']);
  await expect(dibujo(page, 70)).toHaveAttribute('aria-label', 'Carga: 25 + 2,5 kg');
});

test('SPEC-CALC-003/AC-15 una tarjeta añadida entra con un fundido; las que vuelven al corregir el peso, sin él; el dibujo no se anima', async ({ page }) => {
  await pararReloj(page);
  await registrar(page);
  const entradas = (li) => li.evaluate((el) => el.getAnimations().map((a) => a.effect.getKeyframes().map((k) => k.opacity).join('→')));
  await anadirPorcentaje(page, '50');
  expect(await entradas(tarjeta(page, 50))).toEqual(['0→1']);
  await page.clock.runFor(20);
  await expect(dibujo(page, 50)).toHaveAttribute('aria-label', 'Carga: 15 kg');
  await expect(dibujo(page, 50)).toHaveAttribute('data-animando', 'false');

  // Al borrar el peso y escribir 100, las tarjetas vuelven sin entrada y con el
  // dibujo ya cargado.
  await trabajo(page).fill('');
  await expect(series(page)).toHaveCount(0);
  await trabajo(page).fill('100');
  await expect(series(page)).toHaveCount(4);
  for (const p of [40, 50, 70, 90]) expect(await entradas(tarjeta(page, p))).toEqual([]);
  await page.clock.runFor(1000);
  await comprobarDibujos(page, [
    ['40 %', 'Carga: 10 kg', '1000'],
    ['50 %', 'Carga: 15 kg', '1500'],
    ['70 %', 'Carga: 25 kg', '2500'],
    ['90 %', 'Carga: 25 + 10 kg', '2500,1000'],
  ]);
  expect(await animados(page)).toEqual([]);

  // Con la lista vacía, la tarjeta añadida también entra con el fundido.
  for (const p of [40, 50, 70, 90]) {
    await page.getByRole('button', { name: `Quitar la serie del ${p} %` }).press('Enter');
    await page.clock.runFor(1000);
  }
  await expect(series(page)).toHaveCount(0);
  await anadirPorcentaje(page, '50');
  expect(await entradas(tarjeta(page, 50))).toEqual(['0→1']);
});

test('SPEC-CALC-003/AC-15 con "Reducir movimiento", nada se anima: añadir, borrar, deshacer, desplegar y cambiar el peso', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pararReloj(page);
  await registrar(page);
  await page.evaluate(() => {
    window.movimientos = [];
    for (const tipo of ['transitionrun', 'animationstart']) {
      document.addEventListener(tipo, (e) => window.movimientos.push(`${tipo} ${e.target.className}`), true);
    }
  });
  const enCurso = () => page.evaluate(() => document.getAnimations().length + window.movimientos.length);

  await anadirPorcentaje(page, '50');
  expect(await enCurso()).toBe(0);
  await page.getByRole('button', { name: 'Quitar la serie del 70 %' }).press('Enter');
  expect(await enCurso()).toBe(0);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '90 %']);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
  expect(await enCurso()).toBe(0);
  await desplegarPaneles(page);
  expect(await enCurso()).toBe(0);
  // El peso: la espera es la misma, pero el dibujo cambia de golpe.
  await trabajo(page).fill('105');
  await page.clock.runFor(399);
  await expect(dibujo(page, 70)).toHaveAttribute('data-discos', '2500');
  await page.clock.runFor(20);
  await expect(dibujo(page, 70)).toHaveAttribute('data-discos', '2500,125');
  await expect(dibujo(page, 70)).toHaveAttribute('aria-label', 'Carga: 25 + 1,25 kg');
  await page.clock.runFor(2000);
  // Con 105 kg, el 70 % tiene la marca de diferencia (AC-06).
  await tarjeta(page, 70).locator('.diferencia').click();
  await expect(tarjeta(page, 70).locator('.detalle')).toBeVisible();
  expect(await enCurso()).toBe(0);
  expect(await animados(page)).toEqual([]);
  expect((await registro(page))['70 %']).toEqual(['2500', '2500,125']);
});
