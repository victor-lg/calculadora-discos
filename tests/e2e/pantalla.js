// Localizadores de la pantalla de SPEC-CALC-003 que comparten los E2E.
import { expect } from '@playwright/test';

export const trabajo = (page) => page.getByLabel('Peso de trabajo', { exact: true });
export const pesoBarra = (page) => page.getByLabel('Peso de la barra', { exact: true });
// FR-03: las fichas se anuncian con su nombre y su peso ("Recta 10 kg").
export const barra = (page, nombre) => page.getByRole('radio', { name: new RegExp(`^${nombre}( |$)`) });
export const botonCarga = (page) => page.getByRole('button', { name: /^Carga/ });
export const botonDiscos = (page) => page.getByRole('button', { name: /^Mis discos/ });

// FR-01: los paneles arrancan plegados. Los recorridos que usan sus controles
// los despliegan primero.
export async function desplegarPaneles(page) {
  for (const boton of [botonCarga(page), botonDiscos(page)]) {
    if (await boton.getAttribute('aria-expanded') !== 'true') await boton.click();
  }
}

// SPEC-CALC-003 §11: carga todas las caras de @font-face y devuelve su estado
// ("Barlow 400 loaded"). Las medidas de geometría esperan a las fuentes de
// verdad: con las de reserva, el texto ocupa otro ancho.
export const FUENTES_CARGADAS = [
  ...[400, 500, 600].map((p) => `Barlow ${p} loaded`),
  ...[500, 600, 700, 800].map((p) => `Barlow Semi Condensed ${p} loaded`),
];
export const cargarFuentes = (page) => page.evaluate(() => Promise.all([...document.fonts]
  .map((f) => f.load().catch(() => {}).then(() => `${f.family.replace(/"/g, '')} ${f.weight} ${f.status}`))));

// Recarga la app (un arranque de cero) y vuelve a desplegar los paneles.
export async function recargar(page) {
  await page.reload();
  await desplegarPaneles(page);
}

// Copia un texto al portapapeles con un área de texto temporal, fuera de la
// app. Quita el foco de donde esté: se copia antes de entrar en el campo.
export async function copiar(page, texto) {
  await page.evaluate((t) => {
    const area = document.createElement('textarea');
    area.id = 'portapapeles-prueba';
    area.value = t;
    document.body.append(area);
  }, texto);
  const area = page.locator('#portapapeles-prueba');
  await area.selectText();
  await page.keyboard.press('ControlOrMeta+C');
  await area.evaluate((el) => el.remove());
}

// Pega de verdad (con el portapapeles, no asignando el valor por programa) en
// un campo, sustituyendo lo que tenga.
export async function pegar(page, campo) {
  await campo.selectText();
  await page.keyboard.press('ControlOrMeta+V');
}

// SPEC-CALC-003 FR-06: los discos que se ven en cada tarjeta que los tiene,
// unidos con " + " y con "×n" tras el peso ("25 ×2 + 10"). Para usarlo con
// expect.poll.
export const discosDeSeries = (page) => page.locator('#series > li').evaluateAll((lis) => lis
  .filter((li) => li.querySelector('.discos'))
  .map((li) => [...li.querySelectorAll('.disco-serie')]
    .map((d) => [...d.querySelectorAll('.cifra, .veces')].map((x) => x.textContent).join(' '))
    .join(' + ')));

// SPEC-CALC-003 FR-01 y FR-06: los porcentajes de las tarjetas, en su orden.
export const porcentajesDeSeries = (page) => page.locator('#series > li .porcentaje');

// FR-09: añade un porcentaje con el campo de añadir, que abre si está cerrado.
export async function anadirPorcentaje(page, texto) {
  const abrir = page.getByRole('button', { name: 'Añadir porcentaje' });
  if (await abrir.isVisible()) await abrir.click();
  await page.getByLabel('Nuevo porcentaje').fill(texto);
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
}

// FR-08: el botón "Quitar la serie del P %", que solo se ve con el foco. Se
// activa con el teclado. La tarjeta sale de lado y cierra su hueco antes de
// borrarse, así que quitarSerie espera a su aviso. Con el reloj controlado,
// sus temporizadores no corren solos: se usa botonQuitar y se avanza el reloj.
export const botonQuitar = (page, porcentaje) => page.getByRole('button', { name: `Quitar la serie del ${porcentaje} %` });
export async function quitarSerie(page, porcentaje) {
  await botonQuitar(page, porcentaje).press('Enter');
  await expect(page.locator('#texto-borrado')).toHaveText(`Serie del ${porcentaje} % borrada`);
}

// FR-08: borra todas las series que se ven. Cada tarjeta sale de lado y cierra
// su hueco antes de borrarse, así que se espera a que se vaya antes de pasar a
// la siguiente.
export async function quitarTodas(page) {
  const botones = page.getByRole('button', { name: /^Quitar la serie del / });
  for (let quedan = await botones.count(); quedan > 0; quedan -= 1) {
    await botones.first().press('Enter');
    await expect(botones).toHaveCount(quedan - 1);
  }
}

// FR-08: desliza con el puntero la tarjeta hacia la izquierda una fracción de
// su ancho y la suelta.
export async function deslizar(page, tarjeta, fraccion) {
  await tarjeta.scrollIntoViewIfNeeded();
  const caja = await tarjeta.locator('.serie').boundingBox();
  const y = caja.y + caja.height / 2;
  const x = caja.x + caja.width * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const pasos = 10;
  for (let i = 1; i <= pasos; i++) await page.mouse.move(x - (caja.width * fraccion * i) / pasos, y);
  await page.mouse.up();
}
