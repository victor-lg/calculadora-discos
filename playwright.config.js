// E2E de SPEC-CALC-001 (ADR-0001 §3.7): en la CI siempre Chromium y WebKit.
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4791;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Un solo proceso en la CI: con él se midió la espera antes de axe en verde
  // (ADR-0008 §5; docs/baseline-controles.md, M27 de axe), pero la medición no aísla
  // la causa (el runner pasó a la vez de 2 a 4 CPU). Se revisa con los criterios
  // de ADR-0009 §6 o si el runner vuelve a 2 CPU.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  // Regresión visual (capturas.spec.js): una captura que falta es un fallo, no
  // una nueva escrita en silencio. Las referencias solo se escriben con
  // --update-snapshots, en la imagen de Playwright de tests.yml, y las aprueba
  // Víctor en el PR. Sin tolerancias: threshold 0 (sin él, Playwright deja
  // pasar diferencias de color de hasta 0,2), y sin maxDiffPixels ni
  // maxDiffPixelRatio, así que el límite es 0 píxeles. animations, caret y
  // scale son los valores por defecto, escritos para que se vean. Dos límites
  // de Playwright: los píxeles que pixelmatch toma por antialias no cuentan, y
  // scale 'css' reduce la captura de WebKit (3 px por px CSS) a un píxel por
  // px CSS.
  updateSnapshots: 'none',
  expect: {
    toHaveScreenshot: { threshold: 0, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}/`,
    // El service worker solo se permite en las pruebas que lo necesitan
    // (AC-12 y AC-13), para que no interfiera en las demás.
    serviceWorkers: 'block',
    locale: 'es-ES',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 17'] } },
  ],
  webServer: {
    command: 'node tests/e2e/servidor.js',
    url: `http://127.0.0.1:${PUERTO}/`,
    env: { PUERTO: String(PUERTO) },
    reuseExistingServer: !process.env.CI,
  },
});
