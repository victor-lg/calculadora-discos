// E2E de SPEC-CALC-001 (ADR-0001 §3.7): en la CI siempre Chromium y WebKit.
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4791;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // ADR-0003: en la CI, sin GPU, cada arranque dibuja en 3D por software y
  // tarda varios segundos; los recorridos que recargan muchas veces pasan de
  // los 30 s por defecto. Decisión de Víctor del 2026-11-03 (PR #33).
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
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
