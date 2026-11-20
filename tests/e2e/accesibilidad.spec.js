// SPEC-CALC-003 NFR-01 a NFR-03 sobre toda la pantalla (AC-20 a AC-22). Cada
// test recorre los estados del AC y mide todo lo que se ve en cada uno, no una
// lista de controles: así cuenta también lo que se añada después.
import { test, expect } from '@playwright/test';
import {
  trabajo, pesoBarra, barra, botonCarga, botonDiscos, desplegarPaneles, anadirPorcentaje,
  botonQuitar, quitarSerie, deslizar, porcentajesDeSeries, cargarFuentes, FUENTES_CARGADAS,
  tarjeta, abrirAnadir as abrir, campoAnadir as campo, aviso, deshacer, disco, arrastrarSinSoltar,
} from './pantalla.js';
import { analizarConAxe } from './axe.js';

// Contraste de WCAG 2.x, compartido por las medidas de AC-21. Un color con
// transparencia se compone con lo que tiene debajo, también el fondo: se
// apilan los fondos de los antecesores hasta llegar a uno opaco.
function instalarContraste() {
  const rgba = (c) => {
    const n = c.match(/[\d.]+/g).map(Number);
    return n.length === 3 ? [...n, 1] : n;
  };
  const sobre = ([r, g, b, a], [fr, fg, fb]) => [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a), 1];
  const lum = ([r, g, b]) => {
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // El fondo que se ve detrás de `el`, como [r, g, b, 1].
  const fondo = (el) => {
    const capas = [];
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] === 0) continue;
      capas.push(c);
      if (c[3] === 1) break;
    }
    let base = [255, 255, 255, 1];
    if (!capas.length || capas.at(-1)[3] !== 1) base = rgba(getComputedStyle(document.documentElement).backgroundColor);
    if (base[3] !== 1) base = [255, 255, 255, 1];
    return capas.reverse().reduce((debajo, c) => sobre(c, debajo), base);
  };
  // `color` (texto CSS) sobre `debajo` ([r, g, b, 1]).
  const razon = (color, debajo) => {
    const [x, y] = [lum(sobre(rgba(color), debajo)), lum(debajo)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  window.contraste = { rgba, sobre, fondo, razon };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(instalarContraste);
  await page.goto('./');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await cargarFuentes(page)).toEqual(FUENTES_CARGADAS);
  await analizarConAxe(page);
});

// Los estados de AC-20, en orden: cada uno parte del anterior. Con 105 kg hay
// marcas de diferencia; con la Z se ve el campo del peso de la barra.
async function recorrerEstados(page, medir) {
  await trabajo(page).fill('105');
  await trabajo(page).blur();
  await expect(page.locator('.diferencia')).not.toHaveCount(0);
  await medir('paneles plegados');
  await analizarConAxe(page);

  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  await medir('paneles desplegados');
  await analizarConAxe(page);

  await abrir(page).click();
  await expect(campo(page)).toBeFocused();
  await medir('campo de añadir abierto');
  await analizarConAxe(page);
  await page.keyboard.press('Escape');

  await quitarSerie(page, 40);
  await expect(aviso(page)).toBeVisible();
  await medir('aviso de "Deshacer"');
  await analizarConAxe(page);
  // ADR-0008 §3.1: el aviso caduca a los 5 s; se comprueba después del análisis.
  await expect(aviso(page)).toBeVisible();

  await botonQuitar(page, 70).focus();
  await medir('"Quitar la serie del 70 %" con el foco');
  await analizarConAxe(page);
}

// Lo que se puede pulsar y se ve. Los radios y casillas transparentes cubren su
// etiqueta entera (estilos.css), así que su caja es la zona de toque.
const pulsables = (page) => page.evaluate(() => {
  const sel = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
  return [...document.querySelectorAll(sel)]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      // Los "Quitar" sin foco están ocultos a la vista con 1 × 1 px (FR-08).
      return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
        && !(r.width <= 1 && r.height <= 1 && el.matches('.quitar'));
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      const nombre = el.getAttribute('aria-label') || el.labels?.[0]?.textContent.trim() || el.textContent.trim() || el.id;
      return { nombre: `${el.tagName.toLowerCase()} "${nombre}"`, ancho: r.width, alto: r.height, clase: el.className };
    });
});

test('SPEC-CALC-003/AC-20 a 390 px, todo lo que se puede pulsar mide al menos 44 × 44 px en cada estado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await recorrerEstados(page, async (estado) => {
    const lista = await pulsables(page);
    const pequenos = lista.filter((c) => c.ancho < 44 || c.alto < 44)
      .map((c) => `${c.nombre}: ${c.ancho.toFixed(1)} × ${c.alto.toFixed(1)}`);
    expect(pequenos, estado).toEqual([]);
    const hay = (sel) => lista.some((c) => c.clase.split(' ').includes(sel));
    expect(hay('pliegue'), estado).toBe(true);
    expect(hay('diferencia'), estado).toBe(true);
    if (estado === 'paneles desplegados') {
      // Modos, fichas, interruptor, peso de la barra y tipos de Mis discos.
      expect(lista.filter((c) => c.nombre.startsWith('input')).length, estado).toBe(1 + 3 + 4 + 1 + 1 + 7);
    }
    if (estado.startsWith('"Quitar')) expect(hay('quitar'), estado).toBe(true);
    if (estado === 'campo de añadir abierto') expect(hay('confirmar') && hay('cancelar'), estado).toBe(true);
    if (estado.startsWith('aviso')) expect(lista.some((c) => c.nombre.includes('Deshacer')), estado).toBe(true);
  });
});

// Mide el contraste (WCAG 2.x) de cada texto que se ve, del valor y el marcador
// de los campos y de los indicadores que no son texto de NFR-02.
const medirContraste = (page) => page.evaluate(() => {
  const { rgba, sobre, fondo, razon } = window.contraste;
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    && !el.closest('.oculto') && el.getBoundingClientRect().width > 1;
  const esGrande = (s) => parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);

  const fallos = [];
  const textos = [];
  const texto = (el, color, s, nombre) => {
    textos.push(nombre);
    const r = razon(color, fondo(el));
    if (r < (esGrande(s) ? 3 : 4.5)) fallos.push(`${nombre}: ${r.toFixed(2)}`);
  };
  for (const el of document.querySelectorAll('main, main *')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (el.matches('input:not([type=radio], [type=checkbox])')) {
      if (el.value) texto(el, s.color, s, `valor de #${el.id}`);
      else if (el.placeholder) texto(el, getComputedStyle(el, '::placeholder').color, s, `marcador de #${el.id}`);
      continue;
    }
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (propio) texto(el, s.color, s, `"${el.textContent.trim()}"`);
  }

  // Indicadores que no son texto: 3:1 frente al fondo de alrededor.
  const noTexto = [];
  const borde = (el, lado, nombre) => {
    if (!el || !visible(el)) return;
    noTexto.push([nombre, razon(getComputedStyle(el)[`border${lado}Color`], fondo(el.parentElement))]);
  };
  borde(document.querySelector('.peso-campo'), 'Bottom', 'línea del peso de trabajo');
  borde(document.getElementById('peso-barra'), 'Top', 'borde del peso de la barra');
  borde(document.querySelector('.campo-anadir'), 'Top', 'borde del campo de añadir');
  borde(document.querySelector('.abrir-anadir'), 'Top', 'borde de "+ Añadir porcentaje"');
  const interruptor = document.getElementById('collarines');
  if (visible(interruptor)) {
    const pista = getComputedStyle(interruptor, '::before');
    const alrededor = fondo(interruptor.parentElement);
    noTexto.push(['pista del interruptor', razon(pista.borderTopColor, alrededor)]);
    // El círculo se distingue de la pista, encendido o apagado.
    noTexto.push(['círculo del interruptor', razon(getComputedStyle(interruptor, '::after').backgroundColor,
      sobre(rgba(pista.backgroundColor), alrededor))]);
  }
  // FR-04: un tipo deshabilitado se distingue por su peso tachado y en gris.
  for (const peso of document.querySelectorAll('.disco .peso-disco')) {
    if (!visible(peso)) continue;
    const s = getComputedStyle(peso);
    if (s.textDecorationLine.includes('line-through')) {
      noTexto.push([`tachado de ${peso.textContent}`, razon(s.textDecorationColor === 'currentcolor' ? s.color : s.textDecorationColor, fondo(peso))]);
    }
  }
  for (const [nombre, r] of noTexto) if (r < 3) fallos.push(`${nombre}: ${r.toFixed(2)}`);
  return { fallos, textos, noTexto: noTexto.length };
});

// El indicador de foco de cada control al llegar con el teclado: el contorno
// del propio control o de su etiqueta, o el borde que cambia de color en los
// campos (el peso de trabajo, el peso de la barra y el campo de añadir).
const medirFoco = (page) => page.evaluate(() => {
  const { fondo, razon } = window.contraste;
  const el = document.activeElement;
  const nombre = el.getAttribute('aria-label') || el.labels?.[0]?.textContent.trim() || el.textContent.trim() || el.id;
  const con = [el, el.closest('.segmento, .ficha, .disco')].find((e) => e && getComputedStyle(e).outlineStyle !== 'none');
  if (con) {
    const s = getComputedStyle(con);
    return { nombre, tipo: 'contorno', r: razon(s.outlineColor, fondo(con.parentElement)), grosor: parseFloat(s.outlineWidth) };
  }
  const caja = el.closest('.peso-campo, .campo-anadir') ?? el;
  const lado = caja.matches('.peso-campo') ? 'Bottom' : 'Top';
  const s = getComputedStyle(caja);
  return { nombre, tipo: 'borde', r: razon(s[`border${lado}Color`], fondo(caja.parentElement)), grosor: parseFloat(s[`border${lado}Width`]), color: s[`border${lado}Color`] };
});

// Recorre con el tabulador todo lo enfocable y mide su indicador de foco.
async function recorrerFoco(page, estado) {
  await page.locator('body').focus();
  await page.evaluate(() => document.activeElement?.blur());
  const fallos = [];
  let vistos = 0;
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    // Termina al volver a un control ya medido o al salir de la página.
    const nuevo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.dataset.focoMedido) return false;
      el.dataset.focoMedido = '1';
      return true;
    });
    if (!nuevo) break;
    vistos++;
    const f = await medirFoco(page);
    if (f.r < 3 || f.grosor < 1) fallos.push(`${estado}, ${f.nombre} (${f.tipo}): ${f.r.toFixed(2)}`);
  }
  return { fallos, vistos };
}

test('SPEC-CALC-003/AC-21 contraste de los textos e indicadores en los estados de AC-20', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await recorrerEstados(page, async (estado) => {
    const r = await medirContraste(page);
    expect(r.fallos, estado).toEqual([]);
    expect(r.textos.length, estado).toBeGreaterThan(15);
  });
});

test('SPEC-CALC-003/AC-21 contraste del fondo de borrar antes y después del 35 %', async ({ page }) => {
  const t = tarjeta(page, 70);
  const { caja, x, y } = await arrastrarSinSoltar(page, t, 0.2);
  await expect(t.locator('.fondo-borrar')).toBeVisible();
  await expect(t).not.toHaveClass(/listo/);
  let r = await medirContraste(page);
  expect(r.fallos, 'antes del 35 %').toEqual([]);
  expect(r.textos, 'antes del 35 %').toContain('"Borrar"');
  await analizarConAxe(page);
  await page.mouse.move(x - caja.width * 0.5, y, { steps: 5 });
  await expect(t).toHaveClass(/listo/);
  r = await medirContraste(page);
  expect(r.fallos, 'después del 35 %').toEqual([]);
  expect(r.textos, 'después del 35 %').toContain('"Borrar"');
  await analizarConAxe(page);
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();
});

test('SPEC-CALC-003/AC-21 contraste con campos con error, marcas, explicación, collarín, un tipo deshabilitado y el peso con el foco', async ({ page }) => {
  await desplegarPaneles(page);
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await trabajo(page).fill('105');
  // El 70 % con la marca desplegada (su explicación) y otra plegada.
  await tarjeta(page, 70).locator('.diferencia').click();
  await expect(tarjeta(page, 70).locator('.detalle')).toBeVisible();
  await expect(page.locator('.diferencia[aria-expanded="false"]')).not.toHaveCount(0);
  await expect(page.locator('.collarin').first()).toHaveText('+ collarín de 2,5 kg');
  let r = await medirContraste(page);
  expect(r.fallos, 'marcas, collarín y tipo deshabilitado').toEqual([]);
  expect(r.noTexto).toBeGreaterThan(4);
  await analizarConAxe(page);

  // El peso de trabajo con el foco.
  await trabajo(page).focus();
  r = await medirContraste(page);
  expect(r.fallos, 'peso de trabajo con el foco').toEqual([]);
  await analizarConAxe(page);

  // Campos con error: el peso de trabajo, el de la barra y el de añadir.
  await trabajo(page).fill('0');
  await expect(page.locator('#error-trabajo')).toBeVisible();
  r = await medirContraste(page);
  expect(r.fallos, 'peso de trabajo con error').toEqual([]);
  await analizarConAxe(page);
  await trabajo(page).fill('105');
  await barra(page, 'Z').check();
  await pesoBarra(page).fill('0,5');
  await expect(pesoBarra(page)).toHaveAttribute('aria-invalid', 'true');
  r = await medirContraste(page);
  expect(r.fallos, 'peso de la barra con error').toEqual([]);
  await analizarConAxe(page);
  await pesoBarra(page).fill('8,5');
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#error-porcentaje')).toBeVisible();
  r = await medirContraste(page);
  expect(r.fallos, 'campo de añadir con error').toEqual([]);
  await analizarConAxe(page);
});

test('SPEC-CALC-003/AC-21 el indicador de foco de cada control cumple 3:1', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await trabajo(page).fill('105');
  await desplegarPaneles(page);
  await barra(page, 'Z').check();
  let r = await recorrerFoco(page, 'paneles desplegados');
  expect(r.fallos).toEqual([]);
  // Peso, 2 pliegues, modos, fichas, interruptor, peso de la barra, tipos,
  // marcas, "Quitar" de cada tarjeta y "+ Añadir porcentaje".
  expect(r.vistos).toBeGreaterThan(15);
  await analizarConAxe(page);

  await abrir(page).click();
  const enCampo = await medirFoco(page);
  expect(enCampo.r, 'campo de añadir').toBeGreaterThanOrEqual(3);
  await analizarConAxe(page);
  await page.keyboard.press('Escape');
  await quitarSerie(page, 40);
  await deshacer(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const enDeshacer = await medirFoco(page);
  expect(enDeshacer.nombre).toBe('Deshacer');
  expect(enDeshacer.r, 'Deshacer').toBeGreaterThanOrEqual(3);
  await analizarConAxe(page);
  // ADR-0008 §3.1: el aviso caduca a los 5 s; se comprueba después del análisis.
  await expect(deshacer(page)).toBeFocused();
});

// AC-22: lo que se corta o se solapa. Se miden las cajas de cada línea de
// texto (Range.getClientRects) y de los iconos; el valor de los campos se
// corta si no cabe en su caja.
const medirDesborde = (page) => page.evaluate(() => {
  const problemas = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) problemas.push(`desplazamiento horizontal: ${doc.scrollWidth} > ${doc.clientWidth}`);

  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    && !el.closest('.oculto, template') && el.getBoundingClientRect().width > 1;
  const recortan = (el) => {
    const lista = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.clipPath !== 'none') lista.push(e);
    }
    return lista;
  };
  const dentro = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  const cortan = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

  const cajas = [];
  const recorrido = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !visible(el)) continue;
    const rango = document.createRange();
    rango.selectNodeContents(n);
    const nombre = `"${n.textContent.trim()}"`;
    for (const r of rango.getClientRects()) {
      if (r.width < 1) continue;
      if (r.left < -1 || r.right > innerWidth + 1) problemas.push(`${nombre} sale de la pantalla`);
      for (const c of recortan(el)) {
        if (!dentro(r, c.getBoundingClientRect())) problemas.push(`${nombre} cortado por ${c.id || c.className}`);
      }
      cajas.push({ nombre, r, el });
    }
  }
  for (const el of document.querySelectorAll('main svg')) {
    if (visible(el)) cajas.push({ nombre: `icono de ${el.parentElement.id || el.parentElement.className}`, r: el.getBoundingClientRect(), el });
  }
  // Un botón tampoco puede tapar un texto, un icono u otro botón. Cuenta la
  // parte que se ve: la caja si tiene fondo o borde y, si es transparente
  // (como la marca de diferencia, con 44 px de zona de toque), la pastilla.
  const seVe = (e) => {
    const s = getComputedStyle(e);
    return s.backgroundColor.match(/[\d.]+/g).length === 3 || Number(s.backgroundColor.match(/[\d.]+/g)[3]) > 0
      || parseFloat(s.borderTopWidth) > 0;
  };
  for (const el of document.querySelectorAll('main button, main button *')) {
    if (!visible(el) || !seVe(el)) continue;
    const boton = el.closest('button');
    cajas.push({ nombre: `botón "${boton.getAttribute('aria-label') || boton.textContent.trim()}"`, r: el.getBoundingClientRect(), el });
  }
  for (const el of document.querySelectorAll('main input:not([type=radio], [type=checkbox])')) {
    if (!visible(el)) continue;
    // WebKit suma 1 px de cursor a scrollWidth aunque el texto quepa.
    if (el.scrollWidth > el.clientWidth + 1) problemas.push(`valor de #${el.id} cortado: ${el.scrollWidth} > ${el.clientWidth}`);
    if (el.getBoundingClientRect().right > innerWidth + 1) problemas.push(`#${el.id} sale de la pantalla`);
    const auto = el.closest('.auto');
    // El marcador o el valor, en la copia invisible que da el ancho al campo.
    if (auto && auto.scrollWidth > auto.clientWidth + 1) problemas.push(`#${el.id} no cabe: ${auto.scrollWidth} > ${auto.clientWidth}`);
  }
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const [a, b] = [cajas[i], cajas[j]];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (cortan(a.r, b.r)) problemas.push(`${a.nombre} se solapa con ${b.nombre}`);
    }
  }
  return [...new Set(problemas)];
});

// NFR-03: el zoom de página al 200 % sobre 390 × 844 deja 195 × 422 px CSS.
const ZOOM_200 = { width: 195, height: 422 };

test('SPEC-CALC-003/AC-22 al 200 % (195 px), nada se corta ni se solapa ni hay desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize(ZOOM_200);
  // El aviso de "Deshacer" flota abajo sobre las tarjetas mientras se
  // desplaza (FR-08); se mide en su sitio, al final de la página.
  const medir = async (estado) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await medirDesborde(page), estado).toEqual([]);
  };
  await recorrerEstados(page, medir);

  // Con los demás estados de AC-21: errores, explicación, collarín, un tipo
  // deshabilitado y "Solo la barra".
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: /Collarines/ }).check();
  await disco(page, '25 kg').click();
  await pesoBarra(page).fill('0,5');
  await trabajo(page).fill('0');
  await medir('errores de los pesos');
  await analizarConAxe(page);
  await pesoBarra(page).fill('8,5');
  await trabajo(page).fill('105');
  await page.locator('.diferencia').first().click();
  await expect(page.locator('.detalle:not([hidden])')).toHaveCount(1);
  await medir('explicación y collarín');
  await analizarConAxe(page);
  await abrir(page).click();
  await campo(page).pressSequentially('0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#error-porcentaje')).toBeVisible();
  await medir('campo de añadir con error');
  await analizarConAxe(page);
  await page.keyboard.press('Escape');
  await trabajo(page).fill('999,99');
  await medir('peso de trabajo de 6 caracteres');
  await analizarConAxe(page);
  // Con la Z de 8,5 kg, el 70 % de 10 kg (7 kg) no llega a la barra.
  await trabajo(page).fill('10');
  await expect(tarjeta(page, 70).locator('.linea')).toHaveText('Solo la barra');
  await medir('"Solo la barra"');
  await analizarConAxe(page);
});

// FR-08 sin AC propio: a 390 px, "Quitar" con el foco tapaba la mitad de la
// marca de diferencia. Ahora ocupa su propia fila y no tapa nada.
test('a 390 px, en los estados de AC-20 nada se corta ni se solapa ("Quitar" no tapa la tarjeta)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await recorrerEstados(page, async (estado) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await medirDesborde(page), estado).toEqual([]);
  });
});

test('SPEC-CALC-003/AC-22 al 200 % (195 px) se abren los paneles y se añaden, borran y deshacen series', async ({ page }) => {
  await page.setViewportSize(ZOOM_200);
  await botonCarga(page).click();
  await expect(page.locator('#panel-carga')).toBeVisible();
  await analizarConAxe(page);
  await barra(page, 'Recta').check();
  await expect(barra(page, 'Recta')).toBeChecked();
  await analizarConAxe(page);
  await botonDiscos(page).click();
  await expect(page.locator('#panel-discos')).toBeVisible();
  await analizarConAxe(page);
  await disco(page, '25 kg').click();
  await expect(disco(page, '25 kg')).not.toBeChecked();
  await analizarConAxe(page);
  await disco(page, '25 kg').click();

  await anadirPorcentaje(page, '55');
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %', '90 %']);
  await analizarConAxe(page);

  // Borrar con el gesto, deshacer; borrar con el botón, deshacer.
  await deslizar(page, tarjeta(page, 55), 0.6);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '70 %', '90 %']);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %', '90 %']);
  await analizarConAxe(page);
  await quitarSerie(page, 90);
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %']);
  const caja = await deshacer(page).boundingBox();
  expect(caja.x + caja.width).toBeLessThanOrEqual(ZOOM_200.width);
  await deshacer(page).click();
  await expect(porcentajesDeSeries(page)).toHaveText(['40 %', '55 %', '70 %', '90 %']);
  await analizarConAxe(page);
});
