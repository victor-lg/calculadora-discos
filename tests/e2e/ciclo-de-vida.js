// Lo que le pasa a la app desde fuera y que repiten varios E2E: pasar a segundo
// plano, volver de otra app y no poder guardar.
import { expect } from '@playwright/test';

// SPEC-CALC-001 FR-11: la app pasa a segundo plano y vuelve, con el foco donde
// estuviera.
export const segundoPlano = (page) => page.evaluate(() => {
  for (const estado of ['hidden', 'visible']) {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }
  delete document.visibilityState;
});

// Pasa a otra pestaña y vuelve, y lanza los eventos de ciclo de vida de iOS.
// Comprueba que la página no se ha recargado.
export async function volverDeOtraApp(page, context) {
  await page.evaluate(() => { window.marcaSinRecarga = true; });
  const otra = await context.newPage();
  await otra.bringToFront();
  await page.bringToFront();
  await otra.close();
  await page.evaluate(() => {
    for (const tipo of ['visibilitychange', 'pagehide', 'pageshow', 'freeze', 'resume']) {
      const destino = tipo === 'visibilitychange' || tipo === 'freeze' || tipo === 'resume'
        ? document : window;
      destino.dispatchEvent(new Event(tipo));
    }
  });
  expect(await page.evaluate(() => window.marcaSinRecarga)).toBe(true);
}

// SPEC-CALC-002 FR-09: el almacenamiento deja de poder guardar (como con la
// cuota llena). Deja en la página window.romperAlmacen(roto) para repararlo
// (false) o volver a romperlo (true).
export const romperAlmacen = (page) => page.evaluate(() => {
  const original = Storage.prototype.setItem;
  window.romperAlmacen = (roto) => {
    Storage.prototype.setItem = roto
      ? () => { throw new DOMException('Lleno', 'QuotaExceededError'); }
      : original;
  };
  window.romperAlmacen(true);
});
