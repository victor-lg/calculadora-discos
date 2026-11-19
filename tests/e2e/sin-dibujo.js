// Los E2E que no tratan del dibujo corren en la vista de SPEC-CALC-003 FR-14:
// el navegador no puede preparar ningún contexto gráfico, como en AC-18. En la
// CI, sin GPU, dibujar en 3D por software no cabe en el tiempo del job. El
// dibujo sigue activo en dibujo.spec.js, accesibilidad.spec.js y
// sin-conexion.spec.js, que importan test de @playwright/test. Decisión de
// Víctor del 2026-11-03 (PR #33).
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
      delete window.WebGLRenderingContext;
      delete window.WebGL2RenderingContext;
    });
    await use(context);
  },
});

export { expect };
