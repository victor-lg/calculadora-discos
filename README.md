# Calculadora de discos

[![sdd](https://github.com/victor-lg/calculadora-discos/actions/workflows/sdd.yml/badge.svg)](https://github.com/victor-lg/calculadora-discos/actions/workflows/sdd.yml)
[![tests](https://github.com/victor-lg/calculadora-discos/actions/workflows/tests.yml/badge.svg)](https://github.com/victor-lg/calculadora-discos/actions/workflows/tests.yml)

Calcula al instante qué discos cargar en cada serie de aproximación, a partir del peso de trabajo y de unos porcentajes, para no hacer cuentas entre series. Es para un solo usuario, en su iPhone y sin conexión. La visión completa está en `docs/vision.md`.

**App:** https://discos.victorlopez.dev

## Funcionalidad

- Series de calentamiento con cálculo de discos — [`SPEC-CALC-001`](docs/specs/SPEC-CALC-001-series-calentamiento.md)

## Arquitectura

PWA de HTML, CSS y JavaScript estándar, sin framework, sin compilación y sin dependencias en tiempo de ejecución.
Funciona sin conexión con un service worker propio y solo guarda en el dispositivo la lista de porcentajes.
Se publica en GitHub Pages, con subdominio propio, mediante un workflow que solo lanza Víctor; fusionar no publica. El porqué está en los ADR:

- [`ADR-0001`](docs/adr/ADR-0001-tecnologia-pwa.md) — PWA sin framework, alojada en GitHub Pages

## Desarrollo

Requisitos: Node.js ≥ 22 (la versión exacta está en `.nvmrc`). Playwright es la única dependencia de desarrollo.

```bash
# Instalar dependencias (versiones exactas del lockfile, sin scripts de instalación)
npm ci --ignore-scripts

# Tests unitarios (node --test)
npm test

# Servir la app en local (http://127.0.0.1:4791; otro puerto con PUERTO=…)
node tests/e2e/servidor.js

# Navegadores de Playwright: se descargan fuera del sandbox del agente.
# En Linux, WebKit puede necesitar librerías del sistema: añade --with-deps (usa sudo), como la CI.
npx playwright install chromium webkit

# Tests E2E (Chromium y WebKit; en la CI, siempre los dos)
npm run test:e2e
```

## Cómo se trabaja aquí

Este proyecto sigue un workflow de desarrollo guiado por especificaciones (SDD) con un agente de IA:

- **Qué se construye:** cada comportamiento está en una spec con criterios de aceptación (AC) numerados, aprobada antes de implementarse.
- **Cómo se decide:** las decisiones de arquitectura están en ADR.
- **Cómo se verifica:** cada AC tiene al menos un test que lo cita, y la CI lo comprueba en cada PR.
- **Quién decide:** el código lo escribe un agente desde una cuenta propia, en un sandbox. Los cambios llegan por PR con revisión independiente de IA. Solo una persona aprueba y fusiona en `main`.
- **Historial:** un commit por PR (squash), con títulos en [Conventional Commits](https://www.conventionalcommits.org/).

Las reglas para agentes están en `AGENTS.md`.

## Etapa

técnica

<!--
- documental → solo discovery/ y docs/ (visión, specs, ADR); aún no hay tecnología elegida.
- técnica    → existe un ADR que fija la tecnología; hay src/, tests/ y la CI del stack.
-->

## Rutas sensibles

<!--
Todo cambio que toque estas rutas es R2, además de las que ya marca el
workflow (dependencias, .github/, .claude/, AGENTS.md, migraciones). Es la
forma de decir que un componente es delicado. Cambiar esta lista es R2.

Formato que lee la CI: una ruta por línea, entre comillas invertidas, por
ejemplo `src/pagos/` (una carpeta entera) o `src/auth/*.ts`. El `*` también
cruza carpetas. La CI usa la lista que hay en `main`, no la del PR.
-->

- (ninguna todavía)
