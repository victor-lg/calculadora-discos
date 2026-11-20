// Ajustes de SPEC-CALC-003 frente a la referencia visual de §11
// (docs/diseno/maqueta-interfaz.html y notas-diseno-interfaz.md §3.6 y §6),
// tras la prueba en el iPhone de AC-24. Lo que solo fija la referencia visual
// cita AC-24, que es donde se acepta; la prueba manual sigue haciendo falta.
import { test, expect } from './sin-dibujo.js';
import { trabajo, pesoBarra, barra, botonCarga, botonDiscos, desplegarPaneles, cargarFuentes, deslizar, botonQuitar, tarjeta } from './pantalla.js';
import { analizarConAxe } from './axe.js';

const GRIS = 'rgb(166, 171, 179)';
const ROJO = 'rgb(229, 72, 77)';

// El número del peso de trabajo y su "kg", con sus estilos calculados.
const medirPeso = (page) => page.evaluate(() => {
  const numero = getComputedStyle(document.getElementById('trabajo-auto'));
  const unidad = getComputedStyle(document.querySelector('.peso-campo .unidad'));
  return {
    numero: [numero.fontSize, numero.fontWeight, numero.fontFamily.split(',')[0].replace(/"/g, '')],
    unidad: [unidad.fontSize, unidad.color],
  };
});

// Retrasa las fuentes de la app, como en el iPhone la primera vez (o tras
// vaciar la caché): la app pinta antes de que llegue Barlow.
async function retrasarFuentes(page, ms) {
  await page.route('**/fuentes/*.woff2', async (ruta) => {
    await new Promise((r) => setTimeout(r, ms));
    await ruta.continue();
  });
}

test.describe('SPEC-CALC-003/AC-02 FR-02 el número del peso de trabajo', () => {
  test('a 390 px, 64 px en Barlow Semi Condensed 600, con "kg" a 24 px en gris', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await retrasarFuentes(page, 600);
    await page.goto('./');
    await cargarFuentes(page);
    await expect.poll(() => medirPeso(page)).toEqual({
      numero: ['64px', '600', 'Barlow Semi Condensed'],
      unidad: ['24px', GRIS],
    });
    await analizarConAxe(page);
  });

  test('a 360 px, 52 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('./');
    await cargarFuentes(page);
    await expect.poll(async () => (await medirPeso(page)).numero[0]).toBe('52px');
    await analizarConAxe(page);
  });

  // FR-02: el número solo se reduce si no cabe. A 195 px (el zoom al 200 % de
  // NFR-03), "102,5" no cabe a 52 px con la fuente de reserva de WebKit, más
  // ancha, y con Barlow sí. Al llegar Barlow, el número vuelve a su tamaño. En
  // Chromium la de reserva ya cabe, así que no hay nada que volver a medir.
  test('se vuelve a medir cuando llega Barlow', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'solo WebKit reduce el número con la fuente de reserva');
    await page.setViewportSize({ width: 195, height: 422 });
    await page.addInitScript(() => localStorage.setItem('calculadora-discos:v1:trabajo', JSON.stringify('102,5')));
    await retrasarFuentes(page, 1500);
    // Sin esperar a load, que en WebKit espera también a las fuentes.
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expect(trabajo(page)).toHaveValue('102,5');
    // Antes de que llegue Barlow, con la de reserva, el número está reducido.
    expect(parseFloat((await medirPeso(page)).numero[0])).toBeLessThan(52);
    await cargarFuentes(page);
    await expect.poll(async () => (await medirPeso(page)).numero[0]).toBe('52px');
    await analizarConAxe(page);
  });

  // En el iPhone, el campo de texto desborda unos píxeles aunque el número
  // quepa (el cursor). Aquí se simula con 3 px más de relleno en el campo:
  // el número no se puede reducir por eso.
  test('no se reduce porque el campo desborde aunque el número quepa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await cargarFuentes(page);
    await page.evaluate(() => {
      document.getElementById('trabajo').style.paddingRight = '6px';
      window.dispatchEvent(new Event('resize'));
    });
    expect(await page.evaluate(() => {
      const i = document.getElementById('trabajo');
      return i.scrollWidth - i.clientWidth;
    })).toBeGreaterThan(1);
    expect((await medirPeso(page)).numero[0]).toBe('64px');
    await trabajo(page).fill('102,55');
    expect((await medirPeso(page)).numero[0]).toBe('64px');
    await analizarConAxe(page);
  });

  test('si no cabe, se reduce hasta caber junto a "kg"', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await page.goto('./');
    await cargarFuentes(page);
    await trabajo(page).fill('102,55');
    const m = await page.evaluate(() => {
      const campo = document.querySelector('.peso-campo').getBoundingClientRect();
      const numero = document.getElementById('trabajo-auto').getBoundingClientRect();
      const unidad = document.querySelector('.peso-campo .unidad').getBoundingClientRect();
      return { tamano: parseFloat(getComputedStyle(document.getElementById('trabajo-auto')).fontSize), dentro: unidad.right <= campo.right + 0.5, pegado: unidad.left >= numero.right };
    });
    expect(m.tamano).toBeLessThan(64);
    expect(m.tamano).toBeGreaterThan(24);
    expect(m).toMatchObject({ dentro: true, pegado: true });
    await analizarConAxe(page);
  });
});

// Abre la app a 390 × 844 px, el ancho de SPEC-CALC-003 §5.
async function abrirA390(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await analizarConAxe(page);
}

test.describe('SPEC-CALC-003/AC-24 referencia visual de §11', () => {
  test.beforeEach(async ({ page }) => {
    await abrirA390(page);
  });

  test('(FR-06) el "kg" del total de cada tarjeta, a 16 px, peso 500 y en gris', async ({ page }) => {
    const total = tarjeta(page, 70).locator('.total');
    await expect(total).toHaveText('70 kg');
    const kg = total.locator('small');
    await expect(kg).toHaveText(' kg');
    await expect(kg).toHaveCSS('font-size', '16px');
    await expect(kg).toHaveCSS('font-weight', '500');
    await expect(kg).toHaveCSS('color', GRIS);
    await expect(total).toHaveCSS('font-size', '34px');
  });

  test('(FR-03) el círculo del interruptor de collarines, centrado en vertical en la pastilla', async ({ page }) => {
    await desplegarPaneles(page);
    const centros = () => page.evaluate(() => {
      const input = document.getElementById('collarines');
      const caja = input.getBoundingClientRect();
      const centro = (pseudo) => {
        const s = getComputedStyle(input, pseudo);
        const dy = new DOMMatrixReadOnly(s.transform === 'none' ? undefined : s.transform).m42;
        // El alto de la caja entera, con borde y relleno.
        const extra = s.boxSizing === 'border-box' ? 0
          : ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'].reduce((t, p) => t + parseFloat(s[p]), 0);
        return parseFloat(s.top) + (parseFloat(s.height) + extra) / 2 + dy;
      };
      return { pista: centro('::before'), circulo: centro('::after'), alto: caja.height };
    });
    for (const activado of [false, true]) {
      if (activado) await page.locator('label.interruptor').click();
      await expect(page.getByRole('switch', { name: 'Collarines de competición' })).toBeChecked({ checked: activado });
      await analizarConAxe(page);
      const c = await centros();
      expect(Math.abs(c.circulo - c.pista), JSON.stringify(c)).toBeLessThan(0.5);
      expect(Math.abs(c.pista - c.alto / 2), JSON.stringify(c)).toBeLessThan(0.5);
    }
  });

  // Como en la referencia: pista de 46 × 28 px y círculo de 22 px, a 3 px del
  // borde de la pista arriba, abajo y en el lado en que está, apagado y
  // encendido.
  test('(FR-03) el círculo del interruptor de collarines, con los mismos márgenes apagado y encendido', async ({ page }) => {
    await desplegarPaneles(page);
    const margenes = () => page.evaluate(() => {
      const input = document.getElementById('collarines');
      const pista = getComputedStyle(input, '::before');
      const circulo = getComputedStyle(input, '::after');
      const dx = new DOMMatrixReadOnly(circulo.transform).m41;
      const izquierda = parseFloat(circulo.left) + dx - parseFloat(pista.left);
      const ancho = parseFloat(circulo.width);
      return {
        pista: [parseFloat(pista.width), parseFloat(pista.height)],
        circulo: ancho,
        izquierda,
        derecha: parseFloat(pista.width) - izquierda - ancho,
        vertical: (parseFloat(pista.height) - parseFloat(circulo.height)) / 2,
      };
    });
    const apagado = await margenes();
    expect(apagado).toMatchObject({ pista: [46, 28], circulo: 22, izquierda: 3, vertical: 3 });
    await analizarConAxe(page);
    await page.locator('label.interruptor').click();
    await expect(page.getByRole('switch', { name: 'Collarines de competición' })).toBeChecked();
    await analizarConAxe(page);
    const encendido = await margenes();
    expect(encendido).toMatchObject({ pista: [46, 28], circulo: 22, derecha: 3, vertical: 3 });
  });

  // NFR-01: vacío, el peso de trabajo conserva sitio donde tocar.
  test('(FR-02) el peso de trabajo vacío mide al menos 44 px de ancho y se puede volver a tocar', async ({ page }) => {
    await trabajo(page).fill('');
    await trabajo(page).blur();
    await analizarConAxe(page);
    const caja = await trabajo(page).boundingBox();
    expect(caja.width).toBeGreaterThanOrEqual(44);
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await expect(trabajo(page)).toBeFocused();
    await analizarConAxe(page);
  });

  test('(FR-03) un peso de barra no válido tiene el borde rojo también con el foco', async ({ page }) => {
    await desplegarPaneles(page);
    await barra(page, 'Z').check();
    const campo = pesoBarra(page);
    await campo.fill('8');
    await expect(campo).toBeFocused();
    await expect(campo).not.toHaveCSS('border-top-color', ROJO);
    await analizarConAxe(page);
    await campo.fill('0,5');
    await expect(campo).toBeFocused();
    await expect(campo).toHaveCSS('border-top-color', ROJO);
    await analizarConAxe(page);
    await campo.blur();
    await expect(campo).toHaveCSS('border-top-color', ROJO);
    await analizarConAxe(page);
  });

  test('(FR-04) el título de Mis discos como el de la referencia y los pesos sin "kg"', async ({ page }) => {
    const titulo = page.locator('#titulo-discos');
    await expect(titulo).toHaveText('Mis discos');
    await expect(titulo).toHaveCSS('text-transform', 'none');
    await expect(titulo).toHaveCSS('font-size', '15px');
    await expect(titulo).toHaveCSS('font-weight', '600');
    await expect(titulo).toHaveCSS('color', 'rgb(241, 242, 244)');
    // "Carga" conserva su estilo.
    await expect(page.locator('#titulo-carga')).toHaveCSS('text-transform', 'uppercase');
    await expect(botonDiscos(page)).toHaveAccessibleName('Mis discos: 7 de 7 habilitados');

    await botonDiscos(page).click();
    // Se ve el peso sin "kg", y se anuncia con "kg".
    const visibles = await page.locator('#lista-discos .peso-disco').evaluateAll((pesos) => pesos.map((p) => {
      const copia = p.cloneNode(true);
      copia.querySelectorAll('.oculto').forEach((el) => el.remove());
      return copia.textContent;
    }));
    await expect(page.locator('#lista-discos .peso-disco .oculto').first()).toHaveCSS('clip-path', 'inset(50%)');
    expect(visibles).toEqual(['25', '20', '15', '10', '5', '2,5', '1,25']);
    await expect(page.getByLabel('25 kg', { exact: true })).toBeChecked();
    await expect(page.getByLabel('1,25 kg', { exact: true })).toBeChecked();
    await analizarConAxe(page);
  });

  test('(FR-05) los avisos generales llevan el icono de aviso de la referencia', async ({ page }) => {
    await trabajo(page).fill('');
    const avisos = page.locator('#avisos > .aviso:not([hidden])');
    await expect(avisos).toHaveText(['Escribe el peso de trabajo.']);
    const icono = avisos.first().locator('svg');
    await expect(icono).toHaveAttribute('aria-hidden', 'true');
    await expect(icono).toHaveCSS('width', '16px');
    await expect(icono).toHaveCSS('color', GRIS);
    // El triángulo con su exclamación (ICON_INFO de la maqueta).
    await expect(icono.locator('path')).toHaveCount(2);
    await analizarConAxe(page);
  });
});

// FR-08 y notas §3.5: la tarjeta sale de lado en 200 ms y su hueco se cierra
// en 260 ms con cubic-bezier(.2,.8,.2,1) y opacidad, sin saltos.
test.describe('SPEC-CALC-003/AC-11 borrar con el gesto', () => {
  test.beforeEach(async ({ page }) => {
    await abrirA390(page);
  });

  test('la tarjeta sale de lado y su hueco se cierra con transición, sin saltos', async ({ page }) => {
    const t70 = tarjeta(page, 70);
    const t90 = tarjeta(page, 90);
    const inicio90 = (await t90.boundingBox()).y;
    const inicio70 = (await t70.boundingBox()).y;
    // Registra la posición de la tarjeta del 90 % en cada fotograma, y las
    // transiciones de la tarjeta que se borra. Además, en cuanto empieza el
    // cierre del hueco, lleva sus transiciones a 0, 52, 104… 260 ms y mide la
    // del 90 % en cada momento: no depende de cuántos fotogramas pinte el
    // navegador.
    await page.evaluate(() => {
      window.registro = { posiciones: [], transiciones: [], muestras: null };
      // Anota cada transición nueva de `el` y sus descendientes.
      const anotar = (el) => {
        for (const a of el.getAnimations({ subtree: true })) {
          const clave = `${a.transitionProperty} ${a.effect.getTiming().duration} ${a.effect.getTiming().easing}`;
          if (!window.registro.transiciones.includes(clave)) window.registro.transiciones.push(clave);
        }
      };
      const ver = () => {
        const li = [...document.querySelectorAll('#series > li')];
        const t90 = li.find((el) => el.querySelector('.porcentaje').textContent === '90 %');
        window.registro.posiciones.push(t90.getBoundingClientRect().y);
        const cierra = li.find((el) => el.classList.contains('se-cierra'));
        if (cierra && !window.registro.muestras) {
          const animaciones = cierra.getAnimations();
          const antes = animaciones.map((a) => a.currentTime);
          window.registro.muestras = [0, 52, 104, 156, 208, 260].map((ms) => {
            for (const a of animaciones) a.currentTime = ms;
            return t90.getBoundingClientRect().y;
          });
          animaciones.forEach((a, i) => { a.currentTime = antes[i]; });
        }
        for (const el of li) anotar(el);
        if (window.registro.posiciones.length < 120) requestAnimationFrame(ver);
      };
      requestAnimationFrame(ver);
      // Las transiciones también se anotan en cuanto cambian las clases o el
      // estilo de las tarjetas: WebKit sin pantalla, con carga, pinta pocos
      // fotogramas y la salida de 200 ms podía empezar y acabar entre dos.
      const series = document.getElementById('series');
      new MutationObserver(() => anotar(series)).observe(series, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    });
    await deslizar(page, t70, 0.5);
    await expect(page.locator('#series .porcentaje')).toHaveText(['40 %', '90 %']);
    await expect.poll(async () => (await t90.boundingBox()).y).toBe(inicio70);
    const { posiciones, transiciones, muestras } = await page.evaluate(() => window.registro);

    expect(transiciones).toEqual(expect.arrayContaining([
      'transform 200 ease-in',
      'height 260 cubic-bezier(0.2, 0.8, 0.2, 1)',
      'margin-bottom 260 cubic-bezier(0.2, 0.8, 0.2, 1)',
    ]));
    expect(transiciones.some((t) => t.startsWith('opacity '))).toBe(true);
    // La del 90 % sube poco a poco, sin bajar nunca, y acaba en el sitio del
    // 70 %. Durante el cierre pasa por posiciones intermedias en lugar de
    // saltar.
    for (let i = 1; i < posiciones.length; i++) {
      expect(posiciones[i]).toBeLessThanOrEqual(posiciones[i - 1] + 0.5);
    }
    expect(Math.min(...posiciones)).toBeCloseTo(inicio70, 0);
    expect(muestras[0]).toBeCloseTo(inicio90, 0);
    expect(muestras.at(-1)).toBeCloseTo(inicio70, 0);
    // Con la curva de §6, a los 208 ms ya ha recorrido casi todo: las
    // intermedias que cuentan son las de 52, 104 y 156 ms.
    for (let i = 1; i < muestras.length; i++) expect(muestras[i]).toBeLessThanOrEqual(muestras[i - 1]);
    expect(muestras.slice(1, 4).every((y) => y < inicio90 - 1 && y > inicio70 + 1), JSON.stringify({ inicio90, inicio70, muestras })).toBe(true);
    await analizarConAxe(page);
  });

  test('con "Reducir movimiento", sin salida de lado ni cierre del hueco', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      window.transiciones = 0;
      document.addEventListener('transitionrun', () => { window.transiciones += 1; });
    });
    await deslizar(page, tarjeta(page, 70), 0.5);
    await expect(page.locator('#series .porcentaje')).toHaveText(['40 %', '90 %']);
    await analizarConAxe(page);
    // Con el botón "Quitar", lo mismo.
    await botonQuitar(page, 40).press('Enter');
    await expect(page.locator('#series .porcentaje')).toHaveText(['90 %']);
    expect(await page.evaluate(() => window.transiciones)).toBe(0);
    await analizarConAxe(page);
  });

  // FR-08: el botón "Quitar la serie del P %" hace lo mismo que el gesto: la
  // tarjeta sale de lado (200 ms) y después su hueco se cierra (260 ms). Hasta
  // entonces la lista no cambia.
  test('con el botón "Quitar", la misma salida de lado y el mismo cierre del hueco', async ({ page }) => {
    const t90 = tarjeta(page, 90);
    const inicio70 = (await tarjeta(page, 70).boundingBox()).y;
    // Las transiciones de las tarjetas, en cuanto cambian sus clases o su
    // estilo: WebKit sin pantalla apenas pinta fotogramas si no hay entrada, y
    // una transición puede empezar y acabar entre dos.
    await page.evaluate(() => {
      window.transiciones = [];
      const series = document.getElementById('series');
      new MutationObserver(() => {
        for (const a of series.getAnimations({ subtree: true })) {
          const clave = `${a.effect.target.className} ${a.transitionProperty} ${a.effect.getTiming().duration} ${a.effect.getTiming().easing}`;
          if (!window.transiciones.includes(clave)) window.transiciones.push(clave);
        }
      }).observe(series, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    });
    await botonQuitar(page, 70).press('Enter');
    await expect(page.locator('#series .porcentaje')).toHaveText(['40 %', '70 %', '90 %']);
    await expect(page.locator('#series .porcentaje')).toHaveText(['40 %', '90 %']);
    await expect.poll(async () => (await t90.boundingBox()).y).toBe(inicio70);
    expect(await page.evaluate(() => window.transiciones)).toEqual(expect.arrayContaining([
      'serie sale transform 200 ease-in',
      'deslizable arrastra listo se-cierra height 260 cubic-bezier(0.2, 0.8, 0.2, 1)',
      'deslizable arrastra listo se-cierra margin-bottom 260 cubic-bezier(0.2, 0.8, 0.2, 1)',
    ]));
    await expect(page.locator('#aviso-borrado')).toContainText('Serie del 70 % borrada');
    await analizarConAxe(page);
    // ADR-0008 §3.1: el aviso caduca a los 5 s; se comprueba después del análisis.
    await expect(page.locator('#aviso-borrado')).toContainText('Serie del 70 % borrada');
  });
});
