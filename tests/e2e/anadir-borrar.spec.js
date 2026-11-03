// Recorridos de SPEC-CALC-003: el orden de la pantalla (FR-01), añadir un
// porcentaje (FR-09), borrar una serie con el gesto, la pulsación larga o el
// botón, y "Deshacer" (FR-08), y todo ello sin dibujo 3D (FR-14).
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, barra, botonCarga, botonDiscos, desplegarPaneles, copiar, pegar, discosDeSeries,
  porcentajesDeSeries, anadirPorcentaje, botonQuitar, quitarSerie, deslizar,
} from './pantalla.js';

const series = (page) => page.locator('#series > li');
const tarjeta = (page, porcentaje) => series(page).filter({ has: page.locator('.porcentaje', { hasText: `${porcentaje} %` }) });
const abrir = (page) => page.getByRole('button', { name: 'Añadir porcentaje' });
const campo = (page) => page.getByLabel('Nuevo porcentaje');
const confirmar = (page) => page.getByRole('button', { name: 'Añadir', exact: true });
const cancelar = (page) => page.getByRole('button', { name: 'Cancelar' });
const error = (page) => page.locator('#error-porcentaje');
const aviso = (page) => page.locator('#aviso-borrado');
const deshacer = (page) => page.getByRole('button', { name: 'Deshacer' });
const ROJO = 'rgb(229, 72, 77)';

// Mantiene pulsada la tarjeta sin mover el puntero y la suelta.
async function pulsacionLarga(page, objetivo, ms = 600) {
  await objetivo.scrollIntoViewIfNeeded();
  const caja = await objetivo.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

// FR-09: la app pasa a segundo plano, lo que quita el foco al campo, y vuelve.
async function segundoPlano(page) {
  await page.evaluate(() => {
    const cambiar = (estado) => {
      Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    const campo = document.activeElement;
    cambiar('hidden');
    campo.blur();
    cambiar('visible');
    delete document.visibilityState;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('SPEC-CALC-003/AC-01 de arriba abajo: peso, Carga y Mis discos plegados, las tarjetas y "+ Añadir porcentaje"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(botonCarga(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botonDiscos(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  const bloques = [
    trabajo(page), botonCarga(page), botonDiscos(page),
    tarjeta(page, 40), tarjeta(page, 70), tarjeta(page, 90), abrir(page),
  ];
  let anterior = -Infinity;
  for (const bloque of bloques) {
    const caja = await bloque.boundingBox();
    expect(caja.y).toBeGreaterThan(anterior);
    anterior = caja.y + caja.height - 1;
  }
  // No queda la lista de porcentajes anterior: los porcentajes son las tarjetas.
  await expect(page.locator('#porcentajes')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Porcentajes' })).toHaveCount(0);
});

test('SPEC-CALC-003/AC-11 deslizar un 20 % devuelve la tarjeta; un 50 % la borra y "Deshacer" la recupera', async ({ page }) => {
  await deslizar(page, tarjeta(page, 70), 0.2);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(tarjeta(page, 70).locator('.serie')).toHaveCSS('transform', 'none');
  await expect(aviso(page)).toBeHidden();

  await deslizar(page, tarjeta(page, 70), 0.5);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await expect(aviso(page)).toBeVisible();
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
});

test('SPEC-CALC-003/AC-11 el fondo "Borrar" aparece al arrastrar y cambia pasado el 35 %', async ({ page }) => {
  const t = tarjeta(page, 70);
  const fondo = t.locator('.fondo-borrar');
  await expect(fondo).toBeHidden();
  await t.scrollIntoViewIfNeeded();
  const caja = await t.boundingBox();
  const y = caja.y + caja.height / 2;
  const x = caja.x + caja.width * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - caja.width * 0.1, y, { steps: 5 });
  await expect(fondo).toBeVisible();
  await expect(fondo).toHaveText('Borrar');
  await expect(fondo).toHaveCSS('background-color', 'rgb(59, 28, 30)');
  // La tarjeta sigue al dedo.
  expect((await t.locator('.serie').boundingBox()).x).toBeLessThan(caja.x);
  await page.mouse.move(x - caja.width * 0.4, y, { steps: 5 });
  await expect(fondo).toHaveCSS('background-color', 'rgb(209, 52, 56)');
  await expect(fondo).toHaveCSS('color', 'rgb(255, 255, 255)');
  // Vuelve por debajo del umbral antes de soltar: no se borra.
  await page.mouse.move(x - caja.width * 0.2, y, { steps: 5 });
  await expect(fondo).toHaveCSS('background-color', 'rgb(59, 28, 30)');
  await page.mouse.up();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(fondo).toBeHidden();
});

test('SPEC-CALC-003/AC-11 deslizar en vertical no borra', async ({ page }) => {
  const t = tarjeta(page, 70);
  await t.scrollIntoViewIfNeeded();
  const caja = await t.boundingBox();
  const x = caja.x + caja.width / 2;
  const y = caja.y + caja.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 20, y - 60, { steps: 6 });
  await page.mouse.move(x - caja.width * 0.5, y - 60, { steps: 6 });
  await page.mouse.up();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(t.locator('.serie')).toHaveCSS('transform', 'none');
});

test('SPEC-CALC-003/AC-11 la pulsación larga muestra "Quitar la serie del 70 %", que la borra', async ({ page }) => {
  const quitar = botonQuitar(page, 70);
  await pulsacionLarga(page, tarjeta(page, 70).locator('.total'));
  await expect(quitar).toHaveText('Quitar la serie del 70 %');
  const caja = await quitar.boundingBox();
  expect(caja.width).toBeGreaterThanOrEqual(44);
  expect(caja.height).toBeGreaterThanOrEqual(44);
  await quitar.click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(deshacer(page)).toBeFocused();
});

test('SPEC-CALC-003/AC-11 tras la pulsación larga, tocar fuera oculta "Quitar" y la lista no cambia', async ({ page }) => {
  await pulsacionLarga(page, tarjeta(page, 70).locator('.total'));
  const quitar = botonQuitar(page, 70);
  expect((await quitar.boundingBox()).width).toBeGreaterThanOrEqual(44);
  await tarjeta(page, 40).locator('.total').click();
  expect((await quitar.boundingBox()).width).toBeLessThan(44);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
});

test('SPEC-CALC-003/AC-11 al soltar tras la pulsación larga no se activa la marca de diferencia', async ({ page }) => {
  await trabajo(page).fill('105');
  const marca = tarjeta(page, 70).locator('.diferencia');
  await pulsacionLarga(page, marca);
  await expect(botonQuitar(page, 70)).toHaveText('Quitar la serie del 70 %');
  await expect(marca).toHaveAttribute('aria-expanded', 'false');
  await tarjeta(page, 40).locator('.total').click();
  expect((await botonQuitar(page, 70).boundingBox()).width).toBeLessThan(44);
});

test('SPEC-CALC-003/AC-11 la tarjeta no deja seleccionar texto ni abre el menú del sistema', async ({ page }) => {
  const t = tarjeta(page, 70).locator('.serie');
  await expect(t).toHaveCSS('user-select', 'none');
  await expect(t).toHaveCSS('touch-action', 'pan-y');
  const cancelado = await t.evaluate((el) => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  expect(cancelado).toBe(true);
});

test('SPEC-CALC-003/AC-12 con el teclado: "Quitar" se ve con el foco, borra y el foco pasa a "Deshacer" y después a añadir', async ({ page }) => {
  const quitar = botonQuitar(page, 70);
  expect((await quitar.boundingBox()).width).toBeLessThan(44);
  await quitar.focus();
  const caja = await quitar.boundingBox();
  expect(caja.width).toBeGreaterThanOrEqual(44);
  expect(caja.height).toBeGreaterThanOrEqual(44);
  await expect(quitar).toHaveText('Quitar la serie del 70 %');
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(deshacer(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
  await expect(abrir(page)).toBeFocused();

  // Tras borrar, la persona lleva el foco al peso de trabajo y escribe 105.
  await quitarSerie(page, 70);
  await expect(deshacer(page)).toBeFocused();
  await trabajo(page).focus();
  await trabajo(page).selectText();
  await expect(aviso(page)).toBeVisible();
  await trabajo(page).pressSequentially('105');
  await expect(trabajo(page)).toHaveValue('105');
  await expect(aviso(page)).toBeHidden();
  await expect(trabajo(page)).toBeFocused();
});

// FR-08: con el campo de añadir abierto, el foco que estaba en el aviso pasa al
// campo. Sigue abierto al salir de él porque tiene un porcentaje no válido.
test('SPEC-CALC-003/AC-12 con el campo de añadir abierto, "Deshacer" deja el foco en el campo', async ({ page }) => {
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await quitarSerie(page, 90);
  await expect(error(page)).toBeVisible();
  await expect(deshacer(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(campo(page)).toBeFocused();
});

test('SPEC-CALC-003/AC-13 borrar el 70, añadir 70 y "Deshacer" deja un solo 70', async ({ page }) => {
  await quitarSerie(page, 70);
  await anadirPorcentaje(page, '70');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(deshacer(page)).toBeVisible();
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
});

test('SPEC-CALC-003/AC-13 borrar el 70 y añadir 50 deja el aviso, y "Deshacer" recupera el 70', async ({ page }) => {
  await quitarSerie(page, 70);
  await anadirPorcentaje(page, '50');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '90 %']);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
});

test('SPEC-CALC-001/AC-46 con el peso de trabajo vacío no hay series ni forma de quitar un porcentaje', async ({ page }) => {
  await trabajo(page).fill('');
  await expect(series(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Quitar la serie/ })).toHaveCount(0);
  await trabajo(page).fill('100');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
});

test('SPEC-CALC-003/AC-13 al borrar el 70 y después el 40, "Deshacer" recupera solo el 40', async ({ page }) => {
  await quitarSerie(page, 70);
  await quitarSerie(page, 40);
  await expect(aviso(page)).toContainText('Serie del 40 % borrada');
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

// FR-08: pulsar "Quitar" en otra tarjeta mientras la primera aún sale. El
// último borrado es el que se pidió el último, aunque su tarjeta acabe antes.
// Si algo repinta las tarjetas mientras una sale (aquí, el final del otro
// borrado), esa tarjeta sigue saliendo: no reaparece ni se puede tocar.
test('SPEC-CALC-003/AC-13 al quitar el 70 y enseguida el 40, el aviso es del 40 y "Deshacer" recupera solo el 40', async ({ page }) => {
  await page.evaluate(() => {
    window.reaparece = [];
    const series = document.getElementById('series');
    new MutationObserver(() => {
      for (const li of series.children) {
        const porcentaje = li.querySelector('.porcentaje').textContent;
        if (['40 %', '70 %'].includes(porcentaje) && !(li.inert && li.classList.contains('listo'))) window.reaparece.push(porcentaje);
      }
    }).observe(series, { childList: true });
  });
  await botonQuitar(page, 70).press('Enter');
  await botonQuitar(page, 40).press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['90 %']);
  await expect(aviso(page)).toContainText('Serie del 40 % borrada');
  expect(await page.evaluate(() => window.reaparece)).toEqual([]);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

// FR-08: el orden inverso, forzado: la tarjeta del 40 termina de salir antes
// que la del 70, que se quitó antes. Con el reloj parado, la salida del 40 se
// da por terminada a mano y la del 70, con sus temporizadores de respaldo. El
// aviso sigue siendo del 40, el último borrado pedido.
test('SPEC-CALC-003/AC-13 si la tarjeta del 40 acaba de salir antes que la del 70, el aviso y "Deshacer" son del 40', async ({ page }) => {
  await pararReloj(page);
  await botonQuitar(page, 70).press('Enter');
  await botonQuitar(page, 40).press('Enter');
  await page.evaluate(() => {
    const li = [...document.querySelectorAll('#series > li')].find((el) => el.querySelector('.porcentaje').textContent === '40 %');
    li.querySelector('.serie').dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'transform' }));
    li.dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'height' }));
  });
  await expect(aviso(page)).toContainText('Serie del 40 % borrada');
  await expect(porcentajesDeSeries(page)).toHaveText(['70 %', '90 %']);
  await page.clock.runFor(ANIMACION_MS);
  await expect(porcentajesDeSeries(page)).toHaveText(['90 %']);
  await expect(aviso(page)).toContainText('Serie del 40 % borrada');
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

// FR-08: terminar un borrado repinta las tarjetas; la del 40, que aún sale,
// sigue en el documento con su transición en marcha.
test('SPEC-CALC-003/AC-11 si otro borrado repinta las tarjetas, la que sale sigue saliendo de lado', async ({ page }) => {
  await pararReloj(page);
  await botonQuitar(page, 70).press('Enter');
  await botonQuitar(page, 40).press('Enter');
  const r = await page.evaluate(() => {
    const tarjetaDe = (p) => [...document.querySelectorAll('#series > li')].find((el) => el.querySelector('.porcentaje').textContent === p);
    const t40 = tarjetaDe('40 %');
    const t70 = tarjetaDe('70 %');
    t70.querySelector('.serie').dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'transform' }));
    t70.dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'height' }));
    return {
      aviso: document.getElementById('texto-borrado').textContent,
      misma: tarjetaDe('40 %') === t40,
      transiciones: t40.querySelector('.serie').getAnimations().map((a) => [a.transitionProperty, a.playState]),
    };
  });
  expect(r).toEqual({ aviso: 'Serie del 70 % borrada', misma: true, transiciones: [['transform', 'running']] });
});

// SPEC-CALC-003 §10: los plazos del aviso se prueban con un reloj controlado,
// parado. Con él, los temporizadores de la salida de la tarjeta tampoco corren
// solos: tras pulsar "Quitar" se avanza el reloj hasta que termina, como mucho
// SALIDA_MS + CIERRE_MS de app.js (la animación dura 200 + 260 ms). Las
// transiciones CSS sí corren con el tiempo real y pueden terminarla antes, así
// que se anota la hora del reloj en que aparece cada aviso y los tiempos de
// AC-13 se cuentan desde ella.
const ANIMACION_MS = 400 + 450;

async function pararReloj(page) {
  await page.clock.install();
  await page.reload();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate(() => {
    const avisoBorrado = document.getElementById('aviso-borrado');
    let texto = null;
    new MutationObserver(() => {
      const ahora = avisoBorrado.hidden ? null : avisoBorrado.textContent;
      if (ahora && ahora !== texto) window.avisoAparecio = Date.now();
      texto = ahora;
    }).observe(avisoBorrado, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}

// Quita la serie con su botón, avanza el reloj hasta el final de la salida y
// comprueba que aparece su aviso.
async function borrarConReloj(page, porcentaje) {
  await botonQuitar(page, porcentaje).press('Enter');
  await page.clock.runFor(ANIMACION_MS);
  await expect(aviso(page)).toContainText(`Serie del ${porcentaje} % borrada`);
}

// La hora del reloj `ms` después de que apareciera el último aviso.
const desdeAviso = (page, ms) => page.evaluate((x) => window.avisoAparecio + x, ms);

// Avanza el reloj hasta `ms` después de que apareciera el último aviso.
async function hasta(page, ms) {
  const objetivo = await desdeAviso(page, ms);
  await page.clock.runFor(objetivo - await page.evaluate(() => Date.now()));
}

test.describe('SPEC-CALC-003/AC-13 el plazo de 5 s del aviso', () => {
  test.beforeEach(async ({ page }) => {
    await pararReloj(page);
  });

  // La app pasa a segundo plano y vuelve `ms` después de que apareciera el
  // aviso, avisando con `regreso` ('visibilitychange', o 'pageshow', lo que
  // llega en iOS al volver a una PWA desde la caché). Mientras, como en iOS,
  // sus temporizadores no corren: solo cambia la hora (setSystemTime no
  // dispara ninguno).
  async function segundoPlano(page, ms, regreso) {
    const visibilidad = (estado) => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
    await page.evaluate(`(${visibilidad})('hidden'); document.dispatchEvent(new Event('visibilitychange'));`);
    await page.clock.setSystemTime(await desdeAviso(page, ms));
    await page.evaluate(`(${visibilidad})('visible');`);
    if (regreso === 'pageshow') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    else await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  }

  test('a los 4 s sigue y "Deshacer" recupera; a los 5 s desaparece sin "Deshacer"', async ({ page }) => {
    await borrarConReloj(page, 70);
    await hasta(page, 4000);
    await expect(aviso(page)).toBeVisible();
    await deshacer(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);

    await borrarConReloj(page, 70);
    await hasta(page, 4999);
    await expect(aviso(page)).toBeVisible();
    await hasta(page, 5000);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
    await expect(deshacer(page)).toHaveCount(0);
  });

  test('añadir el 50 a los 3 s no reinicia el plazo: a los 5 s desaparece', async ({ page }) => {
    await borrarConReloj(page, 70);
    await hasta(page, 3000);
    await anadirPorcentaje(page, '50');
    await hasta(page, 4999);
    await expect(aviso(page)).toBeVisible();
    await hasta(page, 5000);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '90 %']);
  });

  test('borrar el 40 a los 3 s empieza un plazo nuevo', async ({ page }) => {
    await borrarConReloj(page, 70);
    await hasta(page, 3000);
    await borrarConReloj(page, 40);
    await hasta(page, 4999);
    await expect(aviso(page)).toContainText('Serie del 40 % borrada');
    await hasta(page, 5000);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['90 %']);
  });

  test('"Deshacer" a los 2 s anula el plazo: el borrado del 40 1 s después dura 5 s', async ({ page }) => {
    await borrarConReloj(page, 70);
    await hasta(page, 2000);
    await deshacer(page).click();
    await expect(aviso(page)).toBeHidden();
    await page.clock.runFor(1000);
    await borrarConReloj(page, 40);
    await hasta(page, 4999);
    await expect(aviso(page)).toContainText('Serie del 40 % borrada');
    await hasta(page, 5000);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['70 %', '90 %']);
  });

  for (const regreso of ['visibilitychange', 'pageshow']) {
    test(`en segundo plano cuenta el tiempo real, al volver con ${regreso}`, async ({ page }) => {
      await borrarConReloj(page, 70);
      await segundoPlano(page, 10_000, regreso);
      await expect(aviso(page)).toBeHidden();
      await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
      await expect(deshacer(page)).toHaveCount(0);

      await borrarConReloj(page, 40);
      await segundoPlano(page, 3000, regreso);
      await expect(aviso(page)).toContainText('Serie del 40 % borrada');
      await hasta(page, 4999);
      await expect(aviso(page)).toBeVisible();
      await hasta(page, 5000);
      await expect(aviso(page)).toBeHidden();
      await expect(porcentajesDeSeries(page)).toHaveText(['90 %']);
    });
  }
});

// FR-08: el plazo no se detiene con el foco en el aviso; al desaparecer, el
// foco pasa a "+ Añadir porcentaje" o, si está abierto, al campo de añadir.
test('SPEC-CALC-003/AC-12 con el foco en "Deshacer", a los 5 s el aviso desaparece y el foco pasa a añadir', async ({ page }) => {
  await pararReloj(page);
  await borrarConReloj(page, 70);
  await expect(deshacer(page)).toBeFocused();
  await hasta(page, 4999);
  await expect(deshacer(page)).toBeFocused();
  await hasta(page, 5000);
  await expect(aviso(page)).toBeHidden();
  await expect(abrir(page)).toBeFocused();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

test('SPEC-CALC-003/AC-12 con el campo de añadir abierto, a los 5 s el foco pasa del aviso al campo', async ({ page }) => {
  await pararReloj(page);
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await borrarConReloj(page, 90);
  await expect(error(page)).toBeVisible();
  await expect(deshacer(page)).toBeFocused();
  await hasta(page, 5000);
  await expect(aviso(page)).toBeHidden();
  await expect(campo(page)).toBeFocused();
});

// SPEC-CALC-003 FR-08, decisión de Víctor en el PR #32: si mientras la tarjeta
// sale la persona lleva el foco a otro sitio, al aparecer el aviso el foco no
// pasa a "Deshacer". Con el reloj parado, el foco se mueve antes de que
// termine la salida.
test('SPEC-CALC-003 FR-08 si durante la salida el foco va al peso de trabajo, se queda allí al aparecer el aviso', async ({ page }) => {
  await pararReloj(page);
  await botonQuitar(page, 70).press('Enter');
  await trabajo(page).focus();
  await page.clock.runFor(ANIMACION_MS);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await expect(trabajo(page)).toBeFocused();
  // Sin mover el foco, pasa a "Deshacer" (AC-12).
  await deshacer(page).click();
  await botonQuitar(page, 40).press('Enter');
  await page.clock.runFor(ANIMACION_MS);
  await expect(aviso(page)).toContainText('Serie del 40 % borrada');
  await expect(deshacer(page)).toBeFocused();
});

test('SPEC-CALC-003/AC-13 activar los collarines cierra el aviso y la lista sigue sin el 70', async ({ page }) => {
  await quitarSerie(page, 70);
  await expect(aviso(page)).toBeVisible();
  await desplegarPaneles(page);
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await expect(aviso(page)).toBeHidden();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

test.describe('SPEC-CALC-003/AC-14 el campo de añadir', () => {
  test.beforeEach(async ({ page }) => {
    await abrir(page).click();
    await expect(abrir(page)).toBeHidden();
    await expect(campo(page)).toBeVisible();
    await expect(campo(page)).toBeFocused();
    await expect(campo(page)).toHaveAttribute('placeholder', 'Porcentaje');
    await expect(campo(page)).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('.campo-anadir .unidad')).toHaveText('%');
    await expect(cancelar(page)).toBeVisible();
    await expect(confirmar(page)).toBeVisible();
  });

  test('no deja teclear más de 3 caracteres', async ({ page }) => {
    await campo(page).pressSequentially('1000');
    await expect(campo(page)).toHaveValue('100');
  });

  test('50 e Intro: se añade, se cierra y el foco vuelve a "+ Añadir porcentaje"', async ({ page }) => {
    await campo(page).pressSequentially('50');
    await page.keyboard.press('Enter');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
    await expect(campo(page)).toBeHidden();
    await expect(abrir(page)).toBeFocused();
  });

  test('60 y "Añadir": la lista gana un solo 60', async ({ page }) => {
    await campo(page).pressSequentially('60');
    await confirmar(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '60 %', '70 %', '90 %']);
    await expect(campo(page)).toBeHidden();
    await expect(abrir(page)).toBeFocused();
  });

  test('60 y "Añadir", que antes quita el foco al campo: se añade una sola vez', async ({ page }) => {
    await campo(page).pressSequentially('60');
    await confirmar(page).dispatchEvent('pointerdown');
    await campo(page).blur();
    await confirmar(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '60 %', '70 %', '90 %']);
  });

  test('55 y tocar el peso de trabajo: se añade y el foco queda en el peso', async ({ page }) => {
    await campo(page).pressSequentially('55');
    await trabajo(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %', '90 %']);
    await expect(campo(page)).toBeHidden();
    await expect(trabajo(page)).toBeFocused();
  });

  test('5 y pasar a segundo plano: al volver sigue abierto con "5" y la lista no cambia', async ({ page }) => {
    await campo(page).pressSequentially('5');
    await segundoPlano(page);
    await expect(campo(page)).toBeVisible();
    await expect(campo(page)).toHaveValue('5');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  });

  test('0 da el error y, al cambiar a 05, desaparece', async ({ page }) => {
    await campo(page).pressSequentially('0');
    await page.keyboard.press('Enter');
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await page.keyboard.press('Home');
    await page.keyboard.type('0');
    await expect(campo(page)).toHaveValue('00');
    await expect(error(page)).toBeHidden();
    await campo(page).fill('05');
    await expect(error(page)).toBeHidden();
  });

  test('30, Escape y volver a abrir: está vacío', async ({ page }) => {
    await campo(page).pressSequentially('30');
    await page.keyboard.press('Escape');
    await abrir(page).click();
    await expect(campo(page)).toHaveValue('');
  });

  test('pegar "1000" lo muestra entero y, al confirmar, da el error', async ({ page }) => {
    // Copiar usa un área de texto fuera de la app: se cierra antes el campo.
    await page.keyboard.press('Escape');
    await copiar(page, '1000');
    await abrir(page).click();
    await pegar(page, campo(page));
    await expect(campo(page)).toHaveValue('1000');
    await page.keyboard.press('Enter');
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  });

  test('30 y Escape: se cierra sin cambiar la lista y el foco vuelve al botón', async ({ page }) => {
    await campo(page).pressSequentially('30');
    await page.keyboard.press('Escape');
    await expect(campo(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
    await expect(abrir(page)).toBeFocused();
  });

  test('30 y tocar "✕": se cierra sin cambiar la lista', async ({ page }) => {
    await campo(page).pressSequentially('30');
    await cancelar(page).click();
    await expect(campo(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
    await expect(abrir(page)).toBeFocused();
  });

  test('30 y tocar "✕", que antes quita el foco al campo: cancelar prevalece', async ({ page }) => {
    await campo(page).pressSequentially('30');
    await cancelar(page).dispatchEvent('pointerdown');
    await campo(page).blur();
    await cancelar(page).click();
    await expect(campo(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  });

  test('vacío y tocar fuera: se cierra sin mensaje', async ({ page }) => {
    await tarjeta(page, 40).locator('.total').click();
    await expect(campo(page)).toBeHidden();
    await expect(error(page)).toBeHidden();
    await expect(abrir(page)).toBeVisible();
  });

  test('0 y tocar fuera: sigue abierto, con el borde rojo y el mensaje debajo', async ({ page }) => {
    await campo(page).pressSequentially('0');
    await tarjeta(page, 40).locator('.total').click();
    await expect(campo(page)).toBeVisible();
    await expect(page.locator('.campo-anadir')).toHaveCSS('border-top-color', ROJO);
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    const cajaCampo = await page.locator('.campo-anadir').boundingBox();
    expect((await error(page).boundingBox()).y).toBeGreaterThanOrEqual(cajaCampo.y + cajaCampo.height);
  });

  test('70 e Intro: sigue abierto, con el borde rojo y "Ya tienes una serie del 70 %."', async ({ page }) => {
    await campo(page).pressSequentially('70');
    await page.keyboard.press('Enter');
    await expect(campo(page)).toBeVisible();
    await expect(page.locator('.campo-anadir')).toHaveCSS('border-top-color', ROJO);
    await expect(error(page)).toHaveText('Ya tienes una serie del 70 %.');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  });
});

test.describe('sin dibujo 3D', () => {
  // FR-14: el navegador no puede preparar ningún contexto gráfico.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
      delete window.WebGLRenderingContext;
      delete window.WebGL2RenderingContext;
    });
    await page.reload();
  });

  test('SPEC-CALC-003/AC-18 solo texto en una columna, fichas planas, el aviso de capacidad y todo funciona igual', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Las series de SPEC-CALC-001 AC-01, solo con texto y en una columna.
    await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);
    await expect.poll(() => discosDeSeries(page)).toEqual(['10', '25', '25 + 10']);
    await expect(page.locator('#series canvas, #series .dibujo')).toHaveCount(0);
    for (const t of await series(page).locator('.serie').all()) {
      expect((await t.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(' ')).toHaveLength(1);
    }
    await desplegarPaneles(page);
    await expect(page.locator('#lista-barras .ficha svg')).toHaveCount(4);
    for (const svg of await page.locator('#lista-barras .ficha svg').all()) await expect(svg).toBeVisible();

    // Añadir, borrar y deshacer.
    await anadirPorcentaje(page, '50');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
    await deslizar(page, tarjeta(page, 50), 0.5);
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
    await quitarSerie(page, 90);
    await deshacer(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);

    // Cambiar de barra y habilitar discos.
    await barra(page, 'Olímpica 15 kg').check();
    await expect(series(page).locator('.total')).toHaveText(['40 kg', '70 kg', '90 kg']);
    await expect.poll(() => discosDeSeries(page)).toEqual(['10 + 2,5', '25 + 2,5', '25 + 10 + 2,5']);
    await page.getByLabel('25 kg', { exact: true }).click();
    await expect.poll(() => discosDeSeries(page)).toEqual(['10 + 2,5', '20 + 5 + 2,5', '20 + 15 + 2,5']);
    await page.getByLabel('25 kg', { exact: true }).click();

    // Cambiar de modo: Un punto, 500 kg y el 100 %.
    await page.getByLabel('Un punto').check();
    await anadirPorcentaje(page, '100');
    await trabajo(page).fill('500');
    await expect(tarjeta(page, 100).locator('.capacidad')).toHaveText('No caben en la manga: faltan 23 cm.');
  });
});

// NFR-01 y NFR-02 de añadir y borrar. Las pruebas de toda la pantalla
// (AC-20 a AC-22) están en accesibilidad.spec.js.
test('SPEC-CALC-003 NFR-01 añadir, "Quitar" con el foco y "Deshacer" miden al menos 44 × 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const medir = async (locator, nombre) => {
    const caja = await locator.boundingBox();
    expect(caja.width, nombre).toBeGreaterThanOrEqual(44);
    expect(caja.height, nombre).toBeGreaterThanOrEqual(44);
  };
  await medir(abrir(page), 'Añadir porcentaje');
  await abrir(page).click();
  await medir(campo(page), 'campo');
  await medir(cancelar(page), 'Cancelar');
  await medir(confirmar(page), 'Añadir');
  await page.keyboard.press('Escape');
  await botonQuitar(page, 40).focus();
  await medir(botonQuitar(page, 40), 'Quitar');
  await page.keyboard.press('Enter');
  await medir(deshacer(page), 'Deshacer');
  // El aviso no tapa el botón de añadir.
  const cajaAviso = await aviso(page).boundingBox();
  const cajaBoton = await abrir(page).boundingBox();
  expect(cajaAviso.y >= cajaBoton.y + cajaBoton.height || cajaAviso.y + cajaAviso.height <= cajaBoton.y).toBe(true);
});

// Contraste de los textos visibles dentro de `raices` frente a su fondo, con el
// mismo cálculo que los tests de contraste de presentacion.spec.js.
const contraste = (page, raices) => page.evaluate((selectores) => {
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => {
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const razon = (a, b) => {
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
    && !el.closest('.oculto') && el.getBoundingClientRect().width > 1;
  const fallos = [];
  let medidos = 0;
  for (const raiz of selectores.flatMap((s) => [...document.querySelectorAll(s)])) {
    for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio || !visible(el)) continue;
      const s = getComputedStyle(el);
      const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
      const r = razon(s.color, fondo(el));
      medidos++;
      if (r < (grande ? 3 : 4.5)) fallos.push(`${el.textContent.trim()}: ${r.toFixed(2)}`);
    }
  }
  // Bordes de los campos y del botón de añadir (3:1 frente al fondo de la página).
  const pagina = getComputedStyle(document.body).backgroundColor;
  for (const sel of ['.abrir-anadir', '.campo-anadir']) {
    const el = document.querySelector(sel);
    if (el && visible(el) && selectores.some((s) => el.closest(s))) {
      const r = razon(getComputedStyle(el).borderTopColor, pagina);
      medidos++;
      if (r < 3) fallos.push(`borde de ${sel}: ${r.toFixed(2)}`);
    }
  }
  return { fallos, medidos };
}, raices);

test('SPEC-CALC-003 NFR-02 contraste de añadir, el fondo de borrar, "Quitar" y el aviso de "Deshacer"', async ({ page }) => {
  let r = await contraste(page, ['.anadir']);
  expect(r.fallos).toEqual([]);
  expect(r.medidos).toBeGreaterThan(0);

  // El campo, con un error.
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await page.keyboard.press('Enter');
  await expect(error(page)).toBeVisible();
  r = await contraste(page, ['.anadir']);
  expect(r.fallos).toEqual([]);
  expect(r.medidos).toBeGreaterThan(2);
  await page.keyboard.press('Escape');

  // El fondo de borrar antes y después del 35 %.
  const t = tarjeta(page, 70);
  await t.scrollIntoViewIfNeeded();
  const caja = await t.boundingBox();
  const y = caja.y + caja.height / 2;
  const x = caja.x + caja.width * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - caja.width * 0.2, y, { steps: 5 });
  r = await contraste(page, ['.arrastra .fondo-borrar']);
  expect(r).toEqual({ fallos: [], medidos: 1 });
  await page.mouse.move(x - caja.width * 0.5, y, { steps: 5 });
  await expect(t).toHaveClass(/listo/);
  r = await contraste(page, ['.arrastra .fondo-borrar']);
  expect(r).toEqual({ fallos: [], medidos: 1 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();

  // "Quitar" con el foco y el aviso de "Deshacer".
  await botonQuitar(page, 70).focus();
  r = await contraste(page, ['.quitar']);
  expect(r).toEqual({ fallos: [], medidos: 1 });
  await page.keyboard.press('Enter');
  // El aviso aparece al terminar la salida de la tarjeta (FR-08).
  await expect(aviso(page)).toBeVisible();
  r = await contraste(page, ['#aviso-borrado']);
  expect(r.fallos).toEqual([]);
  expect(r.medidos).toBe(2);
});

// FR-08 y FR-13: con "Reducir movimiento", la tarjeta sigue al dedo, pero al
// soltarla no sale de lado ni vuelve con transición.
test('SPEC-CALC-003/AC-11 con "Reducir movimiento", borrar y devolver la tarjeta no tienen transición', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = tarjeta(page, 70);
  await t.scrollIntoViewIfNeeded();
  const caja = await t.boundingBox();
  const y = caja.y + caja.height / 2;
  const x = caja.x + caja.width * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - caja.width * 0.2, y, { steps: 5 });
  expect((await t.locator('.serie').boundingBox()).x).toBeLessThan(caja.x);
  await page.mouse.up();
  // Vuelve sin transición: en el mismo instante ya está en su sitio.
  expect(await t.locator('.serie').evaluate((el) => [el.className, el.style.transform, el.getAnimations().length]))
    .toEqual(['serie', '', 0]);

  await page.evaluate(() => {
    window.borradaAlSoltar = null;
    document.querySelector('#series').addEventListener('pointerup', () => {
      queueMicrotask(() => { window.borradaAlSoltar = !document.body.textContent.includes('70 kg'); });
    }, { once: true });
  });
  await deslizar(page, t, 0.5);
  // Se borra al soltar, sin esperar a una salida de lado.
  expect(await page.evaluate(() => window.borradaAlSoltar)).toBe(true);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
});

// FR-10: la entrada de las tarjetas no depende del dibujo. La añadida y la que
// vuelve con "Deshacer" entran con un fundido; las que vuelven al corregirse una
// regla, sin él; con "Reducir movimiento", ninguna (FR-13).
test('SPEC-CALC-003 FR-10 sin dibujo, la tarjeta añadida y la que vuelve con "Deshacer" entran con un fundido; las demás, no', async ({ page }) => {
  const entradas = (p) => tarjeta(page, p).evaluate((el) => el.getAnimations().map((a) => a.effect.getKeyframes().map((k) => k.opacity).join('→')));
  for (const p of [40, 70, 90]) expect(await entradas(p)).toEqual([]);
  await anadirPorcentaje(page, '50');
  expect(await entradas(50)).toEqual(['0→1']);
  for (const p of [40, 70, 90]) expect(await entradas(p)).toEqual([]);
  await quitarSerie(page, 70);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
  expect(await entradas(70)).toEqual(['0→1']);
  // Ningún disco habilitado y, otra vez, todos: vuelven sin entrada.
  await desplegarPaneles(page);
  const discos = page.locator('#lista-discos input[name="disco"]');
  for (const d of await discos.all()) await d.uncheck();
  await expect(series(page)).toHaveCount(0);
  for (const d of await discos.all()) await d.check();
  await expect(series(page)).toHaveCount(4);
  for (const p of [40, 50, 70, 90]) expect(await entradas(p)).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await anadirPorcentaje(page, '60');
  expect(await entradas(60)).toEqual([]);
});

test('SPEC-CALC-003/AC-11 con muchas series, el aviso de "Deshacer" no tapa "+ Añadir porcentaje"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of ['50', '55', '60', '65', '75', '80']) await anadirPorcentaje(page, p);
  await quitarSerie(page, 40);
  await expect(aviso(page)).toBeVisible();
  const boton = abrir(page);
  for (const margen of [0, 10, 30, 60, 90, 150, 300]) {
    // Desplaza hasta que el botón quede `margen` px por encima del borde de abajo.
    await boton.evaluate((el, m) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.bottom - (window.innerHeight - m));
    }, margen);
    const a = await aviso(page).boundingBox();
    const b = await boton.boundingBox();
    const solapan = a.y < b.y + b.height && b.y < a.y + a.height;
    expect(solapan, `botón a ${margen} px del borde`).toBe(false);
  }
});
