// Localizadores de la pantalla de SPEC-CALC-003 que comparten los E2E.

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
