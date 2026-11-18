---
id: ADR-0007
titulo: axe en los E2E, quinta dependencia de desarrollo admitida
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-18
sustituye: null
sustituido_por: null
modifica: ["ADR-0006 (§3.1, la lista de dependencias de desarrollo admitidas)"]
referencias: ["ADR-0001", "ADR-0006", "SPEC-CALC-003", "VIC-31", "VIC-22", "PR #53", "sdd-workflow PR #48"]
---

<!--
Redactado por Claude (VIC-31). ADR-0006 §3.1 admite cuatro dependencias de desarrollo y
pide un ADR nuevo para añadir otra; VIC-31 lleva axe a los E2E (M27 del workflow) y Víctor
decidió este ADR en un comentario de la issue (2026-11-17). Cambia solo el punto de la
cabecera (`modifica`); el resto de ADR-0006 sigue vigente y no se edita. Datos del registro
de npm leídos el 2026-11-18, con un lockfile simulado sobre el de `main` (8027ca5), y de
`docs/herramientas.md` del workflow (main de sdd-workflow, 6c62a3a).
-->

# ADR-0007 — axe en los E2E, quinta dependencia de desarrollo admitida

## 1. Contexto

VIC-31 lleva a la calculadora la comprobación de accesibilidad con axe que el workflow SDD añadió a su ejemplo de E2E (M27, sdd-workflow PR #48). La regla del workflow es que cada E2E compruebe con axe cada vista al llegar y cada estado nuevo, sin excluir reglas ni elementos salvo excepción escrita en la spec o en un ADR.

Hoy los E2E ya miden parte de la accesibilidad con código propio (`tests/e2e/accesibilidad.spec.js`): el tamaño de lo que se puede pulsar, el contraste y el indicador de foco (SPEC-CALC-003, AC-20 a AC-22). No comprueban nombres accesibles, roles, atributos ARIA, ni la estructura de encabezados y regiones, que es lo que cubre axe.

ADR-0006 §3.1 fija las dependencias de desarrollo en cuatro "y ninguna más", y pide un ADR nuevo para añadir otra. Sin esta decisión, VIC-31 no puede llevar axe a los E2E.

## 2. Alternativas consideradas

### Opción A: `@axe-core/playwright`

- **Ventajas:** es la integración oficial de axe con Playwright (`new AxeBuilder({ page }).analyze()`), la misma que usa el ejemplo del workflow y que ya está aprobada en su `docs/herramientas.md`. Solo añade dos paquetes al lockfile: `@axe-core/playwright` y `axe-core`.
- **Inconvenientes:** declara `playwright-core >= 1.0.0` como dependencia par, y `axe-core ~4.14.0` como dependencia. Sin fijarlas, npm puede meter versiones distintas de las previstas (§3.2).
- **Riesgos:** ninguno nuevo de ejecución: corre dentro de los E2E, en el navegador, sobre la app local.

### Opción B: inyectar `axe-core` a mano

- **Ventajas:** una sola dependencia (`axe-core`).
- **Inconvenientes:** hay que escribir y mantener la inyección y la lectura de resultados, que es justo lo que hace `@axe-core/playwright`. Se aparta del ejemplo del workflow y de la regla tal como está escrita.

### Opción C: no usar axe

- **Ventajas:** las dependencias no cambian.
- **Inconvenientes:** los E2E siguen sin comprobar nombres, roles ni ARIA. VIC-31 se queda sin una de sus tres partes (M27).

## 3. Decisión

**Opción A.** Es la que aplica la regla del workflow tal como está escrita, con el menor código propio.

1. **Dependencias de desarrollo admitidas.** A las cuatro de ADR-0006 §3.1 se añade una quinta, `@axe-core/playwright`, para la comprobación de accesibilidad de los E2E. `axe-core` entra en el lockfile como dependencia suya, no en `devDependencies`. Añadir otra sigue exigiendo un ADR nuevo.
2. **Condiciones.** `@axe-core/playwright` y `axe-core` cumplen, en cada versión, las mismas condiciones que ADR-0006 §3.2 pone a los paquetes de calidad:
   - versión exacta, `integrity` y descarga de `registry.npmjs.org` en el lockfile;
   - ningún paquete de su árbol con `hasInstallScript`;
   - su entrada aprobada en `docs/herramientas.md` del workflow;
   - solo para desarrollo: ningún fichero de `app/` los importa, y no se publican ni entran en la caché del service worker.

   Además, dos `overrides` en `package.json`, con versión exacta:
   - **`axe-core`:** su rango (`~4.14.0`) admite versiones más recientes que la aprobada. El `overrides` la fija, y se sube a mano en el mismo PR que suba `@axe-core/playwright`.
   - **`playwright-core`:** tiene que coincidir con `@playwright/test` y con la imagen del contenedor, o falla el job `versiones` de `tests.yml`. Se sube junto a ellos, en el PR propio que sustituye al de Dependabot (guía de instalación del workflow, G1).
3. **Cómo se usa.** `new AxeBuilder({ page }).analyze()` tal cual, sin `exclude`, `disableRules`, `withRules` ni `withTags`, salvo una excepción escrita en la spec o en un ADR. Una violación que ya existía no se excluye para que el test pase. Se anota y la persona decide si se corrige o se escribe la excepción.
4. **Qué cambia de ADR-0006 §3.1.** "Las de `devDependencies` son estas cuatro, y ninguna más" pasa a "estas cuatro y `@axe-core/playwright` (ADR-0007), y ninguna más". Lo demás de ADR-0006 sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - Los E2E comprueban también nombres accesibles, roles y ARIA en cada vista y estado.
  - Es la misma comprobación que el ejemplo del workflow.
- **Costes aceptados:**
  - Dos paquetes más en el lockfile, ambos con licencia MPL-2.0. No se distribuyen: solo corren en los E2E.
  - Las subidas de `@axe-core/playwright` llegan con Dependabot; los `overrides` se suben a mano (§3.2), así que cada subida es un PR R2 con un paso más.
  - Cada análisis de axe añade tiempo a los E2E, en una CI cuyo trozo más lento ya tarda de 9 a 10,5 minutos de sus 15 (`docs/baseline-controles.md`).
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | El rango de `axe-core` o la dependencia par de `playwright-core` meten versiones no previstas | Los dos `overrides` de §3.2. Si `playwright-core` se desalinea, el job `versiones` falla antes de los E2E. |
  | Violaciones que ya existen ponen la CI en rojo | No se excluyen: se anotan en `docs/baseline-controles.md` y las decide la persona (§3.3). |
  | Una exclusión silenciosa debilita el control | §3.3 solo admite excepciones escritas en la spec o en un ADR; la revisión del PR lo comprueba. |

- **Impacto:** `package.json`, `package-lock.json` y los E2E de `tests/e2e/`, en el PR de axe de VIC-31. La app no cambia.

## 5. Validación

- El PR que añade axe muestra, en su lockfile, que se cumplen las condiciones de §3.2. Su CI tiene `versiones` en verde con los `overrides`.
- Los E2E con axe pasan, o cada violación previa está anotada y decidida.
- Medición del 2026-11-18, con un lockfile simulado sobre el de `main`:
  - entran 2 paquetes (`@axe-core/playwright` 4.14.0 y `axe-core` 4.14.0), con las integridades que recoge `docs/herramientas.md` del workflow;
  - ninguno trae `hasInstallScript`;
  - sin el `overrides`, `axe-core` se resolvería a la 4.14.1, publicada el 2026-11-16.

## 6. Seguimiento

- Se revisa si axe da falsos positivos repetidos en alguna vista, o si su tiempo obliga a repartir los E2E de otra forma.
- Si el workflow cambia la regla de M27 o su entrada de `docs/herramientas.md`, se revisa §3.
