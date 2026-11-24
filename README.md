# Calculadora de discos

[![sdd](https://github.com/victor-lg/calculadora-discos/actions/workflows/sdd.yml/badge.svg)](https://github.com/victor-lg/calculadora-discos/actions/workflows/sdd.yml)
[![tests](https://github.com/victor-lg/calculadora-discos/actions/workflows/tests.yml/badge.svg)](https://github.com/victor-lg/calculadora-discos/actions/workflows/tests.yml)

Calcula al instante qué discos cargar en cada serie de aproximación, a partir del peso de trabajo y de unos porcentajes, para no hacer cuentas entre series. Es para un solo usuario, en su iPhone y sin conexión. La visión completa está en `docs/vision.md`.

**App:** https://discos.victorlopez.dev

## Funcionalidad

- Series de calentamiento con cálculo de discos — [`SPEC-CALC-001`](docs/specs/SPEC-CALC-001-series-calentamiento.md)

## Arquitectura

PWA de HTML, CSS y JavaScript estándar, sin framework y sin compilación. La única dependencia en tiempo de ejecución que se admite es three.js, para el dibujo 3D, servida desde la propia app.
Funciona sin conexión con un service worker propio y solo guarda en el dispositivo, cada dato por separado, la lista de porcentajes, el último peso de trabajo válido, los pesos de la recta y de la Z, la opción de collarines y los discos habilitados. El modo y la barra no se guardan.
Se publica en GitHub Pages, con subdominio propio, mediante un workflow que solo lanza Víctor; fusionar no publica. El porqué está en los ADR:

- [`ADR-0001`](docs/adr/ADR-0001-tecnologia-pwa.md) — PWA sin framework, alojada en GitHub Pages
- [`ADR-0002`](docs/adr/ADR-0002-datos-guardados.md) — datos guardados en el dispositivo; modifica ADR-0001 §3.2
- [`ADR-0003`](docs/adr/ADR-0003-dibujo-3d.md) — dibujo 3D en vivo con three.js y un solo renderizador; modifica ADR-0001 §3.1
- [`ADR-0004`](docs/adr/ADR-0004-mas-datos-guardados.md) — más datos guardados en el dispositivo; modifica ADR-0002 §3.1
- [`ADR-0005`](docs/adr/ADR-0005-guardar-al-terminar-de-editar.md) — los pesos se guardan al terminar de editar; modifica ADR-0004 §3 y §4

## Desarrollo

Requisitos: Node.js ≥ 22 (la versión exacta está en `.nvmrc`). Las dependencias de desarrollo admitidas son las de [ADR-0006](docs/adr/ADR-0006-herramientas-de-calidad.md) (§3.1).

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
- técnica    → existe un ADR que fija la tecnología; hay código, tests y la CI del stack.
No lo lee la CI: es información para quien abre el repo.
-->

## Rutas sensibles

Las rutas sensibles del proyecto (todo PR que las toque es R2) están en `.github/sdd/rutas-sensibles.txt`.
