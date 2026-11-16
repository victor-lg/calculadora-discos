---
id: ADR-0006
titulo: Las herramientas de calidad de la CI, dependencias de desarrollo admitidas
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-16
sustituye: null
sustituido_por: null
modifica: ["ADR-0001 (§3.7, segundo punto; §4, beneficios)", "ADR-0003 (§3.2, última frase del segundo punto)"]
referencias: ["ADR-0001", "ADR-0003", "VIC-27", "VIC-29", "PR #48", "docs/baseline-controles.md"]
---

<!--
Redactado por Claude (VIC-27) a partir del hallazgo A de la G4 del PR #48: ADR-0001 §3.7
y ADR-0003 §3.2 dicen que Playwright es la única dependencia de desarrollo, y ese PR
añade tres. Víctor pidió un ADR nuevo, con las tres herramientas admitidas y sus
condiciones. Cambia solo los puntos de la cabecera (`modifica`); el resto de ADR-0001 y
ADR-0003 sigue vigente y no se edita. Datos del lockfile y de la CI tomados de la rama
del PR #48 y de `docs/herramientas.md` del workflow el 2026-11-16.
-->

# ADR-0006 — Las herramientas de calidad de la CI, dependencias de desarrollo admitidas

## 1. Contexto

VIC-27 lleva a la calculadora `calidad.yml`, el workflow de calidad de la plantilla del workflow SDD (VIC-21), con tres jobs: `mutaciones` (Stryker), `codigo-sobrante` (knip) y `duplicados` (jscpd). El PR #48 lo hace y choca con dos ADR aceptados:

- **ADR-0001 §3.7:** "Playwright, como **única dependencia de desarrollo**". Sus beneficios (§4) cuentan "una de desarrollo".
- **ADR-0003 §3.2:** "Playwright sigue siendo la única dependencia de desarrollo (ADR-0001 §3.7)".

`calidad.yml` no deja otra forma de instalar Stryker y knip: los toma de `node_modules`, instalados con `npm ci --ignore-scripts` desde el lockfile del proyecto, nunca con `npx`, y el job falla si el paquete no está en `devDependencies` (`docs/herramientas.md` del workflow, "Stryker (JS/TS)" y "knip (JS/TS)"). jscpd no es dependencia del proyecto: la CI descarga su binario con la suma SHA-256 fijada en el workflow, así que no le afecta este ADR.

Stryker necesita además un runner de tests. Con el runner `command`, que viene en el núcleo, cada mutante lanzaba todos los tests unitarios y el job se canceló a los 30 minutos de su límite. Con el runner `tap` (`@stryker-mutator/tap-runner`), que solo lanza los ficheros de test que pasan por cada mutante, el job tarda entre unos 10 y unos 20 minutos (`docs/baseline-controles.md`, "`mutaciones` (Stryker)").

Sin esta decisión, el PR #48 no se puede fusionar sin contradecir dos ADR aceptados.

## 2. Alternativas consideradas

### Opción A: admitir las tres como dependencias de desarrollo, con condiciones

- **Ventajas:** `calidad.yml` se usa tal como viene de la plantilla; las versiones quedan fijadas por `integrity` y las vigilan Dependabot y osv-scanner, como Playwright.
- **Inconvenientes:** el lockfile pasa de 4 paquetes a 250 (medido en la rama del PR #48).
- **Riesgos:** más código de terceros que se ejecuta en la CI y en local (§4).

### Opción B: no adoptar `mutaciones` ni `codigo-sobrante`

- **Ventajas:** Playwright sigue siendo la única dependencia de desarrollo.
- **Inconvenientes:** la calculadora se queda sin dos de los tres controles de calidad del workflow; solo correría `duplicados`. Es lo contrario de lo que pide VIC-27.

### Opción C: instalar las herramientas en la CI, fuera del lockfile

- **Ventajas:** `package.json` no cambia.
- **Inconvenientes:** exige cambiar `calidad.yml` de la plantilla, que VIC-27 deja fuera de alcance. Además, perderían la fijación por `integrity` del lockfile y la vigilancia de Dependabot y osv-scanner, que hoy cubren `package-lock.json`.

### Opción D: Stryker sin `@stryker-mutator/tap-runner`

- **Ventajas:** dos dependencias nuevas en lugar de tres.
- **Inconvenientes:** con el runner `command`, el job no termina dentro de su límite de 30 minutos (§1).

## 3. Decisión

**Opción A.**

1. **Dependencias de desarrollo admitidas.** Las de `devDependencies` son estas cuatro, y ninguna más:
   - `@playwright/test`, para los E2E, como hasta ahora (ADR-0001 §3.7);
   - `@stryker-mutator/core` y `@stryker-mutator/tap-runner`, para el job `mutaciones`;
   - `knip`, para el job `codigo-sobrante`.

   Añadir otra exige un ADR nuevo. Las dependencias en tiempo de ejecución no cambian: solo three.js (ADR-0003 §3.1).
2. **Condiciones de las tres herramientas de calidad.** Cada una, en cada versión:
   - **Fijada en el lockfile:** versión exacta en `package.json`, sin rangos, y fijada en `package-lock.json` con su `integrity` y descargada de `registry.npmjs.org`; nunca `file:`, Git, URL ni alias `npm:`. Lo mismo para todos los paquetes que trae.
   - **Sin scripts de instalación:** ningún paquete de su árbol en el lockfile tiene `hasInstallScript`. Una versión que traiga uno no se admite, aunque la CI instale con `--ignore-scripts`.
   - **Aprobada en `docs/herramientas.md` del workflow:** la herramienta tiene allí su entrada aprobada, y la versión que se fija es la que esa entrada registra o una subida posterior revisada como R2.
   - **Solo para desarrollo:** ningún fichero de `app/` las importa, y no se publican ni entran en la caché del service worker.

   Cada alta o subida de versión es un PR R2 (cambia los manifiestos) que comprueba estas condiciones y revisa los avisos de seguridad del árbol (osv-scanner).
3. **Qué cambia de ADR-0001 §3.7.** Su segundo punto, "Playwright, como **única dependencia de desarrollo**, para lo que necesita un navegador", pasa a: "Playwright para lo que necesita un navegador; las dependencias de desarrollo admitidas son las de ADR-0006 §3.1". Lo demás de §3.7 (`node --test` sin dependencias, Chromium y WebKit en la CI, el service worker en Chromium) sigue igual. En sus beneficios (§4), "una de desarrollo" pasa a ser "las de desarrollo de ADR-0006".
4. **Qué cambia de ADR-0003 §3.2.** La última frase de su segundo punto, "Playwright sigue siendo la única dependencia de desarrollo (ADR-0001 §3.7)", pasa a: "Las dependencias de desarrollo admitidas son las de ADR-0006 §3.1". El resto de §3.2 (versión exacta de three.js, su procedencia y su revisión R2) sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - pruebas de mutación y búsqueda de código que sobra en cada PR, con la misma configuración que el resto de proyectos del workflow;
  - las tres herramientas, fijadas y vigiladas igual que Playwright.
- **Costes aceptados:**
  - 246 paquetes más en el lockfile, que Dependabot sube una vez al mes, cada subida como R2;
  - el job `mutaciones` tarda entre unos 10 y unos 20 minutos por PR (`docs/baseline-controles.md`);
  - seis avisos medios de osv-scanner en dependencias de Stryker, exceptuados en `osv-scanner.toml` hasta el 2027-02-16 porque Stryker 10.1.1 no admite las versiones corregidas (`docs/baseline-controles.md`).
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | Un paquete comprometido en una versión nueva | Versión exacta e `integrity` en el lockfile, sin scripts de instalación (§3.2); Dependabot espera 7 días tras cada publicación; cada subida es R2. |
  | Código de terceros que se ejecuta en la CI | Stryker ejecuta `npm test` y sus plugins; knip carga la configuración `.js` de las herramientas que reconoce, como `playwright.config.js` de la rama. Los jobs corren con `contents: read`, sin secretos y con la configuración de `main` (`docs/herramientas.md` del workflow). |
  | Las mismas herramientas en local | Se ejecutan en el PC de quien las lance; el agente, dentro del sandbox. |
  | Un aviso de seguridad sin corregir en su árbol | osv-scanner en cada PR; las excepciones caducan y, si no hay versión corregida para entonces, el check vuelve a fallar y se decide de nuevo. |
  | Una herramienta acaba en la app | `app/` se publica sola, sin `node_modules`; la CSP (`script-src 'self'`, ADR-0001 §3.4) y la revisión lo cubren. |

- **Impacto:**
  - el PR #48 puede fusionarse sin contradecir ADR-0001 ni ADR-0003, una vez se fusione este;
  - ADR-0001 y ADR-0003 no se editan: quien los lea debe leer también este ADR para §3.7 y §3.2.

## 5. Validación

- En la rama del PR #48, el lockfile tiene 250 paquetes, todos de `registry.npmjs.org`, todos con `integrity` y ninguno con `hasInstallScript` (comprobado el 2026-11-16 con un script de Python sobre `package-lock.json`).
- La `integrity` de `@stryker-mutator/core` 10.1.1 y de `knip` 6.45.1 coincide con la de `docs/herramientas.md` del workflow.
- Los jobs `mutaciones` y `codigo-sobrante` pasan en la CI del PR #48.
- Cada PR R2 de alta o subida repite estas comprobaciones.

## 6. Seguimiento

- **Pendiente:**
  - la entrada de `@stryker-mutator/tap-runner` en `docs/herramientas.md` del workflow, en un PR de sdd-workflow. Hasta que se fusione, tap-runner no cumple la tercera condición de §3.2;
  - que `mutaciones` pase a check requerido, tras VIC-29.
- **Revisar este ADR si:**
  - una versión necesaria de alguna herramienta trae scripts de instalación;
  - las excepciones de osv-scanner caducan sin versión corregida;
  - el tiempo o los hallazgos de los jobs dejan de compensar;
  - hace falta otra dependencia de desarrollo.
