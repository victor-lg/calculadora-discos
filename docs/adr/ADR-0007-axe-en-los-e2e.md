---
id: ADR-0007
titulo: axe en los E2E, quinta dependencia de desarrollo admitida
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-18
sustituye: null
sustituido_por: null
modifica: ["ADR-0006 (§3.1, la lista de dependencias de desarrollo admitidas; §3.2, sus condiciones se aplican también a axe)"]
referencias: ["ADR-0001", "ADR-0003", "ADR-0006", "SPEC-CALC-003", "VIC-31", "VIC-22", "PR #53", "sdd-workflow PR #48"]
---

<!--
Redactado por Claude (VIC-31). ADR-0006 §3.1 admite cuatro dependencias de desarrollo y
pide un ADR nuevo para añadir otra; VIC-31 lleva axe a los E2E (M27 del workflow) y Víctor
decidió este ADR en un comentario de la issue (2026-11-17). Cambia solo los puntos de la
cabecera (`modifica`); el resto de ADR-0006 sigue vigente y no se edita. Fuentes en §7.
-->

# ADR-0007 — axe en los E2E, quinta dependencia de desarrollo admitida

> Es el ADR-0007 de este repositorio. Las menciones a "ADR-0007" por el formato de los commits y las menciones a Claude (`AGENTS.md`, `.github/sdd/checks.py`, la plantilla de PR) son al ADR-0007 del workflow SDD.

## 1. Contexto

VIC-31 lleva a la calculadora la comprobación de accesibilidad con axe que el workflow SDD añadió a su ejemplo de E2E (M27) [F1].

Hoy los E2E ya miden parte de la accesibilidad con código propio (`tests/e2e/accesibilidad.spec.js`, SPEC-CALC-003):
- AC-20: el tamaño de lo que se puede pulsar;
- AC-21: el contraste y el indicador de foco;
- AC-22: el zoom al 200 %.

No comprueban nombres accesibles, roles, atributos ARIA ni la estructura de encabezados y regiones, que es lo que cubre axe.

ADR-0006 §3.1 fija las dependencias de desarrollo en cuatro "y ninguna más", y pide un ADR nuevo para añadir otra. Sin esta decisión, VIC-31 no puede llevar axe a los E2E.

## 2. Alternativas consideradas

### Opción A: `@axe-core/playwright`

- **Ventajas:** es la integración oficial de axe con Playwright (`new AxeBuilder({ page }).analyze()`), la misma que usa el ejemplo del workflow, y su entrada en `docs/herramientas.md` del workflow está aprobada [F1]. Solo añade dos paquetes al lockfile: `@axe-core/playwright` y `axe-core` [F2].
- **Inconvenientes:**
  - Declara `axe-core ~4.14.0` como dependencia y `playwright-core >= 1.0.0` como dependencia par. Sin fijarlas, npm puede meter versiones distintas de las previstas (§3.2).
  - Su API permite reducir o filtrar el análisis de varias formas, así que hay que acotar cómo se usa (§3.3).
- **Riesgos:** código de terceros que se ejecuta en la CI y en local (§4).

### Opción B: inyectar `axe-core` a mano

- **Ventajas:** una sola dependencia (`axe-core`).
- **Inconvenientes:** hay que escribir y mantener la inyección y la lectura de resultados, que es justo lo que hace `@axe-core/playwright`. Se aparta del ejemplo del workflow.

### Opción C: no usar axe

- **Ventajas:** las dependencias no cambian.
- **Inconvenientes:** los E2E siguen sin comprobar nombres, roles ni ARIA. VIC-31 se queda sin una de sus tres partes (M27).

## 3. Decisión

**Opción A.** Es la que aplica la regla del workflow con menos código propio.

1. **Dependencias de desarrollo admitidas.** A las cuatro de ADR-0006 §3.1 se añade una quinta, `@axe-core/playwright`, para la comprobación de accesibilidad de los E2E. `axe-core` entra en el lockfile como dependencia suya, no en `devDependencies`: su versión exacta en `package.json` es la de su override (§3.2). Añadir otra sigue exigiendo un ADR nuevo.
2. **Condiciones.**
   - **Las de ADR-0006 §3.2, enteras**, para `@axe-core/playwright`, para `axe-core` y para cada paquete de su árbol:
     - versión exacta en `package.json`;
     - lockfile con `integrity` y descarga de `registry.npmjs.org`;
     - sin `hasInstallScript`;
     - su entrada aprobada en `docs/herramientas.md` del workflow, enlazada con su commit;
     - solo para desarrollo.

     Cada alta o subida es un PR R2. Su revisión comprueba estas condiciones y mira los avisos de osv-scanner del árbol.
   - **`overrides` en `package.json`.** Tiene exactamente dos claves, de primer nivel, `axe-core` y `playwright-core`, cada una con una versión semver exacta. Nunca un rango, un alias `npm:`, una URL, Git ni `file:`. Cualquier otro override exige un ADR nuevo.
     - **`axe-core`** queda fijado en la última versión que cumple el rango que declara `@axe-core/playwright` en el lockfile y que lleva al menos 7 días publicada, el mismo plazo que pide el `cooldown` de Dependabot [F1].
       - Se sube en cada subida de `@axe-core/playwright`, en el mismo PR, como dice su entrada del workflow [F1]. Dependabot sube el paquete pero no el override, así que ese PR de Dependabot se cierra y lo sustituye uno propio, por la misma vía que Playwright (guía de instalación del workflow, G1).
       - El PR propio lleva todas las subidas del grupo de Dependabot que sustituye. Cada versión que sube lleva al menos 7 días publicada.
       - Un test del repositorio comprueba en `package-lock.json` que la versión de `axe-core` cumple el rango que declara `@axe-core/playwright`, y falla si no sabe leer ese rango. Lo añade el PR de axe de VIC-31.
     - **`playwright-core`** tiene la misma versión exacta que `@playwright/test` y que la imagen del contenedor. Se sube junto a ellos, en el PR que sustituye al de Dependabot (G1). Si se olvida, falla el job `versiones` de `tests.yml`; su mensaje habla de `npm dedupe`, pero la corrección es subir este override.
3. **Cómo se usa.**
   - **Cobertura:** cada E2E de una vista la analiza con axe al llegar y después de cada estado que comprueba (cada vez que el test verifica lo que se ve tras una acción). Se analiza en todos los proyectos de `playwright.config.js`, salvo en los tests que ya se saltan un proyecto por otro motivo.
   - **Forma admitida:** solo `new AxeBuilder({ page }).analyze()`, sin otras opciones en el constructor y sin ningún otro método del builder (`include`, `exclude`, `options`, `withRules`, `withTags`, `disableRules`, `setLegacyMode`, ni los que traigan versiones futuras). Puede ir dentro de una función auxiliar compartida, siempre que esta haga solo eso y la comprobación siguiente.
   - **Comprobación:** `expect(resultado.violations).toEqual([])` sobre el resultado entero, sin filtrarlo ni contarlo. Los resultados `incomplete` (lo que axe no puede decidir, como el contraste sobre el dibujo 3D) no hacen fallar el test: por eso axe no sustituye a AC-21.
   - **Sin trampas alrededor:** el análisis se hace sobre la página bajo prueba y después de comprobar el estado. Ningún código cambia la página, el DOM ni `window.axe` para el análisis. No se capturan errores de `analyze()`, y los tests con axe no llevan `test.fail` ni `test.fixme`.
   - **Excepciones:** solo con una excepción escrita en la spec o en un ADR que nombre el ID de la regla de axe y el selector exacto. Las excepciones generales de una spec (por ejemplo, las de SPEC-CALC-003 NFR-02) no valen como excepción de axe.
   - **Violaciones previas:** no se excluyen para que el test pase. Se anotan en `docs/baseline-controles.md` y la persona decide si se corrigen, en otra issue y por su spec si cambian el comportamiento, o si se escribe la excepción.
   - **Los tests propios se mantienen:** axe se suma a los tests de AC-20 a AC-22 y no los sustituye. Que axe mida el contraste no permite quitar ni relajar los de AC-21.
4. **Qué cambia de ADR-0006 §3.1.** "Las de `devDependencies` son estas cuatro, y ninguna más" pasa a "estas cuatro y `@axe-core/playwright` (ADR-0007), y ninguna más". Lo demás de ADR-0006 sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - Los E2E comprueban también nombres accesibles, roles y ARIA en cada vista y estado.
  - Es la misma comprobación que el ejemplo del workflow.
- **Costes aceptados:**
  - Dos paquetes más en el lockfile, ambos con licencia MPL-2.0. No se distribuyen: solo corren en los E2E.
  - Cada subida es un PR R2. Los `overrides` se suben a mano y, si el rango de `axe-core` cambia, el PR de Dependabot se sustituye (§3.2).
  - Si sale un aviso de seguridad de `axe-core` con el override fijado, osv-scanner falla en todos los PR hasta que se suba a mano o se decida una excepción.
  - Cada análisis añade tiempo a los E2E, en una CI cuyo trozo más lento ya tarda de 9 a 10,5 minutos de sus 15 [F3]. El PR de axe lo mide. Si no cabe, se reparten los E2E en más trozos, un cambio de `tests.yml` que hace una persona.
  - La regla de uso (§3.3) la comprueba la revisión del PR, sin un control automático.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | Código de terceros que se ejecuta en la CI. `@axe-core/playwright` corre en el proceso de Node de los E2E: en la CI, como root dentro del contenedor de Playwright, que tiene el socket de Docker montado. `axe-core` se inyecta en la página con `page.evaluate`, que no respeta la CSP de la app (ADR-0001 §3.4). Su entrada es el DOM de la app de la rama, sin red. | Las condiciones de §3.2 (versión exacta, `integrity`, sin scripts de instalación, aprobación y revisión R2). `npm ci --ignore-scripts`. El job tiene `contents: read` y no usa secretos. |
  | Las mismas herramientas en local | Ejecutan código de terceros en el PC de quien lance los E2E, como ya hace Playwright. |
  | El rango de `axe-core` o la dependencia par de `playwright-core` meten versiones no previstas | Los dos `overrides` de §3.2. Si `playwright-core` se desalinea, `versiones` falla antes de los E2E. Que `axe-core` cumpla el rango lo comprueba un test (§3.2). |
  | Una exclusión o un filtro silencioso debilita el control | §3.3 admite una sola forma de uso, sin opciones, filtros ni código alrededor, y la revisión del PR lo comprueba. |
  | Violaciones que ya existen ponen la CI en rojo | Se anotan y las decide la persona (§3.3). |

- **Impacto:**
  - `package.json`, `package-lock.json` y los E2E de `tests/e2e/`, en el PR de axe de VIC-31. Este ADR no cambia la app; corregir una violación es otra issue.
  - ADR-0001 §3.7, ADR-0003 §3.2 y `README.md` ("Desarrollo") remiten a ADR-0006 §3.1 para la lista de dependencias de desarrollo. Desde este ADR, esa lista se lee junto con §3.1 de aquí. El `README.md` se pone al día en un PR propio.

## 5. Validación

- **El PR que añade axe** muestra, en su lockfile, que se cumplen las condiciones de §3.2. Su CI tiene `versiones` en verde con los `overrides`.
- **Los E2E con axe** pasan, o cada violación previa está anotada y decidida.
- **Medición del 2026-11-18** [F2], con un lockfile simulado sobre el de `main`:
  - entran 2 paquetes (`@axe-core/playwright` 4.14.0 y `axe-core` 4.14.0), con las integridades de [F1] y sin `hasInstallScript`;
  - sin el override, `axe-core` se resolvería a la 4.14.1, publicada el 2026-11-16;
  - sin el override, `playwright-core` se queda hoy en 1.65.0, porque se reutiliza la que ya está en el lockfile. Pero su `latest` es la 1.65.1, y en una instalación desde cero entró esa en el ejemplo del workflow [F1]. El override protege de ese caso.

## 6. Seguimiento

Se revisa este ADR si:
- axe da falsos positivos repetidos en alguna vista;
- el trozo más lento de los E2E pasa de 12 minutos de forma habitual;
- el workflow cambia la regla de M27 o su entrada de `docs/herramientas.md`;
- `@axe-core/playwright` deja de mantenerse o cambia su licencia;
- se encuentra una forma de esquivar §3.3 que la revisión no ve. Entonces se valora un control automático, por ejemplo una regla de Semgrep en la configuración de `main`.

## 7. Fuentes

Consultadas el 2026-11-18.

- [F1] `docs/herramientas.md` de sdd-workflow, `main` en `6c62a3a`, "Regresión visual y axe en el ejemplo de E2E":
  - `@axe-core/playwright` 4.14.0 y `axe-core` 4.14.0, con su versión, su `integrity` y su licencia;
  - el `overrides` de `axe-core` por el `cooldown` de 7 días;
  - el de `playwright-core` (1.65.1 en el ejemplo, frente a la imagen 1.65.0).

  La regla de uso de axe es la de `sdd-implement` (M27, sdd-workflow PR #48).
- [F2] Registro de npm. `@axe-core/playwright` 4.14.0 es su última versión estable. `axe-core` 4.14.1 se publicó el 2026-11-16. El `latest` de `playwright-core` es la 1.65.1. La API de `AxeBuilder` es la de `dist/index.d.ts` del paquete 4.14.0. Lockfile simulado con `npm install --package-lock-only --ignore-scripts` sobre `package.json` y `package-lock.json` de `main` (`8027ca5`).
- [F3] `docs/baseline-controles.md` de `main`, "M6: contenedor de Playwright por digest y job `versiones`".
