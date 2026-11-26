// Recorridos de SPEC-CALC-004: el botón "Volver a 40, 70 y 90 %" (FR-01),
// restaurar (FR-02), el aviso "Porcentajes restaurados" con "Deshacer" (FR-03)
// y el foco (FR-04), sin dibujo 3D (SPEC-CALC-003 FR-14). Las animaciones de
// FR-05 están en restaurar-animaciones.spec.js, con el dibujo activo.
import { test, expect } from './sin-dibujo.js';
import {
  trabajo, barra, disco, desplegarPaneles, porcentajesDeSeries, discosDeSeries, anadirPorcentaje,
  botonQuitar, quitarSerie, series, abrirAnadir as abrir, campoAnadir as campo, aviso, deshacer,
  abrirSinDatos,
} from './pantalla.js';
import { romperAlmacen } from './ciclo-de-vida.js';
import { analizarConAxe } from './axe.js';
import { instalarContraste } from './contraste.js';

const NOMBRE = 'Volver a 40, 70 y 90 %';
const restaurar = (page) => page.locator('#restaurar');
// Por su papel: solo existe si se ve y lo alcanzan el teclado y VoiceOver.
const restaurarAccesible = (page) => page.getByRole('button', { name: NOMBRE, exact: true });
const confirmar = (page) => page.getByRole('button', { name: 'Añadir', exact: true });
const error = (page) => page.locator('#error-porcentaje');
const RESTAURADOS = 'Porcentajes restaurados';
const HABITUAL = ['40 %', '70 %', '90 %'];
// SPEC-CALC-001 AC-01: los discos por lado de 40, 70 y 90 % de 100 kg.
const SERIES_AC01 = ['10', '25', '25 + 10'];
const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';
const CLAVE_DISCOS = 'calculadora-discos:v1:discos';

// ADR-0008 §3.1: el aviso caduca a los 5 s en tiempo real, y axe puede tardar.
// Por eso, en este fichero no se analiza entre restaurar y pulsar "Deshacer":
// el aviso de restaurar lo analizan los tests que no lo pulsan después (AC-03,
// AC-05, AC-07 con "150").

// Arranca de cero con la lista `lista` guardada y, si se dan, los discos
// habilitados `discos` (en kg).
async function arrancarCon(page, lista, discos) {
  await page.evaluate(([cp, l, cd, d]) => {
    localStorage.setItem(cp, JSON.stringify(l));
    if (d) localStorage.setItem(cd, JSON.stringify(d));
  }, [CLAVE_PORCENTAJES, lista, CLAVE_DISCOS, discos]);
  await page.reload();
  await expect(restaurar(page)).toBeVisible();
}

// La lista de porcentajes guardada.
const guardada = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLAVE_PORCENTAJES);

// Si las cajas de dos elementos se solapan.
async function solapan(a, b) {
  const [x, y] = [await a.boundingBox(), await b.boundingBox()];
  return x.x < y.x + y.width && y.x < x.x + x.width && x.y < y.y + y.height && y.y < x.y + x.height;
}

// FR-01: el botón está justo debajo de `encima`, sin nada entre los dos.
async function justoDebajo(page, encima) {
  const arriba = await encima.boundingBox();
  const boton = await restaurar(page).boundingBox();
  const hueco = boton.y - (arriba.y + arriba.height);
  expect(hueco).toBeGreaterThanOrEqual(0);
  expect(hueco).toBeLessThanOrEqual(8);
}

test.beforeEach(async ({ page }) => {
  await abrirSinDatos(page);
});

test('SPEC-CALC-004/AC-01 sin botón con 40, 70 y 90; al borrar el 70 aparece debajo de añadir y "Deshacer" lo quita', async ({ page }) => {
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await expect(restaurar(page)).toBeHidden();
  await expect(restaurarAccesible(page)).toHaveCount(0);
  // Con el teclado, del último control de la página no se pasa a él.
  await abrir(page).focus();
  await page.keyboard.press('Tab');
  await expect(restaurar(page)).not.toBeFocused();

  await quitarSerie(page, 70);
  await expect(restaurarAccesible(page)).toBeVisible();
  await justoDebajo(page, abrir(page));
  await expect(restaurar(page)).toHaveCSS('border-top-style', 'none');
  await expect(restaurar(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const caja = await restaurar(page).boundingBox();
  expect(caja.width).toBeGreaterThanOrEqual(44);
  expect(caja.height).toBeGreaterThanOrEqual(44);
  // SPEC-CALC-003 NFR-02: 4,5:1 frente a su fondo.
  await instalarContraste(page);
  const r = await restaurar(page).evaluate((el) => window.medidasContraste.textos([el]));
  expect(r).toEqual({ fallos: [], medidos: 1 });
  await analizarConAxe(page);

  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await expect(restaurar(page)).toBeHidden();
  await expect(restaurarAccesible(page)).toHaveCount(0);
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-02 se ve con la lista vacía y el peso vacío, junto a sus indicaciones', async ({ page }) => {
  await arrancarCon(page, []);
  await trabajo(page).fill('');
  await expect(restaurarAccesible(page)).toBeVisible();
  await expect(page.getByText('Escribe el peso de trabajo.')).toBeVisible();
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-02 se ve con 40, 70, 90 y 100', async ({ page }) => {
  await anadirPorcentaje(page, '100');
  await expect(porcentajesDeSeries(page)).toHaveText([...HABITUAL, '100 %']);
  await expect(restaurarAccesible(page)).toBeVisible();
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-02 se ve con 40 y 70 y ningún disco habilitado', async ({ page }) => {
  await arrancarCon(page, [40, 70], []);
  await expect(series(page)).toHaveCount(0);
  await expect(page.getByText('Habilita al menos un disco en Mis discos.')).toBeVisible();
  await expect(restaurarAccesible(page)).toBeVisible();
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-02 con el campo de añadir abierto y 40 y 70, está justo debajo del campo', async ({ page }) => {
  await arrancarCon(page, [40, 70]);
  await abrir(page).click();
  await expect(campo(page)).toBeFocused();
  await expect(restaurarAccesible(page)).toBeVisible();
  await justoDebajo(page, page.locator('#form-porcentaje'));
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-03 con 50 y 80, restaura 40, 70 y 90 con el aviso, y se guarda', async ({ page }) => {
  await arrancarCon(page, [50, 80]);
  await restaurar(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await expect(page.locator('#series .total')).toHaveText(['40 kg', '70 kg', '90 kg']);
  expect(await discosDeSeries(page)).toEqual(SERIES_AC01);
  // El aviso, en la región que anuncian los lectores de pantalla (SPEC-CALC-003 FR-08).
  await expect(page.getByRole('status').filter({ has: aviso(page) })).toContainText(RESTAURADOS);
  await expect(aviso(page)).toBeVisible();
  await expect(deshacer(page)).toBeVisible();
  expect(await solapan(aviso(page), abrir(page))).toBe(false);
  await expect(restaurar(page)).toBeHidden();
  await expect(restaurarAccesible(page)).toHaveCount(0);
  await analizarConAxe(page);
  expect(await guardada(page)).toEqual([40, 70, 90]);
  await page.reload();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
});

test('SPEC-CALC-004/AC-03 "Deshacer" vuelve a 50 y 80, cierra el aviso, el botón vuelve y se guarda', async ({ page }) => {
  await arrancarCon(page, [50, 80]);
  await restaurar(page).click();
  await expect(aviso(page)).toContainText(RESTAURADOS);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
  await expect(aviso(page)).toBeHidden();
  await expect(restaurarAccesible(page)).toBeVisible();
  await analizarConAxe(page);
  await page.reload();
  await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
});

test('SPEC-CALC-004/AC-04 con la lista vacía, restaurar y "Deshacer" la dejan vacía, también al arrancar', async ({ page }) => {
  await arrancarCon(page, []);
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
  await restaurar(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await expect(aviso(page)).toContainText(RESTAURADOS);
  await deshacer(page).click();
  await expect(series(page)).toHaveCount(0);
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
  await analizarConAxe(page);
  await page.reload();
  await expect(series(page)).toHaveCount(0);
  await expect(page.getByText('Añade al menos un porcentaje.')).toBeVisible();
});

test.describe('SPEC-CALC-004/AC-05 lo que cierra el aviso y lo que no', () => {
  test.beforeEach(async ({ page }) => {
    await arrancarCon(page, [50, 80]);
    await restaurar(page).click();
    await expect(aviso(page)).toContainText(RESTAURADOS);
  });

  test('añadir el 50 lo cierra y el 50 se queda', async ({ page }) => {
    await anadirPorcentaje(page, '50');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
    await expect(aviso(page)).toBeHidden();
    await analizarConAxe(page);
  });

  test('intentar añadir el 70, "150" o un porcentaje vacío no lo cierra', async ({ page }) => {
    await anadirPorcentaje(page, '70');
    await expect(error(page)).toHaveText('Ya tienes una serie del 70 %.');
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await campo(page).fill('150');
    await confirmar(page).click();
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await analizarConAxe(page);
    await campo(page).fill('');
    await confirmar(page).click();
    await expect(campo(page)).toBeHidden();
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  });

  test('borrar el 70 lo sustituye por el del borrado, cuyo "Deshacer" devuelve 40, 70 y 90', async ({ page }) => {
    await quitarSerie(page, 70);
    await expect(aviso(page)).not.toContainText(RESTAURADOS);
    await deshacer(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await expect(aviso(page)).toBeHidden();
    await analizarConAxe(page);
  });

  test('escribir 105 en el peso de trabajo lo cierra', async ({ page }) => {
    await trabajo(page).fill('105');
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  });

  const acciones = {
    'activar los collarines': (page) => page.getByRole('switch', { name: /Collarines/ }).check(),
    'deshabilitar el disco de 25 kg': (page) => disco(page, '25 kg').click(),
    'pasar al modo Dos lados': (page) => page.getByLabel('Dos lados').check(),
    'elegir la olímpica de 15 kg': (page) => barra(page, 'Olímpica 15 kg').check(),
  };
  for (const [nombre, accion] of Object.entries(acciones)) {
    test(`${nombre} lo cierra`, async ({ page }) => {
      await desplegarPaneles(page);
      await expect(aviso(page)).toContainText(RESTAURADOS);
      await accion(page);
      await expect(aviso(page)).toBeHidden();
      await expect(deshacer(page)).toHaveCount(0);
      await analizarConAxe(page);
    });
  }
});

// El reloj controlado (SPEC-CALC-004 §11), como en anadir-borrar.spec.js: se
// instala, se recarga la app y se para. Desde entonces los temporizadores solo
// corren al avanzarlo.
async function pararReloj(page) {
  await page.clock.install();
  await page.reload();
  // ADR-0008 §3.2: con el reloj parado, analyze() no funciona: se analiza
  // antes. El aviso de restaurar y lo que lo cierra los analizan los tests sin
  // reloj de este fichero.
  await analizarConAxe(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

// La salida de lado y el cierre del hueco de una tarjeta borrada, como mucho
// (SALIDA_MS + CIERRE_MS de app.js).
const ANIMACION_MS = 400 + 450;


test.describe('SPEC-CALC-004/AC-05 el plazo de 5 s', () => {
  test.beforeEach(async ({ page }) => {
    await arrancarCon(page, [50, 80]);
    await pararReloj(page);
  });

  test('a los 5 s el aviso ha desaparecido y la lista sigue siendo 40, 70 y 90', async ({ page }) => {
    await restaurar(page).click();
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await page.clock.runFor(4999);
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await page.clock.runFor(1);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await expect(deshacer(page)).toHaveCount(0);
  });

  test('tras 6 s en segundo plano, al volver el aviso ya no está', async ({ page }) => {
    await restaurar(page).click();
    await expect(aviso(page)).toContainText(RESTAURADOS);
    const inicio = await page.evaluate(() => Date.now());
    // En segundo plano, como en iOS, los temporizadores no corren: solo cambia
    // la hora (setSystemTime no dispara ninguno).
    const visibilidad = (estado) => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
    await page.evaluate(`(${visibilidad})('hidden'); document.dispatchEvent(new Event('visibilitychange'));`);
    await page.clock.setSystemTime(inicio + 6000);
    await page.evaluate(`(${visibilidad})('visible'); document.dispatchEvent(new Event('visibilitychange'));`);
    await expect(aviso(page)).toBeHidden();
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  });
});

test('SPEC-CALC-004/AC-06 restaurar con el aviso del borrado lo sustituye y "Deshacer" devuelve 40 y 90', async ({ page }) => {
  await quitarSerie(page, 70);
  await expect(restaurarAccesible(page)).toBeVisible();
  expect(await solapan(aviso(page), restaurar(page))).toBe(false);
  await restaurar(page).click();
  await expect(aviso(page)).toContainText(RESTAURADOS);
  await expect(aviso(page)).not.toContainText('Serie del 70 % borrada');
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '90 %']);
  await expect(aviso(page)).toBeHidden();
});

test('SPEC-CALC-004/AC-06 el aviso dura 5 s desde que aparece "Porcentajes restaurados", no desde el borrado', async ({ page }) => {
  await pararReloj(page);
  await botonQuitar(page, 70).press('Enter');
  await page.clock.runFor(ANIMACION_MS);
  await expect(aviso(page)).toContainText('Serie del 70 % borrada');
  await page.clock.runFor(3000);
  await restaurar(page).click();
  await expect(aviso(page)).toContainText(RESTAURADOS);
  await page.clock.runFor(4999);
  await expect(aviso(page)).toContainText(RESTAURADOS);
  await page.clock.runFor(1);
  await expect(aviso(page)).toBeHidden();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
});

// FR-02: pulsa el botón sin soltarlo, deja que `mientras` compruebe lo que ha
// pasado con el toque ya empezado, y lo suelta.
async function pulsarRestaurar(page, mientras) {
  await restaurar(page).scrollIntoViewIfNeeded();
  const caja = await restaurar(page).boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await mientras(caja);
  await page.mouse.up();
}

test.describe('SPEC-CALC-004/AC-07 restaurar con el campo de añadir abierto', () => {
  test.beforeEach(async ({ page }) => {
    await arrancarCon(page, [40, 70]);
    await abrir(page).click();
  });

  test('con "90", se añade el 90, no hay aviso y el foco pasa a añadir aunque el botón desaparezca antes de soltar', async ({ page }) => {
    await campo(page).pressSequentially('90');
    await pulsarRestaurar(page, async () => {
      await expect(restaurar(page)).toBeHidden();
    });
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await expect(aviso(page)).toBeHidden();
    await expect(page.getByText(RESTAURADOS)).toHaveCount(0);
    await expect(restaurar(page)).toBeHidden();
    await expect(abrir(page)).toBeFocused();
    await analizarConAxe(page);
  });

  test('con "55", restaura y el foco pasa a "Deshacer" aunque el botón cambie de sitio; "Deshacer" da 40, 55 y 70', async ({ page }) => {
    await campo(page).pressSequentially('55');
    await pulsarRestaurar(page, async (antes) => {
      await expect(campo(page)).toBeHidden();
      const ahora = await restaurar(page).boundingBox();
      expect(ahora.y).not.toBe(antes.y);
    });
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await expect(deshacer(page)).toBeFocused();
    await deshacer(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %']);
    await analizarConAxe(page);
  });

  test('con "150", el campo sigue abierto con su mensaje, restaura y el foco pasa a "Deshacer"', async ({ page }) => {
    await campo(page).pressSequentially('150');
    await restaurar(page).click();
    await expect(campo(page)).toBeVisible();
    await expect(campo(page)).toHaveValue('150');
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await expect(deshacer(page)).toBeFocused();
    await analizarConAxe(page);
  });
});

// SPEC-CALC-002 FR-09: el aviso de fallo sigue mientras la lista no coincida
// con la última que se guardó bien. Para que ni la restaurada ni la de antes
// coincidan, la última guardada es 40, 50, 70 y 90, y 50 y 80 se hacen ya sin
// poder guardar.
test('SPEC-CALC-004/AC-08 sin poder guardar, restaurar y "Deshacer" funcionan y el aviso de fallo sigue', async ({ page }) => {
  const FALLO = 'No se ha podido guardar: se mantendrá hasta cerrar la app';
  await anadirPorcentaje(page, '50');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '50 %', '70 %', '90 %']);
  await romperAlmacen(page);
  for (const p of [40, 70, 90]) await quitarSerie(page, p);
  await anadirPorcentaje(page, '80');
  await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
  await expect(page.getByText(FALLO)).toBeVisible();

  await restaurar(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  expect(await discosDeSeries(page)).toEqual(SERIES_AC01);
  await expect(page.getByText(FALLO)).toBeVisible();
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
  await expect(page.getByText(FALLO)).toBeVisible();
  await analizarConAxe(page);
});

test('SPEC-CALC-004/AC-09 con el teclado, el foco pasa a "Deshacer" y, al activarlo, a añadir', async ({ page }) => {
  await arrancarCon(page, [50, 80]);
  await restaurar(page).focus();
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
  await expect(deshacer(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
  await expect(abrir(page)).toBeFocused();
  await analizarConAxe(page);
});

test.describe('SPEC-CALC-004/AC-09 el foco cuando el aviso desaparece', () => {
  test.beforeEach(async ({ page }) => {
    await arrancarCon(page, [50, 80]);
    await pararReloj(page);
    await restaurar(page).focus();
    await page.keyboard.press('Enter');
    await expect(deshacer(page)).toBeFocused();
  });

  test('si se queda en "Deshacer", a los 5 s pasa a añadir', async ({ page }) => {
    await page.clock.runFor(5000);
    await expect(aviso(page)).toBeHidden();
    await expect(abrir(page)).toBeFocused();
  });

  test('si la persona lo lleva al peso de trabajo, se queda allí', async ({ page }) => {
    await trabajo(page).focus();
    await page.clock.runFor(5000);
    await expect(aviso(page)).toBeHidden();
    await expect(trabajo(page)).toBeFocused();
  });
});

test.describe('SPEC-CALC-004/AC-12 "Deshacer" con el campo de añadir abierto', () => {
  test.beforeEach(async ({ page }) => {
    await arrancarCon(page, [50, 80]);
    await restaurar(page).click();
    await expect(aviso(page)).toContainText(RESTAURADOS);
    await abrir(page).click();
  });

  // El campo sigue abierto con `texto`, sin mensaje, y la lista es 50 y 80.
  async function deshecho(page, texto) {
    await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
    await expect(campo(page)).toBeVisible();
    await expect(campo(page)).toHaveValue(texto);
    await expect(error(page)).toBeHidden();
    await expect(aviso(page)).toBeHidden();
  }

  test('con "55", al pulsar "Deshacer" no se añade; al confirmar después, sí', async ({ page }) => {
    await campo(page).pressSequentially('55');
    await deshacer(page).click();
    await deshecho(page, '55');
    await expect(campo(page)).toBeFocused();
    await analizarConAxe(page);
    await page.keyboard.press('Enter');
    await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '55 %', '80 %']);
  });

  test('con el teclado, desde el campo con "55", llevar el foco a "Deshacer" y activarlo no añade el 55', async ({ page }) => {
    await campo(page).pressSequentially('55');
    await page.keyboard.press('Shift+Tab');
    await expect(deshacer(page)).toBeFocused();
    await expect(campo(page)).toHaveValue('55');
    await expect(porcentajesDeSeries(page)).toHaveText(HABITUAL);
    await page.keyboard.press('Enter');
    await deshecho(page, '55');
    await expect(campo(page)).toBeFocused();
  });

  test('con "70" y su mensaje, "Deshacer" lo quita; al confirmar, se añade el 70', async ({ page }) => {
    await campo(page).pressSequentially('70');
    await page.keyboard.press('Enter');
    await expect(error(page)).toHaveText('Ya tienes una serie del 70 %.');
    await deshacer(page).click();
    await deshecho(page, '70');
    await confirmar(page).click();
    await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '70 %', '80 %']);
  });

  test('con "150" y su mensaje, "Deshacer" lo quita; al confirmar, vuelve', async ({ page }) => {
    await campo(page).pressSequentially('150');
    await page.keyboard.press('Enter');
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await deshacer(page).click();
    await deshecho(page, '150');
    await confirmar(page).click();
    await expect(error(page)).toHaveText('Escribe un porcentaje entre 1 y 100.');
    await expect(porcentajesDeSeries(page)).toHaveText(['50 %', '80 %']);
  });

  // El AC dice "a «+ Añadir porcentaje»", que no se ve mientras el campo está
  // abierto (SPEC-CALC-003 FR-09): el foco sale de "Deshacer" hacia el control
  // anterior, el "Quitar" de la última tarjeta (FR-03: "hacia otro sitio").
  test('con el teclado, si el foco sale de "Deshacer" a otro sitio sin activarlo, se añade el 55 y el aviso se cierra', async ({ page }) => {
    await campo(page).pressSequentially('55');
    await page.keyboard.press('Shift+Tab');
    await expect(deshacer(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %', '90 %']);
    await expect(aviso(page)).toBeHidden();
    await expect(campo(page)).toBeHidden();
  });
});
