---
id: ADR-0008
titulo: axe analiza el estado estable, y cómo se comprueba que una excepción ya no aparece
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-18
sustituye: null
sustituido_por: null
modifica: ["ADR-0007 (§3.3, la forma admitida admite una espera de solo lectura antes de analyze(); y en las excepciones, cuándo una ya no aparece)"]
referencias: ["ADR-0007", "SPEC-CALC-003", "VIC-31", "PR #55", "PR #56"]
---

<!--
Redactado por Claude (VIC-31). En el PR #56 (axe en los E2E), la función auxiliar espera a que
no haya animaciones antes de analizar, algo que ADR-0007 §3.3 no admite. Víctor decidió
formalizarlo en un ADR propio, fusionado antes que el #56, y aclarar a la vez la mejora I de la
ronda 1 de G4 del #56 (comentario de VIC-31, 2026-11-18). Cambia solo los puntos de la cabecera
(`modifica`); el resto de ADR-0007 sigue vigente y no se edita. Fuentes en §7.
-->

# ADR-0008 — axe analiza el estado estable, y cómo se comprueba que una excepción ya no aparece

> No confundir con el ADR-0008 del workflow (herramientas de terceros).

## 1. Contexto

ADR-0007 §3.3 fija la única forma de analizar con axe en los E2E: una función auxiliar que hace `new AxeBuilder({ page }).analyze()` y después la comprobación, sin nada alrededor.

Al aplicarlo en el PR #56 salió una violación, `color-contrast`, en la tarjeta recién añadida mientras dura su fundido de entrada (SPEC-CALC-003 FR-10, 240 ms): axe medía el texto a media opacidad, con contrastes de 1,14 a 2,06. Salió con el dibujo 3D, en Chromium y en WebKit. Fuera del fundido no hay violación [F2].

Para que el análisis no dependa de en qué punto de la animación cae, la función auxiliar del #56 espera, antes de `analyze()`, a que `document.getAnimations()` esté vacío. Los dos revisores de la ronda 1 de G4 del #56 señalaron que eso va más allá de §3.3: no es ninguna de sus dos salidas para una violación previa (corregirla o escribir su excepción) y afecta a todas las llamadas [F1].

En la misma ronda salió otro hueco de §3.3: el test falla "si una excepción ya no aparece", pero no dice si se mide en cada llamada o en toda la ejecución. Medido en cada llamada, una excepción tendría que aparecer en todos los estados de todos los tests, y no se podría usar [F1].

Sin esta decisión, el #56 no cumple ADR-0007 y no puede fusionarse.

Las animaciones de la app hoy son cortas y terminan solas: el fundido de entrada de FR-10 y FR-13 (240 ms), la salida y la vuelta de una tarjeta al soltarla (200 ms) y el cierre de su hueco (260 ms). Ninguna es infinita. Con "Reducir movimiento" no hay ninguna (FR-13) [F3].

## 2. Alternativas consideradas

### Espera antes del análisis

#### Opción A: esperar, solo leyendo, a que no haya animaciones

- **Ventajas:** el análisis mide lo que se queda en pantalla, y su resultado no depende del momento. No cambia la página. Es una línea en la función auxiliar.
- **Inconvenientes:** ningún estado intermedio de una animación o una transición CSS se analiza, en ninguna regla y en ningún elemento. Suma a cada análisis lo que quede de la animación en curso.

#### Opción B: excepción de `color-contrast` para la tarjeta que entra

- **Ventajas:** es una de las dos salidas que ya da ADR-0007 §3.3.
- **Inconvenientes:** no hay un selector exacto estable para "la tarjeta recién añadida", y la violación solo aparece si el análisis cae dentro de los 240 ms, así que sería intermitente. Con cualquiera de las lecturas de "ya no aparece" (§3.2), una excepción intermitente falla o no comprueba nada.

#### Opción C: analizar con "Reducir movimiento" o terminando las animaciones

- **Ventajas:** no hay que esperar.
- **Inconvenientes:** cambia la página para el análisis (emular la preferencia, `finish()`, `currentTime`, CSS inyectado), lo que ADR-0007 §3.3 prohíbe. Se analizaría una vista que no es la que se está probando.

#### Opción D: corregir la app

- **Inconvenientes:** que el texto a media opacidad durante 240 ms incumpla o no NFR-02 de SPEC-CALC-003 es una pregunta de la spec. Aunque se corrigiera, cualquier animación futura volvería a dar resultados que dependen del momento.

### Cuándo una excepción ya no aparece

- **Por llamada, en sentido literal** (lo que hace hoy el #56): la excepción tiene que salir en cada análisis. Falla de forma segura, pero no se puede usar.
- **Por ejecución:** la excepción tiene que salir en algún análisis de toda la ejecución. Los E2E corren en varios procesos, en dos navegadores y en tres trozos de la CI, y en local se lanzan a menudo solo algunos tests. Juntar los resultados exige un reporter o un paso más en `tests.yml`, y una ejecución parcial daría falsos fallos.
- **Por llamada, solo donde axe pudo verla:** la excepción ya no aparece cuando, en un análisis, axe evaluó esa regla en ese selector y pasó. Si el elemento no está o la regla no se aplica a él, ese análisis no dice nada. Se decide en cada llamada, sin juntar nada.

## 3. Decisión

**Opción A, y "por llamada, solo donde axe pudo verla".**

1. **Espera al estado estable.** Antes de `analyze()`, la función auxiliar de ADR-0007 §3.3 espera a que `document.getAnimations()` de la página bajo prueba esté vacío, y solo entonces analiza. Condiciones:
   - **Solo lee.** Ni la espera ni nada a su alrededor cambia la página: no pausa, termina, cancela ni acelera animaciones (`pause`, `finish`, `cancel`, `playbackRate`, `currentTime`), no emula "Reducir movimiento", no inyecta CSS ni mueve el reloj de la página. Lo demás de "Sin trampas alrededor" (§3.3 de ADR-0007) se aplica igual a la espera.
   - **Tiempo máximo explícito.** La espera tiene su propio tiempo máximo, escrito en la función auxiliar, de 5 s como mucho: unas 20 veces la animación más larga de hoy. No se reintenta ni se captura el error al agotarlo.
   - **Fallo claro ante una animación que no termina.** Si se agota el tiempo, el test falla con un mensaje que dice que se esperaba a que terminaran las animaciones antes de axe, cita este ADR y lista las que siguen en curso (el elemento y el nombre de la animación o la propiedad de la transición). Leer esos datos no cambia la página.
   - **Sin filtros.** La espera cuenta todas las animaciones del documento. No se ignora ninguna por nombre, elemento ni duración. Si la app necesita una animación infinita, la persona decide cómo se analiza esa vista, con un ADR nuevo.
   - **No espera al dibujo 3D.** El dibujo va con `requestAnimationFrame` y no aparece en `getAnimations()`. Lo que axe no puede decidir sobre él sigue en `incomplete` (ADR-0007 §3.3).
2. **Cuándo una excepción ya no aparece.** Se comprueba en cada llamada, solo donde axe pudo verla: el test falla si, en ese análisis, la regla de la excepción aparece entre las que pasan (`passes`) con un nodo cuyo selector es exactamente el de la excepción. Si el selector no está en la página, o la regla no se aplica o queda en `incomplete` para él, esa llamada no dice nada de la excepción. Lo demás de "Excepciones" de ADR-0007 §3.3 no cambia: una violación que no coincide exactamente con una excepción hace fallar el test, en cualquier llamada.
   - Una violación que en un mismo elemento aparece en unos estados y no en otros no puede llevar excepción: se corrige o se decide en un ADR nuevo.
   - El PR que añada la primera excepción añade también un test unitario de la comparación con las excepciones.
3. **Qué cambia de ADR-0007 §3.3.**
   - "Forma admitida": entre la función auxiliar y `analyze()` se admite la espera del punto 1, y nada más.
   - "Excepciones": "si una excepción ya no aparece" se lee como dice el punto 2.
   - Lo demás de ADR-0007 sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - El resultado de axe no depende de en qué punto de una animación cae el análisis.
  - Las excepciones se pueden usar sin juntar resultados entre procesos, navegadores ni trozos de la CI.
- **Costes aceptados:**
  - Ningún estado intermedio de una animación o una transición CSS se analiza con axe, en ninguna regla. Lo señalaron los dos revisores de la ronda 1 del #56 [F1]. Una violación que solo exista durante una animación no la verá axe; los tests propios de AC-20 a AC-22 siguen como estaban.
  - Cada análisis espera lo que quede de la animación en curso, hoy 260 ms como mucho. Donde un plazo de la app tiene que seguir corriendo para el paso siguiente, el análisis va después de ese paso (como ya hace el #56).
  - Una excepción cuyo selector desaparece de la app deja de comprobarse en silencio. La revisión del PR que lo quite la retira.
  - La regla la sigue comprobando la revisión del PR, sin un control automático.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La espera se convierte en una forma de esquivar axe (una animación hecha a propósito para que el análisis no llegue, o una espera que cambie la página) | Una animación que no termina hace fallar el test, no lo salta. La espera solo lee y no filtra animaciones; la revisión lo comprueba. |
  | Una animación larga alarga mucho los E2E | El tiempo máximo de 5 s por análisis. Una animación que lo pase hace fallar el test. |
  | Una excepción oculta una violación nueva en un estado distinto | Solo cubre la regla y el selector exactos (ADR-0007 §3.3). |

- **Impacto:** `tests/e2e/axe.js`, en el PR #56, que alinea su espera y su comentario con este ADR. Este ADR no cambia la app.

## 5. Validación

- **En el #56:** con la espera, la violación de `color-contrast` del fundido de FR-10 deja de salir y los E2E pasan en los dos navegadores [F2].
- **Antes de fusionar el #56:** la espera cumple el punto 1 (solo lectura, tiempo máximo, mensaje y sin filtros) y la comprobación de excepciones, el punto 2. Lo mira la ronda 2 de G4 del #56.

## 6. Seguimiento

- **Fuera de este ADR:** los tests con el reloj parado (`page.clock.pauseAt`) no analizan después de pararlo, porque `analyze()` se cuelga [F2]. Analizan antes, con el reloj ya instalado. Es un hueco de cobertura que se rige por ADR-0007 §3.3 (lo cita el código y lo revisa la persona) y no depende de esta decisión.
- Se revisa este ADR si:
  - la app pasa a tener una animación infinita o más larga que el tiempo máximo;
  - alguna violación real resulta estar solo en un estado intermedio de una animación;
  - axe o Playwright ofrecen una forma, sin tocar la página, de analizar en un momento fijo de una animación.

## 7. Fuentes

Consultadas el 2026-11-18.

- [F1] Reconciliación de la ronda 1 de G4 del PR #56, hallazgos B e I, con las respuestas de los dos revisores: https://github.com/victor-lg/calculadora-discos/pull/56#issuecomment-6977588400
- [F2] `docs/baseline-controles.md`, "M27: axe en los E2E (ADR-0007)", en la rama `test/vic-31-axe` (`6c2d778`): la violación, la espera y el reloj parado.
- [F3] `app/js/app.js` (`entrar`) y `app/css/estilos.css` (`.serie.sale`, `.serie.vuelve`, `.deslizable.se-cierra`) de `main` (`06dac50`).
